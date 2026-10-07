import type { NewsItem } from './types.js';

/** Characters of page lead text kept as model input. The page itself is not republished. */
export const LEAD_CAP = 600;
/** Article fetches per generate call, inside the Workers subrequest budget. */
export const LEAD_FETCHES = 4;
export const LEAD_TIMEOUT_MS = 4_000;

function decode(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html: string, attr: string, key: string): string {
  const pattern = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const swapped = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  return decode(html.match(pattern)?.[1] || html.match(swapped)?.[1] || '');
}

/** og:description, meta description, then the first two or three real paragraphs. */
export function extractLead(html: string, cap = LEAD_CAP): string {
  const summary = meta(html, 'property', 'og:description') || meta(html, 'name', 'description') || meta(html, 'name', 'twitter:description');
  const paragraphs: string[] = [];
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decode(match[1] || '');
    if (text.length < 40) continue;
    paragraphs.push(text);
    if (paragraphs.length >= 3) break;
  }
  const unique: string[] = [];
  for (const part of [summary, ...paragraphs]) {
    if (!part || unique.includes(part)) continue;
    unique.push(part);
  }
  return unique.join(' ').slice(0, cap);
}

/**
 * Fill short excerpts from the article page. Used only as synthesis input.
 * Existing long excerpts are left alone. Failures keep the headline.
 */
export async function enrichExcerpts(items: NewsItem[], fetchImpl: typeof fetch = fetch, limit = LEAD_FETCHES): Promise<NewsItem[]> {
  const pending = items.filter((item) => /^https?:\/\//.test(item.link) && (item.excerpt || '').length < 180).slice(0, limit);
  const leads = new Map<string, string>();
  await Promise.all(pending.map(async (item) => {
    try {
      const response = await fetchImpl(item.link, {
        redirect: 'follow',
        signal: AbortSignal.timeout(LEAD_TIMEOUT_MS),
        headers: { 'user-agent': 'world-news.xyz lead fetch' },
      });
      if (!response.ok) return;
      const html = (await response.text()).slice(0, 200_000);
      const lead = extractLead(html);
      if (lead) leads.set(item.link, lead);
    } catch {
      /* timeout or a blocked page: the headline is still usable */
    }
  }));
  return items.map((item) => (leads.has(item.link) ? { ...item, excerpt: leads.get(item.link) } : item));
}
