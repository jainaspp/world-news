import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { needsSearch } from '../../shared/articleText.js';
import { coherentCluster, type StoryCluster } from '../../shared/angles.js';
import { coherencePrompt, keepItems, parseCoherence } from '../../shared/coherence.js';
import {
  applyBundles,
  applyDelta,
  articleRoom,
  bundleFrom,
  deltaPrompt,
  excerptChars,
  matchEvent,
  newLinks,
  overPace,
  parseDelta,
  UPDATES_PER_CALL,
  type StoredEvent,
} from '../../shared/research.js';
import type { NewsItem } from '../../shared/types.js';
import {
  applyModelText,
  attachCitations,
  briefingPublic,
  explainerCurrent,
  formatHkt,
  guardDoc,
  hktParts,
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
  callCostUsd,
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
import { fetchArticleTexts, readBundles, readEvents, stampExcerpts, writeBundle, writeEvents } from './material.js';
import { docKey, readDoc, readIndex, readValue, rememberIndexMany, writeDoc, writeValue, type ContentEnv } from './store.js';
import { completeGrok, completeText, XAI_TIMEOUT_MS } from './xai.js';

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
  /** Thin fetched text only. The default path is chat completions over article excerpts. */
  search?: boolean;
  /** Fetched excerpts are already on the draft. No search tool. */
  material?: boolean;
  fetchedSources?: number;
  /** Tokens already billed for this article, such as the coherence check. */
  priorInput?: number;
  priorOutput?: number;
}

export interface ArticleCost {
  key: string;
  costUsd: number;
  searchCalls: number;
  inputTokens: number;
  outputTokens: number;
  fetchedSources: number;
}

