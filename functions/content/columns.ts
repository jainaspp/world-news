import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import type { StoryCluster } from '../../shared/angles.js';
import { clusterRecent, clustersFromSnapshot, type BoardSnapshot } from '../../shared/board.js';
import {
  applyModelText,
  formatHkt,
  guardDoc,
  renderColumnIndex,
  renderContentPage,
  type ContentDoc,
} from '../../shared/content.js';
import {
  COMPARE_BATCH,
  GROK_MODEL,
  briefingFromItems,
  briefingKey,
  compareFromCluster,
  compareKey,
  emptyUsage,
  findWritten,
  hktMonth,
  parseUsage,
  parseWritten,
  pickCompareBatch,
  preferWritten,
  richness,
  routeForCluster,
  selectBriefingItems,
  statusFrom,
  storySignature,
  usageKey,
  withArticle,
  withTokens,
  writerFor,
  writtenKey,
  type MonthUsage,
  type WrittenStory,
} from '../../shared/grok.js';
import type { NewsItem } from '../../shared/types.js';
import type { PagesContext } from '../env.js';
import { readBoard } from '../board/store.js';
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

function htmlPage(doc: ContentDoc, canonical: string, env: ContentEnv, archive: Awaited<ReturnType<typeof readIndex>>, status = 200): Response {
  const shown = doc.mode === 'ai' ? guardDoc(doc) : doc;
  return new Response(renderContentPage(shown, canonical, { ads: adConfig(env), archive }), { status, headers: HTML_HEADERS });
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

/** Grok calls for a batch run together. Workers AI runs only when Grok is short, capped, or not the route. */
async function composeBatch(env: ContentEnv, jobs: Job[], started = Date.now()): Promise<{ docs: ContentDoc[]; usage: MonthUsage; grokStatus: number[] }> {
  let usage = await monthUsage(env);
  const key = apiKey(env);
  const statuses: number[] = [];
  const grok = await Promise.all(jobs.map(async (job) => {
    if (writerFor({ route: job.route, costUsd: usage.costUsd, hasKey: Boolean(key) }) !== 'grok') {
      return { job, grokDoc: null as ContentDoc | null, input: 0, output: 0, requests: 0 };
    }
    let grokDoc: ContentDoc | null = null;
    let input = 0;
    let output = 0;
    let requests = 0;
    for (let attempt = 0; attempt < 2 && !(grokDoc && richness(grokDoc) >= 500); attempt += 1) {
      if (attempt === 1 && Date.now() - started > RETRY_BEFORE_MS) break;
      const result = await completeGrok(key, job.draft, attempt === 1);
      statuses.push(result.status);
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
    if (row.grokDoc && richness(row.grokDoc) >= 500) return row.grokDoc;
    if (Date.now() - started > WALL_MS) return row.grokDoc ?? row.job.draft;
    try {
      const polished = await polish(env, row.job.draft);
      return preferWritten(row.grokDoc, polished);
    } catch {
      return row.grokDoc ?? row.job.draft;
    }
  }));
  for (const doc of docs) {
    if (doc.mode !== 'ai' || (doc.kind !== 'briefing' && doc.kind !== 'compare')) continue;
    usage = withArticle(usage, doc.model?.includes('grok') ? 'grok' : 'workers', doc.kind);
  }
  await saveUsage(env, usage);
  return { docs, usage, grokStatus: statuses };
}

function withLiveItems(snapshot: BoardSnapshot, items: NewsItem[]): StoryCluster[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return clustersFromSnapshot(snapshot).map((cluster) => {
    const joined = cluster.items.map((item) => byId.get(item.id) ?? item);
    const lead = joined[0] ?? cluster.lead;
    const sources = [...new Set(joined.map((item) => item.source))];
    return { ...cluster, lead, items: joined, sources, count: sources.length };
  }).filter((cluster) => cluster.count >= 2);
}

/** Prefer the precomputed 多方報道 board so this request does not cluster the whole feed. */
async function loadMaterial(env: ContentEnv): Promise<{ items: NewsItem[]; clusters: StoryCluster[] }> {
  const news = await getNews();
  const board = await readBoard(env).catch(() => null);
  const clusters = board?.clusters.length ? withLiveItems(board, news.items) : clusterRecent(news.items);
  return { items: news.items, clusters };
}

export async function columnStatus(env: ContentEnv, now = new Date()): Promise<ReturnType<typeof statusFrom>> {
  const usage = await monthUsage(env, now).catch(() => emptyUsage(hktMonth(now)));
  return statusFrom(usage);
}

export async function generateBriefing(env: ContentEnv, now = new Date()): Promise<Record<string, unknown>> {
  const key = briefingKey(now);
  const existing = await readDoc(env, docKey('briefing', key));
  if (existing?.doc.mode === 'ai') return { ok: true, kind: 'briefing', key, mode: 'ai', skipped: 'exists' };
  const { items } = await loadMaterial(env);
  const selected = selectBriefingItems(items, now);
  const draft = briefingFromItems(selected.hk, selected.china, key, now);
  if (!draft) return { ok: true, kind: 'briefing', key, skipped: 'no-headlines' };
  const { docs, grokStatus } = await composeBatch(env, [{ draft, route: 'grok' }]);
  const doc = docs[0] ?? draft;
  await writeDoc(env, doc);
  return { ok: true, kind: 'briefing', key, mode: doc.mode, model: doc.model ?? '', chars: richness(doc), grokStatus };
}

export async function generateCompare(env: ContentEnv, limit = COMPARE_BATCH, now = new Date()): Promise<Record<string, unknown>> {
  const take = Math.max(1, Math.min(COMPARE_BATCH, limit));
  const written = parseWritten(await readValue(env, writtenKey(now)).catch(() => null));
  const { clusters } = await loadMaterial(env);
  const picked = pickCompareBatch(clusters, written, take, now);
  if (!picked.length) return { ok: true, kind: 'compare', keys: [], skipped: 'none' };
  const jobs = picked.map((cluster) => ({
    draft: compareFromCluster(cluster, now),
    route: routeForCluster(cluster),
    cluster,
  }));
  const { docs, grokStatus } = await composeBatch(env, jobs);
  const saved: ContentDoc[] = [];
  const nextWritten: WrittenStory[] = [...written];
  for (const [index, doc] of docs.entries()) {
    const cluster = jobs[index]?.cluster;
    if (!cluster || !doc) continue;
    await writeDoc(env, doc, false);
    saved.push(doc);
    const row: WrittenStory = {
      key: compareKey(cluster, now),
      signature: storySignature(cluster),
      links: [...new Set(cluster.items.map((item) => item.link))],
      mode: doc.mode,
      at: now.getTime(),
    };
    const previous = findWritten(cluster, nextWritten, now);
    if (previous) {
      previous.mode = doc.mode;
      previous.at = row.at;
      previous.key = row.key;
    } else nextWritten.push(row);
    await writeValue(env, writtenKey(now), JSON.stringify(nextWritten));
  }
  if (saved.length) await rememberIndexMany(env, saved).catch(() => undefined);
  return {
    ok: true,
    kind: 'compare',
    keys: saved.map((doc) => doc.key),
    modes: saved.map((doc) => doc.mode),
    routes: jobs.map((job) => job.route),
    models: saved.map((doc) => doc.model ?? ''),
    grokStatus,
  };
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

export async function serveCompareIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const entries = await readIndex(env, 'compare').catch(() => []);
  const canonical = `${siteUrl(env)}/compare/`;
  return new Response(renderColumnIndex('compare', entries, canonical, { ads: adConfig(env) }), { headers: HTML_HEADERS });
}

export async function serveBriefing(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const slot = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/briefing/${slot}`;
  const archive = await readIndex(env, 'briefing').catch(() => []);
  if (!slotOk(slot)) return htmlPage(emptyDoc('briefing', slot, '未有這一期'), canonical, env, archive, 404);
  const saved = await readDoc(env, docKey('briefing', slot)).catch(() => null);
  if (!saved) return htmlPage(emptyDoc('briefing', slot, '未有這一期'), canonical, env, archive, 404);
  return htmlPage(saved.doc, canonical, env, archive);
}

export async function serveCompare(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const key = decodeURIComponent(new URL(context.request.url).pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/compare/${encodeURIComponent(key)}`;
  const archive = await readIndex(env, 'compare').catch(() => []);
  if (!compareOk(key)) return htmlPage(emptyDoc('compare', key, '未有這則對比'), canonical, env, archive, 404);
  const saved = await readDoc(env, docKey('compare', key)).catch(() => null);
  if (!saved) return htmlPage(emptyDoc('compare', key, '未有這則對比'), canonical, env, archive, 404);
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
    if (kind === 'briefing') return Response.json(await generateBriefing(env));
    if (kind === 'compare') {
      const requested = Number(new URL(context.request.url).searchParams.get('limit') || COMPARE_BATCH);
      const limit = Number.isFinite(requested) ? requested : COMPARE_BATCH;
      return Response.json(await generateCompare(env, limit));
    }
    return Response.json({ error: 'kind' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
