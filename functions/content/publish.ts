import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import {
  AI_MODEL,
  ANALYSIS_PER_RUN,
  DAILY_AI_CALLS,
  analysisEligible,
  analysisFromCluster,
  analysisSlug,
  applyModelText,
  digestFromClusters,
  formatHkt,
  guardDoc,
  hktParts,
  pickAnalysisClusters,
  promptFor,
  recentSlots,
  renderAnalysisIndex,
  renderContentPage,
  slotId,
  textFromAi,
  weeklyEdition,
  weeklyFromHeadlines,
  type AdConfig,
  type ContentDoc,
  type SourceRef,
} from '../../shared/content.js';
import { clusterRecent } from '../../shared/board.js';
import type { NewsItem } from '../../shared/types';
import type { PagesContext } from '../env.js';
import { docKey, readDoc, readIndex, rememberIndex, rememberIndexMany, readValue, writeDoc, writeValue, type ContentEnv, type SavedDoc } from './store.js';

const FRESH_MS: Record<ContentDoc['kind'], number> = {
  digest: 6 * 60 * 60 * 1000,
  analysis: 12 * 60 * 60 * 1000,
  weekly: 6 * 24 * 60 * 60 * 1000,
};

function envOf(context: PagesContext): ContentEnv {
  return context.env as ContentEnv;
}

function siteUrl(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

function envString(env: ContentEnv, ...names: string[]): string {
  for (const name of names) {
    const value = env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/**
 * AdSense for the column pages. The loader script (with the client id) is always on the page,
 * so Auto ads work once enabled in AdSense. Manual units only render when a slot id is set as
 * a Pages environment variable; there is no slot id in the repo.
 */
export function adConfig(env: ContentEnv): AdConfig {
  const top = envString(env, 'AD_SLOT_TOP', 'VITE_AD_SLOT_TOP');
  return {
    client: envString(env, 'VITE_GOOGLE_AD_CLIENT', 'GOOGLE_AD_CLIENT') || 'ca-pub-8392975944327076',
    top,
    mid: envString(env, 'AD_SLOT_MID', 'VITE_AD_SLOT_FEED', 'AD_SLOT_FEED'),
    bottom: envString(env, 'AD_SLOT_BOTTOM', 'VITE_AD_SLOT_BOTTOM') || top,
  };
}

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400',
};

async function page(doc: ContentDoc, canonical: string, env: ContentEnv, status = 200): Promise<Response> {
  const archive = await readIndex(env, doc.kind).catch(() => []);
  // Docs saved before the guard existed get the same deterministic pass when shown.
  const shown = doc.mode === 'ai' ? guardDoc(doc) : doc;
  return new Response(renderContentPage(shown, canonical, { ads: adConfig(env), archive }), { status, headers: HTML_HEADERS });
}

function emptyDoc(kind: ContentDoc['kind'], key: string, title: string): ContentDoc {
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

function callsKey(now = new Date()): string {
  return `ai-calls:${hktParts(now).date}`;
}

/** Reserves up to n model calls for today (HKT) in one read/write. Returns how many were granted. */
export async function reserveCalls(env: ContentEnv, n: number, now = new Date()): Promise<number> {
  const key = callsKey(now);
  const used = Number(await readValue(env, key) || '0');
  const granted = Math.max(0, Math.min(n, DAILY_AI_CALLS - used));
  if (granted > 0) await writeValue(env, key, String(used + granted));
  return granted;
}

async function allowModel(env: ContentEnv): Promise<boolean> {
  return (await reserveCalls(env, 1)) === 1;
}

async function runModel(env: ContentEnv, doc: ContentDoc, strict: boolean): Promise<ContentDoc | null> {
  if (!env.AI?.run) return null;
  try {
    const prompt = promptFor(doc, strict);
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      max_tokens: prompt.maxTokens,
    });
    return applyModelText(doc, textFromAi(result));
  } catch {
    return null;
  }
}

/**
 * One model call, plus one stricter retry if the reply was unusable (bad JSON, empty, or mostly
 * English). Both count against DAILY_AI_CALLS. `reserved` means the first call was already counted.
 */
async function polish(env: ContentEnv, doc: ContentDoc, reserved = false): Promise<ContentDoc> {
  if (!env.AI?.run) return doc;
  if (!reserved && !(await allowModel(env))) return doc;
  const first = await runModel(env, doc, false);
  if (first) return first;
  if (!(await allowModel(env))) return doc;
  return (await runModel(env, doc, true)) ?? doc;
}

interface RollupRow {
  title: string;
  url: string;
  source: string;
  category: string;
  at: string;
  image?: string;
}

async function rememberRollup(env: ContentEnv, items: NewsItem[], now = new Date()): Promise<void> {
  const raw = await readValue(env, 'rollup');
  let current: RollupRow[] = [];
  try {
    current = raw ? JSON.parse(raw) as RollupRow[] : [];
  } catch {
    current = [];
  }
  const cutoff = now.getTime() - 8 * 24 * 60 * 60 * 1000;
  const kept = current.filter((item) => {
    const at = Date.parse(item.at);
    return Number.isFinite(at) && at >= cutoff;
  }).slice(-300);
  const seen = new Set(kept.map((item) => item.url));
  for (const item of items.slice(0, 40)) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    kept.push({
      title: item.title,
      url: item.link,
      source: item.source,
      category: item.category || 'world',
      at: now.toISOString(),
      ...(item.image ? { image: item.image } : {}),
    });
  }
  await writeValue(env, 'rollup', JSON.stringify(kept.slice(-300)));
}

