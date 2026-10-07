import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { loadSnapshot } from '../board/fallback.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 300;

/** /api/clusters reads the precomputed board. It does not cluster the live list. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/clusters-cache-v2');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const snapshot = await loadSnapshot(context);
  const clusters = snapshot?.clusters ?? [];
  const ok = clusters.length > 0;
  const response = Response.json({ clusters }, {
    headers: { 'cache-control': `public, max-age=${ok ? 120 : 30}, s-maxage=${ok ? TTL : 60}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
