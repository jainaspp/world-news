import { CATEGORY_IDS, type CategoryId } from '../shared/categories.js';
import { FEEDS, type Feed } from '../shared/feeds.js';
import { dedupeNews, parseFeed, parseNowFeed } from '../shared/rss.js';
import type { FeedErrorSource, NewsItem } from '../shared/types';

const BROWSER_HEADERS = {
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.8',
  'Accept-Language': 'zh-HK,zh-Hant;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

const FEED_TIMEOUT_MS = 5000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_PER_SOURCE = 36;
/** 30% of the China floor, so one outlet cannot fill the section. */
const CHINA_PER_SOURCE = 24;
/** Press releases are useful but should not crowd out reporting. */
const PRESS_RELEASE_CAP = 16;
const TARGET_TOTAL = 840;
const MIN_PER_CATEGORY = 24;
const CATEGORY_FLOOR: Partial<Record<CategoryId, number>> = {
  hk: 120,
  china: 80,
};

function sourceLimit(source: string, category: string): number {
  if (source === '新聞公報') return PRESS_RELEASE_CAP;
  if (category === 'china') return CHINA_PER_SOURCE;
  return MAX_PER_SOURCE;
}

function categoryFloor(category: string): number {
  return CATEGORY_FLOOR[category as CategoryId] ?? MIN_PER_CATEGORY;
}

/** Exact headline match after stripping punctuation, so wire copies collapse. */
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function dedupeTitles(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = titleKey(item.title);
    if (key.length >= 8 && seen.has(key)) continue;
    if (key.length >= 8) seen.add(key);
    out.push(item);
  }
  return out;
}

export function selectHeadlines(items: NewsItem[], now = Date.now()): NewsItem[] {
  const fresh = items.filter((item) => {
    const published = Date.parse(item.pubDate);
    return Number.isFinite(published) && published <= now + 15 * 60 * 1000 && now - published <= MAX_AGE_MS;
  });
  const sorted = dedupeTitles(dedupeNews(fresh));
  const counts = new Map<string, number>();
  const capped: NewsItem[] = [];
  for (const item of sorted) {
    const category = item.category ?? 'world';
    const key = `${item.source}|${category}`;
    const used = counts.get(key) ?? 0;
    if (used >= sourceLimit(item.source, category)) continue;
    counts.set(key, used + 1);
    capped.push(item);
  }
  if (capped.length <= TARGET_TOTAL) return capped;

  const picked: NewsItem[] = [];
  const seen = new Set<string>();
  for (const category of CATEGORY_IDS) {
    let kept = 0;
    const floor = categoryFloor(category);
    for (const item of capped) {
      if ((item.category ?? 'world') !== category || seen.has(item.id)) continue;
      seen.add(item.id);
      picked.push(item);
      kept += 1;
      if (kept >= floor) break;
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
    if (feed.format === 'now') {
      const items = parseNowFeed(text, feed);
      if (!items.length) return fail('empty');
      return { items };
    }
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
