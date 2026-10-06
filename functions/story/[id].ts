import { getNews } from '../../server/newsService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { relatedItems, renderStoryMissing, renderStoryPage } from '../../shared/storyPage.js';
import { clusterStories } from '../../shared/trending.js';
import type { PagesContext } from '../env.js';

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').filter(Boolean)[1] || '';
  const canonical = `https://world-news.xyz/story/${encodeURIComponent(id)}/`;
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120, s-maxage=300' };
  if (!/^[0-9a-f]{6,16}$/.test(id)) return new Response(renderStoryMissing(canonical), { status: 404, headers });
  const news = await getNews().catch(() => null);
  const item = news?.items.find((row) => row.id === id);
  if (!news || !item) return new Response(renderStoryMissing(canonical), { status: 404, headers });
  const cluster = clusterStories(news.items).find((row) => row.items.some((member) => member.id === id)) ?? null;
  return new Response(renderStoryPage(item, cluster, relatedItems(item, cluster, news.items), canonical), { headers });
}
