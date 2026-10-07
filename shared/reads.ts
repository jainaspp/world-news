import type { StoryCluster } from './angles.js';
import type { NewsItem } from './types.js';

/** Distinct story clicks one IP hash may contribute per Hong Kong day. */
export const READ_CAP = 30;
/** Distinct IP hashes remembered per day, so the KV document stays bounded. */
export const READ_HASH_CAP = 4000;

const BOT_RE = /bot\b|spider|crawler|crawl|slurp|facebookexternalhit|whatsapp|telegrambot|curl\/|wget|python-requests|httpie|headlesschrome|preview/i;

export function isBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim();
  if (ua.length < 12) return true;
  return BOT_RE.test(ua);
}

export function hktDay(now = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}

export function isStoryId(id: string): boolean {
  return /^[0-9a-f]{6,16}$/.test(id);
}

export interface ReadBook {
  counts: Record<string, number>;
  seen: Record<string, string[]>;
}

export function emptyBook(): ReadBook {
  return { counts: {}, seen: {} };
}

/**
 * One count per story per IP hash per day, capped at {@link READ_CAP} stories.
 * Returns the next book. The input is not mutated.
 */
export function recordRead(book: ReadBook, ipHash: string, id: string, cap = READ_CAP): { book: ReadBook; counted: boolean } {
  if (!ipHash || !isStoryId(id)) return { book, counted: false };
  if (!book.seen[ipHash] && Object.keys(book.seen).length >= READ_HASH_CAP) return { book, counted: false };
  const seen = book.seen[ipHash] ?? [];
  if (seen.includes(id) || seen.length >= cap) return { book, counted: false };
  return {
    counted: true,
    book: {
      counts: { ...book.counts, [id]: (book.counts[id] ?? 0) + 1 },
      seen: { ...book.seen, [ipHash]: [...seen, id] },
    },
  };
}

export async function hashIp(ip: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${day}|${ip}|world-news-reads`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function clientIp(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return 'unknown';
}

export interface PopularRow {
  id: string;
  title: string;
  link: string;
  source: string;
  count: number;
  outlets: number;
  fallback: boolean;
}

/**
 * Top stories by today's private click counts.
 * When fewer than `minReal` counted headlines are still on the board, fill with the
 * freshest multi-outlet clusters. Those rows are marked fallback and carry a zero count.
 */
export function buildPopular(
  counts: Record<string, number>,
  items: NewsItem[],
  clusters: StoryCluster[],
  limit = 10,
  minReal = 3,
): PopularRow[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ranked = Object.entries(counts)
    .map(([id, count]) => ({ item: byId.get(id), count }))
    .filter((row): row is { item: NewsItem; count: number } => Boolean(row.item) && row.count > 0)
    .sort((a, b) => b.count - a.count || Date.parse(b.item.pubDate) - Date.parse(a.item.pubDate));

  const rows: PopularRow[] = ranked.slice(0, limit).map((row) => ({
    id: row.item.id,
    title: row.item.title,
    link: row.item.link,
    source: row.item.source,
    count: row.count,
    outlets: 0,
    fallback: false,
  }));

  if (rows.length >= minReal) return rows;

  const used = new Set(rows.map((row) => row.id));
  const filler = [...clusters].sort((a, b) => b.latest - a.latest);
  for (const cluster of filler) {
    if (rows.length >= limit) break;
    if (used.has(cluster.lead.id)) continue;
    used.add(cluster.lead.id);
    rows.push({
      id: cluster.lead.id,
      title: cluster.lead.title,
      link: cluster.lead.link,
      source: cluster.lead.source,
      count: 0,
      outlets: cluster.count,
      fallback: true,
    });
  }
  return rows;
}
