import { FEEDS, type Feed } from '../shared/feeds.js';
import { dedupeNews, parseFeed } from '../shared/rss.js';
import type { NewsItem } from '../shared/types';

const FEED_TIMEOUT_MS = 3000;
const CONCURRENCY = 8;

async function fetchOne(feed: Feed, fetchImpl: typeof fetch): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetchImpl(feed.url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'User-Agent': 'world-news/3.0 (+https://world-news-tawny.vercel.app)',
      },
    });
    if (!response.ok) return [];
    return parseFeed(await response.text(), feed);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function loadFeeds(
  feeds: Feed[] = FEEDS,
  fetchImpl: typeof fetch = fetch,
): Promise<{ items: NewsItem[]; errors: number }> {
  const results: NewsItem[][] = [];
  let cursor = 0;
  let errors = 0;

  async function worker() {
    while (cursor < feeds.length) {
      const index = cursor;
      cursor += 1;
      const feed = feeds[index];
      if (!feed) continue;
      const items = await fetchOne(feed, fetchImpl);
      if (items.length === 0) errors += 1;
      results[index] = items;
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, feeds.length) }, () => worker()));
  return { items: dedupeNews(results.flat()), errors };
}
