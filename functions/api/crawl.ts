import { buildCrawlResponse } from '../../server/responses.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import type { PagesContext } from '../env.js';

export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const result = await buildCrawlResponse(context.request.method, context.request.headers.get('authorization') ?? undefined);
  const response = new Response(result.body, {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': result.cacheControl,
    },
  });
  if (result.status === 200) {
    const boardUrl = new URL('/api/board', context.request.url).href;
    context.waitUntil(fetch(boardUrl, { method: 'POST' }).catch(() => undefined));
  }
  return response;
}
