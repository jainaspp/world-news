/**
 * newsFetcher.ts — Production news fetch architecture
 *
 * Strategy: Browser-first, multi-layer fallback
 * - Layer 1 (primary):   Google News RSS direct (browser → Google, no proxy)
 * - Layer 2 (backup):   BBC / regional RSS via CORS proxy
 * - Layer 3 (last opt): NewsData.io API direct (has CORS, 2000/day)
 * - Base (always):       localStorage cache (instant + background refresh)
 *
 * Vercel serverless CANNOT reach external sites — all fetch is browser-side.
 */

import { NewsItem } from '../types';

// ─── Constants ────────────────────────────────────────────────
const CACHE_PREFIX = 'wn_v2_';   // versioned key to bust old cache
const CACHE_TTL    = 10 * 60 * 1000; // 10 minutes

// CORS proxy rotation — first one that responds wins
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors.sh/',
];

let _proxyIndex = 0;
function getProxy(url: string): string {
  // Rotate through proxies to distribute load
  const proxy = CORS_PROXIES[_proxyIndex % CORS_PROXIES.length];
  _proxyIndex++;
  return proxy + encodeURIComponent(url);
}

// ─── ID / text helpers ────────────────────────────────────────
function sid(t: string, l: string): number {
  const s = (t + '|' + l).replace(/\s+/g, ' ').trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function dh(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c))
    .replace(/<[^>]+>/g, '').trim();
}

// ─── RSS Parser ────────────────────────────────────────────────
function parseRSS(xml: string, source: string): NewsItem[] {
  if (!xml || xml.length < 50) return [];
  const items: NewsItem[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const gt = (block: string, tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
  };
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 12) {
    const b = m[1];
    const lp = gt(b,'link'), up = lp.match(/[?&]url=([^&]+)/);
    const link = up ? decodeURIComponent(up[1]) : lp;
    const title = gt(b,'title');
    if (!title || !link) continue;
    const imgM = b.match(/<media:content[^>]+url=["']([^"']+)["']/i)
              || b.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
              || b.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const desc = gt(b,'description');
    const pd   = gt(b,'pubDate') || new Date().toISOString();
    items.push({
      id: sid(dh(title), dh(link)), title: dh(title), titleTL: {},
      summary: dh(desc).slice(0, 300), summaryTL: {},
      link, source, pubDate: pd, imageUrl: imgM ? imgM[1] : '',
    });
  }
  return items;
}

