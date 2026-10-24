import { civArchResponse } from '../../shared/civArch/document.js';
import type { PagesContext } from '../env.js';

/** /read/ is the same article as the homepage, entered at 卷一, with no opening. */
export function onRequest(context: PagesContext): Response {
  const response = civArchResponse(context.request.url);
  if (response) return response;
  return new Response('沒有這一頁。', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, follow',
    },
  });
}
