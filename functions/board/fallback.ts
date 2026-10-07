import { boardIsFresh, computeBoard, newestItems, type BoardSnapshot } from '../../shared/board.js';
import type { ContentEnv } from '../content/store.js';
import { edgeCache, type PagesContext } from '../env.js';
import { loadList } from './list.js';
import { readBoard, scheduleBoard } from './store.js';

/**
 * Stored board when KV has one. Production does not cluster on this path.
 * Local dev (no Cache API) falls back to the newest 100 headlines only.
 */
export async function loadSnapshot(context: PagesContext): Promise<BoardSnapshot | null> {
  const saved = await readBoard(context.env as ContentEnv);
  if (edgeCache()) {
    if (!boardIsFresh(saved)) scheduleBoard(context);
    return saved;
  }
  const items = await loadList(context);
  if (!items.length) return null;
  return computeBoard(newestItems(items));
}
