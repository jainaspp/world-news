import { CATEGORY_IDS } from '../shared/categories.js';
import { FEEDS, type Feed } from '../shared/feeds.js';
import { dedupeNews, parseFeed } from '../shared/rss.js';
import type { FeedErrorSource, NewsItem } from '../shared/types';

const BROWSER_HEADERS = {
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8',
  'Accept-Language': 'zh-HK,zh-Hant;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

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

function failureReason(error: unknown): string {
  if (!(error instanceof Error)) return 'network';
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'timeout';
  if (/subrequest/i.test(error.message)) return 'subrequests';
  return 'network';
}

async function fetchOne(
  feed: Feed,
  fetchImpl: typeof fetch,
): Promise<{ items: NewsItem[]; error?: FeedErrorSource }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  const fail = (reason: string) => ({ items: [] as NewsItem[], error: { source: feed.label, reason } });
  try {
    let response = await fetchImpl(feed.url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: 'manual',
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return fail('redirect');
      response = await fetchImpl(new URL(location, feed.url).href, {
        signal: controller.signal,
        headers: BROWSER_HEADERS,
        redirect: 'manual',
      });
      if (response.status >= 300 && response.status < 400) return fail('redirect');
    }
    if (!response.ok) return fail(`HTTP ${response.status}`);
    const text = await response.text();
    if (!/<(rss|feed|rdf:RDF)/i.test(text)) return fail('not xml');
    const items = parseFeed(text, feed);
    if (!items.length) return fail('empty');
    return { items };
  } catch (error) {
    return fail(failureReason(error));
  } finally {
    clearTimeout(timer);
  }
}

export async function loadFeeds(
  feeds: Feed[] = FEEDS,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<{ items: NewsItem[]; errors: number; errorSources: FeedErrorSource[] }> {
  const results: NewsItem[][] = [];
  const errorSources: FeedErrorSource[] = [];
  let cursor = 0;
  const workers = Math.max(1, feeds.length);

  async function worker() {
    while (cursor < feeds.length) {
      const index = cursor;
      cursor += 1;
      const feed = feeds[index];
      if (!feed) continue;
      const fetched = await fetchOne(feed, fetchImpl);
      if (fetched.error) errorSources.push(fetched.error);
      results[index] = fetched.items;
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return { items: selectHeadlines(results.flat(), now), errors: errorSources.length, errorSources };
}
