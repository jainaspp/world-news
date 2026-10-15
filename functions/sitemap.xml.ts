import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { clusterRecent } from '../shared/board.js';
import { briefingPublic, explainerCurrent, hktParts, type ContentDoc, type IndexEntry } from '../shared/content.js';
import { DATA_HUB, DATA_PAGES } from '../shared/dataSeries.js';
import { materialFromBoard } from '../shared/grok.js';
import { heritagePublicPaths } from '../shared/heritagePage.js';
import { buildToday, indexableTodayPaths, onHktDate, TODAY_INDEX_FLOOR } from '../shared/todayPage.js';
import { readBoard } from './board/store.js';
import { indexableEntries } from './content/mustRead.js';
import { docKey, readDoc, readIndex, type ContentEnv, type SavedDoc } from './content/store.js';
import { publicTopicPaths } from './content/topics.js';
import type { PagesContext } from './env.js';

/** Drop whole <url> blocks. Used for /region/twn and any failed digest still sitting in the static file. */
export function omitSitemapLocs(xml: string, locs: string[]): string {
  let next = xml;
  for (const loc of locs) {
    const escaped = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\s*<url>\\s*<loc>${escaped}</loc>[\\s\\S]*?</url>`, 'g'), '');
  }
  return next;
}

function entry(loc: string, lastmod: string, freq: string, priority: string): string {
  const day = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${day}\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

const LEGAL: [string, string, string][] = [
  ['https://world-news.xyz/about/', 'yearly', '0.5'],
  ['https://world-news.xyz/privacy/', 'yearly', '0.5'],
  ['https://world-news.xyz/terms/', 'yearly', '0.4'],
  ['https://world-news.xyz/contact/', 'yearly', '0.4'],
];

const HOME = 'https://world-news.xyz/';

/** Always dropped, including on the static-shell fallback. */
const ALWAYS_THIN = [
  'https://world-news.xyz/region/twn',
  'https://world-news.xyz/digest/',
  'https://world-news.xyz/weekly/',
];

/**
 * Newest rows whose bodies are checked per column. Indexes are newest-first.
 * Older rows are left out so a full briefing archive cannot exhaust Worker CPU or subrequests.
 */
export const SITEMAP_DOC_CAP = 80;

/** Concurrent KV reads. One Promise.all over the whole index is what spiked CPU under load. */
const SITEMAP_READ_BATCH = 8;

const READ_TIMEOUT_MS = 1500;

const HOMEPAGE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${HOME}</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

function xmlResponse(xml: string, maxAge: number): Response {
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}`,
    },
  });
}

function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    Promise.resolve(work).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

function usableSitemap(xml: string): boolean {
  return xml.includes('<urlset') && xml.includes('</urlset>') && xml.includes('<loc>');
}

/** Static shell when the merge throws; homepage urlset when the shell never arrived. */
function fallbackSitemap(shell: string): string {
  if (!usableSitemap(shell)) return HOMEPAGE_SITEMAP;
  try {
    const xml = omitSitemapLocs(shell, ALWAYS_THIN);
    return usableSitemap(xml) ? xml : HOMEPAGE_SITEMAP;
  } catch {
    return HOMEPAGE_SITEMAP;
  }
}

async function loadShell(context: PagesContext): Promise<string> {
  const assets = context.env.ASSETS as { fetch(request: Request): Promise<Response> } | undefined;
  if (!assets) return '';
  return withTimeout(
    assets.fetch(context.request).then((response) => response.text()).catch(() => ''),
    READ_TIMEOUT_MS,
    '',
  );
}

async function readIndexSafe(env: ContentEnv, kind: ContentDoc['kind']): Promise<IndexEntry[]> {
  return withTimeout(readIndex(env, kind).catch(() => []), READ_TIMEOUT_MS, []);
}

/** Same indexable filter as the columns, but never one Promise.all over the whole index. */
async function indexableCapped(env: ContentEnv, kind: ContentDoc['kind'], rows: IndexEntry[], deadline: number): Promise<IndexEntry[]> {
  const capped = rows.slice(0, SITEMAP_DOC_CAP);
  const out: IndexEntry[] = [];
  for (let i = 0; i < capped.length; i += SITEMAP_READ_BATCH) {
    if (Date.now() > deadline) break;
    const batch = capped.slice(i, i + SITEMAP_READ_BATCH);
    const found = await withTimeout(indexableEntries(env, kind, batch).catch(() => []), READ_TIMEOUT_MS, []);
    out.push(...found);
  }
  return out;
}

