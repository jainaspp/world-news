import { getNews } from '../server/newsService.js';
import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { storySitemapEntries } from '../shared/sitemap.js';
import type { NewsItem } from '../shared/types.js';
import { readIndex, type ContentEnv } from './content/store.js';
import { edgeCache, type PagesContext } from './env.js';

function entry(loc: string, lastmod: string, freq: string, priority: string): string {
  const day = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${day}\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

/** Ids currently on `/api/news`. A self-fetch deadlocks local wrangler, so that path uses getNews(). */
async function storyItems(context: PagesContext): Promise<NewsItem[]> {
  if (edgeCache()) {
    try {
      const response = await fetch(new URL('/api/news', context.request.url).href, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const payload = await response.json() as { items?: NewsItem[] };
        return Array.isArray(payload.items) ? payload.items : [];
      }
    } catch {
      /* list cache missed; try the in-process news cache below */
    }
  }
  const news = await getNews().catch(() => null);
  return news?.items ?? [];
}

/** Static sitemap, saved AI columns, and recent /story/<id>/ pages. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const assets = context.env.ASSETS as { fetch(request: Request): Promise<Response> } | undefined;
  const base = assets ? await assets.fetch(context.request).then((r) => r.text()).catch(() => '') : '';
  const env = context.env as ContentEnv;
  const [analysis, digest, weekly, stories] = await Promise.all([
    readIndex(env, 'analysis').catch(() => []),
    readIndex(env, 'digest').catch(() => []),
    readIndex(env, 'weekly').catch(() => []),
    storyItems(context).catch(() => [] as NewsItem[]),
  ]);
  const extra = [
    ...analysis.map((row) => entry(`https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
    ...digest.map((row) => entry(`https://world-news.xyz/digest/${row.key}`, row.publishedAt, 'weekly', '0.5')),
    ...weekly.map((row) => entry(`https://world-news.xyz/weekly/${row.key}`, row.publishedAt, 'monthly', '0.5')),
  ].join('') + storySitemapEntries(stories);
  const major = base.includes('/major/') ? '' : entry('https://world-news.xyz/major/', new Date().toISOString(), 'hourly', '0.8');
  const xml = base.includes('</urlset>')
    ? base.replace('</urlset>', `${major}${extra}</urlset>`)
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${major}${extra}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}