async function finish(env: ContentEnv, doc: ContentDoc, reserved = false, index = true): Promise<ContentDoc> {
  const polished = await polish(env, doc, reserved);
  if (polished.mode === 'ai') {
    await writeDoc(env, polished, index);
    return polished;
  }
  const existing = await readDoc(env, docKey(doc.kind, doc.key));
  if (existing?.doc.mode === 'ai') {
    if (index) await rememberIndex(env, existing.doc);
    return existing.doc;
  }
  await writeDoc(env, polished, index);
  return polished;
}

async function loadClusters(): Promise<{ items: NewsItem[]; clusters: ReturnType<typeof clusterRecent> }> {
  const news = await getNews();
  // Generate stays on the newest window so a model run does not cluster the whole board.
  const clusters = clusterRecent(news.items);
  return { items: news.items, clusters };
}

export async function buildDigest(env: ContentEnv, key: string, now = new Date()): Promise<ContentDoc> {
  const { items, clusters } = await loadClusters();
  const doc = digestFromClusters(clusters.filter((cluster) => cluster.count >= 2), key, now);
  await rememberRollup(env, items, now);
  return doc;
}

export async function buildAnalysis(_env: ContentEnv, slug: string, now = new Date()): Promise<ContentDoc | null> {
  const { clusters } = await loadClusters();
  const cluster = clusters.find((item) => analysisEligible(item) && analysisSlug(item.lead.title) === slug);
  if (!cluster) return null;
  return analysisFromCluster(cluster, now);
}

export async function buildWeekly(env: ContentEnv, key: string, now = new Date()): Promise<ContentDoc> {
  const raw = await readValue(env, 'rollup');
  let rollup: RollupRow[] = [];
  try {
    rollup = raw ? JSON.parse(raw) as RollupRow[] : [];
  } catch {
    rollup = [];
  }
  const pick = (category: string): SourceRef[] => rollup
    .filter((item) => item.category === category)
    .slice(-8)
    .map((item) => ({ title: item.title, url: item.url, source: item.source, category: item.category, ...(item.image ? { image: item.image } : {}) }));
  let tech = pick('tech');
  let business = pick('business');
  if (!tech.length || !business.length) {
    const { items } = await loadClusters();
    const fromNews = (category: string): SourceRef[] => items
      .filter((item) => item.category === category)
      .slice(0, 8)
      .map((item) => ({ title: item.title, url: item.link, source: item.source, excerpt: item.excerpt, category: item.category, ...(item.image ? { image: item.image } : {}), pubDate: item.pubDate }));
    if (!tech.length) tech = fromNews('tech');
    if (!business.length) business = fromNews('business');
  }
  return weeklyFromHeadlines(tech, business, key, now);
}

function freshEnough(saved: SavedDoc, kind: ContentDoc['kind']): boolean {
  return Date.now() - saved.savedAt < FRESH_MS[kind];
}

async function respondWithCache(
  context: PagesContext,
  kind: ContentDoc['kind'],
  key: string,
  canonical: string,
  build: () => Promise<ContentDoc | null>,
  allowBuild: boolean,
): Promise<Response> {
  const env = envOf(context);
  const saved = await readDoc(env, docKey(kind, key));
  if (saved && freshEnough(saved, kind)) return page(saved.doc, canonical, env);
  if (saved) {
    if (allowBuild) context.waitUntil(build().then((doc) => (doc ? finish(env, doc) : undefined)).catch(() => undefined));
    return page(saved.doc, canonical, env);
  }
  if (!allowBuild) {
    return page(emptyDoc(kind, key, '未有這一期'), canonical, env, 404);
  }
  try {
    const doc = await build();
    if (!doc) return page(emptyDoc(kind, key, '未有這一則'), canonical, env, 404);
    await writeDoc(env, doc);
    context.waitUntil(finish(env, doc).catch(() => undefined));
    return page(doc, canonical, env);
  } catch {
    return page(emptyDoc(kind, key, '暫時未能整理'), canonical, env);
  }
}

