import { edgeCache } from '../env.js';
import { mergeIndex, type ContentDoc, type IndexEntry } from '../../shared/content.js';

export interface ContentEnv {
  CONTENT?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  GENERATE_SECRET?: string;
  VITE_AD_SLOT_TOP?: string;
  AD_SLOT_TOP?: string;
  AD_SLOT_MID?: string;
  AD_SLOT_BOTTOM?: string;
  VITE_AD_SLOT_FEED?: string;
  VITE_GOOGLE_AD_CLIENT?: string;
  VITE_SITE_URL?: string;
  [key: string]: unknown;
}

export interface SavedDoc {
  doc: ContentDoc;
  savedAt: number;
}

const memory = new Map<string, string>();

function cacheKey(key: string): Request {
  return new Request(`https://world-news.xyz/content-store/${encodeURIComponent(key)}`);
}

export async function readValue(env: ContentEnv, key: string): Promise<string | null> {
  if (env.CONTENT) {
    try {
      const value = await env.CONTENT.get(key);
      if (value) return value;
    } catch {
      /* try the cache */
    }
  }
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

export async function writeValue(env: ContentEnv, key: string, value: string): Promise<void> {
  memory.set(key, value);
  if (env.CONTENT) {
    try {
      await env.CONTENT.put(key, value);
    } catch {
      /* cache still holds it */
    }
  }
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(cacheKey(key), new Response(value, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=604800' },
    }));
  } catch {
    /* best effort */
  }
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

/** One read and one write for several docs of the same kind (parallel writers would lose rows). */
export async function rememberIndexMany(env: ContentEnv, docs: ContentDoc[]): Promise<void> {
  const rows = docs.filter((doc) => doc.blocks.length);
  const kind = rows[0]?.kind;
  if (!kind) return;
  let index = await readIndex(env, kind);
  for (const doc of rows) if (doc.kind === kind) index = mergeIndex(index, doc);
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
