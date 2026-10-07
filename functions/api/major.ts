import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { majorTimeline } from '../../shared/angles.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 180;

/** /api/major: the current banner story, if one fired in the last three hours. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/major-cache-v1');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const news = await getNews().catch(() => null);
  const { banner } = majorTimeline(news?.items ?? []);
  const response = Response.json({ banner }, {
    headers: { 'cache-control': `public, max-age=60, s-maxage=${TTL}` },
  });
  if (cache) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
