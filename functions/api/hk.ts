import { loadHkBundle } from '../../server/hkService.js';
import { emptyHkNow } from '../../shared/hk.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 600;

/** /api/hk: HKO current weather, forecast detail and EPD AQHI, cached at the edge for 10 minutes. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/hk-cache-v2');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const loaded = await loadHkBundle();
  const ok = loaded != null;
  const response = Response.json(loaded ?? emptyHkNow(), {
    headers: { 'cache-control': `public, max-age=${ok ? 300 : 30}, s-maxage=${ok ? TTL : 30}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
