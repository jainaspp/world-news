import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { renderFeed, type FeedEntry } from '../shared/feedXml.js';
import { articlePath } from '../shared/searchCorpus.js';
import type { IndexEntry } from '../shared/content.js';
import { edgeCache, type PagesContext } from './env.js';
import { readIndex, type ContentEnv } from './content/store.js';

function rows(kind: 'briefing' | 'explainer', entries: IndexEntry[]): FeedEntry[] {
  return entries.map((entry) => ({
    title: entry.title,
    href: `https://world-news.xyz${articlePath(kind, entry.key)}`,
    summary: entry.description || entry.title,
    publishedAt: entry.publishedAt,
  }));
}

/** Briefings and explainers. Read-only and cached. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const url = new URL(context.request.url);
  const cacheKey = new Request(`${url.origin}/feed.xml`, { method: 'GET' });
  const cache = edgeCache();
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      /* rebuild */
    }
  }
  const env = context.env as ContentEnv;
  const [briefings, explainers] = await Promise.all([
    readIndex(env, 'briefing').catch(() => []),
    readIndex(env, 'compare').catch(() => []),
  ]);
  const entries = [...rows('briefing', briefings), ...rows('explainer', explainers)]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const response = new Response(renderFeed(entries), {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      /* cache is best-effort */
    }
  }
  return response;
}
