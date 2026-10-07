import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import type { StoryCluster } from '../../shared/angles.js';
import type { NewsItem } from '../../shared/types.js';
import {
  applyModelText,
  explainerCurrent,
  formatHkt,
  guardDoc,
  renderColumnIndex,
  renderContentPage,
  type ContentDoc,
} from '../../shared/content.js';
import {
  COMPARE_BATCH,
  GROK_MODEL,
  bodyChars,
  briefingFromItems,
  briefingKey,
  capReached,
  columnDelivery,
  compareFromCluster,
  emptyUsage,
  hktMonth,
  materialFromBoard,
  parseUsage,
  parseWritten,
  pickCompareBatch,
  pieceReady,
  preferWritten,
  relatedEarlier,
  richness,
  routeForCluster,
  selectBriefingItems,
  slotInstant,
  statusFrom,
  storySignature,
  upsertWritten,
  usageKey,
  withArticle,
  withTokens,
  writerFor,
  writtenKey,
  type ColumnDelivery,
  type MonthUsage,
  type WrittenStory,
} from '../../shared/grok.js';
import type { PagesContext } from '../env.js';
import { readBoard } from '../board/store.js';
import { generateFocus } from './focus.js';
import { adConfig, polish } from './publish.js';
import { docKey, readDoc, readIndex, readValue, rememberIndexMany, writeDoc, writeValue, type ContentEnv } from './store.js';
import { completeGrok } from './xai.js';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400',
};

const WALL_MS = 60_000;
/** Only start the stricter second Grok attempt while there is room before the edge's 100 s limit. */
const RETRY_BEFORE_MS = 35_000;

