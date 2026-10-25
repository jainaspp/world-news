import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { clusterFromSnapshot, clusterRecent } from '../../shared/board.js';
import { relatedItems, renderStoryMissing, renderStoryPage } from '../../shared/storyPage.js';
import { loadList, loadSourceBlurbs } from '../board/list.js';
import type { NewsItem } from '../../shared/types.js';
import { readBoard, scheduleBoard } from '../board/store.js';
import type { ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const id = url.pathname.split('/').filter(Boolean)[1] || '';
  const canonical = `https://world-news.xyz/story/${encodeURIComponent(id)}/`;
  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=300',
    'x-robots-tag': 'noindex, follow',
  };
  const missing = {
    'content-type': headers['content-type'],
    'cache-control': 'no-store',
    'x-robots-tag': headers['x-robots-tag'],
  };
  if (!/^[0-9a-f]{6,16}$/.test(id)) return new Response(renderStoryMissing(canonical), { status: 404, headers: missing });
  const items = await loadList(context);
  const item = items.find((row) => row.id === id);
  if (!item) return new Response(renderStoryMissing(canonical), { status: 404, headers: missing });
  const snapshot = await readBoard(context.env as ContentEnv);
  // A stored board already clustered the full list. Otherwise only the newest 100.
  const cluster = snapshot
    ? clusterFromSnapshot(snapshot, id, items)
    : clusterRecent(items).find((row) => row.items.some((member) => member.id === id)) ?? null;
  if (!snapshot) scheduleBoard(context);
  const coverage = cluster?.items ?? [item];
  const blurbs = await loadSourceBlurbs(context, [...new Set(coverage.map((row) => row.source))]);
  const stamp = (row: NewsItem): NewsItem => {
    const excerpt = blurbs.get(row.id);
    return excerpt ? { ...row, excerpt } : row;
  };
  const stamped = stamp(item);
  const stampedCluster = cluster ? { ...cluster, lead: stamp(cluster.lead), items: cluster.items.map(stamp) } : null;
  return new Response(renderStoryPage(stamped, stampedCluster, relatedItems(item, cluster, items), canonical), { headers });
}
