import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { boardIsFresh, computeBoard, type BoardSnapshot } from '../../shared/board.js';
import type { ContentEnv } from '../content/store.js';
import { loadList } from '../board/list.js';
import { claimBoardLock, readBoard, writeBoard } from '../board/store.js';
import type { PagesContext } from '../env.js';

const EMPTY: BoardSnapshot = {
  savedAt: 0,
  clusters: [],
  counts: {},
  banner: null,
  timeline: [],
  headlines: [],
};

/**
 * Rebuilds clusters and the major timeline off the request path that renders pages.
 * News, crawl, and a cold reader schedule this with waitUntil. A fresh snapshot
 * returns without clustering.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const saved = await readBoard(env);
  if (boardIsFresh(saved)) {
    return Response.json(saved, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
  }
  if (!(await claimBoardLock(env))) {
    return Response.json(saved ?? EMPTY, {
      headers: { 'cache-control': saved ? 'public, max-age=30, s-maxage=60' : 'no-store' },
    });
  }
  const items = await loadList(context);
  if (!items.length) {
    return Response.json(saved ?? EMPTY, { headers: { 'cache-control': 'no-store' } });
  }
  const snapshot = computeBoard(items);
  await writeBoard(env, snapshot);
  return Response.json(snapshot, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
}
