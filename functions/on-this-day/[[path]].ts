import { hktMmdd } from '../../shared/heritage.js';
import { adsFromEnv, renderOnThisDayPage } from '../../shared/heritagePage.js';
import type { PagesContext } from '../env.js';

function headers(status: number): HeadersInit {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
  };
}

/** /on-this-day/ is today in Hong Kong. /on-this-day/MM-DD/ is that calendar day. */
export function onRequest(context: PagesContext): Response {
  const url = new URL(context.request.url);
  const rest = url.pathname.replace(/\/+$/, '').replace(/^\/on-this-day\/?/, '');
  const today = hktMmdd();
  const page = renderOnThisDayPage(rest || today, adsFromEnv(context.env), today);
  return new Response(page.html, { status: page.status, headers: headers(page.status) });
}
