/**
 * api/crawl.ts — Vercel Cron: 每 30 分鐘自動爬蟲寫入 Supabase
 */
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL || 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const sb     = createClient(SB_URL, SB_KEY);

const ND_KEYS = ['pub_2cc2f7c9e2694779871ea0d95a5a4689', 'pub_6659e2e08a3b483b89d1a2a5db900301'];
let _ki = 0;
const ndKey = () => ND_KEYS[_ki++ % ND_KEYS.length];

const RSS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',             source: 'BBC World',    region: 'ALL', lang: 'en' },
  { url: 'https://feeds.reuters.com/reuters/worldnews',               source: 'Reuters',      region: 'ALL', lang: 'en' },
  { url: 'https://rss.cnn.com/rss/edition_world.rss',             source: 'CNN',          region: 'ALL', lang: 'en' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',             source: 'Al Jazeera',   region: 'ALL', lang: 'en' },
  { url: 'https://feeds.npr.org/1001/rss.xml',                source: 'NPR',          region: 'ALL', lang: 'en' },
  { url: 'https://www.france24.com/en/rss',                    source: 'France24',     region: 'ALL', lang: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', source: 'BBC Asia',      region: 'ASI', lang: 'en' },
  { url: 'https://www.scmp.com/rss/world.xml',                 source: 'SCMP',         region: 'ASI', lang: 'en' },
  { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',       source: 'NHK World',    region: 'ASI', lang: 'ja' },
  { url: 'https://www.channelnewsasia.com/rss',                source: 'CNA',          region: 'ASI', lang: 'en' },
  { url: 'https://www.cna.com.tw/rss/home.html',              source: 'CNA Taiwan',   region: 'TWN', lang: 'zh-TW' },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', source: 'BBC Asia',      region: 'TWN', lang: 'en' },
  { url: 'https://www.scmp.com/rss/world.xml',               source: 'SCMP',         region: 'TWN', lang: 'en' },
  { url: 'https://rss.nhk.or.jp/rss/news/asgn40.xml',       source: 'NHK World',    region: 'JPN', lang: 'ja' },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', source: 'BBC Asia',      region: 'KOR', lang: 'en' },
  { url: 'https://www.theguardian.com/world/rss',            source: 'Guardian',     region: 'EUR', lang: 'en' },
  { url: 'https://rss.dw.com/rdf/rss-en-world',            source: 'DW',           region: 'EUR', lang: 'de' },
  { url: 'https://feeds.bbci.co.uk/news/uk/rss.xml',        source: 'BBC UK',       region: 'UK',  lang: 'en' },
  { url: 'https://rss.cnn.com/rss/edition_us.rss',          source: 'CNN US',       region: 'USA', lang: 'en' },
  { url: 'https://feeds.npr.org/1001/rss.xml',             source: 'NPR',          region: 'USA', lang: 'en' },
  { url: 'https://feeds.reuters.com/reuters/worldnews',       source: 'Reuters',     region: 'UKR', lang: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC ME', region: 'ME',  lang: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', source: 'BBC Africa', region: 'AFR', lang: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',  source: 'BBC Tech',    region: 'TEC', lang: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC Science', region: 'SCI', lang: 'en' },
  { url: 'https://feeds.bloomberg.com/world/news.rss',      source: 'Bloomberg',    region: 'ECO', lang: 'en' },
  { url: 'https://feeds.bbci.co.uk/news/sport/rss.xml',   source: 'BBC Sport',   region: 'SPO', lang: 'en' },
];

function sid(t, l) {
  const s = (t+'|'+l).replace(/\s+/g,' ').trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h*31+s.charCodeAt(i))>>>0;
  return String(h);
}
function dh(html) {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,(_,c) => String.fromCharCode(+c))
    .replace(/<[^>]+>/g,'').trim();
}
function parseRSS(xml, src, region, lang) {
  if (!xml || xml.length < 50) return [];
  const items = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const gt = (b, t) => {
    const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
  };
  let m;
  while ((m = re.exec(xml)) !== null && items.length < 12) {
    const b = m[1];
    const lp = gt(b,'link'), up = lp.match(/[?&]url=([^&]+)/);
    const link = up ? decodeURIComponent(up[1]) : lp;
    const title = gt(b,'title');
    if (!title || !link) continue;
    const img = b.match(/<media:content[^>]+url=["']([^"']+)["']/i)
             || b.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
             || b.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    items.push({
      title: dh(title),
      summary: dh(gt(b,'description')||'').slice(0,300),
      link, source: src, image_url: img ? img[1] : '',
      pub_date: gt(b,'pubDate') || new Date().toISOString(), region, lang,
    });
  }
  return items;
}
function httpGet(url) {
  return fetch(url, {
    headers: { 'User-Agent': 'WorldNewsBot/1.0 (+world-news.xyz)', 'Accept': 'application/rss+xml,*/*' },
    signal: AbortSignal.timeout(8000),
  }).then(r => r.ok ? r.text() : '').catch(() => '');
}

