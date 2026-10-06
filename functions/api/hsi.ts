import { loadHsiQuote } from '../../server/hsiService.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 600;

const EMPTY = { price: null, change: null, changePercent: null };

/** /api/hsi: Hang Seng Index, cached at the edge for 10 minutes. Failures are not cached. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/hsi-cache-v1');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;

  const quote = await loadHsiQuote();
  const ok = quote != null;
  const response = Response.json(ok ? quote : EMPTY, {
    headers: { 'cache-control': `public, max-age=${ok ? 300 : 30}, s-maxage=${ok ? TTL : 30}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
