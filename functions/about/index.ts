import { renderAboutPage, siteHeaders } from '../../shared/sitePages.js';

export function onRequest(): Response {
  return new Response(renderAboutPage(), { headers: siteHeaders() });
}