async function readDocsCapped(env: ContentEnv, kind: ContentDoc['kind'], rows: IndexEntry[], deadline: number): Promise<(SavedDoc | null)[]> {
  const capped = rows.slice(0, SITEMAP_DOC_CAP);
  const saved: (SavedDoc | null)[] = new Array(capped.length).fill(null);
  for (let i = 0; i < capped.length; i += SITEMAP_READ_BATCH) {
    if (Date.now() > deadline) break;
    const batch = capped.slice(i, i + SITEMAP_READ_BATCH);
    await Promise.all(batch.map(async (row, offset) => {
      saved[i + offset] = await withTimeout(
        readDoc(env, docKey(kind, row.key)).catch(() => null),
        READ_TIMEOUT_MS,
        null,
      );
    }));
  }
  return saved;
}

/**
 * Static sitemap plus saved AI columns.
 * Thin headline pages are omitted. The board is read only to decide which /today/ lists are indexable.
 * Any failure returns 200 with the static shell, or a homepage urlset, so crawlers never see 5xx.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  let shell = '';
  try {
    shell = await loadShell(context);
    applyRuntimeEnv(context.env);
    const xml = await buildSitemap(context.env as ContentEnv, shell);
    if (!usableSitemap(xml)) throw new Error('sitemap empty');
    return xmlResponse(xml, 600);
  } catch (error) {
    console.error('sitemap.xml fallback', error instanceof Error ? error.message : error);
    return xmlResponse(fallbackSitemap(shell), 60);
  }
}

async function buildSitemap(env: ContentEnv, base: string): Promise<string> {
  const deadline = Date.now() + 4000;
  const [analysis, digest, weekly, briefing, compare] = await Promise.all([
    readIndexSafe(env, 'analysis'),
    readIndexSafe(env, 'digest'),
    readIndexSafe(env, 'weekly'),
    readIndexSafe(env, 'briefing'),
    readIndexSafe(env, 'compare'),
  ]);
  const explainers = await currentExplainers(env, compare, deadline);
  const briefings = await currentBriefings(env, briefing, deadline);
  const analysisPub = await indexableCapped(env, 'analysis', analysis, deadline);
  const digestPub = await indexableCapped(env, 'digest', digest, deadline);
  const weeklyPub = await indexableCapped(env, 'weekly', weekly, deadline);
  const legal = LEGAL
    .filter(([loc]) => !base.includes(loc))
    .map(([loc, freq, priority]) => entry(loc, '2026-10-07', freq, priority))
    .join('');
  const extra = [
    ...analysisPub.map((row) => entry(`https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
    ...digestPub.map((row) => entry(`https://world-news.xyz/digest/${row.key}`, row.publishedAt, 'weekly', '0.5')),
    ...weeklyPub.map((row) => entry(`https://world-news.xyz/weekly/${row.key}`, row.publishedAt, 'monthly', '0.5')),
    ...briefings.map((row) => entry(`https://world-news.xyz/briefing/${row.key}`, row.publishedAt, 'daily', '0.7')),
    ...explainers.map((row) => entry(`https://world-news.xyz/explainer/${encodeURIComponent(row.key)}`, row.publishedAt, 'daily', '0.6')),
  ].join('');
  const home = base.includes(`${HOME}</loc>`) ? '' : entry(HOME, new Date().toISOString(), 'hourly', '1.0');
  const major = base.includes('/major/') ? '' : entry('https://world-news.xyz/major/', new Date().toISOString(), 'hourly', '0.8');
  const dataLocs: [string, string, string][] = [
    [`https://world-news.xyz${DATA_HUB.path}`, 'daily', '0.6'],
    ...DATA_PAGES.map((page) => [`https://world-news.xyz${page.path}`, 'daily', '0.6'] as [string, string, string]),
  ];
  const data = dataLocs
    .filter(([loc]) => !base.includes(loc))
    .map(([loc, freq, priority]) => entry(loc, '2026-10-07', freq, priority))
    .join('');
  const topicRows = await withTimeout(publicTopicPaths(env).catch(() => []), READ_TIMEOUT_MS, []);
  const topics = topicRows
    .filter((row) => !base.includes(`https://world-news.xyz/topic/${row.slug}/`))
    .map((row) => entry(`https://world-news.xyz/topic/${row.slug}/`, row.updatedAt, 'daily', '0.7'))
    .join('');
  const topicIndex = topicRows.length && !base.includes('https://world-news.xyz/topic/</loc>')
    ? entry('https://world-news.xyz/topic/', new Date().toISOString(), 'daily', '0.7')
    : '';
  const analysisHub = analysisPub.length && !base.includes('https://world-news.xyz/analysis/</loc>')
    ? entry('https://world-news.xyz/analysis/', analysisPub[0]?.publishedAt || new Date().toISOString(), 'hourly', '0.7')
    : '';
  const heritage = heritagePublicPaths()
    .filter((path) => !base.includes(`https://world-news.xyz${path}`))
    .map((path) => entry(`https://world-news.xyz${path}`, '2026-10-09', path.includes('/landmarks/') ? 'monthly' : 'daily', path === '/hk/landmarks/' || path === '/on-this-day/' ? '0.7' : '0.6'))
    .join('');
  const today = (await withTimeout(todayLocs(env), READ_TIMEOUT_MS, ['/today/']))
    .filter((path) => !base.includes(`https://world-news.xyz${path}`))
    .map((path) => entry(`https://world-news.xyz${path}`, new Date().toISOString(), 'daily', path === '/today/' ? '0.7' : '0.5'))
    .join('');
  const published = new Set([
    ...analysisPub.map((row) => `https://world-news.xyz/analysis/${encodeURIComponent(row.key)}`),
    ...digestPub.map((row) => `https://world-news.xyz/digest/${row.key}`),
    ...weeklyPub.map((row) => `https://world-news.xyz/weekly/${row.key}`),
  ]);
  const merged = base.includes('</urlset>')
    ? base.replace('</urlset>', `${home}${major}${legal}${data}${heritage}${today}${analysisHub}${topicIndex}${topics}${extra}</urlset>`)
    : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${home}${major}${legal}${data}${heritage}${today}${analysisHub}${topicIndex}${topics}${extra}</urlset>\n`;
  const withoutShells = merged.replace(
    /\s*<url>\s*<loc>(https:\/\/world-news\.xyz\/(?:digest|weekly|analysis)\/[^<]+)<\/loc>[\s\S]*?<\/url>/g,
    (block, loc: string) => (published.has(loc) ? block : ''),
  );
  const thinHubs = [...ALWAYS_THIN];
  if (!analysisPub.length) thinHubs.push('https://world-news.xyz/analysis/');
  if (!topicRows.length) thinHubs.push('https://world-news.xyz/topic/');
  return omitSitemapLocs(withoutShells, thinHubs);
}

/** Briefings under the floor stay out of the sitemap. */
async function currentBriefings(env: ContentEnv, rows: IndexEntry[], deadline: number): Promise<IndexEntry[]> {
  const capped = rows.slice(0, SITEMAP_DOC_CAP);
  const saved = await readDocsCapped(env, 'briefing', capped, deadline);
  return capped.filter((_row, index) => {
    try {
      const doc = saved[index]?.doc;
      return Boolean(doc && briefingPublic(doc));
    } catch {
      return false;
    }
  });
}

