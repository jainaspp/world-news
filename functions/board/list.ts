import { getNews } from '../../server/newsService.js';
import { shardPartsForLabels } from '../../shared/feeds.js';
import type { NewsItem } from '../../shared/types.js';
import { edgeCache, type PagesContext } from '../env.js';

async function fetchNews(context: PagesContext, path: string): Promise<NewsItem[] | null> {
  try {
    const response = await fetch(new URL(path, context.request.url).href, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { items?: NewsItem[] };
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return null;
  }
}

/** Slim headline list. Production reads `/api/news` so this invocation does not parse RSS. */
export async function loadList(context: PagesContext): Promise<NewsItem[]> {
  if (edgeCache()) return (await fetchNews(context, '/api/news')) ?? [];
  const news = await getNews().catch(() => null);
  return news?.items ?? [];
}

/**
 * Blurbs for one story. Each outlet is one shard (`?part=&body=1`); the public list stays slim.
 * A missed shard leaves that outlet title-only.
 */
export async function loadSourceBlurbs(context: PagesContext, sources: string[]): Promise<Map<string, string>> {
  const blurbs = new Map<string, string>();
  if (!edgeCache() || sources.length === 0) return blurbs;
  const parts = shardPartsForLabels(sources);
  const batches = await Promise.all(parts.map((part) => fetchNews(context, `/api/news?part=${part}&body=1`)));
  for (const batch of batches) {
    for (const item of batch ?? []) {
      const excerpt = (item.excerpt || '').trim();
      if (excerpt) blurbs.set(item.id, excerpt);
    }
  }
  return blurbs;
}
