import { loadFeeds } from './loadFeeds.js';
import { readCache, storeNews } from './supabase.js';
import type { NewsPayload } from '../shared/types';

const MEMORY_MS = 5 * 60 * 1000;

let memory: { at: number; payload: NewsPayload } | null = null;

export function clearNewsCache(): void {
  memory = null;
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

  const { items, errors } = await loadFeeds();
  if (items.length > 0) {
    void storeNews(items).catch(() => undefined);
    const payload: NewsPayload = {
      items,
      fetchedAt: new Date().toISOString(),
      source: 'rss',
      feedErrors: errors,
      stale: false,
    };
    memory = { at: Date.now(), payload };
    return payload;
  }

  const backup = await readCache(true);
  if (backup && backup.length > 0) {
    return {
      items: backup,
      fetchedAt: new Date().toISOString(),
      source: 'cache',
      feedErrors: errors,
      stale: true,
    };
  }

  return {
    items: [],
    fetchedAt: new Date().toISOString(),
    source: 'rss',
    feedErrors: errors,
    stale: false,
    error: '所有新聞來源暫時沒有回應',
  };
}
