/**
 * World News Proxy Worker — v6 (DB direct write)
 * CF Worker cron 每 30 分鐘：
 * 1. 從 NewsData 取稿
 * 2. 直接 upsert 寫入 Supabase（繞過 Vercel）
 * 3. handleRequest 從 Supabase 讀取
 */
const SB_URL    = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVCKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEY    = 'pub_6659e2e08a3b483b89d1a2a5db900301';

const FALLBACK = [{
  id:'fb1', title:'Loading news...', titleTL:{}, summary:'Fetching latest headlines.',
  summaryTL:{}, link:'https://world-news.xyz', source:'System',
  pubDate:new Date().toISOString(), imageUrl:'',
}];

// 每個地區的 NewsData 查詢關鍵詞
const REGION_QUERIES = {
  ALL: ['world news', 'breaking news', 'top headlines'],
  ASI: ['Asia Pacific news', 'East Asia news'],
  TWN: ['Taiwan news', 'Taiwan politics'],
  JPN: ['Japan news'],
  KOR: ['Korea news', 'South Korea politics'],
  USA: ['United States news', 'US politics'],
  EUR: ['Europe news', 'European Union news'],
  RUS: ['Russia Ukraine war'],
  ME:  ['Middle East news'],
  IND: ['India news'],
  TEC: ['technology AI'],
  SCI: ['science discoveries'],
  ECO: ['business economy'],
  SPO: ['sports football'],
};

const REGION_LANG = {
  TWN: 'zh', JPN: 'ja', KOR: 'ko',
};

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/<[^>]+>/g,'').trim();
}

async function fetchND(key, q, lang, size=10) {
  try {
    const url = `https://newsdata.io/api/1/news?apikey=${key}&q=${encodeURIComponent(q)}&language=${lang}&size=${size}`;
    const r = await fetch(url, { cf:{ cacheTtl:0 } });
    if (!r.ok) return [];
    const d = await r.json();
    if (d.status !== 'success') return [];
    return (d.results || []).map(a => ({
      title:    stripHtml(a.title||'').slice(0,300),
      summary:  stripHtml(a.description||a.content||'').slice(0,500),
      link:     a.link || a.url || '',
      source:   a.source_id || 'NewsData',
      image_url: a.image_url || '',
      pub_date: a.pubDate || new Date().toISOString(),
      region:   'ALL',
      lang,
    }));
  } catch(e) { return []; }
}

// 直接寫入 Supabase（繞過 Vercel）
async function upsertSupabase(items) {
  if (!items.length) return 0;
  const now = new Date().toISOString();
  const rows = items.map(i => ({
    ...i,
    fetched_at: now,
  }));
  try {
    const r = await fetch(`${SB_URL}/rest/v1/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_SVCKEY,
        'Authorization': `Bearer ${SB_SVCKEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    });
    return r.ok ? rows.length : 0;
  } catch(e) { return 0; }
}

addEventListener('fetch', e => e.respondWith(handleRequest(e.request)));
addEventListener('scheduled', e => e.waitUntil(handleScheduled()));

// 從 Supabase 讀取
async function readSupabase(regions, limit=30) {
  try {
    let query = `${SB_URL}/rest/v1/news?select=id,title,summary,link,source,pub_date,image_url,region&order=pub_date.desc&limit=${limit}`;
    if (regions.length > 0) {
      query += `&or=(region.in.(${regions.join(',')}),region.eq.ALL)`;
    }
    const r = await fetch(query, {
      headers: {
        'apikey': SB_SVCKEY,
        'Authorization': `Bearer ${SB_SVCKEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data.map(r => ({
      id: r.id||'', title: r.title||'', titleTL: {},
      summary: r.summary||'', summaryTL: {},
      link: r.link||'', source: r.source||'',
      pubDate: r.pub_date||new Date().toISOString(),
      imageUrl: r.image_url||'',
      region: r.region||'ALL',
    }));
  } catch(e) { return []; }
}

const GROUP_REGIONS = {
  ALL:[], ASI:['ASI'], TWN:['TWN'], JPN:['JPN'], KOR:['KOR'],
  USA:['USA'], EUR:['EUR'], RUS:['RUS'], ME:['ME'], IND:['IND'],
  LAT:['LAT'], AFR:['AFR'], TEC:['TEC'], SCI:['SCI'], ECO:['ECO'], SPO:['SPO'],
};

async function handleRequest(request) {
  try {
    const url  = new URL(request.url);
    const group = (url.searchParams.get('group')||'ALL').toUpperCase().replace('-','');
    const limit = parseInt(url.searchParams.get('limit')||'30', 10);
    const regions = GROUP_REGIONS[group] || [];

    let news = await readSupabase(regions, limit);

    // NewsData 實时備用（CF Worker IP 可達）
    if (news.length < 10) {
      const queries = REGION_QUERIES[group] || REGION_QUERIES['ALL'];
      const lang    = REGION_LANG[group] || 'en';
      const today   = new Date().toISOString().slice(0,10);
      const keyIdx  = parseInt(today.replace(/-/g,''),10) % 2;
      const ndKey   = keyIdx === 0 ? 'pub_2cc2f7c9e2694779871ea0d95a5a4689' : ND_KEY;

      const fresh = [];
      for (const q of queries) {
        const items = await fetchND(ndKey, q, lang);
        fresh.push(...items);
        await new Promise(r => setTimeout(r, 200));
        if (fresh.length >= limit) break;
      }

      // 去重並寫入 Supabase
      const seen = new Set(news.map(n => n.link));
      const newUniq = fresh.filter(a => a.link && !seen.has(a.link));
      if (newUniq.length > 0) {
        await upsertSupabase(newUniq);
        news = [...news, ...newUniq.map(a => ({...a, id:a.title?btoa(a.title.slice(0,20)).replace(/[^a-z0-9]/gi,''):''}))];
      }
    }

    const body = news.length > 0 ? JSON.stringify(news.slice(0,limit)) : JSON.stringify(FALLBACK);
    return new Response(body, {
      status:200,
      headers:{
        'Content-Type':'application/json',
        'Access-Control-Allow-Origin':'*',
        'Cache-Control':'s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch(e) {
    return new Response(JSON.stringify(FALLBACK), {
      status:200,
      headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},
    });
  }
}

async function handleScheduled() {
  const queries = Object.entries(REGION_QUERIES);
  const langs   = { TWN:'zh', JPN:'ja', KOR:'ko' };
  const today   = new Date().toISOString().slice(0,10);
  const keyIdx  = parseInt(today.replace(/-/g,''),10) % 2;
  const ndKey   = keyIdx === 0 ? 'pub_2cc2f7c9e2694779871ea0d95a5a4689' : ND_KEY;
  const now     = new Date().toISOString();

  const allItems = [];
  for (const [region, qlist] of queries) {
    const lang = langs[region] || 'en';
    for (const q of qlist) {
      const items = await fetchND(ndKey, q, lang);
      for (const a of items) a.region = region;
      allItems.push(...items);
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // 去重（按 link）
  const seen = new Set();
  const uniq = allItems.filter(a => a.link && !seen.has(a.link) && (seen.add(a.link), true));

  // 寫入 Supabase
  if (uniq.length > 0) {
    await upsertSupabase(uniq);
  }
  console.log(`[cron ${now}] Inserted ${uniq.length} articles from NewsData`);
}
