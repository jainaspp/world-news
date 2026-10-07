import { readValue, type ContentEnv } from '../content/store.js';
import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { angleClusters } from '../../shared/angles.js';
import { buildPopular, emptyBook, hktDay, type ReadBook } from '../../shared/reads.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 60;

/** GET /api/popular: today's top reads, or freshest multi-outlet clusters when counts are thin. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const cache = edgeCache();
  const day = hktDay();
  const key = new Request(`https://world-news.xyz/api/popular-cache-v1?day=${day}`);
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;

  const env = context.env as ContentEnv;
  const raw = await readValue(env, `reads:${day}`).catch(() => null);
  let counts: Record<string, number> = {};
  if (raw) {
    try {
      const book = JSON.parse(raw) as ReadBook;
      counts = book.counts ?? emptyBook().counts;
    } catch {
      counts = {};
    }
  }
  const news = await getNews().catch(() => null);
  const items = news?.items ?? [];
  const rows = buildPopular(counts, items, angleClusters(items));
  const response = Response.json({ day, items: rows }, {
    headers: { 'cache-control': `public, max-age=30, s-maxage=${TTL}` },
  });
  if (cache && items.length) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
