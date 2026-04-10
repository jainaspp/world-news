/**
 * newsFetcher — NewsData.io 直連（瀏覽器 → NewsData.io，繞過 Supabase）
 * 三個分類：ALL（全球）、HKG（香港）
 * 數據源：NewsData.io（5語言 × 10條）
 */
export interface NewsItem {
  id: string; title: string; titleTL: Record<string,string>;
  summary: string; summaryTL: Record<string,string>;
  link: string; source: string; pubDate: string;
  imageUrl: string; region: string;
}

// NewsData.io API keys（兩個 key 輪流）
const KEYS = [
  'pub_2cc2f7c9e2694779871ea0d95a5a4689',
  'pub_6659e2e08a3b483b89d1a2a5db900301',
];

// 每個分類對應的語言
const LANGS: Record<string,string[]> = {
  ALL: ['en', 'zh', 'ko', 'ja', 'es'],
  HKG: ['en', 'zh'],
};
const REGION_MAP: Record<string,string> = {
  en:'ALL', zh:'CHN', ko:'KOR', ja:'JPN', es:'EUR',
};

// ─── Cache（記憶體，5分鐘TTL）──────────────────────────────
const _cache = new Map<string, {items:NewsItem[]; ts:number}>();
const _TTL = 1000*60*5;

function cGet(g: string): NewsItem[]|null {
  const e = _cache.get(g);
  if (!e) return null;
  if (Date.now()-e.ts > _TTL) { _cache.delete(g); return null; }
  return e.items;
}
function cSet(g: string, v: NewsItem[]) { _cache.set(g,{items:v,ts:Date.now()}); }

// ─── 工具 ───────────────────────────────────────────────
function sid(a='', b='') {
  let h = 0;
  for (const c of (a+b).replace(/[^a-zA-Z0-9]/g,'').toLowerCase())
    h = (Math.imul(31,h)+c.charCodeAt(0))|0;
  return String(Math.abs(h));
}

function unesc(s: string) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
}

// ─── NewsData.io 單語言抓取 ──────────────────────────────
async function fetchLang(lang: string): Promise<NewsItem[]> {
  for (const key of KEYS) {
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 10000);
      const url = `https://newsdata.io/api/1/news?apikey=${key}&language=${lang}&size=10`;
      const res = await fetch(url, { signal: ac.signal });
      clearTimeout(tid);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.results)) continue;
      return json.results.map((i: any) => ({
        id:       i.article_id || sid(i.title||'', i.link||''),
        title:    unesc((i.title||'').slice(0,500)),
        titleTL:  {},
        summary:  unesc((i.description||i.content||'').slice(0,300)),
        summaryTL:{},
        link:     String(i.link||''),
        source:   String(i.source_id||i.source_name||'NewsData'),
        pubDate:  String(i.pubDate||i.iso_date||new Date().toISOString()),
        imageUrl: String(i.image_url||''),
        region:   REGION_MAP[lang]||'ALL',
      }));
    } catch { /* try next key */ }
  }
  return [];
}

// ─── HK 關鍵詞過濾 ──────────────────────────────────────
const HK_RE = /香港|港聞|港股|rthk|hkfp|852|明報/i;

function isHK(item: NewsItem): boolean {
  return HK_RE.test(item.title);
}

// ─── 主導出 ─────────────────────────────────────────────
export async function fetchAllNews(group = 'ALL'): Promise<NewsItem[]> {
  // Cache 命中 → 馬上回應
  const cached = cGet(group);
  if (cached) {
    fetchAllNewsBg(group); // 後台更新 cache
    return cached;
  }
  return fetchAllNewsBg(group);
}

async function fetchAllNewsBg(group: string): Promise<NewsItem[]> {
  const langs = LANGS[group] || LANGS['ALL']!;

  // 並行抓所有語言
  const results = await Promise.all(langs.map(l => fetchLang(l)));
  const flat = results.flat();

  // 去重
  const seen = new Set<string>();
  const uniq = flat.filter(n => n.title && !seen.has(n.id) && seen.add(n.id));

  // 全域：直接返回；香港：過濾 HK
  const final = group === 'HKG'
    ? uniq.filter(isHK).slice(0, 50)
    : uniq.slice(0, 50);

  if (final.length > 0) cSet(group, final);
  return final;
}

export function prefetch(group: string) {
  fetchAllNewsBg(group).catch(()=>{});
}
