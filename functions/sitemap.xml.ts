import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { briefingPublic, explainerCurrent, hktParts, type IndexEntry } from '../shared/content.js';
import { DATA_HUB, DATA_PAGES } from '../shared/dataSeries.js';
import { angleClusters } from '../shared/angles.js';
import { materialFromBoard } from '../shared/grok.js';
import { heritagePublicPaths } from '../shared/heritagePage.js';
import { buildToday, indexableTodayPaths, onHktDate, TODAY_INDEX_FLOOR } from '../shared/todayPage.js';
import { readBoard } from './board/store.js';
import { indexableEntries } from './content/mustRead.js';
import { docKey, readDoc, readIndex, type ContentEnv } from './content/store.js';
import { publicTopicPaths } from './content/topics.js';
import type { PagesContext } from './env.js';

function entry(loc: string, lastmod: string, freq: string, priority: string): string {
  const day = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${day}\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

const LEGAL: [string, string, string][] = [
  ['https://world-news.xyz/about/', 'yearly', '0.5'],
  ['https://world-news.xyz/privacy/', 'yearly', '0.5'],
  ['https://world-news.xyz/terms/', 'yearly', '0.4'],
  ['https://world-news.xyz/contact/', 'yearly', '0.4'],
];

/**
 * Static sitemap plus saved AI columns.
 * Thin headline pages are omitted. The board is read only to decide which /today/ lists are indexable.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const assets = context.env.ASSETS as { fetch(request: Request): Promise<Response> } | undefined;
  const base = assets ? await assets.fetch(context.request).then((r) => r.text()).catch(() => '') : '';
  const env = context.env as ContentEnv;
  const [analysis, digest, weekly, briefing, compare] = await Promise.all([
    readIndex(env, 'analysis').catch(() => []),
    readIndex(env, 'digest').catch(() => []),
    readIndex(env, 'weekly').catch(() => []),
    readIndex(env, 'briefing').catch(() => []),
    readIndex(env, 'compare').catch(() => []),
  ]);
  const explainers = await currentExplainers(env, compare);
  const briefings = await currentBriefings(env, briefing);
  const [analysisPub, digestPub, weeklyPub] = await Promise.all([
    indexableEntries(env, 'analysis', analysis),
    indexableEntries(env, 'digest', digest),
    indexableEntries(env, 'weekly', weekly),
  ]);
  const legal = LEGAL
    .filter(([loc]) => !base.includes(loc))
    .map(([loc, freq, priority]) => entry(loc, '2026-10-07', freq, priority))
    .join('');
  const extra = [
    ...analysisPub.map((row) => entry(`https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
    ...digestPub.map((row) => entry(`https://world-news.xyz/digest/${row.key}`, row.publishedAt, 'weekly', '0.5')),
    ...weeklyPub.map((row) => entry(`https://world-news.xyz/weekly/${row.key}`, row.publishedAt, 'monthly', '0.5')),
    ...briefings.map((row) => entry(`https://world-news.xyz/briefing/${row.key}`, row.publishedAt, 'daily', '0.7')),
    ...explainers.map((row) => entry(`https://world-news.xyz/explainer/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
  ].join('');
  const major = base.includes('/major/') ? '' : entry('https://world-news.xyz/major/', new Date().toISOString(), 'hourly', '0.8');
  const dataLocs: [string, string, string][] = [
    [`https://world-news.xyz${DATA_HUB.path}`, 'daily', '0.6'],
    ...DATA_PAGES.map((page) => [`https://world-news.xyz${page.path}`, 'daily', '0.6'] as [string, string, string]),
  ];
  const data = dataLocs
    .filter(([loc]) => !base.includes(loc))
    .map(([loc, freq, priority]) => entry(loc, '2026-10-07', freq, priority))
    .join('');
  const topics = (await publicTopicPaths(env).catch(() => []))
    .filter((row) => !base.includes(`https://world-news.xyz/topic/${row.slug}/`))
    .map((row) => entry(`https://world-news.xyz/topic/${row.slug}/`, row.updatedAt, 'daily', '0.7'))
    .join('');
  const topicIndex = base.includes('https://world-news.xyz/topic/')
    ? ''
    : entry('https://world-news.xyz/topic/', new Date().toISOString(), 'daily', '0.7');
  const heritage = heritagePublicPaths()
    .filter((path) => !base.includes(`https://world-news.xyz${path}`))
    .map((path) => entry(`https://world-news.xyz${path}`, '2026-10-09', path.includes('/landmarks/') ? 'monthly' : 'daily', path === '/hk/landmarks/' || path === '/on-this-day/' ? '0.7' : '0.6'))
    .join('');
  const today = (await todayLocs(env))
    .filter((path) => !base.includes(`https://world-news.xyz${path}`))
    .map((path) => entry(`https://world-news.xyz${path}`, new Date().toISOString(), 'daily', path === '/today/' ? '0.7' : '0.5'))
    .join('');
  const xml = base.includes('</urlset>')
    ? base.replace('</urlset>', `${major}${legal}${data}${heritage}${today}${topicIndex}${topics}${extra}</urlset>`)
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${major}${legal}${data}${heritage}${today}${topicIndex}${topics}${extra}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}

/** Briefings under the floor stay out of the sitemap. */
async function currentBriefings(env: ContentEnv, rows: IndexEntry[]): Promise<IndexEntry[]> {
  const saved = await Promise.all(rows.map((row) => readDoc(env, docKey('briefing', row.key)).catch(() => null)));
  return rows.filter((_row, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && briefingPublic(doc));
  });
}

/** Old-format comparisons stay out of the sitemap until they are rewritten. */
async function currentExplainers(env: ContentEnv, rows: IndexEntry[]): Promise<IndexEntry[]> {
  const saved = await Promise.all(rows.map((row) => readDoc(env, docKey('compare', row.key)).catch(() => null)));
  return rows.filter((_row, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && explainerCurrent(doc));
  });
}

/** /today/ plus the day it shows, and only region or category lists with enough stories to be indexed. */
async function todayLocs(env: ContentEnv): Promise<string[]> {
  const board = await readBoard(env).catch(() => null);
  const items = materialFromBoard(board)?.items ?? [];
  if (!items.length) return ['/today/'];
  const date = hktParts(new Date()).date;
  const build = (day: string) => buildToday({ clusters: angleClusters(items.filter((item) => onHktDate(item, day))), date: day, today: day === date });
  let model = build(date);
  if (model.stories.length < TODAY_INDEX_FLOOR) {
    const previous = build(hktParts(new Date(Date.now() - 24 * 60 * 60 * 1000)).date);
    if (previous.stories.length > model.stories.length) model = previous;
  }
  return indexableTodayPaths(model);
}
