import { renderContactPage, siteHeaders } from '../../shared/sitePages.js';

export function onRequest(): Response {
  return new Response(renderContactPage(), { headers: siteHeaders() });
}
