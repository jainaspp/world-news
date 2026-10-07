import type { PagesContext } from '../env.js';
import { warmColumns } from '../content/columns.js';
import { warm } from '../content/publish.js';

export function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return Promise.resolve(Response.json({ error: 'method' }, { status: 405, headers: { 'cache-control': 'no-store' } }));
  }
  const kind = new URL(context.request.url).searchParams.get('kind');
  if (kind === 'briefing' || kind === 'compare' || kind === 'explainer' || kind === 'status' || kind === 'focus') return warmColumns(context);
  return warm(context);
}
