import { focusKey, focusPages, parseFocus, type FocusPage } from '../../shared/focus.js';
import type { PagesContext } from '../env.js';
import { readValue, type ContentEnv } from '../content/store.js';

function pageFrom(url: URL): FocusPage | null {
  const scope = url.searchParams.get('scope');
  const id = (url.searchParams.get('id') || '').toLowerCase();
  if (scope !== 'region' && scope !== 'category') return null;
  return focusPages().find((page) => page.scope === scope && page.id === id) ?? null;
}

/** Public read. Missing copy is an empty string, not an error, so the list still renders. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const headers = { 'cache-control': 'public, max-age=300, s-maxage=600' };
  if (context.request.method !== 'GET') {
    return Response.json({ text: '' }, { status: 405, headers: { 'cache-control': 'no-store' } });
  }
  const page = pageFrom(new URL(context.request.url));
  if (!page) return Response.json({ text: '' }, { headers });
  const saved = parseFocus(await readValue(context.env as ContentEnv, focusKey(page)).catch(() => null));
  return Response.json({ text: saved?.text ?? '' }, { headers });
}
