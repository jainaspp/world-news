import { renderLearnPath } from '../../shared/learnPage.js';
import type { PagesContext } from '../env.js';

function headers(status: number): HeadersInit {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    'x-robots-tag': 'noindex, follow',
  };
}

/** /learn/ is the map. Subject and leaf segments stay noindex until the tree is thick. */
export function onRequest(context: PagesContext): Response {
  const url = new URL(context.request.url);
  const rest = decodeURIComponent(url.pathname.replace(/\/+$/, '').replace(/^\/learn\/?/, ''));
  const page = renderLearnPath(rest);
  return new Response(page.html, { status: page.status, headers: headers(page.status) });
}
