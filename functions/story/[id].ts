import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { clusterFromSnapshot, clusterRecent } from '../../shared/board.js';
import { relatedItems, renderStoryMissing, renderStoryPage } from '../../shared/storyPage.js';
import { loadList } from '../board/list.js';
import { readBoard, scheduleBoard } from '../board/store.js';
import type { ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').filter(Boolean)[1] || '';
  const canonical = `https://world-news.xyz/story/${encodeURIComponent(id)}/`;
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120, s-maxage=300' };
  if (!/^[0-9a-f]{6,16}$/.test(id)) return new Response(renderStoryMissing(canonical), { status: 404, headers });
  const items = await loadList(context);
  const item = items.find((row) => row.id === id);
  if (!item) return new Response(renderStoryMissing(canonical), { status: 404, headers });
  const snapshot = await readBoard(context.env as ContentEnv);
  // A stored board already clustered the full list. Otherwise only the newest 100.
  const cluster = snapshot
    ? clusterFromSnapshot(snapshot, id, items)
    : clusterRecent(items).find((row) => row.items.some((member) => member.id === id)) ?? null;
  if (!snapshot) scheduleBoard(context);
  return new Response(renderStoryPage(item, cluster, relatedItems(item, cluster, items), canonical), { headers });
}
