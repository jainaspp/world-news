import { BOARD_KV_KEY, parseBoard, type BoardSnapshot } from '../../shared/board.js';
import { readValue, writeValue, type ContentEnv } from '../content/store.js';
import { edgeCache } from '../env.js';

const LOCK_KEY = 'board:lock';
const LOCK_MS = 60_000;

/** Edge-cache copy of the board (this data center). KV keeps a copy refreshed at most every 30 minutes. */
const LOCAL_BOARD = new Request('https://world-news.xyz/content-store/__board-local');
const KV_BOARD_EVERY_MS = 30 * 60 * 1000;

async function readLocalBoard(): Promise<BoardSnapshot | null> {
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(LOCAL_BOARD);
    return hit ? parseBoard(await hit.text()) : null;
  } catch {
    return null;
  }
}

async function readKvBoard(env: ContentEnv): Promise<BoardSnapshot | null> {
  return parseBoard(await readValue(env, BOARD_KV_KEY).catch(() => null));
}

/** The newer of the edge-cache board and the KV board. */
export async function readBoard(env: ContentEnv): Promise<BoardSnapshot | null> {
  const [local, stored] = await Promise.all([readLocalBoard(), readKvBoard(env)]);
  if (local && (!stored || local.savedAt > stored.savedAt)) return local;
  return stored;
}

/**
 * Every rebuild goes to the edge cache. KV (one put) only when its copy is 30+ minutes old,
 * so the board costs at most ~48 KV puts a day instead of two per rebuild.
 */
export async function writeBoard(env: ContentEnv, snapshot: BoardSnapshot): Promise<void> {
  const body = JSON.stringify(snapshot);
  const cache = edgeCache();
  if (cache) {
    try {
      await cache.put(LOCAL_BOARD, new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' } }));
    } catch {
      /* best effort */
    }
  }
  const stored = await readKvBoard(env);
  if (cache && stored && snapshot.savedAt - stored.savedAt < KV_BOARD_EVERY_MS) return;
  await writeValue(env, BOARD_KV_KEY, body);
}

/** True when this invocation should be the one to rebuild. Stops a stampede of full clusters. */
export async function claimBoardLock(env: ContentEnv, now = Date.now()): Promise<boolean> {
  const raw = await readValue(env, LOCK_KEY).catch(() => null);
  const held = Number(raw ?? '0');
  if (held && now - held < LOCK_MS) return false;
  await writeValue(env, LOCK_KEY, String(now));
  return true;
}

export function scheduleBoard(context: { request: Request; waitUntil: (promise: Promise<unknown>) => void }): void {
  const url = new URL('/api/board', context.request.url);
  context.waitUntil(fetch(url.href, { method: 'POST' }).catch(() => undefined));
}
