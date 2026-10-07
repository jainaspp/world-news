import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { loadSnapshot } from '../board/fallback.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 180;

/** /api/major: banner from the precomputed board, if one fired in the last three hours. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/major-cache-v2');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const snapshot = await loadSnapshot(context);
  const response = Response.json({ banner: snapshot?.banner ?? null }, {
    headers: { 'cache-control': `public, max-age=60, s-maxage=${TTL}` },
  });
  if (cache && snapshot) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
