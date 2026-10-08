import { buildCorpus, type RollupHeadline } from '../../shared/searchCorpus.js';
import type { SearchCorpus } from '../../shared/siteSearch.js';
import type { IndexEntry } from '../../shared/content.js';
import { parseTopicPack, TOPIC_PACKS, topicStorageKey } from '../../shared/topicPack.js';
import type { NewsItem } from '../../shared/types.js';
import { edgeCache } from '../env.js';
import { readIndex, readValue, type ContentEnv } from './store.js';

function parseRollup(raw: string | null): RollupHeadline[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is RollupHeadline => {
      if (!row || typeof row !== 'object') return false;
      const item = row as Partial<RollupHeadline>;
      return typeof item.title === 'string' && typeof item.url === 'string' && typeof item.source === 'string' && typeof item.at === 'string';
    });
  } catch {
    return [];
  }
}

/** Saved topic packs, read only. Missing keys are skipped. */
async function loadTopics(env: ContentEnv): Promise<IndexEntry[]> {
  const rows = await Promise.all(TOPIC_PACKS.map(async (topic) => {
    const pack = parseTopicPack(await readValue(env, topicStorageKey(topic.slug)).catch(() => null));
    if (!pack || pack.mode !== 'ai' || !pack.title.trim()) return null;
    const entry: IndexEntry = {
      key: topic.slug,
      title: pack.title,
      description: pack.description || topic.blurb,
      publishedAt: pack.updatedAt || pack.publishedAt,
      category: topic.category,
      sources: Array.isArray(pack.sources) ? pack.sources.length : 0,
    };
    return entry;
  }));
  return rows.filter((row): row is IndexEntry => Boolean(row));
}

/** Read-only. News comes from the cached board endpoint; AI rows are existing indexes. */
export async function loadSearchCorpus(env: ContentEnv, requestUrl: string): Promise<SearchCorpus> {
  const [newsResponse, rollup, briefings, explainers, analyses, digests, topics] = await Promise.all([
    fetch(new URL('/api/news', requestUrl), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4000) }).then((response) => (response.ok ? response.json() : { items: [] })).catch(() => ({ items: [] })),
    readValue(env, 'rollup').catch(() => null),
    readIndex(env, 'briefing').catch(() => []),
    readIndex(env, 'compare').catch(() => []),
    readIndex(env, 'analysis').catch(() => []),
    readIndex(env, 'digest').catch(() => []),
    loadTopics(env).catch(() => []),
  ]);
  const items = Array.isArray((newsResponse as { items?: NewsItem[] }).items) ? (newsResponse as { items: NewsItem[] }).items : [];
  return buildCorpus({
    news: items,
    rollup: parseRollup(rollup),
    briefings,
    explainers,
    analyses,
    digests,
    topics,
  });
}

export async function cachedJson(request: Request, produce: () => Promise<unknown>, maxAge = 300): Promise<Response> {
  const url = new URL(request.url);
  const cacheKey = new Request(`${url.origin}${url.pathname}?${url.searchParams.toString()}`, { method: 'GET' });
  const cache = edgeCache();
  if (cache && request.method === 'GET') {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch {
      /* build a fresh body */
    }
  }
  const body = JSON.stringify(await produce());
  const response = new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
    },
  });
  if (cache && request.method === 'GET') {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      /* cache is best-effort */
    }
  }
  return response;
}
