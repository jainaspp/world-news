import { getNews } from '../../server/newsService.js';
import type { NewsItem } from '../../shared/types.js';
import { edgeCache, type PagesContext } from '../env.js';

/** Slim headline list. Production reads `/api/news` so this invocation does not parse RSS. */
export async function loadList(context: PagesContext): Promise<NewsItem[]> {
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
      return [];
    }
    return [];
  }
  const news = await getNews().catch(() => null);
  return news?.items ?? [];
}
