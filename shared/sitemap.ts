import type { NewsItem } from './types.js';

/** Freshest story pages. The news list is already a rolling window, so a few hundred is enough. */
export const STORY_SITEMAP_LIMIT = 300;

function entry(loc: string, lastmod: string, freq: string, priority: string): string {
  const day = lastmod && !Number.isNaN(Date.parse(lastmod)) ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${day}\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

/** `/story/<id>/` rows for ids the story function will actually render. Newest first. */
export function storySitemapEntries(items: NewsItem[], limit = STORY_SITEMAP_LIMIT): string {
  const time = (item: NewsItem) => {
    const parsed = Date.parse(item.pubDate || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const sorted = items
    .filter((item) => /^[0-9a-f]{6,16}$/.test(item.id))
    .sort((a, b) => time(b) - time(a));
  const seen = new Set<string>();
  const picked: NewsItem[] = [];
  for (const item of sorted) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
    if (picked.length >= limit) break;
  }
  return picked
    .map((item) => entry(`https://world-news.xyz/story/${item.id}/`, item.pubDate || '', 'daily', '0.5'))
    .join('');
}
