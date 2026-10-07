import { BOARD_KV_KEY, parseBoard, type BoardSnapshot } from '../../shared/board.js';
import { readValue, writeValue, type ContentEnv } from '../content/store.js';

const LOCK_KEY = 'board:lock';
const LOCK_MS = 60_000;

export async function readBoard(env: ContentEnv): Promise<BoardSnapshot | null> {
  const raw = await readValue(env, BOARD_KV_KEY).catch(() => null);
  return parseBoard(raw);
}

export async function writeBoard(env: ContentEnv, snapshot: BoardSnapshot): Promise<void> {
  await writeValue(env, BOARD_KV_KEY, JSON.stringify(snapshot));
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
