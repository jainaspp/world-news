/**
 * CF Worker — 三合一：
 * 1. /news?group=ALL|HKG  → 瀏覽器讀 Supabase（Edge 代理，CF→SB 很快）
 * 2. /run                  → 手動觸發 NewsData.io 抓取寫入
 * 3. cron (每15分鐘)       → 自動抓取寫入
 */
"use strict";

const SB_URL_FALLBACK = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVC_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEYS = ['pub_2cc2f7c9e2694779871ea0d95a5a4689','pub_6659e2e08a3b483b89d1a2a5db900301'];

// ─── 工具 ────────────────────────────────────────────────
function sid(a='', b='') {
  let h = 0;
  for (const c of (a+b).replace(/[^a-zA-Z0-9]/g,'').toLowerCase())
    h = (Math.imul(31,h)+c.charCodeAt(0))|0;
  return String(Math.abs(h));
}
function unesc(s) {
  return (s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
                  .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
}

// ─── NewsData.io 抓取 ─────────────────────────────────────
async function fetchND(lang, size=10) {
  for (const key of ND_KEYS) {
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${key}&language=${lang}&size=${size}`,
        { cf: { cacheTtl: 300, cacheEverything: true } } // CF 緩存5分鐘
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.results)) continue;
      return json.results.map(i => ({
        id:       i.article_id || sid(i.title||'', i.link||''),
        title:    unesc((i.title||'').slice(0,500)),
        summary:  unesc((i.description||i.content||'').slice(0,1000)),
        link:     i.link||'',
        source:   i.source_id||i.source_name||'NewsData',
        pub_date: i.pubDate||i.iso_date||new Date().toISOString(),
        image_url: i.image_url||'',
        region:   {en:'ALL',zh:'CHN',ko:'KOR',ja:'JPN',es:'EUR'}[lang]||'ALL',
      }));
    } catch { /* next key */ }
  }
  return [];
}

// ─── Supabase 讀（供 /news 用）───────────────────────────
async function sbRead(sbUrl, svcKey, fn) {
  try {
    const res = await fetch(`${sbUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': svcKey,
        'Authorization': `Bearer ${svcKey}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// ─── Supabase 寫 ────────────────────────────────────────
async function sbUpsert(sbUrl, svcKey, items) {
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
    return res.ok ? items.length : 0;
  } catch { return 0; }
}

// ─── 路由分發 ────────────────────────────────────────────
export default {
  async fetch(req, env) {
    const u   = new URL(req.url);
    const sb  = env.SUPABASE_URL     || SB_URL_FALLBACK;
    const sk  = env.SUPABASE_SERVICE_KEY || SB_SVC_KEY_FALLBACK;

    // 1. 瀏覽器讀 Supabase（Edge 代理）
    if (u.pathname === '/news') {
      const group = u.searchParams.get('group') || 'ALL';
      const fn    = group === 'HKG' ? 'get_news_hkg' : 'get_news_all';
      const data  = await sbRead(sb, sk, fn);
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      });
    }

    // 2. 手動觸發一次 NewsData.io 抓取
    if (u.pathname === '/run') {
      const result = await runAll(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 健康檢查
    if (u.pathname === '/health') {
      const t0  = Date.now();
      const ok  = await sbRead(sb, sk, 'get_news_all').then(d => d.length > 0).catch(() => false);
      return new Response(JSON.stringify({ ok, ms: Date.now()-t0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  // 每 15 分鐘自動抓取寫入
  async scheduled(_, env) {
    await runAll(env);
  },
};

// ─── 完整抓取流程 ─────────────────────────────────────────
async function runAll(env) {
  const sb    = env.SUPABASE_URL     || SB_URL_FALLBACK;
  const sk    = env.SUPABASE_SERVICE_KEY || SB_SVC_KEY_FALLBACK;
  const t0    = Date.now();

  const [en, zh, ko, ja, es] = await Promise.all([
    fetchND('en', 10), fetchND('zh', 10), fetchND('ko', 10),
    fetchND('ja', 10), fetchND('es', 10),
  ]);

  const seen = new Set();
  const uniq = [...en,...zh,...ko,...ja,...es].filter(n => n.title && !seen.has(n.id) && seen.add(n.id));

  console.log(`[cron] fetched ${uniq.length} unique in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  if (uniq.length > 0) {
    const n = await sbUpsert(sb, sk, uniq);
    console.log(`[cron] upserted ${n}`);
    return { ok: true, fetched: uniq.length, upserted: n, ms: Date.now()-t0 };
  }
  return { ok: false, ms: Date.now()-t0 };
}
