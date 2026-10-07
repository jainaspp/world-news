import { SHARD_COUNT, feedsInShard, shardIndex } from '../../shared/feeds.js';
import { toListPayload } from '../../shared/listPayload.js';
import { assemblePayload, mergePayloads } from '../../server/newsService.js';
import { buildNewsResponse, type JsonResult } from '../../server/responses.js';
import { readCache, storeNews } from '../../server/supabase.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import type { NewsPayload } from '../../shared/types';
import { edgeCache, type PagesContext } from '../env.js';

const FRESH_S = 300;
const STALE_S = 900;

function toResponse(result: JsonResult, cachedAt?: number): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': result.cacheControl,
  };
  if (cachedAt) headers['x-cached-at'] = String(cachedAt);
  return new Response(result.body, { status: result.status, headers });
}

function ageSeconds(response: Response): number {
  const stamped = Number(response.headers.get('x-cached-at') || '0');
  if (stamped > 0) return (Date.now() - stamped) / 1000;
  const date = Date.parse(response.headers.get('date') || '');
  if (Number.isFinite(date)) return (Date.now() - date) / 1000;
  return 0;
}

async function store(cache: Cache, key: Request, response: Response): Promise<void> {
  try {
    await cache.put(key, response.clone());
  } catch {
    /* cache is best-effort */
  }
}

function cacheId(url: URL): string {
  const part = url.searchParams.get('part');
  return shardIndex(part) == null ? 'all' : part!;
}

function jsonResult(payload: NewsPayload): JsonResult {
  const status = payload.items.length > 0 ? 200 : 503;
  // Public shards are slim. Excerpts are not stored, and parsing them in the parent
  // was burning the CPU budget the list response needs.
  return {
    status,
    body: JSON.stringify(toListPayload(payload)),
    cacheControl: status === 200 ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store',
  };
}

function isLocalRequest(requestUrl: string): boolean {
  const host = new URL(requestUrl).hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
}

function emptyShard(): NewsPayload {
  return {
    items: [],
    fetchedAt: new Date().toISOString(),
    source: 'rss',
    feedErrors: 1,
    feedErrorSources: [{ source: 'shard', reason: 'unavailable' }],
    stale: true,
  };
}

async function fetchShard(requestUrl: string, part: string): Promise<NewsPayload> {
  const shardUrl = new URL(requestUrl);
  shardUrl.searchParams.set('part', part);
  try {
    const response = await fetch(shardUrl.href, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as NewsPayload;
  } catch {
    return emptyShard();
  }
}

async function loadMerged(requestUrl: string): Promise<NewsPayload> {
  const fresh = await readCache(false);
  if (fresh && fresh.length > 0) {
    return {
      items: fresh,
      fetchedAt: new Date().toISOString(),
      source: 'cache',
      feedErrors: 0,
      stale: false,
    };
  }
  const parts = isLocalRequest(requestUrl)
    ? await Promise.all(Array.from({ length: SHARD_COUNT }, (_, index) => assemblePayload(feedsInShard(String(index)))))
    : await Promise.all(Array.from({ length: SHARD_COUNT }, (_, index) => fetchShard(requestUrl, String(index))));
  const merged = mergePayloads(parts);
  if (merged.items.length > 0) void storeNews(merged.items).catch(() => undefined);
  return merged;
}

async function buildPart(requestUrl: string, part: string): Promise<JsonResult> {
  if (shardIndex(part) != null) return jsonResult(await assemblePayload(feedsInShard(part)));
  return jsonResult(await loadMerged(requestUrl));
}

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const part = cacheId(url);
  // v3: smaller shards, slim bodies. Don't keep serving a v2 entry from the previous deploy.
  const cacheKey = new Request(`${url.origin}/api/news?cache=v3-${part}`, { method: 'GET' });
  const cache = edgeCache();

  const finish = (result: JsonResult, response: Response) => {
    if (result.status !== 200 || context.request.method !== 'GET') return;
    const boardUrl = new URL('/api/board', context.request.url).href;
    context.waitUntil((async () => {
      if (cache) await store(cache, cacheKey, response);
      // Separate invocation so clustering does not share this request's CPU budget.
      if (part === 'all') await fetch(boardUrl, { method: 'POST' }).catch(() => undefined);
    })());
  };

  if (cache && context.request.method === 'GET') {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const age = ageSeconds(hit);
        if (age >= FRESH_S && age < STALE_S) {
          context.waitUntil(
            buildPart(context.request.url, part).then(async (result) => {
              if (result.status !== 200) return;
              const response = toResponse(result, Date.now());
              await store(cache, cacheKey, response);
              if (part === 'all') await fetch(new URL('/api/board', context.request.url).href, { method: 'POST' }).catch(() => undefined);
            }),
          );
        }
        if (age < STALE_S) return hit;
      }
    } catch {
      /* read-through */
    }
  }

  const result = part === 'all' && !cache
    ? await buildNewsResponse()
    : await buildPart(context.request.url, part);
  const response = toResponse(result, result.status === 200 ? Date.now() : undefined);
  finish(result, response);
  return response;
}
