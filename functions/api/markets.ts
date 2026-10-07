import { loadMarketTicks } from '../../server/marketService.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 600;

/** /api/markets: FX, gold and Brent. Edge cache about 10 minutes. Failures are not cached. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/markets-cache-v1');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const ticks = await loadMarketTicks();
  const ok = ticks.length > 0;
  const response = Response.json({ ticks }, {
    headers: { 'cache-control': `public, max-age=${ok ? 300 : 30}, s-maxage=${ok ? TTL : 30}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
