import { civArchResponse } from '../../shared/civArch/document.js';
import type { PagesContext } from '../env.js';

/** 旁註 index, three open doors, and closed doors that must not invent a syllabus. */
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