function siteUrl(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

function emptyDoc(kind: 'briefing' | 'compare', key: string, title: string): ContentDoc {
  const now = new Date().toISOString();
  return {
    kind,
    key,
    title,
    description: '這一期還沒有內容。',
    blocks: [],
    publishedAt: now,
    hkt: formatHkt(now),
    mode: 'sources',
  };
}

function htmlPage(
  doc: ContentDoc,
  canonical: string,
  env: ContentEnv,
  archive: Awaited<ReturnType<typeof readIndex>>,
  status = 200,
  explainers: Awaited<ReturnType<typeof readIndex>> = [],
): Response {
  const shown = doc.mode === 'ai' ? guardDoc(doc) : doc;
  return new Response(renderContentPage(shown, canonical, { ads: adConfig(env), archive, explainers }), { status, headers: HTML_HEADERS });
}

async function monthUsage(env: ContentEnv, now = new Date()): Promise<MonthUsage> {
  const month = hktMonth(now);
  return parseUsage(await readValue(env, usageKey(month)).catch(() => null), month);
}

async function saveUsage(env: ContentEnv, usage: MonthUsage): Promise<void> {
  await writeValue(env, usageKey(usage.month), JSON.stringify(usage));
}

function apiKey(env: ContentEnv): string {
  return typeof env.XAI_API_KEY === 'string' ? env.XAI_API_KEY.trim() : '';
}

interface Job {
  draft: ContentDoc;
  route: 'grok' | 'workers';
}

/** Grok calls for a batch run together. Workers AI runs only when the cap is hit, the key is missing, or xAI returns nothing. */
async function composeBatch(env: ContentEnv, jobs: Job[], started = Date.now()): Promise<{ docs: ContentDoc[]; usage: MonthUsage; grokStatus: number[]; grokError: string[]; capped: boolean }> {
  let usage = await monthUsage(env);
  const key = apiKey(env);
  const capped = capReached(usage) || !key;
  const statuses: number[] = [];
  const errors: string[] = [];
  const grok = await Promise.all(jobs.map(async (job) => {
    if (writerFor({ route: job.route, costUsd: usage.costUsd, hasKey: Boolean(key) }) !== 'grok') {
      return { job, grokDoc: null as ContentDoc | null, input: 0, output: 0, requests: 0 };
    }
    let grokDoc: ContentDoc | null = null;
    let input = 0;
    let output = 0;
    let requests = 0;
    for (let attempt = 0; attempt < 2 && !(grokDoc && pieceReady(grokDoc)); attempt += 1) {
      if (attempt === 1 && Date.now() - started > RETRY_BEFORE_MS) break;
      const result = await completeGrok(key, job.draft, attempt === 1);
      statuses.push(result.status);
      if (result.error) errors.push(result.error);
      if (!result.status) break;
      input += result.input;
      output += result.output;
      requests += 1;
      const applied = result.text ? applyModelText(job.draft, result.text, GROK_MODEL) : null;
      if (applied && (!grokDoc || richness(applied) > richness(grokDoc))) grokDoc = applied;
    }
    return { job, grokDoc, input, output, requests };
  }));
  for (const row of grok) {
    if (row.requests) usage = withTokens(usage, row.input, row.output, row.requests);
  }
  if (grok.some((row) => row.requests)) await saveUsage(env, usage);

  const docs = await Promise.all(grok.map(async (row) => {
    if (row.grokDoc) return row.grokDoc;
    if (Date.now() - started > WALL_MS) return row.job.draft;
    try {
      const polished = await polish(env, row.job.draft);
      return preferWritten(null, polished);
    } catch {
      return row.job.draft;
    }
  }));
  for (const doc of docs) {
    if (doc.mode !== 'ai' || (doc.kind !== 'briefing' && doc.kind !== 'compare')) continue;
    usage = withArticle(usage, doc.model?.includes('grok') ? 'grok' : 'workers', doc.kind);
  }
  await saveUsage(env, usage);
  return { docs, usage, grokStatus: statuses, grokError: [...new Set(errors)], capped };
}

/** The cached board only. A cold cache returns null so the caller can answer 503 without crawling feeds. */
async function loadMaterial(env: ContentEnv): Promise<{ items: NewsItem[]; clusters: StoryCluster[] } | null> {
  const board = await readBoard(env).catch(() => null);
  return materialFromBoard(board);
}

function delivered(delivery: ColumnDelivery, extra: Record<string, unknown>): Record<string, unknown> {
  return { ...extra, ...delivery };
}

export async function columnStatus(env: ContentEnv, now = new Date()): Promise<ReturnType<typeof statusFrom>> {
  const usage = await monthUsage(env, now).catch(() => emptyUsage(hktMonth(now)));
  return statusFrom(usage);
}

export async function generateBriefing(env: ContentEnv, now = new Date(), options: { force?: boolean } = {}): Promise<Record<string, unknown>> {
  const key = briefingKey(now);
  const existing = await readDoc(env, docKey('briefing', key));
  if (!options.force && existing?.doc.mode === 'ai' && existing.doc.model?.includes('grok') && pieceReady(existing.doc)) {
    return delivered(columnDelivery({ skipped: 'exists' }), { kind: 'briefing', key, mode: 'ai', skipped: 'exists' });
  }
  const material = await loadMaterial(env);
  if (!material) return delivered(columnDelivery({ cold: true }), { kind: 'briefing', key });
  const selected = selectBriefingItems(material.items, now);
  const draft = briefingFromItems(selected.hk, selected.china, key, now);
  if (!draft) return delivered(columnDelivery({ skipped: 'no-headlines' }), { kind: 'briefing', key, skipped: 'no-headlines' });
  const { docs, grokStatus, grokError, capped } = await composeBatch(env, [{ draft, route: 'grok' }]);
  const doc = docs[0] ?? draft;
  await writeDoc(env, doc);
  const chars = bodyChars(doc);
  const ready = doc.mode === 'ai' && pieceReady(doc);
  return delivered(columnDelivery({ capped, docs: [{ mode: doc.mode, model: doc.model, chars, key, ready }] }), {
    kind: 'briefing',
    key,
    mode: doc.mode,
    model: doc.model ?? '',
    chars,
    ready,
    grokStatus,
    grokError,
  });
}

function clusterFromDoc(doc: ContentDoc): StoryCluster | null {
  const seen = new Set<string>();
  const items: NewsItem[] = [];
  for (const block of doc.blocks) {
    for (const source of block.sources) {
      if (!source.url || seen.has(source.url)) continue;
      seen.add(source.url);
      items.push({
        id: source.url,
        title: source.title,
        link: source.url,
        source: source.source,
        sourceUrl: source.url,
        regions: [],
        pubDate: source.pubDate || doc.publishedAt,
        category: source.category || 'world',
        ...(source.excerpt ? { excerpt: source.excerpt } : {}),
      });
    }
  }
  if (items.length < 2) return null;
  const lead = items[0]!;
  return {
    id: doc.key,
    lead,
    items,
    sources: [...new Set(items.map((item) => item.source))],
    count: new Set(items.map((item) => item.source)).size,
    latest: Date.parse(doc.publishedAt) || Date.now(),
  };
}

function matchCluster(doc: ContentDoc, clusters: StoryCluster[]): StoryCluster | undefined {
  const links = new Set(doc.blocks.flatMap((block) => block.sources.map((source) => source.url)));
  return clusters.find((cluster) => cluster.items.filter((item) => links.has(item.link)).length >= 2);
}

async function legacyCompareDocs(env: ContentEnv, onlyKey = ''): Promise<ContentDoc[]> {
  const entries = await readIndex(env, 'compare').catch(() => []);
  const chosen = onlyKey ? entries.filter((entry) => entry.key === onlyKey) : entries;
  const saved = await Promise.all(chosen.map((entry) => readDoc(env, docKey('compare', entry.key)).catch(() => null)));
  return saved
    .map((row) => row?.doc)
    .filter((doc): doc is ContentDoc => Boolean(doc))
    .filter((doc) => (onlyKey ? doc.key === onlyKey : !explainerCurrent(doc)));
}

export async function generateCompare(
  env: ContentEnv,
  limit = COMPARE_BATCH,
  now = new Date(),
  options: { force?: boolean; key?: string } = {},
): Promise<Record<string, unknown>> {
  const take = Math.max(1, Math.min(COMPARE_BATCH, limit));
  const written = parseWritten(await readValue(env, writtenKey(now)).catch(() => null));
  const material = await loadMaterial(env);
  if (!material) return delivered(columnDelivery({ cold: true }), { kind: 'compare', keys: [] });

  let jobs: { draft: ContentDoc; route: 'grok' | 'workers'; cluster: StoryCluster; keepKey?: string }[];
  if (options.force) {
    const legacy = await legacyCompareDocs(env, options.key || '');
    if (options.key && !legacy.length) {
      return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'missing', key: options.key });
    }
    const forced = legacy.slice(0, take);
    if (!forced.length) return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'none' });
    jobs = forced.flatMap((doc) => {
      const cluster = matchCluster(doc, material.clusters) ?? clusterFromDoc(doc);
      if (!cluster) return [];
      const draft = compareFromCluster(cluster, now, relatedEarlier(cluster, material.items));
      draft.key = doc.key;
      return [{ draft, route: routeForCluster(cluster), cluster, keepKey: doc.key }];
    });
  } else {
    const picked = pickCompareBatch(material.clusters, written, take, now);
    if (!picked.length) return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'none' });
    jobs = picked.map((cluster) => ({
      draft: compareFromCluster(cluster, now, relatedEarlier(cluster, material.items)),
      route: routeForCluster(cluster),
      cluster,
    }));
  }
  if (!jobs.length) return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'none' });

  const { docs, grokStatus, grokError, capped } = await composeBatch(env, jobs);
  const saved: ContentDoc[] = [];
  let nextWritten: WrittenStory[] = [...written];
  for (const [index, doc] of docs.entries()) {
    const job = jobs[index];
    if (!job || !doc) continue;
    if (job.keepKey) doc.key = job.keepKey;
    await writeDoc(env, doc, false);
    saved.push(doc);
    const ready = doc.mode === 'ai' && pieceReady(doc);
    nextWritten = upsertWritten(nextWritten, {
      key: doc.key,
      signature: storySignature(job.cluster),
      links: [...new Set(job.cluster.items.map((item) => item.link))],
      mode: doc.mode,
      at: now.getTime(),
      chars: bodyChars(doc),
      ready,
    }, job.cluster, now);
    await writeValue(env, writtenKey(now), JSON.stringify(nextWritten));
  }
  if (saved.length) await rememberIndexMany(env, saved).catch(() => undefined);
  return delivered(columnDelivery({
    capped,
    docs: saved.map((doc) => ({
      mode: doc.mode,
      model: doc.model,
      chars: bodyChars(doc),
      key: doc.key,
      ready: doc.mode === 'ai' && pieceReady(doc),
    })),
  }), {
    kind: 'compare',
    keys: saved.map((doc) => doc.key),
    modes: saved.map((doc) => doc.mode),
    routes: jobs.map((job) => job.route),
    models: saved.map((doc) => doc.model ?? ''),
    grokStatus,
    grokError,
  });
}

