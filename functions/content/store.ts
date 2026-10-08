import { edgeCache } from '../env.js';
import { mergeIndex, type ContentDoc, type IndexEntry } from '../../shared/content.js';

export interface ContentEnv {
  CONTENT?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  GENERATE_SECRET?: string;
  XAI_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  VITE_AD_SLOT_TOP?: string;
  AD_SLOT_TOP?: string;
  AD_SLOT_MID?: string;
  AD_SLOT_BOTTOM?: string;
  VITE_AD_SLOT_FEED?: string;
  VITE_GOOGLE_AD_CLIENT?: string;
  VITE_SITE_URL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TELEGRAM_CHANNEL_URL?: string;
  [key: string]: unknown;
}

export interface SavedDoc {
  doc: ContentDoc;
  savedAt: number;
}

const memory = new Map<string, string>();

/**
 * Keys that are only caches (article text, cited-page titles, shared research, rejected drafts,
 * the Workers AI call counter, the board rebuild lock). They live in memory and the edge cache,
 * never in KV: the free plan allows 1,000 KV puts a day and these were most of them.
 */
const EPHEMERAL_PREFIXES = ['article:', 'article2:', 'article3:', 'title:', 'research:', 'research-index:', 'rejected:', 'ai-calls:', 'board:lock'];

export function isEphemeralKey(key: string): boolean {
  return EPHEMERAL_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function cacheKey(key: string): Request {
  return new Request(`https://world-news.xyz/content-store/${encodeURIComponent(key)}`);
}

async function readCached(key: string): Promise<string | null> {
  const hit = memory.get(key);
  if (hit) return hit;
  const cache = edgeCache();
  if (!cache) return null;
  try {
    const response = await cache.match(cacheKey(key));
    return response ? response.text() : null;
  } catch {
    return null;
  }
}

export async function readValue(env: ContentEnv, key: string): Promise<string | null> {
  if (isEphemeralKey(key)) {
    const cached = await readCached(key);
    if (cached) return cached;
  }
  if (env.CONTENT) {
    try {
      const value = await env.CONTENT.get(key);
      if (value) return value;
    } catch {
      /* try the cache */
    }
  }
  return isEphemeralKey(key) ? null : readCached(key);
}

/** Until the next 00:00 UTC (when the KV daily write quota resets). */
function secondsToUtcMidnight(now = Date.now()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(60, Math.ceil((next.getTime() - now) / 1000));
}

let kvBlockedUntil = 0;
const KV_LIMIT_FLAG = new Request('https://world-news.xyz/content-store/__kv-write-limit');

export function isKvLimitError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /429|limit|quota|exceeded|too many/i.test(text);
}

/** Called when a KV put fails with the daily limit: later puts are skipped until 00:00 UTC. */
export async function markKvWriteLimited(now = Date.now()): Promise<void> {
  const ttl = secondsToUtcMidnight(now);
  kvBlockedUntil = now + ttl * 1000;
  console.warn(`KV put limit reached; skipping KV writes for ${ttl}s`);
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(KV_LIMIT_FLAG, new Response(String(kvBlockedUntil), { headers: { 'cache-control': `public, max-age=${ttl}` } }));
  } catch {
    /* best effort */
  }
}

/** True after a KV put hit the daily limit (this isolate, or this data center via the edge cache). */
export async function kvWritesBlocked(now = Date.now()): Promise<boolean> {
  if (kvBlockedUntil > now) return true;
  const cache = edgeCache();
  if (!cache) return false;
  try {
    const hit = await cache.match(KV_LIMIT_FLAG);
    if (!hit) return false;
    const until = Number(await hit.text());
    if (Number.isFinite(until) && until > now) {
      kvBlockedUntil = until;
      return true;
    }
  } catch {
    /* no flag */
  }
  return false;
}

/** Test hook. */
export function resetKvWriteState(): void {
  kvBlockedUntil = 0;
  memory.clear();
}

/**
 * Writes memory and the edge cache always; KV only for durable keys, only when the value changed,
 * and never after the daily put limit was hit. A failed put is logged, never thrown.
 * Returns false when a durable key could not reach KV.
 */
export async function writeValue(env: ContentEnv, key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  memory.set(key, value);
  let stored = true;
  if (env.CONTENT && !isEphemeralKey(key)) {
    if (await kvWritesBlocked()) {
      stored = false;
    } else {
      let same = false;
      try {
        same = (await env.CONTENT.get(key)) === value;
      } catch {
        same = false;
      }
      if (!same) {
        try {
          await env.CONTENT.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
        } catch (error) {
          stored = false;
          if (isKvLimitError(error)) await markKvWriteLimited();
          else console.warn(`KV put failed for ${key.split(':')[0]}`);
        }
      }
    }
  }
  const cache = edgeCache();
  if (!cache) return stored;
  const maxAge = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : 604800;
  try {
    await cache.put(cacheKey(key), new Response(value, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${maxAge}` },
    }));
  } catch {
    /* best effort */
  }
  return stored;
}

/**
 * One durable KV put through writeValue. A 429, the daily block, or any other miss returns `failed`
 * and is not retried. `unbound` when CONTENT is missing.
 */
export async function putLimited(env: ContentEnv, key: string, value: string, ttlSeconds?: number): Promise<'ok' | 'failed' | 'unbound'> {
  if (!env.CONTENT) return 'unbound';
  const stored = await writeValue(env, key, value, ttlSeconds);
  if (!stored) {
    console.error(`CONTENT put skipped for ${key}`);
    return 'failed';
  }
  return 'ok';
}

export async function readDoc(env: ContentEnv, key: string): Promise<SavedDoc | null> {
  const raw = await readValue(env, `doc:${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedDoc;
    if (!parsed?.doc?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDoc(env: ContentEnv, doc: ContentDoc, index = true): Promise<void> {
  const saved: SavedDoc = { doc, savedAt: Date.now() };
  await writeValue(env, `doc:${doc.kind}:${doc.key}`, JSON.stringify(saved));
  if (index) await rememberIndex(env, doc);
}

export async function rememberIndex(env: ContentEnv, doc: ContentDoc): Promise<void> {
  await rememberIndexMany(env, [doc]);
}

const INDEX_LIMIT: Record<ContentDoc['kind'], number> = {
  digest: 40,
  analysis: 40,
  weekly: 40,
  briefing: 186,
  compare: 80,
};

/** One read and one write for several docs of the same kind (parallel writers would lose rows). */
export async function rememberIndexMany(env: ContentEnv, docs: ContentDoc[]): Promise<void> {
  const rows = docs.filter((doc) => doc.blocks.length);
  const kind = rows[0]?.kind;
  if (!kind) return;
  let index = await readIndex(env, kind);
  for (const doc of rows) if (doc.kind === kind) index = mergeIndex(index, doc, INDEX_LIMIT[kind]);
  await writeValue(env, indexKey(kind), JSON.stringify(index));
}

export function indexKey(kind: ContentDoc['kind']): string {
  return `index:${kind}`;
}

/** Archive list for a column, newest first. Built up by writeDoc; empty until the next write. */
export async function readIndex(env: ContentEnv, kind: ContentDoc['kind']): Promise<IndexEntry[]> {
  const raw = await readValue(env, indexKey(kind));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as IndexEntry[];
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.key === 'string') : [];
  } catch {
    return [];
  }
}

export function docKey(kind: ContentDoc['kind'], key: string): string {
  return `${kind}:${key}`;
}
