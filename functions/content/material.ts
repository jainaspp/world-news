import {
  ARTICLE_CHARS,
  ARTICLE_CHARS_LONG,
  ARTICLE_TTL_SECONDS,
  blockedOutlet,
  extractArticle,
  extractTitle,
  FETCH_CONCURRENCY,
  FETCH_PER_CLUSTER,
  FETCH_TIMEOUT_MS,
  HTML_CAP,
  RAW_HTML_CAP,
} from '../../shared/articleText.js';
import { stableId } from '../../shared/rss.js';
import {
  bundleFrom,
  bundleIndexKey,
  bundleKey,
  eventsKey,
  pruneEvents,
  type ResearchBundle,
  type StoredEvent,
} from '../../shared/research.js';
import type { NewsItem } from '../../shared/types.js';
import { readValue, writeValue, type ContentEnv } from './store.js';

export function articleCacheKey(url: string): string {
  return `article3:${stableId(url)}`;
}

export interface FetchResult {
  texts: Map<string, string>;
  /** Articles that contributed text, including cache hits. */
  fetchedSources: number;
}

interface CacheRow {
  url?: string;
  text?: string;
}

function parseCached(raw: string | null): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as CacheRow;
    return typeof parsed.text === 'string' ? parsed.text : '';
  } catch {
    return '';
  }
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Read article text for the given URLs. Paywalled hosts are skipped.
 * Cache hits do not fetch. Network reads are capped and concurrency-limited.
 */
export async function fetchArticleTexts(
  env: ContentEnv,
  urls: string[],
  fetchImpl: typeof fetch = fetch,
  limit = FETCH_PER_CLUSTER,
): Promise<FetchResult> {
  const texts = new Map<string, string>();
  const wanted = [...new Set(urls.filter((url) => /^https?:\/\//.test(url) && !blockedOutlet(url)))].slice(0, limit);
  const missing: string[] = [];
  await mapPool(wanted, FETCH_CONCURRENCY, async (url) => {
    const cached = parseCached(await readValue(env, articleCacheKey(url)).catch(() => null));
    if (cached) texts.set(url, cached);
    else missing.push(url);
  });
  await mapPool(missing, FETCH_CONCURRENCY, async (url) => {
    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': 'world-news.xyz article fetch', accept: 'text/html' },
      });
      if (response.status === 401 || response.status === 403 || !response.ok) return;
      const type = response.headers.get('content-type') || '';
      if (type && !/html|xml|text\/plain/i.test(type)) return;
      // Code is stripped before the cap: an inline style or script cut open by the cap leaked into extracts.
      const text = extractArticle((await response.text()).slice(0, RAW_HTML_CAP), ARTICLE_CHARS_LONG);
      if (!text) return;
      texts.set(url, text);
      await writeValue(env, articleCacheKey(url), JSON.stringify({ url, text }), ARTICLE_TTL_SECONDS);
    } catch {
      /* timeout or a blocked page: the headline is still usable */
    }
  });
  return { texts, fetchedSources: texts.size };
}

export function stampExcerpts(items: NewsItem[], texts: Map<string, string>, cap = ARTICLE_CHARS): NewsItem[] {
  return items.map((item) => {
    const text = texts.get(item.link);
    if (!text) return item;
    return { ...item, excerpt: text.slice(0, cap) };
  });
}

export async function readBundles(env: ContentEnv, date: string): Promise<ResearchBundle[]> {
  const raw = await readValue(env, bundleIndexKey(date)).catch(() => null);
  let signatures: string[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    signatures = Array.isArray(parsed) ? parsed.filter((row): row is string => typeof row === 'string') : [];
  } catch {
    signatures = [];
  }
  const rows = await Promise.all(signatures.map(async (signature) => {
    const body = await readValue(env, bundleKey(date, signature)).catch(() => null);
    if (!body) return null;
    try {
      const parsed = JSON.parse(body) as ResearchBundle;
      if (!parsed || !Array.isArray(parsed.excerpts)) return null;
      return parsed;
    } catch {
      return null;
    }
  }));
  return rows.filter((row): row is ResearchBundle => Boolean(row));
}

export async function writeBundle(env: ContentEnv, bundle: ResearchBundle): Promise<void> {
  if (!bundle.signature || bundle.chars < 80) return;
  await writeValue(env, bundleKey(bundle.date, bundle.signature), JSON.stringify(bundle), ARTICLE_TTL_SECONDS);
  const existing = await readBundles(env, bundle.date);
  const signatures = [...new Set([bundle.signature, ...existing.map((row) => row.signature)])].slice(0, 40);
  await writeValue(env, bundleIndexKey(bundle.date), JSON.stringify(signatures), ARTICLE_TTL_SECONDS);
}

export function clusterBundle(date: string, signature: string, title: string, items: NewsItem[]): ResearchBundle {
  return bundleFrom(date, signature, title, items);
}

export async function readEvents(env: ContentEnv): Promise<StoredEvent[]> {
  const raw = await readValue(env, eventsKey()).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredEvent[];
    if (!Array.isArray(parsed)) return [];
    return pruneEvents(parsed.filter((row) => row && typeof row.key === 'string' && typeof row.title === 'string'));
  } catch {
    return [];
  }
}

export async function writeEvents(env: ContentEnv, events: StoredEvent[], now = Date.now()): Promise<void> {
  const pruned = pruneEvents(events, now).slice(-80);
  await writeValue(env, eventsKey(), JSON.stringify(pruned));
}

export function titleCacheKey(url: string): string {
  return `title:${stableId(url)}`;
}

/** Headline of each cited page (og:title), cached for 3 days. Used to replace slug or bare-domain citation titles. */
export async function fetchTitles(
  env: ContentEnv,
  urls: string[],
  fetchImpl: typeof fetch = fetch,
  limit = 6,
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const wanted = [...new Set(urls.filter((url) => /^https?:\/\//.test(url) && !blockedOutlet(url)))].slice(0, limit);
  await mapPool(wanted, FETCH_CONCURRENCY, async (url) => {
    const cached = await readValue(env, titleCacheKey(url)).catch(() => null);
    if (cached) {
      titles.set(url, cached);
      return;
    }
    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': 'world-news.xyz article fetch', accept: 'text/html' },
      });
      if (!response.ok) return;
      const title = extractTitle((await response.text()).slice(0, HTML_CAP));
      if (!title || title.length < 8) return;
      titles.set(url, title);
      await writeValue(env, titleCacheKey(url), title, ARTICLE_TTL_SECONDS);
    } catch {
      /* the slug title stays */
    }
  });
  return titles;
}
