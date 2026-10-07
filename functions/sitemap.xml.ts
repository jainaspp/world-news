import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { explainerCurrent, type IndexEntry } from '../shared/content.js';
import { DATA_HUB, DATA_PAGES } from '../shared/dataSeries.js';
import { docKey, readDoc, readIndex, type ContentEnv } from './content/store.js';
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
 * Thin headline pages are omitted so this handler does not load the news board.
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
  const legal = LEGAL
    .filter(([loc]) => !base.includes(loc))
    .map(([loc, freq, priority]) => entry(loc, '2026-10-07', freq, priority))
    .join('');
  const extra = [
    ...analysis.map((row) => entry(`https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
    ...digest.map((row) => entry(`https://world-news.xyz/digest/${row.key}`, row.publishedAt, 'weekly', '0.5')),
    ...weekly.map((row) => entry(`https://world-news.xyz/weekly/${row.key}`, row.publishedAt, 'monthly', '0.5')),
    ...briefing.map((row) => entry(`https://world-news.xyz/briefing/${row.key}`, row.publishedAt, 'daily', '0.7')),
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
  const xml = base.includes('</urlset>')
    ? base.replace('</urlset>', `${major}${legal}${data}${extra}</urlset>`)
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${major}${legal}${data}${extra}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}

/** Old-format comparisons stay out of the sitemap until they are rewritten. */
async function currentExplainers(env: ContentEnv, rows: IndexEntry[]): Promise<IndexEntry[]> {
  const saved = await Promise.all(rows.map((row) => readDoc(env, docKey('compare', row.key)).catch(() => null)));
  return rows.filter((_row, index) => {
    const doc = saved[index]?.doc;
    return Boolean(doc && explainerCurrent(doc));
  });
}
