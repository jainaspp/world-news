import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { readIndex, type ContentEnv } from './content/store.js';
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
  const legal = LEGAL
    .filter(([loc]) => !base.includes(loc))
    .map(([loc, freq, priority]) => entry(loc, '2026-10-07', freq, priority))
    .join('');
  const extra = [
    ...analysis.map((row) => entry(`https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
    ...digest.map((row) => entry(`https://world-news.xyz/digest/${row.key}`, row.publishedAt, 'weekly', '0.5')),
    ...weekly.map((row) => entry(`https://world-news.xyz/weekly/${row.key}`, row.publishedAt, 'monthly', '0.5')),
    ...briefing.map((row) => entry(`https://world-news.xyz/briefing/${row.key}`, row.publishedAt, 'daily', '0.7')),
    ...compare.map((row) => entry(`https://world-news.xyz/explainer/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
  ].join('');
  const major = base.includes('/major/') ? '' : entry('https://world-news.xyz/major/', new Date().toISOString(), 'hourly', '0.8');
  const xml = base.includes('</urlset>')
    ? base.replace('</urlset>', `${major}${legal}${extra}</urlset>`)
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${major}${legal}${extra}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}
