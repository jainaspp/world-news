/**
 * World News Proxy Worker — v7
 * 策略：CF Worker 定時從 NewsData 寫 Supabase
 *       請求時：快速從 Supabase 讀 + NewsData 即時備用
 */
const SB_URL    = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVCKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEY_1  = 'pub_2cc2f7c9e2694779871ea0d95a5a4689';
const ND_KEY_2  = 'pub_6659e2e08a3b483b89d1a2a5db900301';

const FALLBACK = [{
  id:'fb1',title:'全球新聞加載中',titleTL:{},summary:'正在獲取最新頭條新聞，請稍候...',
  summaryTL:{},link:'https://world-news.xyz',source:'System',
  pubDate:new Date().toISOString(),imageUrl:'',
}];

// 每個地區的關鍵詞（給 NewsData）
const REGION_QUERIES = {
  ALL: ['world news','breaking news'],
  ASI: ['Asia Pacific news','East Asia news'],
  TWN: ['Taiwan news'],
  JPN: ['Japan news'],
  KOR: ['South Korea news'],
  USA: ['United States news','US politics'],
  EUR: ['Europe news'],
  RUS: ['Russia Ukraine war'],
  ME:  ['Middle East news'],
  IND: ['India news'],
  TEC: ['technology AI'],
  SCI: ['science discoveries'],
  ECO: ['business economy'],
  SPO: ['sports football'],
};

const REGION_LANG = { TWN:'zh', JPN:'ja', KOR:'ko' };

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/<[^>]+>/g,'').trim();
}

// 計時器超時包裝
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function fetchND(key, q, lang, size) {
  try {
    const r = await withTimeout(
      fetch(`https://newsdata.io/api/1/news?apikey=${key}&q=${encodeURIComponent(q)}&language=${lang}&size=${size}`, { cf:{ cacheTtl:0 } }),
      6000
    );
    if (!r.ok) return [];
    const d = await r.json();
    if (d.status !== 'success') return [];
    return (d.results||[]).map(a => ({
      title:    stripHtml(a.title||'').slice(0,300),
      summary:  stripHtml(a.description||a.content||'').slice(0,500),
      link:     a.link||a.url||'',
      source:   a.source_id||'NewsData',
      image_url: a.image_url||'',
      pub_date: a.pubDate||new Date().toISOString(),
    }));
  } catch { return []; }
}

async function upsertSupabase(items) {
  if (!items.length) return;
  const rows = items.map(i => ({ ...i, fetched_at: new Date().toISOString() }));
  try {
    await withTimeout(fetch(`${SB_URL}/rest/v1/news`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json','apikey':SB_SVCKEY,'Authorization':`Bearer ${SB_SVCKEY}`,'Prefer':'resolution=merge-duplicates' },
      body: JSON.stringify(rows),
    }), 8000);
  } catch {}
}

async function readSupabase(regions, limit) {
  try {
    let query = `${SB_URL}/rest/v1/news?select=id,title,summary,link,source,pub_date,image_url,region&order=pub_date.desc&limit=${limit}`;
    if (regions.length > 0) {
      query += `&or=(region.in.(${regions.join(',')}),region.eq.ALL)`;
    }
    // 使用 AbortSignal 超時（Cloudflare Worker 原生支援）
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 6000);
    const r = await fetch(query, {
      signal: ac.signal,
      headers:{ 'apikey':SB_SVCKEY,'Authorization':`Bearer ${SB_SVCKEY}`,'Content-Type':'application/json' },
    });
    clearTimeout(tid);
    if (!r.ok) return [];
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data.map(r => ({
      id:r.id||'', title:r.title||'', titleTL:{},
      summary:r.summary||'', summaryTL:{},
      link:r.link||'', source:r.source||'',
      pubDate:r.pub_date||new Date().toISOString(),
      imageUrl:r.image_url||'',
      region:r.region||'ALL',
    }));
  } catch(e) {
    console.error('[readSupabase]', e.message);
    return [];
  }
}

const GROUP_MAP = {
  ALL:[], ASI:['ASI'], TWN:['TWN'], JPN:['JPN'], KOR:['KOR'],
  USA:['USA'], EUR:['EUR'], RUS:['RUS'], ME:['ME'], IND:['IND'],
  LAT:['LAT'], AFR:['AFR'], TEC:['TEC'], SCI:['SCI'], ECO:['ECO'], SPO:['SPO'],
};

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
addEventListener('scheduled', e => e.waitUntil(handleScheduled()));

async function handleRequest(request) {
  const url    = new URL(request.url);
  const group  = (url.searchParams.get('group')||'ALL').toUpperCase().replace('-','');
  const limit  = parseInt(url.searchParams.get('limit')||'30', 10);
  const regions = GROUP_MAP[group] || [];

  // 1. Supabase 讀取（6秒超時）
  let news = await readSupabase(regions, limit);

  // 2. NewsData 即時補充
  if (news.length < 10) {
    const queries = REGION_QUERIES[group] || REGION_QUERIES['ALL'];
    const lang    = REGION_LANG[group] || 'en';
    const today  = new Date().toISOString().slice(0,10);
    const ndKey  = (parseInt(today.replace(/-/g,''),10) % 2 === 0) ? ND_KEY_1 : ND_KEY_2;

    const ndItems = [];
    for (const q of queries.slice(0,3)) {
      const items = await fetchND(ndKey, q, lang, 10);
      ndItems.push(...items);
      if (ndItems.length >= 15) break;
    }

    const seen = new Set(news.map(n => n.link));
    const newUniq = ndItems
      .filter(a => a.link && !seen.has(a.link))
      .map(a => ({
        ...a,
        id: a.title ? btoa(a.title.slice(0,15)).replace(/[^a-z0-9]/gi,'') : Math.random().toString(36).slice(2),
        imageUrl: a.image_url || '',
        region: 'ALL',
      }));
    news = [...news, ...newUniq].slice(0, limit);

    if (newUniq.length > 0) {
      upsertSupabase(newUniq);
    }
  }

  const body = news.length > 0 ? JSON.stringify(news.slice(0,limit)) : JSON.stringify(FALLBACK);
  return new Response(body, {
    status:200,
    headers:{
      'Content-Type':'application/json',
      'Access-Control-Allow-Origin':'*',
      'Cache-Control':'s-maxage=120, stale-while-revalidate=300',
    },
  });
}

async function handleScheduled() {
  const entries = Object.entries(REGION_QUERIES);
  const langs   = { TWN:'zh', JPN:'ja', KOR:'ko' };
  const today   = new Date().toISOString().slice(0,10);
  const ndKey   = (parseInt(today.replace(/-/g,''),10) % 2 === 0) ? ND_KEY_1 : ND_KEY_2;
  const allItems = [];

  for (const [region, qlist] of entries) {
    const lang = langs[region] || 'en';
    for (const q of qlist) {
      const items = await fetchND(ndKey, q, lang, 10);
      for (const a of items) { a.region = region; }
      allItems.push(...items);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // 按 link 去重
  const seen = new Set();
  const uniq = allItems.filter(a => a.link && !seen.has(a.link) && (seen.add(a.link), true));

  if (uniq.length > 0) {
    await upsertSupabase(uniq);
    console.log(`[cron ${new Date().toISOString()}] Inserted ${uniq.length} articles`);
  }
}
