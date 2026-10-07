import { renderTermsPage, siteHeaders } from '../../shared/sitePages.js';

export function onRequest(): Response {
  return new Response(renderTermsPage(), { headers: siteHeaders() });
}
