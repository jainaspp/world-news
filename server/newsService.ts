import { FEEDS, type Feed } from '../shared/feeds.js';
import { loadFeeds, selectHeadlines } from './loadFeeds.js';
import { readCache, storeNews } from './supabase.js';
import type { NewsPayload } from '../shared/types';

const MEMORY_MS = 5 * 60 * 1000;

let memory: { at: number; payload: NewsPayload } | null = null;

export function clearNewsCache(): void {
  memory = null;
}

export async function assemblePayload(feeds: Feed[]): Promise<NewsPayload> {
  const { items, errors, errorSources } = await loadFeeds(feeds);
  return {
    items,
    fetchedAt: new Date().toISOString(),
    source: 'rss',
    feedErrors: errors,
    ...(errorSources.length ? { feedErrorSources: errorSources } : {}),
    stale: false,
  };
}

export function mergePayloads(parts: NewsPayload[]): NewsPayload {
  const feedErrorSources = parts.flatMap((part) => part.feedErrorSources ?? []);
  const stale = parts.some((part) => part.stale);
  return {
    items: selectHeadlines(parts.flatMap((part) => part.items)),
    fetchedAt: new Date().toISOString(),
    source: 'rss',
    feedErrors: parts.reduce((sum, part) => sum + part.feedErrors, 0),
    ...(feedErrorSources.length ? { feedErrorSources } : {}),
    stale,
    ...(stale && parts.every((part) => part.items.length === 0) ? { error: '所有新聞來源暫時沒有回應' } : {}),
  };
}

export async function getNews(): Promise<NewsPayload> {
  if (memory && Date.now() - memory.at < MEMORY_MS) return memory.payload;

  const fresh = await readCache(false);
  if (fresh && fresh.length > 0) {
    const payload: NewsPayload = {
      items: fresh,
      fetchedAt: new Date().toISOString(),
      source: 'cache',
      feedErrors: 0,
      stale: false,
    };
    memory = { at: Date.now(), payload };
    return payload;
  }

  const payload = await assemblePayload(FEEDS);
  if (payload.items.length > 0) {
    void storeNews(payload.items).catch(() => undefined);
    memory = { at: Date.now(), payload };
    return payload;
  }
  const errors = payload.feedErrors;

  const backup = await readCache(true);
  if (backup && backup.length > 0) {
    return {
      items: backup,
      fetchedAt: new Date().toISOString(),
      source: 'cache',
      feedErrors: errors,
      ...(payload.feedErrorSources ? { feedErrorSources: payload.feedErrorSources } : {}),
      stale: true,
    };
  }

  return {
    ...payload,
    error: '所有新聞來源暫時沒有回應',
  };
}