function slotOk(slot: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(slot);
}

function compareOk(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-.+-[0-9a-f]{12}$/.test(key);
}

export async function serveBriefingIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const entries = await readIndex(env, 'briefing').catch(() => []);
  const canonical = `${siteUrl(env)}/briefing/`;
  return new Response(renderColumnIndex('briefing', entries, canonical, { ads: adConfig(env) }), { headers: HTML_HEADERS });
}

async function visibleExplainers(env: ContentEnv, entries: Awaited<ReturnType<typeof readIndex>>): Promise<Awaited<ReturnType<typeof readIndex>>> {
  const saved = await Promise.all(entries.map((entry) => readDoc(env, docKey('compare', entry.key)).catch(() => null)));
  return entries.filter((_entry, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && explainerCurrent(doc));
  });
}

export async function serveCompareIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const entries = await readIndex(env, 'compare').catch(() => []);
  const visible = await visibleExplainers(env, entries);
  const canonical = `${siteUrl(env)}/explainer/`;
  return new Response(renderColumnIndex('compare', visible, canonical, { ads: adConfig(env) }), { headers: HTML_HEADERS });
}

export async function serveBriefing(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const slot = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/briefing/${slot}`;
  const archive = await readIndex(env, 'briefing').catch(() => []);
  const day = slot.slice(0, 10);
  const explainers = (await readIndex(env, 'compare').catch(() => [])).filter((entry) => entry.key.startsWith(day));
  if (!slotOk(slot)) return htmlPage(emptyDoc('briefing', slot, '未有這一期'), canonical, env, archive, 404, explainers);
  const saved = await readDoc(env, docKey('briefing', slot)).catch(() => null);
  if (!saved) return htmlPage(emptyDoc('briefing', slot, '未有這一期'), canonical, env, archive, 404, explainers);
  return htmlPage(saved.doc, canonical, env, archive, 200, explainers);
}

export async function serveCompare(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const key = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/explainer/${encodeURIComponent(key)}`;
  const archive = await readIndex(env, 'compare').catch(() => []);
  if (!compareOk(key)) return htmlPage(emptyDoc('compare', key, '未有這則懶人包'), canonical, env, archive, 404);
  const saved = await readDoc(env, docKey('compare', key)).catch(() => null);
  if (!saved) return htmlPage(emptyDoc('compare', key, '未有這則懶人包'), canonical, env, archive, 404);
  return htmlPage(saved.doc, canonical, env, archive);
}

