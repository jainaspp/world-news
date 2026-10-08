import type { NewsItem } from './types.js';

/** Headlines and on-site articles. This browser only; nothing is uploaded. */
export const BOOKMARK_KEY = 'wn_bookmarks_v2';

/** Regions, categories, and source names the reader follows. */
export const FOLLOW_KEY = 'wn_follows_v1';

export const BOOKMARK_LIMIT = 50;

export type BookmarkPage = 'headline' | 'briefing' | 'explainer' | 'story' | 'topic';

export interface StoredBookmark extends NewsItem {
  page?: BookmarkPage;
}

export interface FollowPrefs {
  regions: string[];
  categories: string[];
  sources: string[];
}

function strings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is string => typeof row === 'string' && row.trim().length > 0).slice(0, limit);
}

export function emptyFollows(): FollowPrefs {
  return { regions: [], categories: [], sources: [] };
}

export function parseFollows(raw: string | null | undefined): FollowPrefs {
  if (!raw) return emptyFollows();
  try {
    const parsed = JSON.parse(raw) as Partial<FollowPrefs>;
    return {
      regions: strings(parsed.regions, 12),
      categories: strings(parsed.categories, 20),
      sources: strings(parsed.sources, 40),
    };
  } catch {
    return emptyFollows();
  }
}

export function followCount(prefs: FollowPrefs): number {
  return prefs.regions.length + prefs.categories.length + prefs.sources.length;
}

export function followMatches(prefs: FollowPrefs, item: { category?: string; source: string; regions?: string[] }): boolean {
  if (!followCount(prefs)) return false;
  if (item.category && prefs.categories.includes(item.category)) return true;
  if (item.regions?.some((code) => prefs.regions.includes(code))) return true;
  return prefs.sources.includes(item.source);
}

export function parseBookmarks(raw: string | null | undefined): StoredBookmark[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredBookmark => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Partial<StoredBookmark>;
      return typeof row.id === 'string' && typeof row.title === 'string' && typeof row.link === 'string';
    }).slice(0, BOOKMARK_LIMIT);
  } catch {
    return [];
  }
}

export function articleBookmark(input: {
  page: Exclude<BookmarkPage, 'headline'>;
  key: string;
  title: string;
  link: string;
  publishedAt: string;
  category?: string;
}): StoredBookmark {
  return {
    id: `article:${input.page}:${input.key}`,
    title: input.title,
    link: input.link,
    source: '世界頭條',
    sourceUrl: 'https://world-news.xyz',
    regions: [],
    pubDate: input.publishedAt,
    ...(input.category ? { category: input.category } : {}),
    page: input.page,
  };
}
