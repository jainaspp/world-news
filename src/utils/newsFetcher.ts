/**
 * newsFetcher — 三級降級策略
 *  1. CF Worker → NewsData.io → 真實 RSS（本地）
 *  當 Worker 無資料時，直接在瀏覽器抓取多個真實 RSS feed
 */
import { fetchGroupByRegion } from './newsApi';

export async function fetchAllNews(group = 'ALL') {
  // Cache（記憶體，5分鐘TTL）
  const cached = _cacheGet(group);
  if (cached) { _bgRefresh(group); return cached; }

  // 1. CF Worker（15秒超時）
  const worker = await _fetchWorker(group);
  if (worker.length > 0) { _cacheSet(group, worker); return worker; }

  // 2. NewsData.io（備用，10秒超時）
  const nd = await _fetchND(group);
  if (nd.length > 0) { _cacheSet(group, nd); return nd; }

  // 3. FALLBACK：直接在瀏覽器抓真實 RSS（永不返回假內容）
  const rss = await fetchGroupByRegion(group);
  if (rss.length > 0) { _cacheSet(group, rss); return rss; }

  // 4. 最終降級：本地 static cache（記憶體，1小時TTL）
  return _fallback(group);
}

// ─── Worker ──────────────────────────────────────────
const WORKER_URL = 'https://jainaspp-world-news.jainaspp.workers.dev';

async function _fetchWorker(group) {
  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 15000);
    const res = await fetch(`${WORKER_URL}/news?group=${group}`, { signal: ac.signal });
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map(normalize);
  } catch { return []; }
}

// ─── NewsData.io ──────────────────────────────────────
const ND_KEYS = [
  'pub_2cc2f7c9e2694779871ea0d95a5a4689',
  'pub_6659e2e08a3b483b89d1a2a5db900301',
];
const LANGS: Record<string, string[]> = {
  ALL: ['en', 'zh', 'ko', 'ja', 'es'],
  HKG: ['en', 'zh'],
};
const REGION_MAP: Record<string, string> = { en: 'ALL', zh: 'CHN', ko: 'KOR', ja: 'JPN', es: 'EUR' };
const HK_RE = /香港|港聞|港股|rthk|hkfp|852|明報/i;

function _sid(a: string, b: string): number {
  let h = 0;
  for (const c of (a + b).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) {
    h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
}

async function _fetchNDLang(lang: string) {
  for (const key of ND_KEYS) {
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 10000);
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${key}&language=${lang}&size=10`,
        { signal: ac.signal }
      );
      clearTimeout(tid);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.results)) continue;
      return json.results.map((i: any) => ({
        id: String(i.article_id || _sid(i.title || '', i.link || '')),
        title: (i.title || '').slice(0, 500),
        titleTL: {} as Record<string, string>,
        summary: ((i.description as string) || (i.content as string) || '').slice(0, 300),
        summaryTL: {} as Record<string, string>,
        link: String(i.link || ''),
        source: String(i.source_id || i.source_name || 'NewsData'),
        pubDate: String(i.pubDate || i.iso_date || new Date().toISOString()),
        imageUrl: String(i.image_url || ''),
        region: REGION_MAP[lang] || 'ALL',
      }));
    } catch { /* next key */ }
  }
  return [];
}

async function _fetchND(group: string) {
  const langs = LANGS[group] || LANGS['ALL'];
  const results = await Promise.all(langs.map(_fetchNDLang));
  const flat = results.flat();
  const seen = new Set<string>();
  const uniq = flat.filter(n => n.title && !seen.has(n.id) && seen.add(n.id));
  return group === 'HKG'
    ? uniq.filter((n: any) => HK_RE.test(n.title)).slice(0, 50)
    : uniq.slice(0, 50);
}

// ─── Normalize ────────────────────────────────────────
function normalize(r: any) {
  return {
    id:       String(r.id || r.article_id || ''),
    title:    String(r.title || ''),
    titleTL:  {} as Record<string, string>,
    summary:  String(r.summary || r.description || r.content || '').slice(0, 300),
    summaryTL:{} as Record<string, string>,
    link:     String(r.link || ''),
    source:   String(r.source || r.source_name || r.source_id || ''),
    pubDate:  String(r.pub_date || r.pubDate || r.iso_date || new Date().toISOString()),
    imageUrl: String(r.image_url || r.imageUrl || ''),
    region:   String(r.region || 'ALL'),
  };
}

// ─── Memory Cache（5分鐘TTL）──────────────────────────
const _cache = new Map<string, { items: any[]; ts: number }>();
const _TTL = 1000 * 60 * 5;
const _FALLBACK_TTL = 1000 * 60 * 60; // 1小時 fallback

function _cacheGet(g: string) {
  const e = _cache.get(g);
  if (!e) return null;
  if (Date.now() - e.ts > _TTL) { _cache.delete(g); return null; }
  return e.items;
}
function _cacheSet(g: string, v: any[]) { _cache.set(g, { items: v, ts: Date.now() }); }

// ─── Fallback（本地記憶體，1小時內保留）──────────────────
let _fallbackItems: any[] | null = null;
let _fallbackTs = 0;

function _fallback(group: string) {
  if (group !== 'ALL') return [];
  if (!_fallbackItems || Date.now() - _fallbackTs > _FALLBACK_TTL) {
    return _fallbackItems ?? [];
  }
  return _fallbackItems;
}

function _bgRefresh(group: string) {
  _fetchWorker(group).then(db => {
    if (db.length > 0) _cacheSet(group, db);
    // 更新 fallback cache
    if (group === 'ALL' && db.length > 0) {
      _fallbackItems = db;
      _fallbackTs = Date.now();
    }
  }).catch(() => {});
}

export function prefetch(group: string) { _bgRefresh(group); }
