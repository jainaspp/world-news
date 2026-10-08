import { isCategoryId } from './categories.js';
import { FEEDS, REGIONS, removedFromTaiwanPage } from './feeds.js';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

/** Today plus the previous few days. */
export const SEARCH_DAYS = 4;

export interface SearchHeadline {
  id: string;
  title: string;
  link: string;
  source: string;
  regions: string[];
  category?: string;
  pubDate: string;
}

export interface SearchArticle {
  id: string;
  title: string;
  description: string;
  href: string;
  category?: string;
  publishedAt: string;
  kind: 'briefing' | 'explainer' | 'analysis' | 'digest' | 'topic';
  /** Shown above the title. */
  label: string;
  regions?: string[];
}

export interface SearchCorpus {
  headlines: SearchHeadline[];
  articles: SearchArticle[];
}

export interface SearchHit {
  kind: 'headline' | 'article';
  title: string;
  href: string;
  source: string;
  meta: string;
  category?: string;
  regions: string[];
}

const REGION_CODES = new Set(REGIONS.map((region) => region.code));

const regionsBySource = new Map<string, string[]>();
for (const feed of FEEDS) {
  const prev = regionsBySource.get(feed.label) ?? [];
  const next = [...prev];
  for (const region of feed.regions) if (!next.includes(region)) next.push(region);
  regionsBySource.set(feed.label, next);
}

export function regionsForSource(source: string): string[] {
  return regionsBySource.get(source) ?? [];
}

export function normalizeRegion(value: string | null | undefined): string {
  const code = (value || 'ALL').toUpperCase();
  return REGION_CODES.has(code) ? code : 'ALL';
}

export function normalizeCategory(value: string | null | undefined): string {
  const id = (value || 'all').toLowerCase();
  return id === 'all' || isCategoryId(id) ? id : 'all';
}

export function withinDays(iso: string, now = Date.now(), days = SEARCH_DAYS): boolean {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return false;
  const age = now - at;
  return age >= -3600_000 && age <= days * 24 * 3600 * 1000;
}

function tokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter((token) => token.length > 0).slice(0, 8);
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = text.toLowerCase();
  if (hay.includes(q)) return true;
  const parts = tokens(q);
  return parts.length > 1 && parts.every((part) => hay.includes(part));
}

/** Escape, then wrap each query token in <mark>. */
export function highlight(text: string, query: string): string {
  let html = esc(text);
  const parts = [...new Set([query.trim(), ...tokens(query)].filter((part) => part.length > 0))];
  const ordered = parts.sort((a, b) => b.length - a.length);
  for (const part of ordered) {
    const safe = esc(part);
    if (!safe) continue;
    const pattern = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    html = html.replace(pattern, (match) => `<mark>${match}</mark>`);
  }
  return html;
}

function regionOk(regions: string[], region: string): boolean {
  if (!region || region === 'ALL') return true;
  return regions.includes(region);
}

function categoryOk(category: string | undefined, filter: string): boolean {
  if (!filter || filter === 'all') return true;
  return category === filter;
}

export function searchReader(
  corpus: SearchCorpus,
  opts: { q?: string; region?: string; category?: string; now?: number; limit?: number },
): SearchHit[] {
  const query = (opts.q || '').trim().slice(0, 80);
  const region = normalizeRegion(opts.region);
  const category = normalizeCategory(opts.category);
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? 40;
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const article of corpus.articles) {
    if (!withinDays(article.publishedAt, now)) continue;
    if (!categoryOk(article.category, category)) continue;
    const articleRegions = article.regions ?? [];
    if (!regionOk(articleRegions, region)) continue;
    const text = `${article.title} ${article.description} ${article.label}`;
    if (!matchesQuery(text, query)) continue;
    if (seen.has(article.href)) continue;
    seen.add(article.href);
    hits.push({
      kind: 'article',
      title: article.title,
      href: article.href,
      source: article.label,
      meta: article.description,
      ...(article.category ? { category: article.category } : {}),
      regions: articleRegions,
    });
    if (hits.length >= limit) return hits;
  }

  for (const item of corpus.headlines) {
    if (!withinDays(item.pubDate, now)) continue;
    if (!regionOk(item.regions, region)) continue;
    if (region === 'TWN' && removedFromTaiwanPage(item)) continue;
    if (!categoryOk(item.category, category)) continue;
    const text = `${item.title} ${item.source}`;
    if (!matchesQuery(text, query)) continue;
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    hits.push({
      kind: 'headline',
      title: item.title,
      href: item.link,
      source: item.source,
      meta: item.source,
      ...(item.category ? { category: item.category } : {}),
      regions: item.regions,
    });
    if (hits.length >= limit) break;
  }
  return hits.slice(0, limit);
}
