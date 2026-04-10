/**
 * newsFetcher — CF Worker 代理（主） + NewsData.io（備）
 * 三個分類：ALL（全球）、HKG（香港）
 */
export async function fetchAllNews(group = 'ALL') {
  // Cache
  const cached = _cacheGet(group);
  if (cached) {
    _bgRefresh(group);
    return cached;
  }
  return _fetchMain(group);
}

async function _fetchMain(group) {
  // 1. 嘗試 CF Worker 代理
  const worker = await _fetchWorker(group);
  if (worker.length > 0) { _cacheSet(group, worker); return worker; }

  // 2. NewsData.io 備用
  const nd = await _fetchND(group);
  if (nd.length > 0) { _cacheSet(group, nd); return nd; }

  return [];
}

async function _fetchWorker(group) {
  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 15000);
    const res = await fetch(`${WORKER_URL}/news?group=${group}`, { signal: ac.signal });
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(r => ({
      id:       String(r.id || ''),
      title:    String(r.title || ''),
      titleTL: {},
      summary:  String(r.summary || '').slice(0, 300),
      summaryTL:{},
      link:     String(r.link || ''),
      source:   String(r.source || ''),
      pubDate:  String(r.pub_date || new Date().toISOString()),
      imageUrl: String(r.image_url || ''),
      region:   String(r.region || 'ALL'),
    }));
  } catch { return []; }
}

// ─── NewsData.io 備用 ───────────────────────────────
const ND_KEYS = ['pub_2cc2f7c9e2694779871ea0d95a5a4689','pub_6659e2e08a3b483b89d1a2a5db900301'];
const LANGS = { ALL:['en','zh','ko','ja','es'], HKG:['en','zh'] };
const REGION_MAP = { en:'ALL', zh:'CHN', ko:'KOR', ja:'JPN', es:'EUR' };
const HK_RE = /香港|港聞|港股|rthk|hkfp|852|明報/i;

function _sid(a, b) {
  let h = 0;
  for (const c of (a+b).replace(/[^a-zA-Z0-9]/g,'').toLowerCase())
    h = (Math.imul(31,h)+c.charCodeAt(0))|0;
  return String(Math.abs(h));
}
function _unesc(s) {
  return (s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
                 .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
}

async function _fetchNDLang(lang) {
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
      return json.results.map(i => ({
        id:       i.article_id || _sid(i.title||'', i.link||''),
        title:    _unesc((i.title||'').slice(0,500)),
        titleTL:  {},
        summary:  _unesc((i.description||i.content||'').slice(0,300)),
        summaryTL:{},
        link:     String(i.link||''),
        source:   String(i.source_id||i.source_name||'NewsData'),
        pubDate:  String(i.pubDate||i.iso_date||new Date().toISOString()),
        imageUrl: String(i.image_url||''),
        region:   REGION_MAP[lang]||'ALL',
      }));
    } catch { /* next key */ }
  }
  return [];
}

async function _fetchND(group) {
  const langs = LANGS[group] || LANGS['ALL'];
  const results = await Promise.all(langs.map(_fetchNDLang));
  const flat = results.flat();
  const seen = new Set();
  const uniq = flat.filter(n => n.title && !seen.has(n.id) && seen.add(n.id));
  return group === 'HKG' ? uniq.filter(n => HK_RE.test(n.title)).slice(0,50) : uniq.slice(0,50);
}

// ─── Cache（5分鐘TTL）───────────────────────────────
const _cache = new Map();
const _TTL = 1000 * 60 * 5;

function _cacheGet(g) {
  const e = _cache.get(g);
  if (!e) return null;
  if (Date.now()-e.ts > _TTL) { _cache.delete(g); return null; }
  return e.items;
}
function _cacheSet(g, v) { _cache.set(g, { items: v, ts: Date.now() }); }

function _bgRefresh(group) {
  _fetchWorker(group).then(db => { if (db.length > 0) _cacheSet(group, db); }).catch(()=>{});
}

export function prefetch(group) { _bgRefresh(group); }

// ─── 常量 ───────────────────────────────────────────
const WORKER_URL = 'https://jainaspp-world-news.jainaspp.workers.dev';
