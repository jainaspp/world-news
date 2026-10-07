import { loadAlerts } from '../../server/alertService.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 300;

/** /api/alerts: active HKO warnings and MTR disruptions. Edge cache about 5 minutes. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/alerts-cache-v1');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const loaded = await loadAlerts();
  const ok = loaded.weatherOk || loaded.transportOk;
  const response = Response.json({ alerts: loaded.alerts }, {
    headers: { 'cache-control': `public, max-age=${ok ? 120 : 30}, s-maxage=${ok ? TTL : 30}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
