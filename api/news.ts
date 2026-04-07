/**
 * api/news.ts — 新聞讀取 + NewsData 備用源
 * 1. 先從 Supabase DB 讀取
 * 2. 少於 10 篇時，自動從 NewsData 實時補充
 */
export const config = { runtime: 'nodejs' };

const SB_URL         = process.env.SUPABASE_URL         || 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_ANON_KEY    = process.env.SUPABASE_ANON_KEY    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.KhoDAhJmXcXmqS8g_Z6LdP6LCZPFT4iP5EIJT7JkJlM';
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';
const ND_KEY_1 = process.env.NEWS_KEY_1 || 'pub_2cc2f7c9e2694779871ea0d95a5a4689';
const ND_KEY_2 = process.env.NEWS_KEY_2 || 'pub_6659e2e08a3b483b89d1a2a5db900301';

// 每個地區的關鍵詞
const REGION_QUERIES: Record<string, string[]> = {
  ALL: ['world news', 'breaking news'],
  ASI: ['Asia Pacific news', 'Taiwan China tension'],
  TWN: ['Taiwan news', 'Taiwan politics'],
  JPN: ['Japan news', 'Japan politics'],
  KOR: ['Korea news', 'South Korea politics'],
  USA: ['United States news', 'US politics'],
  EUR: ['Europe news', 'European Union'],
  RUS: ['Russia Ukraine war', 'Russia news'],
  ME:  ['Middle East news', 'Israel Gaza'],
  IND: ['India news', 'South Asia'],
  LAT: ['Latin America news'],
  AFR: ['Africa news'],
  SCI: ['science discoveries'],
  TEC: ['technology AI'],
  ECO: ['business economy'],
  SPO: ['sports football'],
};

function stripHtml(html: string) {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/<[^>]+>/g,'').trim();
}

async function fetchND(key: string, queries: string[], lang = 'en') {
  const results: any[] = [];
  for (const q of queries) {
    try {
      const r = await fetch(
        `https://newsdata.io/api/1/news?apikey=${key}&q=${encodeURIComponent(q)}&language=${lang}&size=10`,
        { signal: AbortSignal.timeout(7000) }
      );
      if (!r.ok) continue;
      const d = await r.json();
      if (d.status !== 'success') continue;
      for (const a of d.results || []) {
        if (!a.title || !a.link) continue;
        results.push({
          id:       a.article_id || Math.random().toString(36).slice(2),
          title:    stripHtml(a.title || '').slice(0, 300),
          summary:  stripHtml(a.description || a.content || '').slice(0, 500),
          link:     a.link || a.url || '',
          source:   a.source_id || 'NewsData',
          pubDate:  a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
          imageUrl: a.image_url || '',
          region:   'ALL',
        });
      }
    } catch { /* skip failed query */ }
    await new Promise(r => setTimeout(r, 150));
  }
  return results;
}

async function readDB(regions: string[], limit: number) {
  try {
    let query = `${SB_URL}/rest/v1/news?select=id,title,summary,link,source,pub_date,image_url,region,lang&order=pub_date.desc&limit=${limit}`;
    if (regions.length > 0) {
      query += `&or=(region.in.(${regions.join(',')}),region.eq.ALL)`;
    }
    const r = await fetch(query, {
      headers: {
        'apikey': SB_SERVICE_KEY,
        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any) => ({
      id:       r.id,
      title:    r.title   || '',
      titleTL:  {},
      summary:  r.summary || '',
      summaryTL: {},
      link:     r.link    || '',
      source:   r.source  || '',
      pubDate:  r.pub_date,
      imageUrl: r.image_url || '',
      region:   r.region  || 'ALL',
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { searchParams } = new URL(req.url || '', 'http://localhost');
  const group = searchParams.get('group') || 'ALL';
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  // 地圖 group → region 代碼
  const GROUP_MAP: Record<string, string[]> = {
    ALL: [], ASI: ['ASI'], TWN: ['TWN'], JPN: ['JPN'], KOR: ['KOR'],
    USA: ['USA'], EUR: ['EUR'], RUS: ['RUS'], ME: ['ME'],
    LAT: ['LAT'], IND: ['IND'], AFR: ['AFR'],
    SCI: ['SCI'], TEC: ['TEC'], ECO: ['ECO'], SPO: ['SPO'],
  };
  const regions = GROUP_MAP[group] || [];

  // 1. 從 DB 讀取
  let news = await readDB(regions, limit);

  // 2. DB 少於 10 篇，從 NewsData 實時補充
  if (news.length < 10) {
    const queries = REGION_QUERIES[group] || REGION_QUERIES['ALL'];
    const lang    = group === 'TWN' ? 'zh' : group === 'JPN' ? 'ja' : group === 'KOR' ? 'ko' : 'en';
    const today   = new Date().toISOString().slice(0, 10);
    const keyIdx  = parseInt(today.replace(/-/g, ''), 10) % 2;
    const ndKey   = keyIdx === 0 ? ND_KEY_1 : ND_KEY_2;

    const ndNews = await fetchND(ndKey, queries, lang);

    // 合併去重
    const seen = new Set(news.map(n => n.link));
    for (const n of ndNews) {
      if (!seen.has(n.link)) {
        news.push(n);
        seen.add(n.link);
      }
      if (news.length >= limit) break;
    }
  }

  res.status(200).json(news.slice(0, limit));
}
