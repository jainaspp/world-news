/**
 * api/crawl.ts — 新聞爬蟲（NewsData 關鍵詞版）
 * 每次運行用多個關鍵詞查詢，每日最多 2000 篇
 * 觸發: GET /api/crawl?secret=YOUR_SECRET
 */
export const config = { runtime: 'nodejs' };
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Supabase REST API（不使用 supabase-js，適用於 Edge/Node.js 環境）
const SB_URL        = process.env.SUPABASE_URL        || 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_ANON_KEY  = process.env.SUPABASE_ANON_KEY  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.KhoDAhJmXcXmqS8g_Z6LdP6LCZPFT4iP5EIJT7JkJlM';
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';

// NewsData API keys
const ND_KEY_1 = process.env.NEWS_KEY_1 || 'pub_2cc2f7c9e2694779871ea0d95a5a4689';
const ND_KEY_2 = process.env.NEWS_KEY_2 || 'pub_6659e2e08a3b483b89d1a2a5db900301';

// 每個關鍵詞查詢分配一個默認地區標籤
const QUERIES = [
  // 英文 — 全球
  { q: 'world news',           lang: 'en', region: 'ALL' },
  { q: 'breaking news',         lang: 'en', region: 'ALL' },
  { q: 'technology AI',         lang: 'en', region: 'ALL' },
  { q: 'business economy',      lang: 'en', region: 'ALL' },
  { q: 'science discoveries',    lang: 'en', region: 'ALL' },
  { q: 'health medicine',       lang: 'en', region: 'ALL' },
  { q: 'sports football',        lang: 'en', region: 'ALL' },
  { q: 'politics government',   lang: 'en', region: 'ALL' },
  // 英文 — 各地區
  { q: 'Asia Pacific news',     lang: 'en', region: 'ASI' },
  { q: 'China Taiwan news',     lang: 'en', region: 'ASI' },
  { q: 'Europe news',           lang: 'en', region: 'EUR' },
  { q: 'United States news',    lang: 'en', region: 'USA' },
  { q: 'Japan Korea news',     lang: 'en', region: 'JPN' },
  { q: 'Middle East news',     lang: 'en', region: 'ME'  },
  { q: 'Russia Ukraine war',    lang: 'en', region: 'RUS' },
  { q: 'India South Asia',      lang: 'en', region: 'IND' },
  // 中文 — 華語圈
  { q: '台灣 新聞',             lang: 'zh', region: 'TWN' },
  { q: '日本 新聞',             lang: 'ja', region: 'JPN' },
  { q: '韓國 新聞',             lang: 'ko', region: 'KOR' },
  { q: '香港 新聞',             lang: 'zh', region: 'ASI' },
];

function fetchND(key: string, q: string, lang: string) {
  return fetch(
    `https://newsdata.io/api/1/news?apikey=${key}&q=${encodeURIComponent(q)}&language=${lang}&size=10`,
    { signal: AbortSignal.timeout(8000) }
  ).then(async r => {
    if (!r.ok) return [];
    const d = await r.json();
    if (d.status !== 'success') return [];
    return (d.results || []).map((a: any) => ({
      title:    (a.title       || '').slice(0, 300),
      summary:  (a.description || a.content || '').slice(0, 500),
      link:     a.link        || '',
      source:   a.source_id   || '',
      image_url: a.image_url  || '',
      pub_date: a.pubDate    || new Date().toISOString(),
      region:   'ALL',
      lang:     lang,
    })).filter((x: any) => x.title && x.link);
  }).catch(() => []);
}

async function upsertDB(items: any[]) {
  if (!items.length) return 0;
  const now = new Date().toISOString();
  const rows = items.map(i => ({
    title:     i.title,
    summary:   i.summary  || '',
    link:      i.link,
    source:    i.source,
    image_url: i.image_url || '',
    pub_date:  i.pub_date || now,
    region:    i.region,
    lang:      i.lang || 'en',
    fetched_at: now,
  }));
  try {
    const r = await fetch(`${SB_URL}/rest/v1/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_ANON_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('[upsert]', r.status, txt.slice(0, 100));
      return 0;
    }
    return rows.length;
  } catch(e: any) {
    console.error('[upsert]', e.message);
    return 0;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { searchParams } = new URL(req.url || '', 'http://localhost');
  const secret = searchParams.get('secret') || '';
  if (secret !== (process.env.CRON_SECRET || 'wn_cron_secure_xk29')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const start = Date.now();
  console.log('[crawl] Starting NewsData crawl...');

  // 讀取現有 link 去重
  let existingLinks = new Set<string>();
  try {
    const r = await fetch(`${SB_URL}/rest/v1/news?select=link&limit=10000`, {
      headers: { 'apikey': SB_ANON_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` },
    });
    if (r.ok) {
      const data = await r.json();
      existingLinks = new Set((Array.isArray(data) ? data : []).map((a: any) => a.link).filter(Boolean));
      console.log(`[crawl] Existing rows: ${existingLinks.size}`);
    }
  } catch(e: any) {
    console.error('[crawl] DB read error:', e.message);
  }

  // 計算旋轉 key（兩個 key 每日各 2000 篇）
  const today = new Date().toISOString().slice(0, 10);
  const keyIdx = parseInt(today.replace(/-/g, ''), 10) % 2;
  const ndKey = keyIdx === 0 ? ND_KEY_1 : ND_KEY_2;
  console.log(`[crawl] Using key: ${ndKey.slice(0, 8)}... (rotated by date)`);

  // 順序執行關鍵詞查詢（避免觸發並發限制）
  let totalRaw = 0;
  let totalFresh = 0;
  let totalInserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const { q, lang, region } = QUERIES[i];
    try {
      const items = await fetchND(ndKey, q, lang);
      totalRaw += items.length;

      // 賦予地區標籤
      const tagged = items.map(a => ({ ...a, region }));

      // 去重
      const fresh = tagged.filter(a => !existingLinks.has(a.link));
      totalFresh += fresh.length;

      if (fresh.length > 0) {
        const inserted = await upsertDB(fresh);
        totalInserted += inserted;
        fresh.forEach(a => existingLinks.add(a.link));
        console.log(`[crawl] [${i+1}/${QUERIES.length}] "${q}" → ${items.length} raw, ${fresh.length} fresh, ${inserted} inserted`);
      } else {
        console.log(`[crawl] [${i+1}/${QUERIES.length}] "${q}" → ${items.length} raw, all dup`);
      }
    } catch(e: any) {
      errors.push(`[${q}]: ${e.message}`);
      console.error(`[crawl] [${i+1}/${QUERIES.length}] "${q}" ERROR:`, e.message);
    }
    // 每個 key 最多 200 requests/天，每次 sleep 100ms 避免超限
    await new Promise(r => setTimeout(r, 100));
  }

  const ms = Date.now() - start;
  const summary = {
    inserted:   totalInserted,
    fresh:      totalFresh,
    raw:        totalRaw,
    queries:    QUERIES.length,
    errors:     errors.length,
    elapsed_ms: ms,
  };

  console.log('[crawl] Done:', summary);
  res.status(200).json(summary);
}
