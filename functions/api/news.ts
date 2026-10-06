import { feedsInShard } from '../../shared/feeds.js';
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

function cacheId(url: URL): 'a' | 'b' | 'all' {
  const part = url.searchParams.get('part');
  return part === 'a' || part === 'b' ? part : 'all';
}

function jsonResult(payload: NewsPayload, forList: boolean): JsonResult {
  const status = payload.items.length > 0 ? 200 : 503;
  // Shard parts stay complete so the merge can store excerpts for story pages and AI drafts.
  const body = forList ? toListPayload(payload) : payload;
  return {
    status,
    body: JSON.stringify(body),
    cacheControl: status === 200 ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store',
  };
}

function isLocalRequest(requestUrl: string): boolean {
  const host = new URL(requestUrl).hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
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
  // Local dev has no 50-subrequest cap, and a self-fetch would deadlock the single wrangler thread.
  if (isLocalRequest(requestUrl)) {
    const [shardA, shardB] = await Promise.all([
      assemblePayload(feedsInShard('a')),
      assemblePayload(feedsInShard('b')),
    ]);
    const merged = mergePayloads([shardA, shardB]);
    if (merged.items.length > 0) void storeNews(merged.items).catch(() => undefined);
    return merged;
  }
  const shardA = await assemblePayload(feedsInShard('a'));
  const shardUrl = new URL(requestUrl);
  shardUrl.searchParams.set('part', 'b');
  let shardB: NewsPayload;
  try {
    const response = await fetch(shardUrl.href, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    shardB = await response.json() as NewsPayload;
  } catch {
    shardB = {
      items: [],
      fetchedAt: new Date().toISOString(),
      source: 'rss',
      feedErrors: 1,
      feedErrorSources: [{ source: 'shard-b', reason: 'unavailable' }],
      stale: true,
    };
  }
  const merged = mergePayloads([shardA, shardB]);
  if (merged.items.length > 0) void storeNews(merged.items).catch(() => undefined);
  return merged;
}

async function buildPart(requestUrl: string, part: 'a' | 'b' | 'all'): Promise<JsonResult> {
  if (part === 'a' || part === 'b') return jsonResult(await assemblePayload(feedsInShard(part)), false);
  return jsonResult(await loadMerged(requestUrl), true);
}

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const part = cacheId(url);
  // v2 drops list excerpts. Don't keep serving the previous fat edge entry after deploy.
  const cacheKey = new Request(`${url.origin}/api/news?cache=v2-${part}`, { method: 'GET' });
  const cache = edgeCache();

  if (cache && context.request.method === 'GET') {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const age = ageSeconds(hit);
        if (age >= FRESH_S && age < STALE_S) {
          context.waitUntil(
            buildPart(context.request.url, part).then((result) => {
              if (result.status !== 200) return;
              return store(cache, cacheKey, toResponse(result, Date.now()));
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
  if (cache && result.status === 200 && context.request.method === 'GET') {
    context.waitUntil(store(cache, cacheKey, response));
  }
  return response;
}
