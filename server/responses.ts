import { isCronAuthorized } from './auth.js';
import { loadFeeds } from './loadFeeds.js';
import { clearNewsCache, getNews } from './newsService.js';
import { storeNews } from './supabase.js';

export interface JsonResult {
  status: number;
  body: string;
  cacheControl: string;
}

const JSON_CACHE = 'public, s-maxage=300, stale-while-revalidate=600';

function result(status: number, body: unknown, cacheControl: string): JsonResult {
  return { status, body: JSON.stringify(body), cacheControl };
}

function unavailable() {
  return {
    items: [],
    fetchedAt: new Date().toISOString(),
    source: 'rss' as const,
    feedErrors: 0,
    stale: false,
    error: '所有新聞來源暫時沒有回應',
  };
}

export async function buildNewsResponse(): Promise<JsonResult> {
  try {
    const payload = await getNews();
    const status = payload.items.length > 0 ? 200 : 503;
    return result(status, payload, status === 200 ? JSON_CACHE : 'no-store');
  } catch {
    return result(503, unavailable(), 'no-store');
  }
}

export async function buildCrawlResponse(method: string | undefined, authorization: string | undefined): Promise<JsonResult> {
  if (method !== 'GET' && method !== 'POST') {
    return result(405, { error: 'Method not allowed' }, 'no-store');
  }
  if (!isCronAuthorized(authorization)) {
    return result(401, { error: 'Unauthorized' }, 'no-store');
  }

  try {
    const { items, errors } = await loadFeeds();
    const saved = await storeNews(items);
    if ('error' in saved) {
      const status = saved.error.includes('not set') ? 503 : 502;
      return result(status, { fetched: items.length, feedErrors: errors, ...saved }, 'no-store');
    }
    clearNewsCache();
    return result(200, { fetched: items.length, feedErrors: errors, stored: saved.stored }, 'no-store');
  } catch {
    return result(503, { fetched: 0, feedErrors: 0, stored: 0, error: 'unavailable' }, 'no-store');
  }
}
