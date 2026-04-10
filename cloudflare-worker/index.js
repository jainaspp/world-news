/**
 * CF Worker — NewsData.io → Supabase
 * 每 15 分鐘抓一次，寫入 DB
 * 瀏覽器直接讀 Supabase（~0.7秒）
 */
"use strict";

const SB_URL_FALLBACK = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVC_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';

// NewsData.io API keys
const ND_KEYS = [
  'pub_2cc2f7c9e2694779871ea0d95a5a4689',
  'pub_6659e2e08a3b483b89d1a2a5db900301',
];

// ─── 工具 ────────────────────────────────────────────────
function sid(a='', b='') {
  let h = 0;
  for (const c of (a+b).replace(/[^a-zA-Z0-9]/g,'').toLowerCase()) h = (Math.imul(31,h)+c.charCodeAt(0))|0;
  return String(Math.abs(h));
}

function mapCategory(cat) {
  const map = {
    top:'ALL', world:'ALL', politics:'POL', business:'FIN',
    technology:'TECH', science:'SCI', health:'SCI',
    entertainment:'ENT', sports:'SPO', environment:'SCI',
    food:'LIF', tourism:'LIF', crime:'WORLD', nation:'ALL',
  };
  return map[cat?.toLowerCase()] || 'ALL';
}

function mapCountry(lang, cat) {
  const m = { en:'WORLD', zh:'CHN', ja:'JPN', ko:'KOR', fr:'EUR', de:'EUR', es:'EUR', ar:'MEA', hi:'IND' };
  return m[lang] || 'ALL';
}

// ─── 從 NewsData.io 抓新聞 ────────────────────────────────
async function fetchFromNewsData(lang, category, size=50) {
  // 輪流試兩個 key
  for (const apiKey of ND_KEYS) {
    const params = new URLSearchParams({
      apikey: apiKey,
      language: lang,
      size: String(size),
      sort: 'publish_desc',
    });
    if (category) params.set('category', category);
    const url = `https://newsdata.io/api/1/news?${params}`;
    try {
      const res = await fetch(url, { timeout: 10000 });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.results)) continue;
      return json.results.map(item => ({
        id:       item.article_id || sid(item.title || '', item.link || ''),
        title:    item.title || '',
        summary:  item.description || item.content || '',
        link:     item.link || '',
        source:   item.source_id || item.source_name || 'NewsData.io',
        pub_date: item.pubDate || item.iso_date || new Date().toISOString(),
        image_url: item.image_url || '',
        region:   mapCountry(lang, item.category?.[0]) || 'ALL',
      }));
    } catch(e) { /* try next key */ }
  }
  return [];
}

// ─── 寫入 Supabase ────────────────────────────────────────
async function upsertNews(sbUrl, svcKey, items) {
  if (!items.length) return 0;
  try {
    const res = await fetch(`${sbUrl}/rest/v1/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': svcKey,
        'Authorization': `Bearer ${svcKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(items),
    });
    const text = await res.text();
    return res.ok ? items.length : 0;
  } catch(e) {
    console.error('[SB] upsert error:', e.message);
    return 0;
  }
}

// ─── 查詢 DB 現有數量 ────────────────────────────────────
async function countNews(sbUrl, svcKey) {
  try {
    const res = await fetch(`${sbUrl}/rest/v1/news?select=id&limit=1000`, {
      headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}` }
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch { return 0; }
}

// ─── 主函數 ────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/health') {
    // 先測 newsdata 是否可達
    try {
      const t0 = Date.now();
      const r = await fetch('https://newsdata.io/api/1/news?apikey=pub_2cc2f7c9e2694779871ea0d95a5a4689&language=en&size=1');
      const ms = Date.now() - t0;
      const text = await r.text();
      return new Response(JSON.stringify({ nd: r.ok?'OK':'FAIL', status: r.status, ms, body: text.slice(0,200) }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch(e) {
      return new Response(JSON.stringify({ nd: 'ERROR', msg: e.message }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
    if (u.pathname === '/run') {
      const result = await runAll(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(_, env) {
    const result = await runAll(env);
    console.log('[cron done]', JSON.stringify(result));
  },
};

async function runAll(env) {
  const sbUrl    = env.SUPABASE_URL     || SB_URL_FALLBACK;
  const svcKey   = env.SUPABASE_SERVICE_KEY || SB_SVC_KEY_FALLBACK;
  const apiKey   = env.NEWSDATA_API_KEY || ND_API_KEY;
  const ts       = new Date().toISOString();

  console.log(`[${ts}] starting...`);

  // 並行抓所有語言/分類
  const [enAll, zhAll, koAll, jaAll, esAll] = await Promise.all([
    fetchFromNewsData('en', null,     50),  // 英文全球
    fetchFromNewsData('zh', null,     30),  // 中文
    fetchFromNewsData('ko', null,     30),  // 韓文
    fetchFromNewsData('ja', null,     30),  // 日文
    fetchFromNewsData('es', null,     30),  // 西班牙文
  ]);

  // 去重
  const seen = new Set();
  const all  = [];
  for (const item of [...enAll, ...zhAll, ...koAll, ...jaAll, ...esAll]) {
    if (!seen.has(item.id)) { seen.add(item.id); all.push(item); }
  }

  // 去空標題
  const valid = all.filter(n => n.title && n.title.length > 10);

  console.log(`[${ts}] total: ${valid.length} (en:${enAll.length} zh:${zhAll.length} ko:${koAll.length} ja:${jaAll.length})`);

  if (valid.length > 0) {
    const written = await upsertNews(sbUrl, svcKey, valid);
    const count   = await countNews(sbUrl, svcKey);
    console.log(`[${ts}] written: ${written}, total in DB: ${count}`);
    return { ok: true, written, total: count, ts };
  }

  return { ok: false, reason: 'no data', ts };
}
