import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import {
  AI_MODEL,
  DAILY_AI_CALLS,
  analysisFromCluster,
  analysisSlug,
  applyModelText,
  digestFromClusters,
  formatHkt,
  hktParts,
  promptFor,
  recentSlots,
  renderContentPage,
  slotId,
  textFromAi,
  weeklyEdition,
  weeklyFromHeadlines,
  type ContentDoc,
  type SourceRef,
} from '../../shared/content.js';
import { clusterStories } from '../../shared/trending.js';
import type { NewsItem } from '../../shared/types';
import type { PagesContext } from '../env.js';
import { docKey, readDoc, readValue, writeDoc, writeValue, type ContentEnv, type SavedDoc } from './store.js';

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

function adSlot(env: ContentEnv): string {
  const slot = env.VITE_AD_SLOT_TOP || env.AD_SLOT_TOP || '';
  return typeof slot === 'string' ? slot.trim() : '';
}

function page(doc: ContentDoc, canonical: string, env: ContentEnv, status = 200): Response {
  const client = typeof env.VITE_GOOGLE_AD_CLIENT === 'string' && env.VITE_GOOGLE_AD_CLIENT.trim()
    ? env.VITE_GOOGLE_AD_CLIENT.trim()
    : 'ca-pub-8392975944327076';
  return new Response(renderContentPage(doc, canonical, adSlot(env), client), {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=86400',
    },
  });
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

async function allowModel(env: ContentEnv, now = new Date()): Promise<boolean> {
  const key = `ai-calls:${hktParts(now).date}`;
  const used = Number(await readValue(env, key) || '0');
  if (used >= DAILY_AI_CALLS) return false;
  await writeValue(env, key, String(used + 1));
  return true;
}

async function polish(env: ContentEnv, doc: ContentDoc): Promise<ContentDoc> {
  if (!env.AI?.run) return doc;
  if (!(await allowModel(env))) return doc;
  try {
    const prompt = promptFor(doc);
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      max_tokens: prompt.maxTokens,
    });
    return applyModelText(doc, textFromAi(result)) ?? doc;
  } catch {
    return doc;
  }
}

interface RollupRow {
  title: string;
  url: string;
  source: string;
  category: string;
  at: string;
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
    });
  }
  await writeValue(env, 'rollup', JSON.stringify(kept.slice(-300)));
}

async function finish(env: ContentEnv, doc: ContentDoc): Promise<ContentDoc> {
  const polished = await polish(env, doc);
  if (polished.mode === 'ai') {
    await writeDoc(env, polished);
    return polished;
  }
  const existing = await readDoc(env, docKey(doc.kind, doc.key));
  if (existing?.doc.mode === 'ai') return existing.doc;
  await writeDoc(env, polished);
  return polished;
}

async function loadClusters(): Promise<{ items: NewsItem[]; clusters: ReturnType<typeof clusterStories> }> {
  const news = await getNews();
  const clusters = clusterStories(news.items);
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
  const cluster = clusters.find((item) => item.count >= 3 && analysisSlug(item.lead.title) === slug);
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
    .map((item) => ({ title: item.title, url: item.url, source: item.source }));
  let tech = pick('tech');
  let business = pick('business');
  if (!tech.length || !business.length) {
    const { items } = await loadClusters();
    const fromNews = (category: string): SourceRef[] => items
      .filter((item) => item.category === category)
      .slice(0, 8)
      .map((item) => ({ title: item.title, url: item.link, source: item.source, excerpt: item.excerpt }));
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
      const limit = Math.min(3, Number(url.searchParams.get('limit') || '3'));
      const { clusters } = await loadClusters();
      const picked = clusters.filter((cluster) => cluster.count >= 3).slice(0, limit);
      const keys: string[] = [];
      for (const cluster of picked) {
        const slug = analysisSlug(cluster.lead.title);
        const draft = await buildAnalysis(env, slug);
        if (!draft) continue;
        await finish(env, draft);
        keys.push(slug);
      }
      return Response.json({ ok: true, kind, keys });
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
