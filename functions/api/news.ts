import { buildNewsResponse, type JsonResult } from '../../server/responses.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
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

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const cacheKey = new Request(`${url.origin}/api/news`, { method: 'GET' });
  const cache = edgeCache();

  if (cache && context.request.method === 'GET') {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        const age = ageSeconds(hit);
        if (age >= FRESH_S && age < STALE_S) {
          context.waitUntil(
            buildNewsResponse().then((result) => {
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

  const result = await buildNewsResponse();
  const response = toResponse(result, result.status === 200 ? Date.now() : undefined);
  if (cache && result.status === 200 && context.request.method === 'GET') {
    context.waitUntil(store(cache, cacheKey, response));
  }
  return response;
}
