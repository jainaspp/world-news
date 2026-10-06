import type { PagesContext } from '../env.js';
import { warm } from '../content/publish.js';

export function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return Promise.resolve(Response.json({ error: 'method' }, { status: 405, headers: { 'cache-control': 'no-store' } }));
  }
  return warm(context);
}
