import { renderChroniclePage, renderCityPage, renderCivilizationHub, renderCivilizationMiss, renderCosmosPage, renderEarthPage, renderGalaxyPage, renderOriginsPage, renderTechPage } from '../../shared/civilizationPage.js';
import type { PagesContext } from '../env.js';

function headers(status: number): HeadersInit {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    'x-robots-tag': status === 200 ? 'index, follow' : 'noindex, follow',
  };
}

type CivPage = { html: string; status: number; indexable: boolean };

/** One record per route. A new thick page is a new key, not another ternary arm. */
export const PAGES: Record<string, () => CivPage> = {
  '': renderCivilizationHub,
  cosmos: renderCosmosPage,
  galaxy: renderGalaxyPage,
  earth: renderEarthPage,
  origins: renderOriginsPage,
  tech: renderTechPage,
  city: renderCityPage,
  chronicle: renderChroniclePage,
};

/** /civilization/ plus each key in PAGES. Other segments 404 and stay noindex. */
export function onRequest(context: PagesContext): Response {
  const url = new URL(context.request.url);
  const rest = decodeURIComponent(url.pathname.replace(/\/+$/, '').replace(/^\/civilization\/?/, ''));
  const render = Object.prototype.hasOwnProperty.call(PAGES, rest) ? PAGES[rest] : undefined;
  const page = render ? render() : renderCivilizationMiss();
  const robots = page.indexable ? 'index, follow' : 'noindex, follow';
  return new Response(page.html, {
    status: page.status,
    headers: { ...headers(page.status), 'x-robots-tag': robots },
  });
}
