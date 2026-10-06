import type { Feed } from './feeds';
import type { NewsItem } from './types';

const PER_FEED = 12;

export function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function decodeText(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLink(raw: string): string {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return '';
  }
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeText(match[1]) : '';
}

function atomLink(block: string): string {
  const match = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return match?.[1] ?? '';
}

function toIso(raw: string): string {
  if (!raw) return '';
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? '' : new Date(time).toISOString();
}

function pushItem(items: NewsItem[], feed: Feed, title: string, link: string, pubDate: string) {
  const normalized = normalizeLink(link);
  if (!title || !normalized || items.length >= PER_FEED) return;
  items.push({
    id: stableId(normalized),
    title: title.slice(0, 300),
    link: normalized,
    source: feed.label,
    sourceUrl: feed.homepage,
    regions: feed.regions,
    pubDate: toIso(pubDate),
  });
}

export function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const items: NewsItem[] = [];
  const rss = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = rss.exec(xml)) !== null) {
    const block = match[1];
    pushItem(items, feed, tagText(block, 'title'), tagText(block, 'link') || atomLink(block), tagText(block, 'pubDate') || tagText(block, 'dc:date'));
  }
  if (items.length > 0) return items;

  const atom = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = atom.exec(xml)) !== null) {
    const block = match[1];
    pushItem(items, feed, tagText(block, 'title'), atomLink(block) || tagText(block, 'link'), tagText(block, 'updated') || tagText(block, 'published'));
  }
  return items;
}

export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const link = normalizeLink(item.link);
    if (!link || seen.has(link)) continue;
    seen.add(link);
    out.push({ ...item, link, id: stableId(link) });
  }
  return out.sort((a, b) => {
    const left = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const right = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return right - left;
  });
}
