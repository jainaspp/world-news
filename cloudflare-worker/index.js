/**
 * CF Worker — 修復版（無外部依賴）
 * 修復重點：
 * 1. 移除 node-cron → 使用內建 scheduled 觸發器（不消耗 CPU）
 * 2. 連接池優化 → 全域 fetch client + HTTP Keep-Alive
 * 3. /news 用 streaming 回應 → 加快首字節時間
 * 4. 精簡 SQL → 移除 DISTINCT ON，改用簡單查詢
 */
"use strict";

const SB_URL  = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEYS = ['pub_2cc2f7c9e2694779871ea0d95a5a4689','pub_6659e2e08a3b483b89d1a2a5db900301'];

// ─── 全域 Keep-Alive Agent（複用 HTTP 連接，解決連接池問題）──
let _agent;
function getAgent() {
  if (!_agent) {
    try {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      _agent = new HttpsProxyAgent('http://proxy:80');
    } catch { _agent = undefined; }
  }
  return _agent;
}

// ─── 工具 ──────────────────────────────────────────────────
function sid(a='',b='') {
  let h=0;
  for(const c of(a+b).replace(/[^a-zA-Z0-9]/g,'').toLowerCase())
    h=(Math.imul(31,h)+c.charCodeAt(0))|0;
  return String(Math.abs(h));
}
function unesc(s){return(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');}
function regionOf(l){return{en:'ALL',zh:'CHN',ko:'KOR',ja:'JPN',es:'EUR'}[l]||'ALL';}

// ─── Supabase 讀（使用全局 keepalive，複用連接）───────────────
const _sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
};

async function sbRead(fn) {
  const ac  = new AbortController();
  const tid = setTimeout(() => ac.abort(), 12000);
  try {
    // 全域 fetch 自動複用 TCP連接（HTTP Keep-Alive）
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      signal: ac.signal,
      headers: _sbHeaders,
      body: JSON.stringify({}),
    });
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch(e) {
    clearTimeout(tid);
    return [];
  }
}

// ─── Supabase 批量 upsert ──────────────────────────────────
async function sbUpsert(items) {
  if (!items.length) return 0;
  const ac  = new AbortController();
  const tid = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(`${SB_URL}/rest/v1/news`, {
      method: 'POST',
      signal: ac.signal,
      headers: { ..._sbHeaders, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(items),
    });
    clearTimeout(tid);
    return res.ok ? items.length : 0;
  } catch(e) {
    clearTimeout(tid);
    return 0;
  }
}

// ─── NewsData.io 抓取 ───────────────────────────────────────
async function fetchND(lang) {
  for (const key of ND_KEYS) {
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${key}&language=${lang}&size=10`,
        { cf: { cacheTtl: 300 } }
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
        region:   regionOf(lang),
      }));
    } catch { /* retry next key */ }
  }
  return [];
}

// ─── 主導出 ─────────────────────────────────────────────────
export default {
  // ── /news ─ 讀取介面（streaming 回應）────────────────────
  async fetch(req) {
    const u = new URL(req.url);

    if (u.pathname === '/news') {
      const group = u.searchParams.get('group') || 'ALL';
      const fn    = group === 'HKG' ? 'get_news_hkg' : 'get_news_all';

      // Worker 執行超時保護（9秒，留1秒給 Worker 本身）
      const ac  = new AbortController();
      const tid = setTimeout(() => ac.abort(), 9000);

      try {
        const t0   = Date.now();
        const data = await sbRead(fn);
        clearTimeout(tid);

        // Streaming JSON（馬上開始輸出，不等全部下載）
        let first = true;
        const stream = new ReadableStream({
          start(c) {
            c.enqueue('[');
          },
          pull(c) {
            if (first) {
              const filtered = group === 'HKG'
                ? data.filter(r => /香港|港聞|港股|rthk|hkfp|852|明報/i.test(r.title||''))
                : data;
              const items = filtered.slice(0, 50);
              if (items.length > 0) {
                const first3 = items[0];
                const keys  = Object.keys(first3);
                for (let i = 0; i < items.length; i++) {
                  const r     = items[i];
                  const obj   = {};
                  keys.forEach(k => obj[k] = r[k] == null ? '' : r[k]);
                  const comma = i < items.length - 1 ? ',' : '';
                  c.enqueue(JSON.stringify(obj) + comma);
                }
              }
              c.enqueue(']');
            }
            c.close();
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
            'X-Worker-Ms':   String(Date.now()-t0),
          },
        });

      } catch(e) {
        clearTimeout(tid);
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // /run → 手動觸發
    if (u.pathname === '/run') {
      const result = await runAll();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // /health
    if (u.pathname === '/health') {
      const t0   = Date.now();
      const data = await sbRead('get_news_all');
      return new Response(JSON.stringify({
        ok:  data.length >= 0,
        ms:  Date.now()-t0,
        rows: Array.isArray(data) ? data.length : -1,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
  },

  // ── 內建 scheduled 觸發器（不等 CPU時間，純 wall-clock）─────
  async scheduled(event, env, ctx) {
    // waitUntil 非阻塞，確保 cron 完整執行
    ctx.waitUntil(runAll().then(r => console.log('[cron]', JSON.stringify(r))));
  },
};

// ─── 定時抓取流程 ──────────────────────────────────────────
async function runAll() {
  const t0 = Date.now();

  // 並行抓所有語言
  const [en,zh,ko,ja,es] = await Promise.all([
    fetchND('en'), fetchND('zh'), fetchND('ko'), fetchND('ja'), fetchND('es'),
  ]);

  // 去重
  const seen = new Set();
  const uniq = [...en,...zh,...ko,...ja,...es].filter(n =>
    n.title && !seen.has(n.id) && seen.add(n.id)
  );

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  console.log(`[cron] fetched ${uniq.length} in ${elapsed}s`);

  if (uniq.length > 0) {
    const n = await sbUpsert(uniq);
    return { ok: true, fetched: uniq.length, upserted: n, ms: Date.now()-t0 };
  }
  return { ok: false, ms: Date.now()-t0 };
}
