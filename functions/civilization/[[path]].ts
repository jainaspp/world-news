import { renderCivilizationHub, renderCivilizationMiss, renderOriginsPage } from '../../shared/civilizationPage.js';
import type { PagesContext } from '../env.js';

function headers(status: number): HeadersInit {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    'x-robots-tag': status === 200 ? 'index, follow' : 'noindex, follow',
  };
}

/** /civilization/ and /civilization/origins/. Other segments 404 and stay noindex. */
export function onRequest(context: PagesContext): Response {
  const url = new URL(context.request.url);
  const rest = decodeURIComponent(url.pathname.replace(/\/+$/, '').replace(/^\/civilization\/?/, ''));
  const page = !rest
    ? renderCivilizationHub()
    : rest === 'origins'
      ? renderOriginsPage()
      : renderCivilizationMiss();
  const robots = page.indexable ? 'index, follow' : 'noindex, follow';
  return new Response(page.html, {
    status: page.status,
    headers: { ...headers(page.status), 'x-robots-tag': robots },
  });
}
