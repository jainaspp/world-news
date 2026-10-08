import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import type { PagesContext } from '../env.js';
import { cachedJson, loadSearchCorpus } from '../content/searchIndex.js';
import type { ContentEnv } from '../content/store.js';

/** Read-only corpus for client search. Cached. No KV writes. */
export function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'GET') {
    return Promise.resolve(Response.json({ error: 'method' }, { status: 405, headers: { 'cache-control': 'no-store' } }));
  }
  applyRuntimeEnv(context.env);
  return cachedJson(context.request, () => loadSearchCorpus(context.env as ContentEnv, context.request.url));
}
