/**
 * newsFetcher — Vercel API（主） + CF Worker（備） + Supabase REST（最後備用）
 * 兩個分類：ALL（全球）、HKG（香港）
 */

const SB_URL = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.7vMNxsKczXGxzzGmimlN338BsK7tSHzejaw4bC2kOs4';
const WORKER_URL = 'https://jainaspp-world-news.jainaspp.workers.dev';
const VERCEL_URL = 'https://world-news.xyz'; // Vercel 部署網址

const HKG_RE = /香港|rthk|hkfp|852|明報|港聞|港股/i;

let _cached: Array<any> = [];
let _cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

async function fetchVercelAPI(group: string) {
  try {
    const res = await fetch(`${VERCEL_URL}/api/news?group=${group}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Vercel ${res.status}`);
    const d = await res.json();
    return Array.isArray(d) ? d : null;
  } catch { return null; }
}

async function fetchWorker(group: string) {
  try {
    const res = await fetch(`${WORKER_URL}/news?group=${group}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Worker ${res.status}`);
    const d = await res.json();
    return Array.isArray(d) ? d : null;
  } catch { return null; }
}

async function fetchSupabaseREST(group: string) {
  try {
    const cols = 'id,title,summary,link,source,pub_date,image_url,region';
    const limit = group === 'HKG' ? 200 : 80;
    const url = `${SB_URL}/rest/v1/news?select=${cols}&order=pub_date.desc&limit=${limit}`;
    const res = await fetch(url, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=none' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`SB ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const all = data.slice(0, limit);
    return group === 'HKG'
      ? all.filter((r: any) => HKG_RE.test(r.title || '')).slice(0, 50)
      : all.slice(0, 50);
  } catch { return null; }
}

export async function fetchAllNews(group = 'ALL') {
  const now = Date.now();
  if (_cached.length && now - _cacheTime < CACHE_MS) return _cached;

  // Try: Vercel API → CF Worker → Supabase REST
  let data: any[] | null = await fetchVercelAPI(group);
  if (data && data.length > 0) { _cached = data; _cacheTime = now; return data; }

  data = await fetchWorker(group);
  if (data && data.length > 0) { _cached = data; _cacheTime = now; return data; }

  data = await fetchSupabaseREST(group);
  _cached = data || [];
  _cacheTime = now;
  return _cached;
}

export function clearCache() { _cached = []; _cacheTime = 0; }
