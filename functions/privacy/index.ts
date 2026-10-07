import { renderPrivacyPage, siteHeaders } from '../../shared/sitePages.js';

export function onRequest(): Response {
  return new Response(renderPrivacyPage(), { headers: siteHeaders() });
}
