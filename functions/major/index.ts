import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { renderMajorPage } from '../../shared/majorPage.js';
import { loadSnapshot } from '../board/fallback.js';
import type { PagesContext } from '../env.js';

const CANONICAL = 'https://world-news.xyz/major/';

/** /major/: 24-hour major-update timeline from the precomputed board. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const snapshot = await loadSnapshot(context);
  const html = renderMajorPage(snapshot?.timeline ?? [], CANONICAL);
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=180' },
  });
}
