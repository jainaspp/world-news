/**
 * api/news.ts — 從 Supabase 讀取新聞（使用 Fetch REST API，兼容 Edge Runtime）
 */
const SB_URL = process.env.SUPABASE_URL || 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const REGION_MAP = {
  ALL:[],
  ASI:['ALL','ASI','EAS','SEA','TWN','JPN','KOR','CHN'],
  EAS:['ALL','EAS','TWN','JPN','KOR'],
  SEA:['ALL','SEA'],
  TWN:['ALL','TWN'],
  JPN:['ALL','JPN'],
  KOR:['ALL','KOR'],
  CHN:['ALL','CHN'],
  IND:['ALL','IND'],
  EUR:['ALL','EUR','UK'],
  UK: ['ALL','UK'],
  FRA:['ALL','EUR'],
  DEU:['ALL','EUR'],
  RUS:['ALL','RUS'],
  UKR:['ALL','UKR'],
  ME: ['ALL','ME'],
  AFR:['ALL','AFR'],
  AM: ['ALL','AM','USA'],
  USA:['ALL','USA'],
  BRA:['ALL','BRA'],
  OCE:['ALL','OCE'],
  MIL:['ALL','MIL'],
  POL:['ALL','POL'],
  ECO:['ALL','ECO'],
  TEC:['ALL','TEC'],
  SCI:['ALL','SCI'],
  ENV:['ALL','ENV'],
  SPO:['ALL','SPO'],
  ENT:['ALL','ENT'],
};

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { group = 'ALL', limit = '30' } = req.query || {};
  const key    = String(group).toUpperCase().replace('-', '');
  const regions = REGION_MAP[key] || [key];
  const cutoff  = new Date(Date.now() - 48*3600*1000).toISOString();

  try {
    const limitInt = parseInt(String(limit), 10);
    const sel = 'id,title,summary,link,source,image_url,pub_date,region';
    let query = `${SB_URL}/rest/v1/news?select=${sel}&pub_date=gte.${cutoff}&order=pub_date.desc&limit=${limitInt}`;
    if (regions.length > 0 && regions[0] !== 'ALL') {
      query += '&or=(region.in.(' + regions.join(',') + '),region.eq.ALL)';
    } else if (regions.length > 0) {
      query += '&or=(region.in.(' + regions.join(',') + '))';
    }

    const r = await fetch(query, {
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        Prefer: 'count=exact',
      },
    });
    const data = await r.json();

    if (!Array.isArray(data)) {
      console.error('[news] non-array response:', JSON.stringify(data).slice(0, 200));
      res.status(200).json([]);
      return;
    }

    const news = data.map(r => ({
      id:      r.id,
      title:   r.title || '',
      titleTL: {},
      summary: r.summary || '',
      summaryTL:{},
      link:    r.link || '',
      source:  r.source || '',
      pubDate: r.pub_date,
      imageUrl: r.image_url || '',
      region:  r.region || 'ALL',
    }));

    res.status(200).json(news);
  } catch (e) {
    console.error('[news] exception:', e.message);
    res.status(200).json({ error: e.message });
  }
}