export async function warmColumns(context: PagesContext): Promise<Response> {
  try {
    applyRuntimeEnv(context.env);
    const env = context.env as ContentEnv;
    const header = context.request.headers.get('x-generate-secret');
    const secret = typeof env.GENERATE_SECRET === 'string' ? env.GENERATE_SECRET : '';
    if (!secret || header !== secret) {
      return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
    }
    const kind = new URL(context.request.url).searchParams.get('kind') || '';
    if (kind === 'status') return Response.json(await columnStatus(env));
    const url = new URL(context.request.url);
    const force = url.searchParams.get('force') === '1';
    if (kind === 'briefing') {
      const slot = url.searchParams.get('slot') || '';
      const when = force && slot ? slotInstant(slot) : null;
      if (force && slot && !when) {
        return Response.json({ error: 'slot' }, { status: 400, headers: { 'cache-control': 'no-store' } });
      }
      const result = await generateBriefing(env, when ?? new Date(), { force });
      const status = typeof result.status === 'number' ? result.status : 200;
      return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
    }
    if (kind === 'compare' || kind === 'explainer') {
      const requested = Number(url.searchParams.get('limit') || COMPARE_BATCH);
      const limit = Number.isFinite(requested) ? requested : COMPARE_BATCH;
      const key = url.searchParams.get('key') || '';
      const result = await generateCompare(env, limit, new Date(), { force, ...(key ? { key } : {}) });
      const status = typeof result.status === 'number' ? result.status : 200;
      return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
    }
    if (kind === 'focus') {
      const requested = Number(url.searchParams.get('limit') || '');
      const result = await generateFocus(env, Number.isFinite(requested) ? requested : undefined, new Date(), {
        force,
        scope: url.searchParams.get('scope') || '',
        id: url.searchParams.get('id') || '',
      });
      const status = typeof result.status === 'number' ? result.status : 200;
      return Response.json(result, { status, headers: { 'cache-control': 'no-store' } });
    }
    return Response.json({ error: 'kind' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
