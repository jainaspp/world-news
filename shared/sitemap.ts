import type { ContentDoc } from './content.js';
import { columnIndexable } from './contentPage.js';
import { CATEGORY_IDS } from './categories.js';
import { DATA_HUB, DATA_PAGES } from './dataSeries.js';
import { REGIONS } from './feeds.js';
import { civilizationPublicPaths } from './civilizationPage.js';
import { heritagePublicPaths } from './heritagePage.js';

export const SITEMAP_ORIGIN = 'https://world-news.xyz';

const HERITAGE_LASTMOD = '2026-10-09';
const LEGAL_LASTMOD = '2026-10-07';

/** Hubs that stay out even when a column has indexable articles. */
const THIN_HUBS = new Set([
  `${SITEMAP_ORIGIN}/digest/`,
  `${SITEMAP_ORIGIN}/weekly/`,
]);

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

export interface PublishedSitemap {
  briefings?: { key: string; publishedAt: string }[];
  explainers?: { key: string; publishedAt: string }[];
  analyses?: { key: string; publishedAt: string }[];
  digests?: { key: string; publishedAt: string }[];
  weeklies?: { key: string; publishedAt: string }[];
  topics?: { slug: string; updatedAt: string }[];
  todayPaths?: string[];
}

/** Drop whole <url> blocks. Used for /region/twn and any failed digest still sitting in a shell. */
export function omitSitemapLocs(xml: string, locs: string[]): string {
  let next = xml;
  for (const loc of locs) {
    const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\s*<url>\\s*<loc>${escaped}</loc>[\\s\\S]*?</url>`, 'g'), '');
  }
  return next;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function entry(loc: string, freq: string, priority: string, lastmod = ''): SitemapUrl {
  const day = lastmod.slice(0, 10);
  return { loc, changefreq: freq, priority, ...(day ? { lastmod: day } : {}) };
}

function absolute(path: string): string {
  if (path.startsWith('https://')) return path;
  return `${SITEMAP_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/** /region/twn, story pages, the empty digest/weekly hubs, and the noindex /tools/ draft. */
export function blockedSitemapLoc(loc: string): boolean {
  if (THIN_HUBS.has(loc)) return true;
  if (loc.includes('/region/twn')) return true;
  if (loc.includes('/story/')) return true;
  if (isToolsDraftLoc(loc)) return true;
  return false;
}

/**
 * The prep index stays out of the sitemap, including any child path.
 * Remove this only in the same change that drops noindex on a written page.
 * See docs/tools-layer-SCHEMA.md.
 */
function isToolsDraftLoc(loc: string): boolean {
  let path = loc;
  if (loc.startsWith('http://') || loc.startsWith('https://')) {
    try {
      path = new URL(loc).pathname;
    } catch {
      path = loc;
    }
  }
  return path === '/tools' || path.startsWith('/tools/');
}

/**
 * Hubs, legal pages, data pages, and indexable heritage paths.
 * Analysis and topic hubs stay out until a publish passes real rows.
 * Dated /today/ lists are not here: they follow the live board.
 */
export function staticSitemapUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [entry(`${SITEMAP_ORIGIN}/`, 'hourly', '1.0')];
  for (const region of REGIONS) {
    if (region.code === 'ALL' || region.code === 'TWN') continue;
    urls.push(entry(`${SITEMAP_ORIGIN}/region/${region.code.toLowerCase()}`, 'hourly', region.code === 'HKG' ? '0.8' : '0.6'));
  }
  for (const id of CATEGORY_IDS) {
    if (id === 'entertainment') continue;
    urls.push(entry(`${SITEMAP_ORIGIN}/category/${id}`, 'hourly', '0.7'));
  }
  urls.push(
    entry(`${SITEMAP_ORIGIN}/briefing/`, 'daily', '0.7'),
    entry(`${SITEMAP_ORIGIN}/explainer/`, 'daily', '0.7'),
    entry(`${SITEMAP_ORIGIN}/today/`, 'daily', '0.7'),
    entry(`${SITEMAP_ORIGIN}${DATA_HUB.path}`, 'daily', '0.6'),
  );
  for (const page of DATA_PAGES) urls.push(entry(`${SITEMAP_ORIGIN}${page.path}`, 'daily', '0.6'));
  urls.push(entry(`${SITEMAP_ORIGIN}/major/`, 'hourly', '0.8'));
  urls.push(entry(`${SITEMAP_ORIGIN}/category/entertainment`, 'hourly', '0.7'));
  for (const path of civilizationPublicPaths()) {
    urls.push(entry(`${SITEMAP_ORIGIN}${path}`, 'weekly', '0.8', '2026-10-17'));
  }
  for (const path of heritagePublicPaths()) {
    const hub = path === '/on-this-day/' || path === '/hk/landmarks/';
    urls.push(entry(
      `${SITEMAP_ORIGIN}${path}`,
      path.includes('/landmarks/') ? 'monthly' : 'daily',
      hub ? '0.7' : '0.6',
      HERITAGE_LASTMOD,
    ));
  }
  urls.push(
    entry(`${SITEMAP_ORIGIN}/about/`, 'yearly', '0.5', LEGAL_LASTMOD),
    entry(`${SITEMAP_ORIGIN}/privacy/`, 'yearly', '0.5', LEGAL_LASTMOD),
    entry(`${SITEMAP_ORIGIN}/terms/`, 'yearly', '0.4', LEGAL_LASTMOD),
    entry(`${SITEMAP_ORIGIN}/contact/`, 'yearly', '0.4', LEGAL_LASTMOD),
  );
  return urls.filter((row) => !blockedSitemapLoc(row.loc));
}

export function sitemapUrls(published: PublishedSitemap = {}): SitemapUrl[] {
  const urls = staticSitemapUrls();
  const seen = new Set(urls.map((row) => row.loc));
  const add = (row: SitemapUrl) => {
    if (seen.has(row.loc) || blockedSitemapLoc(row.loc)) return;
    seen.add(row.loc);
    urls.push(row);
  };
  if (published.analyses?.length) {
    add(entry(`${SITEMAP_ORIGIN}/analysis/`, 'hourly', '0.7', published.analyses[0]?.publishedAt || ''));
    for (const row of published.analyses) {
      add(entry(`${SITEMAP_ORIGIN}/analysis/${encodeURIComponent(row.key)}`, 'daily', '0.6', row.publishedAt));
    }
  }
  if (published.topics?.length) {
    add(entry(`${SITEMAP_ORIGIN}/topic/`, 'daily', '0.7', published.topics[0]?.updatedAt || ''));
    for (const row of published.topics) {
      add(entry(`${SITEMAP_ORIGIN}/topic/${row.slug}/`, 'daily', '0.7', row.updatedAt));
    }
  }
  for (const row of published.briefings ?? []) {
    add(entry(`${SITEMAP_ORIGIN}/briefing/${row.key}`, 'daily', '0.7', row.publishedAt));
  }
  for (const row of published.explainers ?? []) {
    add(entry(`${SITEMAP_ORIGIN}/explainer/${encodeURIComponent(row.key)}`, 'daily', '0.6', row.publishedAt));
  }
  for (const row of published.digests ?? []) {
    add(entry(`${SITEMAP_ORIGIN}/digest/${row.key}`, 'weekly', '0.5', row.publishedAt));
  }
  for (const row of published.weeklies ?? []) {
    add(entry(`${SITEMAP_ORIGIN}/weekly/${row.key}`, 'monthly', '0.5', row.publishedAt));
  }
  for (const path of published.todayPaths ?? []) {
    const loc = absolute(path);
    const hub = path === '/today/' || loc === `${SITEMAP_ORIGIN}/today/`;
    add(entry(loc, 'daily', hub ? '0.7' : '0.5'));
  }
  return urls;
}

export function renderSitemap(urls: SitemapUrl[]): string {
  const body = urls.map((row) => {
    const day = row.lastmod ? `\n    <lastmod>${escapeXml(row.lastmod)}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(row.loc)}</loc>${day}\n    <changefreq>${row.changefreq}</changefreq>\n    <priority>${row.priority}</priority>\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function staticSitemapXml(): string {
  return renderSitemap(staticSitemapUrls());
}

function publishedFromDocs(docs: ContentDoc[]): PublishedSitemap {
  const published: PublishedSitemap = {
    briefings: [],
    explainers: [],
    analyses: [],
    digests: [],
    weeklies: [],
  };
  for (const doc of docs) {
    if (!columnIndexable(doc)) continue;
    const row = { key: doc.key, publishedAt: doc.publishedAt };
    if (doc.kind === 'briefing') published.briefings?.push(row);
    else if (doc.kind === 'compare') published.explainers?.push(row);
    else if (doc.kind === 'analysis') published.analyses?.push(row);
    else if (doc.kind === 'digest') published.digests?.push(row);
    else if (doc.kind === 'weekly') published.weeklies?.push(row);
  }
  return published;
}

/** Static shell plus indexable docs. Thin shells and /region/twn never appear. */
export function sitemapForPublish(
  docs: ContentDoc[] = [],
  topics: { slug: string; updatedAt: string }[] = [],
  todayPaths: string[] = [],
): string {
  const published = publishedFromDocs(docs);
  published.topics = topics;
  published.todayPaths = todayPaths;
  return renderSitemap(sitemapUrls(published));
}
