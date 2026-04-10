/**
 * newsFetcher — NewsData.io → Supabase → 瀏覽器
 * 兩個分類：全球(ALL)、香港(HKG)
 * 數據源：NewsData.io 每15分鐘自動寫入，Cron Job 調度
 */
export interface NewsItem {
  id: string; title: string; titleTL: Record<string,string>;
  summary: string; summaryTL: Record<string,string>;
  link: string; source: string; pubDate: string;
  imageUrl: string; region: string;
}

const SB_URL    = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.7vMNxsKczXGxzzGmimlN338BsK7tSHzejaw4bC2kOs4';

// RPC 函數名
const RPC = { ALL: 'get_news_all', HKG: 'get_news_hkg' };

// ─── Cache（記憶體，標籤頁內有效，5分鐘TTL）─────────────────────
const _cache = new Map<string, {items:NewsItem[]; ts:number}>();
const _TTL = 1000*60*5;

function cGet(g: string): NewsItem[]|null {
  const e = _cache.get(g);
  if (!e) return null;
  if (Date.now()-e.ts > _TTL) { _cache.delete(g); return null; }
  return e.items;
}
function cSet(g: string, v: NewsItem[]) { _cache.set(g,{items:v,ts:Date.now()}); }

// ─── Supabase RPC 讀取 ────────────────────────────────────────
async function fetchFromSB(group: string): Promise<NewsItem[]> {
  const fn = RPC[group as keyof typeof RPC] || 'get_news_all';
  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 12000);
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_ANON,
        'Authorization': `Bearer ${SB_ANON}`,
      },
      body: JSON.stringify({}),
    });
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => ({
      id:       String(r.id || ''),
      title:    String(r.title || ''),
      titleTL:  {},
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

// ─── 導出函數 ───────────────────────────────────────────────
export async function fetchAllNews(group = 'ALL'): Promise<NewsItem[]> {
  // Cache 命中 → 馬上回應（<50ms）
  const cached = cGet(group);
  if (cached) {
    // 後台刷新（不阻塞）
    fetchFromSB(group).then(db => { if (db.length > 0) cSet(group, db); }).catch(()=>{});
    return cached;
  }

  // 無 Cache → 等 Supabase（最多12秒）
  const db = await fetchFromSB(group);
  if (db.length > 0) cSet(group, db);
  return db;
}

// ─── 後台預熱（不阻塞）────────────────────────────────────────
export function prefetch(group: string) {
  fetchFromSB(group).then(db => { if (db.length > 0) cSet(group, db); }).catch(()=>{});
}
