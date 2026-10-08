import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { channelUrl } from '../../shared/telegramPost.js';
import { edgeCache, type PagesContext } from '../env.js';

/** RSS is always available. The Telegram link is omitted when TELEGRAM_CHANNEL_URL is unset. */
export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return Response.json({ error: 'method' }, { status: 405, headers: { 'cache-control': 'no-store' } });
  }
  applyRuntimeEnv(context.env);
  const telegram = channelUrl(context.env.TELEGRAM_CHANNEL_URL);
  const body = JSON.stringify({ rss: '/feed.xml', telegram: telegram || null });
  const response = new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
  const cache = edgeCache();
  if (cache) {
    try {
      const url = new URL(context.request.url);
      await cache.put(new Request(`${url.origin}/api/subscribe`, { method: 'GET' }), response.clone());
    } catch {
      /* cache is best-effort */
    }
  }
  return response;
}