// ─── Google News RSS config ───────────────────────────────────
// hl= language, gl=geolocation, ceid=content region identifier
const GN_CONFIG: Record<string, { q: string; hl: string; gl: string; ceid: string }> = {
  ALL: { q: 'world news today breaking',        hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ASI: { q: 'Asia Pacific news',                hl: 'en-US', gl: 'US', ceid: 'US:en' },
  EAS: { q: 'East Asia Taiwan Japan Korea',     hl: 'en-US', gl: 'US', ceid: 'US:en' },
  SEA: { q: 'Southeast Asia news',              hl: 'en-US', gl: 'SG', ceid: 'SG:en' },
  TWN: { q: 'Taiwan news',                     hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant' },
  CHN: { q: 'China news',                     hl: 'en-US', gl: 'US', ceid: 'US:en' },
  HKG: { q: 'Hong Kong news',                  hl: 'en-HK', gl: 'HK', ceid: 'HK:en' },
  JPN: { q: 'Japan news today',                hl: 'ja-JP', gl: 'JP', ceid: 'JP:ja' },
  KOR: { q: 'South Korea news',                hl: 'ko-KR', gl: 'KR', ceid: 'KR:ko' },
  IND: { q: 'India news today',                 hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
  EUR: { q: 'Europe news today',               hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  UK:  { q: 'UK news Britain',                hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  FRA: { q: 'France news today',               hl: 'fr-FR', gl: 'FR', ceid: 'FR:fr' },
  DEU: { q: 'Germany news today',              hl: 'de-DE', gl: 'DE', ceid: 'DE:de' },
  RUS: { q: 'Russia news today',              hl: 'en-US', gl: 'US', ceid: 'US:en' },
  UKR: { q: 'Ukraine war news',               hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ME:  { q: 'Middle East news',              hl: 'en-AE', gl: 'AE', ceid: 'AE:en' },
  AFR: { q: 'Africa news today',              hl: 'en-US', gl: 'US', ceid: 'US:en' },
  AM:  { q: 'Americas news today',            hl: 'en-US', gl: 'US', ceid: 'US:en' },
  USA: { q: 'United States news',              hl: 'en-US', gl: 'US', ceid: 'US:en' },
  BRA: { q: 'Brazil Latin America news',       hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt' },
  OCE: { q: 'Australia New Zealand news',      hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
  MIL: { q: 'military defense war',            hl: 'en-US', gl: 'US', ceid: 'US:en' },
  POL: { q: 'politics government election',     hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ECO: { q: 'economy finance stock market',   hl: 'en-US', gl: 'US', ceid: 'US:en' },
  TEC: { q: 'technology AI science innovation', hl: 'en-US', gl: 'US', ceid: 'US:en' },
  SCI: { q: 'science space NASA discovery',   hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ENV: { q: 'climate environment weather',      hl: 'en-US', gl: 'US', ceid: 'US:en' },
  SPO: { q: 'sports football olympics',        hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ENT: { q: 'entertainment movie culture',     hl: 'en-US', gl: 'US', ceid: 'US:en' },
};

// ─── Regional RSS feeds (via CORS proxy) ─────────────────────
// Each region has 3-5 targeted sources
const RSS_FEEDS: Record<string, Array<{ url: string; source: string }>> = {
  ALL: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',               source: 'BBC World' },
    { url: 'https://feeds.reuters.com/reuters/worldnews',                source: 'Reuters' },
    { url: 'https://rss.cnn.com/rss/edition_world.rss',                source: 'CNN' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',               source: 'Al Jazeera' },
    { url: 'https://feeds.npr.org/1001/rss.xml',                      source: 'NPR' },
  ],
  ASI: [
    { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',         source: 'BBC Asia' },
    { url: 'https://www.scmp.com/rss/world.xml',                        source: 'SCMP' },
    { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',               source: 'NHK World' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',               source: 'Al Jazeera' },
    { url: 'https://www.channelnewsasia.com/rss',                     source: 'CNA' },
  ],
  EAS: [
    { url: 'https://www.scmp.com/rss/world.xml',                        source: 'SCMP' },
    { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',         source: 'BBC Asia' },
    { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',               source: 'NHK World' },
    { url: 'https://rss.cnn.com/rss/edition_asia.rss',               source: 'CNN Asia' },
    { url: 'https://www.channelnewsasia.com/rss',                     source: 'CNA' },
  ],
  TWN: [
    { url: 'https://www.cna.com.tw/rss/home.html',                     source: 'CNA Taiwan' },
    { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',         source: 'BBC Asia' },
    { url: 'https://www.scmp.com/rss/world.xml',                       source: 'SCMP' },
    { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',               source: 'NHK World' },
  ],
  JPN: [
    { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',               source: 'NHK World' },
    { url: 'https://www.scmp.com/rss/asia.xml',                       source: 'SCMP Asia' },
    { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',        source: 'BBC Asia' },
  ],
  KOR: [
    { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',        source: 'BBC Asia' },
    { url: 'https://www.scmp.com/rss/world.xml',                       source: 'SCMP' },
    { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',               source: 'NHK World' },
  ],
  CHN: [
    { url: 'https://www.scmp.com/rss/world.xml',                       source: 'SCMP' },
    { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',        source: 'BBC Asia' },
  ],
  EUR: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',              source: 'BBC World' },
    { url: 'https://www.theguardian.com/world/rss',                    source: 'Guardian' },
    { url: 'https://rss.dw.com/rdf/rss-en-world',                    source: 'DW' },
    { url: 'https://www.euronews.com/rss?format=xml',                source: 'Euronews' },
  ],
  UK: [
    { url: 'https://feeds.bbci.co.uk/news/uk/rss.xml',               source: 'BBC UK' },
    { url: 'https://www.theguardian.com/uk/rss',                      source: 'Guardian UK' },
  ],
  USA: [
    { url: 'https://rss.cnn.com/rss/edition_us.rss',                 source: 'CNN US' },
    { url: 'https://feeds.npr.org/1001/rss.xml',                     source: 'NPR' },
    { url: 'https://abcnews.go.com/abcnews/topstories/rss',         source: 'ABC News' },
  ],
  UKR: [
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',              source: 'Al Jazeera' },
    { url: 'https://feeds.reuters.com/reuters/worldnews',              source: 'Reuters' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',             source: 'BBC World' },
  ],
  ME: [
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',              source: 'Al Jazeera' },
    { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC ME' },
  ],
  AFR: [
    { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml',     source: 'BBC Africa' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',              source: 'Al Jazeera' },
  ],
  MIL: [
    { url: 'https://www.aljazeera.com/xml/rss/all.xml',              source: 'Al Jazeera' },
    { url: 'https://feeds.reuters.com/reuters/worldnews',              source: 'Reuters' },
  ],
  POL: [
    { url: 'https://www.theguardian.com/politics/rss',               source: 'Guardian Politics' },
    { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',           source: 'BBC Politics' },
  ],
  ECO: [
    { url: 'https://feeds.bloomberg.com/world/news.rss',             source: 'Bloomberg' },
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',          source: 'BBC Business' },
  ],
  TEC: [
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',       source: 'BBC Tech' },
    { url: 'https://rss.cnn.com/rss/edition_technology.rss',           source: 'CNN Tech' },
    { url: 'https://www.theguardian.com/technology/rss',             source: 'Guardian Tech' },
  ],
  SCI: [
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC Science' },
    { url: 'https://rss.cnn.com/rss/edition_space.rss',              source: 'CNN Science' },
  ],
  ENV: [
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC Environment' },
    { url: 'https://www.theguardian.com/environment/rss',           source: 'Guardian Environment' },
  ],
  SPO: [
    { url: 'https://feeds.bbci.co.uk/news/sport/rss.xml',            source: 'BBC Sport' },
    { url: 'https://rss.cnn.com/rss/edition_sport.rss',             source: 'CNN Sport' },
  ],
  ENT: [
    { url: 'https://rss.cnn.com/rss/edition_entertainment.rss',       source: 'CNN Entertainment' },
    { url: 'https://www.theguardian.com/culture/rss',                 source: 'Guardian Culture' },
  ],
};

// ─── NewsData.io (2000 articles/day, browser direct) ──────────
const NEWS_IO_KEY = 'pub_2cc2f7c9e2694779871ea0d95a5a4689';
const ND_REGIONS: Record<string, string[]> = {
  ALL:[], ASI:['cn','jp','kr','tw','hk','sg','th'], EAS:['cn','jp','kr','tw','hk'],
  TWN:['tw'], CHN:['cn'], JPN:['jp'], KOR:['kr'], IND:['in'],
  EUR:['gb','de','fr'], UK:['gb'], USA:['us'], UKR:['ua'], RUS:['ru'],
  ME:['ae','sa'], AFR:['za','ng'], OCE:['au','nz'], AM:['us','ca','br'],
};
const ND_CATS: Record<string, string> = {
  ECO:'business', TEC:'technology', SCI:'science', ENV:'environment',
  SPO:'sports', ENT:'entertainment',
};

// ─── Fetch helpers ─────────────────────────────────────────────

/** Layer 1: Google News RSS — browser fetches Google directly (no proxy needed) */
async function fetchGN(group: string): Promise<NewsItem[]> {
  const key = group.toUpperCase().replace('-', '');
  const cfg = GN_CONFIG[key] || GN_CONFIG['ALL'];
  const gnUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cfg.q)}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${cfg.ceid}`;
  try {
    const r = await fetch(gnUrl, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const text = await r.text();
    return parseRSS(text, 'GoogleNews');
  } catch (_) { return []; }
}

/** Layer 2: Regional RSS via CORS proxy */
async function fetchRSSViaProxy(url: string, source: string): Promise<NewsItem[]> {
  // Try direct first (some RSS support CORS)
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (r.ok) { const t = await r.text(); if (t.includes('<item>')) return parseRSS(t, source); }
  } catch { /* fall through */ }
  // Via proxy
  try {
    const r = await fetch(getProxy(url), { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const text = await r.text();
    return parseRSS(text, source);
  } catch { return []; }
}

/** Layer 3: NewsData.io — browser direct (has CORS headers) */
async function fetchND(group: string): Promise<NewsItem[]> {
  const key = group.toUpperCase().replace('-', '');
  const countries = ND_REGIONS[key] || [];
  const cat = ND_CATS[key] || 'world';
  try {
    let url = `https://newsdata.io/api/1/news?apikey=${NEWS_IO_KEY}&category=${cat}&language=en&size=15`;
    if (countries.length > 0) url += '&country=' + countries.join(',');
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return [];
    const d = await r.json();
    if (d.status !== 'success' || !Array.isArray(d.results)) return [];
    return d.results.map((a: any) => ({
      id: sid(dh(a.title||''), dh(a.link||a.url||'')),
      title: dh(a.title||''), titleTL: {},
      summary: dh(a.description||'').slice(0,300), summaryTL: {},
      link: a.link||a.url||'', source: a.source_id||'NewsData',
      pubDate: a.pubDate||new Date().toISOString(),
      imageUrl: a.image_url||a.thumbnail||'',
    }));
  } catch (_) { return []; }
}

// ─── Cache helpers ─────────────────────────────────────────────
export function getCached(group: string): NewsItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + group);
    if (!raw) return null;
    const { items, ts } = JSON.parse(raw) as { items: NewsItem[]; ts: number };
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + group); return null; }
    return items;
  } catch { return null; }
}
export function setCached(group: string, items: NewsItem[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + group, JSON.stringify({ items, ts: Date.now() }));
  } catch { /* ignore */ }
}

// ─── Dedupe + sort ─────────────────────────────────────────────
function process(items: NewsItem[]): NewsItem[] {
  const seen = new Set<number>();
  const uniq: NewsItem[] = [];
  items.forEach(i => { if (!seen.has(i.id)) { seen.add(i.id); uniq.push(i); } });
  const cutoff = Date.now() - 48 * 3600 * 1000;
  return uniq
    .filter(i => { try { return new Date(i.pubDate).getTime() > cutoff; } catch { return false; } })
    .sort((a, b) => { try { return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(); } catch { return 0; } })
    .slice(0, 60)
    .map((i, idx) => i.imageUrl ? i : { ...i, imageUrl: `https://picsum.photos/seed/${(i.id % 900) + 100}/800/450` });
}

// ─── Main fetch ─────────────────────────────────────────────────
export async function fetchAllNews(group = 'ALL'): Promise<NewsItem[]> {
  // 1. Instant cache
  const cached = getCached(group);
  if (cached && cached.length > 0) {
    // Background refresh — try all layers
    Promise.all([
      fetchGN(group).catch(() => []),
      ...(RSS_FEEDS[group.toUpperCase().replace('-','')] || RSS_FEEDS['ALL'])
        .map(f => fetchRSSViaProxy(f.url, f.source).catch(() => [])),
      fetchND(group).catch(() => []),
    ]).then(results => {
      const fresh = process(results.flat());
      if (fresh.length > 0) setCached(group, fresh);
    }).catch(() => {});
    return cached;
  }

  // 2. No cache — fetch all layers concurrently with timeouts
  const key = group.toUpperCase().replace('-', '');
  const feeds = RSS_FEEDS[key] || RSS_FEEDS['ALL'];

  const [gnResult, ...rssResults] = await Promise.all([
    Promise.race([fetchGN(group),           new Promise<NewsItem[]>(r => setTimeout(() => r([]), 10000))]),
    ...feeds.map(f => Promise.race([
      fetchRSSViaProxy(f.url, f.source),
      new Promise<NewsItem[]>(r => setTimeout(() => r([]), 8000)),
    ])),
    Promise.race([fetchND(group),            new Promise<NewsItem[]>(r => setTimeout(() => r([]), 8000))]),
  ]);

  const all = process([gnResult, ...rssResults].flat());
  if (all.length > 0) setCached(group, all);
  return all;
}

export async function searchNews(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    return parseRSS(await r.text(), 'GoogleNews');
  } catch { return []; }
}
