import { categorize, type CategoryId } from './categories.js';
import type { Feed } from './feeds';
import type { NewsItem } from './types';
import { toHK } from './zh.js';

const PER_FEED = 30;

export function stableId(value: string): string {
  let h1 = 2166136261;
  let h2 = 2166136261 ^ 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619);
    h2 ^= code;
    h2 = Math.imul(h2, 2246822519);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`.slice(0, 12);
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
      const name = key.toLowerCase();
      if (name.startsWith('utm_') || name.startsWith('at_')) url.searchParams.delete(key);
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

function safeImage(raw: string): string {
  const trimmed = raw.trim().replace(/&amp;/g, '&');
  if (!trimmed || trimmed.startsWith('data:')) return '';
  const absolute = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  try {
    const url = new URL(absolute);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function looksLikeImage(url: string, type = ''): boolean {
  if (type && !type.toLowerCase().startsWith('image/')) return false;
  return !/\.(mp3|mp4|pdf|zip)(\?|$)/i.test(url);
}

function imageUrl(raw: string | undefined, type = ''): string {
  if (!raw) return '';
  const decoded = raw.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
  const safe = safeImage(decoded);
  if (!safe || !looksLikeImage(safe, type)) return '';
  return safe;
}

function extractImage(block: string): string {
  const mediaTags = block.match(/<media:(?:content|thumbnail)\b[^>]*>/gi) ?? [];
  for (const tag of mediaTags) {
    const url = tag.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = tag.match(/\b(?:type|medium)=["']([^"']+)["']/i)?.[1] ?? '';
    if (type && type !== 'image' && !type.startsWith('image/')) continue;
    const safe = imageUrl(url, type.startsWith('image/') ? type : '');
    if (safe) return safe;
  }
  const enclosure = block.match(/<enclosure\b[^>]*>/i)?.[0] ?? '';
  if (enclosure) {
    const url = enclosure.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = enclosure.match(/\btype=["']([^"']+)["']/i)?.[1] ?? '';
    const imageType = type || (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url ?? '') ? 'image/jpeg' : 'application/octet-stream');
    const safe = imageUrl(url, imageType);
    if (safe) return safe;
  }
  const itunes = block.match(/<itunes:image\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
  const fromItunes = imageUrl(itunes);
  if (fromItunes) return fromItunes;
  const unescaped = block.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  const img = unescaped.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  return imageUrl(img);
}

const EXCERPT_LEN = 180;

function excerptOf(block: string): string {
  const raw = tagText(block, 'description') || tagText(block, 'summary');
  return raw.slice(0, EXCERPT_LEN);
}

/** Skip the OpenCC walk for Latin headlines. Traditional text passes through. */
function hkText(text: string): string {
  if (!/[\u3400-\u9fff]/.test(text)) return text;
  return toHK(text);
}

function categoryNames(block: string): string[] {
  const found: string[] = [];
  const re = /<category\b[^>]*>([\s\S]*?)<\/category>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const name = decodeText(match[1]);
    if (name) found.push(name);
  }
  return found;
}

function pushItem(items: NewsItem[], feed: Feed, block: string, title: string, link: string, pubDate: string) {
  if (feed.includeCategories?.length) {
    const names = categoryNames(block);
    if (!feed.includeCategories.some((part) => names.includes(part))) return;
  }
  addItem(items, feed, title, link, pubDate, excerptOf(block), extractImage(block));
}

function addItem(items: NewsItem[], feed: Feed, title: string, link: string, pubDate: string, excerpt: string, image: string) {
  const normalized = normalizeLink(link);
  if (!title || !normalized) return;
  if (feed.includePaths?.length && !feed.includePaths.some((part) => normalized.includes(part))) return;
  if (items.length >= PER_FEED) return;
  const traditionalTitle = hkText(title).slice(0, 300);
  const traditionalExcerpt = excerpt ? hkText(excerpt) : '';
  const item: NewsItem = {
    id: stableId(normalized),
    title: traditionalTitle,
    link: normalized,
    source: feed.label,
    sourceUrl: feed.homepage,
    regions: feed.regions,
    pubDate: toIso(pubDate),
    category: categorize(traditionalTitle, (feed.category ?? 'world') as CategoryId),
  };
  if (image) item.image = image;
  if (traditionalExcerpt) item.excerpt = traditionalExcerpt;
  items.push(item);
}

function epochIso(value: number): string {
  const ms = value > 0 && value < 1e12 ? value * 1000 : value;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** 香港01 publishes a zone JSON list, not RSS. Titles are already Traditional. */
export function parseHk01Feed(text: string, feed: Feed): NewsItem[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return [];
  }
  if (!payload || typeof payload !== 'object') return [];
  const rows = (payload as { items?: unknown }).items;
  if (!Array.isArray(rows)) return [];
  const items: NewsItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const data = (row as { data?: unknown }).data;
    if (!data || typeof data !== 'object') continue;
    const record = data as Record<string, unknown>;
    if (record.isSponsored === 1 || record.isSponsored === true) continue;
    const title = decodeText(String(record.title ?? ''));
    const link = String(record.canonicalUrl || record.publishUrl || '').trim();
    if (!title || !link) continue;
    const published = typeof record.publishTime === 'number' ? epochIso(record.publishTime) : toIso(String(record.publishTime ?? ''));
    const excerpt = decodeText(String(record.description ?? '')).slice(0, EXCERPT_LEN);
    const imageRecord = record.mainImage;
    const image = imageRecord && typeof imageRecord === 'object'
      ? safeImage(String((imageRecord as { cdnUrl?: unknown }).cdnUrl ?? ''))
      : '';
    addItem(items, feed, title, link, published, excerpt, image);
    if (items.length >= PER_FEED) break;
  }
  return items;
}

/** Now 新聞 publishes a JSON list, not RSS. Titles are already Traditional. */
export function parseNowFeed(text: string, feed: Feed): NewsItem[] {
  let rows: unknown;
  try {
    rows = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const items: NewsItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const newsId = String(record.newsId ?? '').trim();
    const title = decodeText(String(record.title ?? ''));
    if (!newsId || !title) continue;
    const published = typeof record.publishDate === 'number' ? epochIso(record.publishDate) : toIso(String(record.publishDate ?? ''));
    const excerpt = decodeText(String(record.summary ?? record.leading ?? '')).slice(0, EXCERPT_LEN);
    const image = safeImage(typeof record.imageUrl === 'string' ? record.imageUrl : '');
    addItem(items, feed, title, `https://news.now.com/home/local/player?newsId=${newsId}`, published, excerpt, image);
    if (items.length >= PER_FEED) break;
  }
  return items;
}

export function parseFeed(xml: string, feed: Feed): NewsItem[] {
  const items: NewsItem[] = [];
  const rss = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = rss.exec(xml)) !== null) {
    const block = match[1];
    pushItem(items, feed, block, tagText(block, 'title'), tagText(block, 'link') || atomLink(block), tagText(block, 'pubDate') || tagText(block, 'dc:date'));
    if (items.length >= PER_FEED) return items;
  }
  if (items.length > 0) return items;

  const atom = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  while ((match = atom.exec(xml)) !== null) {
    const block = match[1];
    pushItem(items, feed, block, tagText(block, 'title'), atomLink(block) || tagText(block, 'link'), tagText(block, 'updated') || tagText(block, 'published'));
    if (items.length >= PER_FEED) break;
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