export async function serveDigest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = envOf(context);
  const url = new URL(context.request.url);
  const edition = url.pathname.split('/').filter(Boolean)[1] || slotId();
  if (!/^\d{4}-\d{2}-\d{2}-(am|pm)$/.test(edition)) {
    return page(emptyDoc('digest', edition, '未有這一期'), `${siteUrl(env)}/digest/`, env, 404);
  }
  const canonical = `${siteUrl(env)}/digest/${edition}`;
  return respondWithCache(context, 'digest', edition, canonical, () => buildDigest(env, edition), recentSlots().includes(edition));
}

export async function serveAnalysis(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = envOf(context);
  const url = new URL(context.request.url);
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
  const canonical = `${siteUrl(env)}/analysis/${encodeURIComponent(slug)}`;
  if (!/-[0-9a-f]{12}$/.test(slug)) return page(emptyDoc('analysis', slug, '未有這則分析'), canonical, env, 404);
  return respondWithCache(context, 'analysis', slug, canonical, () => buildAnalysis(env, slug), true);
}

export async function serveAnalysisIndex(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = envOf(context);
  const entries = await readIndex(env, 'analysis').catch(() => []);
  return new Response(renderAnalysisIndex(entries, `${siteUrl(env)}/analysis/`, { ads: adConfig(env) }), { headers: HTML_HEADERS });
}

export async function serveWeekly(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = envOf(context);
  const url = new URL(context.request.url);
  const edition = url.pathname.split('/').filter(Boolean)[1] || weeklyEdition();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edition)) {
    return page(emptyDoc('weekly', edition, '未有這一週'), `${siteUrl(env)}/weekly/`, env, 404);
  }
  const canonical = `${siteUrl(env)}/weekly/${edition}`;
  return respondWithCache(context, 'weekly', edition, canonical, () => buildWeekly(env, edition), edition === weeklyEdition());
}

export async function warm(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = envOf(context);
  const header = context.request.headers.get('x-generate-secret');
  const secret = typeof env.GENERATE_SECRET === 'string' ? env.GENERATE_SECRET : '';
  if (!secret || header !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  const url = new URL(context.request.url);
  const kind = url.searchParams.get('kind') || 'digest';
  try {
    if (kind === 'weekly') {
      const key = weeklyEdition();
      const doc = await finish(env, await buildWeekly(env, key));
      return Response.json({ ok: true, kind, key, mode: doc.mode });
    }
    if (kind === 'analysis') {
      // `count` lowers the run size for manual tests. The scheduled workflow still sends the old
      // `limit=3`, which is ignored on purpose so the schedule gets ANALYSIS_PER_RUN without a workflow edit.
      const requested = Number(url.searchParams.get('count') || ANALYSIS_PER_RUN);
      const limit = Math.max(1, Math.min(ANALYSIS_PER_RUN, Number.isFinite(requested) ? requested : ANALYSIS_PER_RUN));
      const { clusters } = await loadClusters();
      const picked = pickAnalysisClusters(clusters, limit);
      // Reserve the first call for every piece up front, then run them in parallel so a run of six
      // finishes in one model round-trip instead of six.
      const granted = await reserveCalls(env, picked.length);
      const docs = await Promise.all(picked.map((cluster, index) => finish(env, analysisFromCluster(cluster), index < granted, false)
        .catch(() => null)));
      const done = docs.filter((doc): doc is ContentDoc => doc !== null);
      await rememberIndexMany(env, done);
      return Response.json({
        ok: true,
        kind,
        granted,
        keys: done.map((doc) => doc.key),
        modes: done.map((doc) => doc.mode),
      });
    }
    const key = slotId();
    const doc = await finish(env, await buildDigest(env, key));
    return Response.json({ ok: true, kind: 'digest', key, mode: doc.mode, hkt: doc.hkt });
  } catch {
    const saved = await readDoc(env, docKey(kind === 'weekly' ? 'weekly' : 'digest', kind === 'weekly' ? weeklyEdition() : slotId()));
    if (saved) return Response.json({ ok: true, stale: true, key: saved.doc.key, mode: saved.doc.mode });
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