/** Grok calls for a batch run together. Workers AI runs only when the cap is hit, the key is missing, or xAI returns nothing. */
async function composeBatch(env: ContentEnv, jobs: Job[], started = Date.now()): Promise<{ docs: ContentDoc[]; usage: MonthUsage; grokStatus: number[]; grokError: string[]; capped: boolean; costs: ArticleCost[] }> {
  let usage = await monthUsage(env);
  const key = apiKey(env);
  const capped = capReached(usage) || !key;
  const statuses: number[] = [];
  const errors: string[] = [];
  const grok = await Promise.all(jobs.map(async (job) => {
    const priorInput = job.priorInput ?? 0;
    const priorOutput = job.priorOutput ?? 0;
    if (writerFor({ route: job.route, costUsd: usage.costUsd, hasKey: Boolean(key) }) !== 'grok') {
      return { job, grokDoc: null as ContentDoc | null, input: priorInput, output: priorOutput, requests: 0, searchCalls: 0 };
    }
    let grokDoc: ContentDoc | null = null;
    let input = 0;
    let output = 0;
    let requests = 0;
    let searchCalls = 0;
    const attempts = job.search || job.material ? 1 : 2;
    for (let attempt = 0; attempt < attempts && !(grokDoc && pieceReady(grokDoc)); attempt += 1) {
      if (attempt === 1 && Date.now() - started > RETRY_BEFORE_MS) break;
      const result = await completeGrok(key, job.draft, attempt === 1, XAI_TIMEOUT_MS, {
        search: Boolean(job.search),
        material: Boolean(job.material),
      });
      statuses.push(result.status);
      if (result.error) errors.push(result.error);
      if (!result.status) break;
      input += result.input;
      output += result.output;
      searchCalls += result.searchCalls;
      requests += 1;
      const researched = result.searchCalls > 0 || result.citations.length > 0;
      const applied = result.text ? applyModelText(job.draft, result.text, GROK_MODEL, { researched }) : null;
      const cited = applied ? attachCitations(applied, result.citations) : null;
      if (cited && (!grokDoc || richness(cited) > richness(grokDoc))) grokDoc = cited;
    }
    return { job, grokDoc, input: input + priorInput, output: output + priorOutput, requests, searchCalls };
  }));
  for (const row of grok) {
    if (row.requests) usage = withTokens(usage, row.input - (row.job.priorInput ?? 0), row.output - (row.job.priorOutput ?? 0), row.requests, row.searchCalls);
  }
  if (grok.some((row) => row.requests)) await saveUsage(env, usage);

  const docs = await Promise.all(grok.map(async (row) => {
    if (row.grokDoc) return row.grokDoc;
    if (Date.now() - started > WALL_MS) return row.job.draft;
    try {
      const polished = await polish(env, row.job.draft, false, Boolean(row.job.material));
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
  const costs = grok.map((row) => ({
    key: row.grokDoc?.key || row.job.draft.key,
    inputTokens: row.input,
    outputTokens: row.output,
    searchCalls: row.searchCalls,
    fetchedSources: row.job.fetchedSources ?? 0,
    costUsd: callCostUsd(row.input, row.output, row.searchCalls),
  }));
  return { docs, usage, grokStatus: statuses, grokError: [...new Set(errors)], capped, costs };
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

async function fillBriefing(
  env: ContentEnv,
  hk: NewsItem[],
  china: NewsItem[],
  now: Date,
): Promise<{ hk: NewsItem[]; china: NewsItem[]; search: boolean; fetchedSources: number }> {
  const bundles = await readBundles(env, hktParts(now).date);
  let nextHk = applyBundles(hk, bundles);
  let nextChina = applyBundles(china, bundles);
  if (needsSearch(excerptChars([...nextHk, ...nextChina]))) {
    const missing = [...nextHk, ...nextChina].filter((item) => (item.excerpt || '').length < 200 && /^https?:\/\//.test(item.link));
    const fetched = await fetchArticleTexts(env, missing.map((item) => item.link), fetch, 4);
    nextHk = stampExcerpts(nextHk, fetched.texts);
    nextChina = stampExcerpts(nextChina, fetched.texts);
  }
  const rows = [...nextHk, ...nextChina];
  return {
    hk: nextHk,
    china: nextChina,
    search: needsSearch(excerptChars(rows)),
    fetchedSources: rows.filter((item) => (item.excerpt || '').length >= 80).length,
  };
}

function summedCost(rows: ArticleCost[], key: string): ArticleCost {
  const picked = rows.filter((row) => row.key === key);
  const inputTokens = picked.reduce((sum, row) => sum + row.inputTokens, 0);
  const outputTokens = picked.reduce((sum, row) => sum + row.outputTokens, 0);
  const searchCalls = picked.reduce((sum, row) => sum + row.searchCalls, 0);
  const fetchedSources = picked.reduce((sum, row) => sum + (row.fetchedSources ?? 0), 0);
  return { key, inputTokens, outputTokens, searchCalls, fetchedSources, costUsd: callCostUsd(inputTokens, outputTokens, searchCalls) };
}

export async function generateBriefing(env: ContentEnv, now = new Date(), options: { force?: boolean } = {}): Promise<Record<string, unknown>> {
  const key = briefingKey(now);
  const existing = await readDoc(env, docKey('briefing', key));
  if (!options.force && existing?.doc.mode === 'ai' && existing.doc.model?.includes('grok') && pieceReady(existing.doc)) {
    return delivered(columnDelivery({ skipped: 'exists' }), { kind: 'briefing', key, mode: 'ai', skipped: 'exists' });
  }
  const spent = await monthUsage(env, now);
  if (!options.force && overPace(spent.costUsd, now)) {
    return delivered(columnDelivery({ skipped: 'pace' }), { kind: 'briefing', key, skipped: 'pace' });
  }
  const material = await loadMaterial(env);
  if (!material) return delivered(columnDelivery({ cold: true }), { kind: 'briefing', key });
  const started = Date.now();
  const selected = selectBriefingItems(material.items, now);
  const filled = await fillBriefing(env, selected.hk, selected.china, now);
  const draft = briefingFromItems(filled.hk, filled.china, key, now);
  if (!draft) return delivered(columnDelivery({ skipped: 'no-headlines' }), { kind: 'briefing', key, skipped: 'no-headlines' });
  const first = await composeBatch(env, [{
    draft,
    route: 'grok',
    search: filled.search,
    material: !filled.search,
    fetchedSources: filled.fetchedSources,
  }], started);
  let doc = first.docs[0] ?? draft;
  let costs = first.costs;
  let grokStatus = first.grokStatus;
  let grokError = first.grokError;
  const capped = first.capped;
  if (doc.mode === 'ai' && !pieceReady(doc) && Date.now() - started < RETRY_BEFORE_MS) {
    const more = selectBriefingItems(material.items, now, 14);
    const widerFilled = await fillBriefing(env, more.hk, more.china, now);
    const wider = briefingFromItems(widerFilled.hk, widerFilled.china, key, now);
    if (wider) {
      const again = await composeBatch(env, [{
        draft: wider,
        route: 'grok',
        search: widerFilled.search,
        material: !widerFilled.search,
        fetchedSources: widerFilled.fetchedSources,
      }], started);
      costs = [...costs, ...again.costs];
      grokStatus = [...grokStatus, ...again.grokStatus];
      grokError = [...new Set([...grokError, ...again.grokError])];
      const next = again.docs[0];
      if (next && bodyChars(next) > bodyChars(doc)) doc = next;
    }
  }
  await writeDoc(env, doc);
  const chars = bodyChars(doc);
  const ready = doc.mode === 'ai' && pieceReady(doc);
  const cost = summedCost(costs, doc.key);
  return delivered(columnDelivery({ capped, docs: [{ mode: doc.mode, model: doc.model, chars, key, ready }] }), {
    kind: 'briefing',
    key,
    mode: doc.mode,
    model: doc.model ?? '',
    chars,
    ready,
    grokStatus,
    grokError,
    cost,
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

interface Prepared {
  draft: ContentDoc;
  route: 'grok' | 'workers';
  cluster: StoryCluster;
  keepKey?: string;
  search: boolean;
  material: boolean;
  fetchedSources: number;
  priorInput: number;
  priorOutput: number;
}

/** Drop headlines that are not the lead's event, then ask Grok which of the rest are the same story. */
async function narrowCluster(cluster: StoryCluster, key: string, capped: boolean): Promise<{ cluster: StoryCluster | null; input: number; output: number; requests: number }> {
  const strict = coherentCluster(cluster);
  if (!strict) return { cluster: null, input: 0, output: 0, requests: 0 };
  if (strict.items.length < 3 || !key || capped) return { cluster: strict, input: 0, output: 0, requests: 0 };
  const prompt = coherencePrompt(strict.items.map((item) => ({ source: item.source, title: item.title })));
  const result = await completeText(key, prompt.system, prompt.user, 200, 12_000);
  const spent = { input: result.input, output: result.output, requests: result.status ? 1 : 0 };
  const keep = result.text ? parseCoherence(result.text, strict.items.length) : null;
  if (!keep) return { cluster: strict, ...spent };
  if (keep.length < 2) return { cluster: null, ...spent };
  const items = keepItems(strict.items, keep);
  const lead = items.find((item) => item.id === strict.lead.id) ?? items[0];
  if (!lead) return { cluster: null, ...spent };
  const next = coherentCluster({
    ...strict,
    lead,
    items,
    sources: [...new Set(items.map((item) => item.source))],
    count: new Set(items.map((item) => item.source)).size,
  });
  return { cluster: next, ...spent };
}

async function prepareExplainers(
  env: ContentEnv,
  candidates: { cluster: StoryCluster; keepKey?: string }[],
  items: NewsItem[],
  take: number,
  now: Date,
): Promise<Prepared[]> {
  const usage = await monthUsage(env);
  const key = apiKey(env);
  const capped = capReached(usage) || !key;
  const narrowed = await Promise.all(candidates.map((row) => narrowCluster(row.cluster, key, capped)));
  const requests = narrowed.reduce((sum, row) => sum + row.requests, 0);
  if (requests) {
    const input = narrowed.reduce((sum, row) => sum + row.input, 0);
    const output = narrowed.reduce((sum, row) => sum + row.output, 0);
    await saveUsage(env, withTokens(usage, input, output, requests, 0));
  }
  const chosen: { cluster: StoryCluster; source: { cluster: StoryCluster; keepKey?: string }; priorInput: number; priorOutput: number }[] = [];
  for (const [index, row] of narrowed.entries()) {
    if (chosen.length >= take) break;
    const cluster = row.cluster;
    const source = candidates[index];
    if (!cluster || !source) continue;
    chosen.push({ cluster, source, priorInput: row.input, priorOutput: row.output });
  }
  const urls: string[] = [];
  for (const row of chosen) {
    let added = 0;
    for (const item of row.cluster.items) {
      if (added >= 4) break;
      if (!/^https?:\/\//.test(item.link) || urls.includes(item.link)) continue;
      urls.push(item.link);
      added += 1;
    }
  }
  const fetched = urls.length
    ? await fetchArticleTexts(env, urls, fetch, urls.length)
    : { texts: new Map<string, string>(), fetchedSources: 0 };
  const date = hktParts(now).date;
  const jobs: Prepared[] = [];
  for (const row of chosen) {
    const stamped = stampExcerpts(row.cluster.items, fetched.texts);
    const lead = stamped.find((item) => item.id === row.cluster.lead.id) ?? stamped[0];
    if (!lead) continue;
    const cluster: StoryCluster = {
      ...row.cluster,
      lead,
      items: stamped,
      sources: [...new Set(stamped.map((item) => item.source))],
      count: new Set(stamped.map((item) => item.source)).size,
    };
    const chars = excerptChars(stamped);
    const search = needsSearch(chars) && !capped;
    await writeBundle(env, bundleFrom(date, storySignature(cluster), cluster.lead.title, stamped)).catch(() => undefined);
    const draft = compareFromCluster(cluster, now, relatedEarlier(cluster, items));
    if (row.source.keepKey) draft.key = row.source.keepKey;
    jobs.push({
      draft,
      route: routeForCluster(cluster),
      cluster,
      search,
      material: !search,
      fetchedSources: stamped.filter((item) => (item.excerpt || '').length >= 80).length,
      priorInput: row.priorInput,
      priorOutput: row.priorOutput,
      ...(row.source.keepKey ? { keepKey: row.source.keepKey } : {}),
    });
  }
  return jobs;
}

async function runUpdates(
  env: ContentEnv,
  clusters: StoryCluster[],
  events: StoredEvent[],
  now: Date,
): Promise<{ keys: string[]; costs: ArticleCost[]; events: StoredEvent[] }> {
  const key = apiKey(env);
  const usage = await monthUsage(env, now);
  if (capReached(usage) || !key || writerFor({ costUsd: usage.costUsd, hasKey: Boolean(key) }) !== 'grok') {
    return { keys: [], costs: [], events };
  }
  const ranked = [...clusters].filter((cluster) => cluster.count >= 2).sort((a, b) => b.count - a.count || b.latest - a.latest);
  const picked: { cluster: StoryCluster; event: StoredEvent; links: string[] }[] = [];
  for (const cluster of ranked) {
    const event = matchEvent(cluster, events, now.getTime());
    if (!event) continue;
    const links = newLinks(cluster, event);
    if (!links.length) continue;
    picked.push({ cluster, event, links });
    if (picked.length >= UPDATES_PER_CALL) break;
  }
  if (!picked.length) return { keys: [], costs: [], events };
  const urls = [...new Set(picked.flatMap((row) => row.links))].slice(0, 4);
  const fetched = await fetchArticleTexts(env, urls, fetch, urls.length || 1);
  const keys: string[] = [];
  const costs: ArticleCost[] = [];
  const saved: ContentDoc[] = [];
  let nextUsage = usage;
  for (const row of picked) {
    const existing = await readDoc(env, docKey('compare', row.event.key));
    if (!existing) continue;
    const material = row.cluster.items.filter((item) => row.links.includes(item.link)).map((item) => ({
      source: item.source,
      title: item.title,
      url: item.link,
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      excerpt: (fetched.texts.get(item.link) || item.excerpt || '').slice(0, 1_200),
    }));
    const prompt = deltaPrompt(existing.doc, material);
    const result = await completeText(key, prompt.system, prompt.user, prompt.maxTokens, 20_000);
    if (result.status) nextUsage = withTokens(nextUsage, result.input, result.output, 1, 0);
    const delta = result.text ? parseDelta(result.text) : null;
    const applied = delta ? applyDelta(existing.doc, delta, material, now) : { doc: existing.doc, changed: false };
    if (applied.changed) {
      await writeDoc(env, applied.doc, false);
      saved.push(applied.doc);
      keys.push(applied.doc.key);
    }
    row.event.links = [...new Set([...row.event.links, ...row.links])];
    row.event.at = now.getTime();
    costs.push({
      key: row.event.key,
      inputTokens: result.input,
      outputTokens: result.output,
      searchCalls: 0,
      fetchedSources: material.filter((item) => (item.excerpt || '').length >= 80).length,
      costUsd: callCostUsd(result.input, result.output, 0),
    });
  }
  if (costs.length) await saveUsage(env, nextUsage);
  if (saved.length) await rememberIndexMany(env, saved).catch(() => undefined);
  return { keys, costs, events };
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

  let events = await readEvents(env);
  const update = options.force
    ? { keys: [] as string[], costs: [] as ArticleCost[], events }
    : await runUpdates(env, material.clusters, events, now);
  events = update.events;

  const spent = await monthUsage(env, now);
  const room = options.force ? take : Math.min(take, articleRoom(spent.costUsd, now));
  if (!options.force && room <= 0) {
    await writeEvents(env, events, now.getTime());
    return delivered(columnDelivery({ skipped: 'pace' }), {
      kind: 'compare',
      keys: [],
      updates: update.keys,
      costs: update.costs,
      skipped: 'pace',
    });
  }

  let candidates: { cluster: StoryCluster; keepKey?: string }[];
  if (options.force) {
    const legacy = await legacyCompareDocs(env, options.key || '');
    if (options.key && !legacy.length) {
      return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'missing', key: options.key });
    }
    const forced = legacy.slice(0, take);
    if (!forced.length) return delivered(columnDelivery({ skipped: 'none' }), { kind: 'compare', keys: [], skipped: 'none' });
    candidates = forced.flatMap((doc) => {
      const cluster = matchCluster(doc, material.clusters) ?? clusterFromDoc(doc);
      return cluster ? [{ cluster, keepKey: doc.key }] : [];
    });
  } else {
    const fresh = material.clusters.filter((cluster) => !matchEvent(cluster, events, now.getTime()));
    const picked = pickCompareBatch(fresh, written, Math.min(8, room + 5), now);
    if (!picked.length) {
      await writeEvents(env, events, now.getTime());
      return delivered(columnDelivery({ skipped: 'none' }), {
        kind: 'compare',
        keys: [],
        updates: update.keys,
        costs: update.costs,
        skipped: 'none',
      });
    }
    candidates = picked.map((cluster) => ({ cluster }));
  }
  const jobs = await prepareExplainers(env, candidates, material.items, room, now);
  if (!jobs.length) {
    await writeEvents(env, events, now.getTime());
    return delivered(columnDelivery({ skipped: 'none' }), {
      kind: 'compare',
      keys: [],
      updates: update.keys,
      costs: update.costs,
      skipped: 'none',
    });
  }

  const { docs, grokStatus, grokError, capped, costs } = await composeBatch(env, jobs);
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
    const previous = events.find((event) => event.key === doc.key);
    const row: StoredEvent = {
      key: doc.key,
      title: doc.title,
      leadTitle: job.cluster.lead.title,
      links: [...new Set([...(previous?.links ?? []), ...job.cluster.items.map((item) => item.link)])],
      at: now.getTime(),
      signature: storySignature(job.cluster),
    };
    events = [row, ...events.filter((event) => event.key !== doc.key)];
  }
  await writeEvents(env, events, now.getTime());
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
    updates: update.keys,
    modes: saved.map((doc) => doc.mode),
    routes: jobs.map((job) => job.route),
    models: saved.map((doc) => doc.model ?? ''),
    grokStatus,
    grokError,
    costs: [...update.costs, ...saved.map((doc) => summedCost(costs, doc.key))],
  });
}

function slotOk(slot: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(slot);
}

function compareOk(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-.+-[0-9a-f]{12}$/.test(key);
}

async function visibleBriefings(env: ContentEnv, entries: Awaited<ReturnType<typeof readIndex>>): Promise<Awaited<ReturnType<typeof readIndex>>> {
  const saved = await Promise.all(entries.map((entry) => readDoc(env, docKey('briefing', entry.key)).catch(() => null)));
  return entries.filter((_entry, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && briefingPublic(doc));
  });
}

export async function serveBriefingIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const entries = await readIndex(env, 'briefing').catch(() => []);
  const visible = await visibleBriefings(env, entries);
  const canonical = `${siteUrl(env)}/briefing/`;
  return new Response(renderColumnIndex('briefing', visible, canonical, { ads: adConfig(env) }), { headers: HTML_HEADERS });
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
  const archive = await visibleBriefings(env, await readIndex(env, 'briefing').catch(() => []));
  const day = slot.slice(0, 10);
  const explainers = await visibleExplainers(env, (await readIndex(env, 'compare').catch(() => [])).filter((entry) => entry.key.startsWith(day)));
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
  const archive = await visibleExplainers(env, await readIndex(env, 'compare').catch(() => []));
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
