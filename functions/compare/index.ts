import type { PagesContext } from '../env.js';

export function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  return Promise.resolve(new Response(null, {
    status: 301,
    headers: { location: new URL('/explainer/', url).href, 'cache-control': 'public, max-age=86400' },
  }));
}