/** Old-format comparisons stay out of the sitemap until they are rewritten. */
async function currentExplainers(env: ContentEnv, rows: IndexEntry[], deadline: number): Promise<IndexEntry[]> {
  const capped = rows.slice(0, SITEMAP_DOC_CAP);
  const saved = await readDocsCapped(env, 'compare', capped, deadline);
  return capped.filter((_row, index) => {
    try {
      const doc = saved[index]?.doc;
      return Boolean(doc && explainerCurrent(doc));
    } catch {
      return false;
    }
  });
}

/** /today/ plus the day it shows, and only region or category lists with enough stories to be indexed. */
async function todayLocs(env: ContentEnv): Promise<string[]> {
  try {
    const board = await readBoard(env).catch(() => null);
    const source = board && board.headlines.length > 200
      ? {
        ...board,
        headlines: [...board.headlines]
          .sort((a, b) => String(b.pubDate).localeCompare(String(a.pubDate)) || a.id.localeCompare(b.id))
          .slice(0, 200),
      }
      : board;
    const items = materialFromBoard(source)?.items ?? [];
    if (!items.length) return ['/today/'];
    const date = hktParts(new Date()).date;
    const build = (day: string) => buildToday({
      clusters: clusterRecent(items.filter((item) => onHktDate(item, day))),
      date: day,
      today: day === date,
    });
    let model = build(date);
    if (model.stories.length < TODAY_INDEX_FLOOR) {
      const previous = build(hktParts(new Date(Date.now() - 24 * 60 * 60 * 1000)).date);
      if (previous.stories.length > model.stories.length) model = previous;
    }
    return indexableTodayPaths(model);
  } catch {
    return ['/today/'];
  }
}
