import { CATEGORY_IDS } from '../shared/categories.js';
import { FEEDS, type Feed } from '../shared/feeds.js';
import { dedupeNews, parseFeed } from '../shared/rss.js';
import type { NewsItem } from '../shared/types';

const FEED_TIMEOUT_MS = 5000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_PER_SOURCE = 36;
const TARGET_TOTAL = 600;
const MIN_PER_CATEGORY = 24;

export function selectHeadlines(items: NewsItem[], now = Date.now()): NewsItem[] {
  const fresh = items.filter((item) => {
    const published = Date.parse(item.pubDate);
    return Number.isFinite(published) && published <= now + 15 * 60 * 1000 && now - published <= MAX_AGE_MS;
  });
  const sorted = dedupeNews(fresh);
  const counts = new Map<string, number>();
  const capped: NewsItem[] = [];
  for (const item of sorted) {
    const used = counts.get(item.source) ?? 0;
    if (used >= MAX_PER_SOURCE) continue;
    counts.set(item.source, used + 1);
    capped.push(item);
  }
  if (capped.length <= TARGET_TOTAL) return capped;

  const picked: NewsItem[] = [];
  const seen = new Set<string>();
  for (const category of CATEGORY_IDS) {
    let kept = 0;
    for (const item of capped) {
      if ((item.category ?? 'world') !== category || seen.has(item.id)) continue;
      seen.add(item.id);
      picked.push(item);
      kept += 1;
      if (kept >= MIN_PER_CATEGORY) break;
    }
  }
  for (const item of capped) {
    if (picked.length >= TARGET_TOTAL) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }
  return dedupeNews(picked);
}

async function fetchOne(feed: Feed, fetchImpl: typeof fetch): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetchImpl(feed.url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'User-Agent': 'world-news/3.0 (+https://world-news.xyz)',
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
  now = Date.now(),
): Promise<{ items: NewsItem[]; errors: number }> {
  const results: NewsItem[][] = [];
  let cursor = 0;
  let errors = 0;
  const workers = Math.max(1, feeds.length);

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

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return { items: selectHeadlines(results.flat(), now), errors };
}
