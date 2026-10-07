import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { majorTimeline } from '../../shared/angles.js';
import { renderMajorPage } from '../../shared/majorPage.js';
import type { PagesContext } from '../env.js';

const CANONICAL = 'https://world-news.xyz/major/';

/** /major/: 24-hour major-update timeline. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const news = await getNews().catch(() => null);
  const { timeline } = majorTimeline(news?.items ?? []);
  const html = renderMajorPage(timeline, CANONICAL);
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=180' },
  });
}
