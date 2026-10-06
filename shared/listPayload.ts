import type { NewsItem, NewsPayload } from './types.js';

/**
 * Public list responses omit RSS excerpts. Cards never render them, and they are
 * about a fifth of `/api/news`. Story pages and AI drafts still read the full item
 * from `getNews()` / the shard merge before this copy is made.
 */
export function toListItem(item: NewsItem): NewsItem {
  if (!Object.prototype.hasOwnProperty.call(item, 'excerpt')) return item;
  const copy = { ...item };
  delete copy.excerpt;
  return copy;
}

export function toListPayload(payload: NewsPayload): NewsPayload {
  return { ...payload, items: payload.items.map(toListItem) };
}
