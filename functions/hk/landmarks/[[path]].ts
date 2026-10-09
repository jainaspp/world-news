import { adsFromEnv, renderLandmarkHub, renderLandmarkPage } from '../../../shared/heritagePage.js';
import type { PagesContext } from '../../env.js';

function headers(status: number): HeadersInit {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
  };
}

/** /hk/landmarks/ and /hk/landmarks/<slug>/. */
export function onRequest(context: PagesContext): Response {
  const url = new URL(context.request.url);
  const rest = url.pathname.replace(/\/+$/, '').replace(/^\/hk\/landmarks\/?/, '');
  const ads = adsFromEnv(context.env);
  const page = rest
    ? renderLandmarkPage(decodeURIComponent(rest), ads)
    : renderLandmarkHub(url.searchParams.get('kind') || '', ads);
  return new Response(page.html, { status: page.status, headers: headers(page.status) });
}
