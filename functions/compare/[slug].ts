import type { PagesContext } from '../env.js';

export function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const key = decodeURIComponent(url.pathname.split('/').filter(Boolean)[1] || '');
  const dest = key ? `/explainer/${encodeURIComponent(key)}` : '/explainer/';
  return Promise.resolve(new Response(null, {
    status: 301,
    headers: { location: new URL(dest, url).href, 'cache-control': 'public, max-age=86400' },
  }));
}
