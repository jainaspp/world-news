import { renderSavedPage } from '../../shared/readerPages.js';
import type { PagesContext } from '../env.js';

export function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return Promise.resolve(new Response('method', { status: 405 }));
  }
  return Promise.resolve(new Response(renderSavedPage(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  }));
}
