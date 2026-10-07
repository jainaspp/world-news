import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { clusterCards } from '../../shared/angles.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 300;

/** /api/clusters: multi-outlet story groups. Kept off /api/news so the list stays slim. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/clusters-cache-v1');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const news = await getNews().catch(() => null);
  const clusters = clusterCards(news?.items ?? []);
  const ok = clusters.length > 0;
  const response = Response.json({ clusters }, {
    headers: { 'cache-control': `public, max-age=${ok ? 120 : 30}, s-maxage=${ok ? TTL : 60}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
