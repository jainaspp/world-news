/**
 * CF Worker — 極速版（完全繞過 RPC，REST 查詢）
 * 問題：Supabase RPC 函數超時 → 改用 REST 直接查詢
 */
"use strict";

const SB_URL = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEYS = ['pub_2cc2f7c9e2694779871ea0d95a5a4689','pub_6659e2e08a3b483b89d1a2a5db900301'];

const _hdr = { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY };

// ─── 工具 ───────────────────────────────────────────────
function sid(a,b) {
  let h=0;
  for(const c of(a+b).replace(/[^a-zA-Z0-9]/g,'').toLowerCase())
    h=(Math.imul(31,h)+c.charCodeAt(0))|0;
  return String(Math.abs(h));
}
function unesc(s){return(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');}

// ─── Supabase REST（直接查，不走 RPC）───────────────────────
const HKG_RE = /香港|rthk|hkfp|852|明報|港聞|港股/i;

async function sbREST(group) {
  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 10000);
    const url = SB_URL + '/rest/v1/news?select=id,title,summary,link,source,pub_date,image_url,region&order=pub_date.desc&limit=80';
    const res = await fetch(url, {
      method: 'GET',
      signal: ac.signal,
      headers: { ..._hdr, 'Prefer': 'count=none' },
    });
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const all = data.slice(0, 80);
    return group === 'HKG' ? all.filter(r => HKG_RE.test(r.title || '')).slice(0, 50) : all.slice(0, 50);
  } catch(e) { return []; }
}

// ─── Supabase 寫入 ─────────────────────────────────────// ─── Supabase 寫入 ─────────────────────────────────────
async function sbWrite(items) {
  if (!items.length) return 0;
  try {
    const ac=new AbortController(), tid=setTimeout(()=>ac.abort(),15000);
    const res = await fetch(SB_URL+'/rest/v1/news', {
      method:'POST',
      signal:ac.signal,
      headers:{..._hdr,'Prefer':'resolution=merge-duplicates'},
      body:JSON.stringify(items),
    });
    clearTimeout(tid);
    return res.ok ? items.length : 0;
  } catch(e) { return 0; }
}

// ─── NewsData.io 抓取 ────────────────────────────────
async function fetchND(lang) {
  for (const key of ND_KEYS) {
    try {
      const res = await fetch(
        `https://newsdata.io/api/1/news?apikey=${key}&language=${lang}&size=10`,
        { cf:{ cacheTtl:300 } }
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.results)) continue;
      return json.results.map(i => ({
        id: i.article_id || sid(i.title||'', i.link||''),
        title: unesc((i.title||'').slice(0,500)),
        summary: unesc((i.description||i.content||'').slice(0,1000)),
        link: i.link||'',
        source: i.source_id||i.source_name||'NewsData',
        pub_date: i.pubDate||i.iso_date||new Date().toISOString(),
        image_url: i.image_url||'',
        region: {en:'ALL',zh:'CHN',ko:'KOR',ja:'JPN',es:'EUR'}[lang]||'ALL',
      }));
    } catch {}
  }
  return [];
}

// ─── 主導出 ───────────────────────────────────────────
export default {
  async fetch(req) {
    const u = new URL(req.url);

    // /news → 讀取
    if (u.pathname === '/news') {
      const group = u.searchParams.get('group') || 'ALL';
      const data  = await sbREST(group);

      // Streaming 回應
      const stream = new ReadableStream({
        start(c) { c.enqueue('['); },
        pull(c) {
          if (!this._sent) {
            this._sent = true;
            const items = data.slice(0,50);
            if (items.length > 0) {
              const keys = Object.keys(items[0]);
              for (let i=0; i<items.length; i++) {
                const r = items[i], obj = {};
                keys.forEach(k => obj[k] = r[k] == null ? '' : r[k]);
                c.enqueue(JSON.stringify(obj) + (i<items.length-1 ? ',' : ''));
              }
            }
          }
          c.enqueue(']'); c.close();
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type':'application/json','Cache-Control':'public, max-age=30' }
      });
    }

    // /run → 手動抓取
    if (u.pathname === '/run') {
      const result = await runAll();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type':'application/json' }
      });
    }

    // /health
    if (u.pathname === '/health') {
      const t0 = Date.now();
      const data = await sbREST('ALL');
      return new Response(JSON.stringify({ ok:true, rows:data.length, ms:Date.now()-t0 }), {
        headers: { 'Content-Type':'application/json' }
      });
    }

    return new Response('Not Found', { status:404 });
  },

  // 定時（每15分鐘）
  async scheduled(_, __, ctx) {
    ctx.waitUntil(runAll().then(r => console.log('[cron]', JSON.stringify(r))));
  },
};

async function runAll() {
  const t0 = Date.now();
  const [en,zh,ko,ja,es] = await Promise.all([
    fetchND('en'), fetchND('zh'), fetchND('ko'), fetchND('ja'), fetchND('es'),
  ]);
  const seen = new Set();
  const uniq = [...en,...zh,...ko,...ja,...es].filter(n => n.title && !seen.has(n.id) && seen.add(n.id));
  if (uniq.length > 0) {
    const n = await sbWrite(uniq);
    console.log(`[cron] ${uniq.length} upserted in ${((Date.now()-t0)/1000).toFixed(1)}s`);
    return { ok:true, fetched:uniq.length, upserted:n, ms:Date.now()-t0 };
  }
  return { ok:false, ms:Date.now()-t0 };
}
