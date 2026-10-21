import { renderToolsDraftIndex, toolsDraftHeaders } from '../../shared/toolsDraft.js';

/** Noindex draft index. Status stays 200: this route is not a redirect. */
export function onRequest(): Response {
  return new Response(renderToolsDraftIndex(), {
    status: 200,
    headers: toolsDraftHeaders(),
  });
}