const ND_MAP = {
  ALL:[], ASI:['cn','jp','kr','tw','hk','sg'], TWN:['tw'], JPN:['jp'],
  KOR:['kr'], EUR:['gb','de','fr'], UK:['gb'], USA:['us'], UKR:['ua'],
};
async function fetchND(region) {
  const countries = ND_MAP[region] || [];
  try {
    let u = `https://newsdata.io/api/1/news?apikey=${ndKey()}&category=world&language=en&size=15`;
    if (countries.length) u += '&country=' + countries.join(',');
    const xml = await httpGet(u);
    if (!xml) return [];
    let d; try { d = JSON.parse(xml); } catch { return []; }
    if (d.status !== 'success' || !Array.isArray(d.results)) return [];
    return d.results.map(a => ({
      title: dh(a.title||''), summary: dh(a.description||'').slice(0,300),
      link: a.link||a.url||'', source: a.source_id||'NewsData',
      image_url: a.image_url||a.thumbnail||'',
      pub_date: a.pubDate||new Date().toISOString(), region, lang: 'en',
    }));
  } catch { return []; }
}

async function upsert(items) {
  if (!items.length) return 0;
  const rows = items.map(i => ({
    title: i.title, summary: i.summary||'',
    link: i.link, source: i.source,
    image_url: i.image_url||'',
    pub_date: i.pub_date || new Date().toISOString(),
    region: i.region, lang: i.lang||'en',
    fetched_at: new Date().toISOString(),
  }));

  // Upsert with merge-duplicates (no Prefer header = standard upsert)
  const res = await fetch(`${SB_URL}/rest/v1/news`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`Upsert HTTP ${res.status}:`, txt.slice(0, 200));
    return 0;
  }

  // With merge-duplicates + no return preference: empty body on success
  // Trust our own dedup: we only insert items with unseen links
  return rows.length;
}

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const secret = req.headers['x-cron-secret'] || req.query?.secret;
  if (secret !== process.env.CRON_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  const start = Date.now();

  const rssResults = await Promise.allSettled(
    RSS.map(f => httpGet(f.url).then(xml => ({ xml, feed: f })))
  );
  const rssItems = [];
  for (const r of rssResults) {
    if (r.status !== 'fulfilled' || !r.value.xml) continue;
    rssItems.push(...parseRSS(r.value.xml, r.value.feed.source, r.value.feed.region, r.value.feed.lang||'en'));
  }

  const ndResults = await Promise.all([
    fetchND('ALL'), fetchND('ASI'), fetchND('TWN'),
    fetchND('JPN'), fetchND('EUR'), fetchND('USA'),
  ]);
  const ndItems = ndResults.flat();

  const seen = new Set();
  const uniq = [];
  for (const i of [...rssItems, ...ndItems]) {
    if (!i.link || seen.has(i.link)) continue;
    seen.add(i.link); uniq.push(i);
  }

  const cutoff = Date.now() - 48*3600*1000;
  const fresh = uniq.filter(i => { try { return new Date(i.pub_date).getTime() > cutoff; } catch { return false; } });

  const inserted = await upsert(fresh);
  const ms = Date.now() - start;
  console.log(`[crawl] Done. RSS=${rssItems.length} Uniq=${uniq.length} Fresh=${fresh.length} Inserted=${inserted} in ${ms}ms`);
  console.log('[crawl] Sample links:', uniq.slice(0,3).map(i=>i.link.substring(0,50)));

  res.status(200).json({ ok: true, inserted, fresh: fresh.length, elapsed_ms: ms, at: new Date().toISOString() });
}
