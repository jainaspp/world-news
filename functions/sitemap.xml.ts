import type { PagesContext } from './env.js';
import { readIndex, type ContentEnv } from './content/store.js';

function entry(loc: string, lastmod: string, freq: string, priority: string): string {
  const day = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${day}\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

/** Static sitemap plus every saved AI analysis, digest and weekly edition from KV. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const assets = context.env.ASSETS as { fetch(request: Request): Promise<Response> } | undefined;
  const base = assets ? await assets.fetch(context.request).then((r) => r.text()).catch(() => '') : '';
  const env = context.env as ContentEnv;
  const [analysis, digest, weekly] = await Promise.all([
    readIndex(env, 'analysis').catch(() => []),
    readIndex(env, 'digest').catch(() => []),
    readIndex(env, 'weekly').catch(() => []),
  ]);
  const extra = [
    ...analysis.map((row) => entry(`https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
    ...digest.map((row) => entry(`https://world-news.xyz/digest/${row.key}`, row.publishedAt, 'weekly', '0.5')),
    ...weekly.map((row) => entry(`https://world-news.xyz/weekly/${row.key}`, row.publishedAt, 'monthly', '0.5')),
  ].join('');
  const xml = base.includes('</urlset>')
    ? base.replace('</urlset>', `${extra}</urlset>`)
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${extra}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}
