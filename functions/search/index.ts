import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { renderSearchPage } from '../../shared/readerPages.js';
import { normalizeCategory, normalizeRegion, searchReader } from '../../shared/siteSearch.js';
import { edgeCache, type PagesContext } from '../env.js';
import { loadSearchCorpus } from '../content/searchIndex.js';
import type { ContentEnv } from '../content/store.js';

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=60, s-maxage=120',
};

/** Server render of the same read-only corpus the client can fetch at /api/search-index. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').slice(0, 80);
  const region = normalizeRegion(url.searchParams.get('region'));
  const category = normalizeCategory(url.searchParams.get('category'));
  const cacheKey = new Request(`${url.origin}/search/?q=${encodeURIComponent(q)}&region=${region}&category=${category}`, { method: 'GET' });
  const cache = edgeCache();
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      /* render */
    }
  }
  let hits: ReturnType<typeof searchReader> = [];
  try {
    const corpus = await loadSearchCorpus(context.env as ContentEnv, context.request.url);
    hits = searchReader(corpus, { q, region, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`search corpus skipped: ${message}`);
  }
  const response = new Response(renderSearchPage({ q, region, category, hits }), { headers: HEADERS });
  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      /* cache is best-effort */
    }
  }
  return response;
}
