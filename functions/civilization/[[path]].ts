import { renderChroniclePage, renderCityPage, renderCivilizationHub, renderCivilizationMiss, renderCosmosPage, renderEarthPage, renderOriginsPage, renderTechPage } from '../../shared/civilizationPage.js';
import type { PagesContext } from '../env.js';

function headers(status: number): HeadersInit {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    'x-robots-tag': status === 200 ? 'index, follow' : 'noindex, follow',
  };
}

/** /civilization/, /civilization/cosmos/, /civilization/earth/, /civilization/origins/, /civilization/tech/, /civilization/city/, and /civilization/chronicle/. Other segments 404 and stay noindex. */
export function onRequest(context: PagesContext): Response {
  const url = new URL(context.request.url);
  const rest = decodeURIComponent(url.pathname.replace(/\/+$/, '').replace(/^\/civilization\/?/, ''));
  const page = !rest
    ? renderCivilizationHub()
    : rest === 'cosmos'
      ? renderCosmosPage()
      : rest === 'earth'
        ? renderEarthPage()
        : rest === 'origins'
        ? renderOriginsPage()
        : rest === 'tech'
          ? renderTechPage()
          : rest === 'city'
            ? renderCityPage()
            : rest === 'chronicle'
              ? renderChroniclePage()
              : renderCivilizationMiss();
  const robots = page.indexable ? 'index, follow' : 'noindex, follow';
  return new Response(page.html, {
    status: page.status,
    headers: { ...headers(page.status), 'x-robots-tag': robots },
  });
}
