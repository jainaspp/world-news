/**
 * CF Worker — 多來源 RSS 抓取 → Supabase 儲存
 * 
 * Cron: 每 15 分鐘執行一次
 * RSS 來源覆蓋：全球熱門 + 12 個地區 + 6 個專業話題
 * 結果存入 Supabase，前端直接讀 DB（穩定快速）
 * 
 * 為什麼不用 Google News RSS：
 * - Google News 地區 RSS 結果極少（0-5條）
 * - source: 運算符幾乎全部被 Google 過濾
 * - 直接 RSS 來自權威媒體，更穩定、更準確
 */
"use strict";

// ─── 環境變量（在 CF Dashboard 設定）─────────────────────────────
// SUPABASE_URL: https://qpckwhnbawprbkkizcmn.supabase.co
// SUPABASE_SERVICE_KEY: eyJhbGci...（service_role key）

// ⚠️  fallback（如果 env 未設定，確保 cron 仍能運行）
const SB_URL_FALLBACK = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_SVC_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDIzMywiZXhwIjoyMDkxMDY2MjMzfQ.rX6gqIWcgFmpckJUFplmSIvCrm09An43Gs6YUwrx218';

// ─── RSS 來源配置（50+ 來源）────────────────────────────────
const RSS_FEEDS = [
  // 🌍 全球權威
  { name: 'Reuters World', url: 'https://feeds.reuters.com/reuters/worldnews', region: 'ALL', lang: 'en' },
  { name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', region: 'ALL', lang: 'en' },
  { name: 'CNN World', url: 'http://rss.cnn.com/rss/edition_world.rss', region: 'ALL', lang: 'en' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', region: 'ALL', lang: 'en' },
  { name: 'AP News', url: 'https://feeds.ap.org/rss/topnews', region: 'ALL', lang: 'en' },
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', region: 'ALL', lang: 'en' },
  { name: 'France24', url: 'https://www.france24.com/en/rss', region: 'ALL', lang: 'en' },
  { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss', region: 'ALL', lang: 'en' },
  { name: 'Fox Business Latest', url: 'https://moxie.foxbusiness.com/google-publisher/latest.xml', region: 'ALL', lang: 'en' },

  // 🇺🇸 美國
  { name: 'BBC Americas', url: 'http://feeds.bbci.co.uk/news/world/us_canada/rss.xml', region: 'USA', lang: 'en' },
  { name: 'Fox Business Economy', url: 'https://moxie.foxbusiness.com/google-publisher/economy.xml', region: 'USA', lang: 'en' },
  { name: 'Fox Business Markets', url: 'https://moxie.foxbusiness.com/google-publisher/markets.xml', region: 'USA', lang: 'en' },
  { name: 'Fox Business Tech', url: 'https://moxie.foxbusiness.com/google-publisher/technology.xml', region: 'USA', lang: 'en' },
  { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', region: 'USA', lang: 'en' },

  // 🌏 亞太
  { name: 'Asahi News', url: 'https://www.asahi.com/rss/asahi/news.rdf', region: 'JPN', lang: 'ja' },
  { name: 'Asahi Politics', url: 'https://www.asahi.com/rss/asahi/politics.rdf', region: 'JPN', lang: 'ja' },
  { name: 'Asahi International', url: 'https://www.asahi.com/rss/asahi/international.rdf', region: 'JPN', lang: 'ja' },
  { name: 'Asahi Tech Science', url: 'https://www.asahi.com/rss/asahi/tech_science.rdf', region: 'JPN', lang: 'ja' },
  { name: 'NHK World', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', region: 'JPN', lang: 'ja' },
  { name: 'CNA Taiwan', url: 'https://english.cna.com.tw/rss/latestReports', region: 'TWN', lang: 'en' },
  { name: 'RTHK Hong Kong', url: 'https://news.rthk.hk/rss/news', region: 'HKG', lang: 'zh' },
  { name: 'HK Free Press', url: 'https://www.hongkongfp.com/feed/', region: 'HKG', lang: 'en' },
  { name: 'Yonhap Korea', url: 'https://www.yna.co.kr/rss/news.xml', region: 'KOR', lang: 'ko' },
  { name: 'Korea Herald', url: 'http://www.koreaherald.com/rss.php?l=1', region: 'KOR', lang: 'en' },
  { name: 'The Hindu', url: 'https://www.thehindu.com/news/international/rss/', region: 'IND', lang: 'en' },
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rss.cms', region: 'IND', lang: 'en' },
  { name: 'SCMP', url: 'https://www.scmp.com/rss/91/feed', region: 'CHN', lang: 'en' },

  // 🌍 歐洲
  { name: 'DW Germany', url: 'https://rss.dw.com/rdf/rss-de-all', region: 'DEU', lang: 'de' },
  { name: 'Le Monde', url: 'https://www.lemonde.fr/international/rss_full.xml', region: 'FRA', lang: 'fr' },
  { name: 'BBC Europe', url: 'http://feeds.bbci.co.uk/news/world/europe/rss.xml', region: 'EUR', lang: 'en' },
  { name: 'Euronews', url: 'https://feeds.euronews.com/italy_news', region: 'EUR', lang: 'en' },

  // 🌍 中東 / 非洲 / 拉美
  { name: 'Al Arabiya', url: 'https://www.alarabiya.net/.rss/full/22', region: 'ME', lang: 'ar' },
  { name: 'BBC Africa', url: 'http://feeds.bbci.co.uk/news/world/africa/rss.xml', region: 'AFR', lang: 'en' },
  { name: 'Mail & Guardian', url: 'https://mg.co.za/feed/', region: 'AFR', lang: 'en' },
  { name: 'BBC Latin America', url: 'http://feeds.bbci.co.uk/news/world/latin_america/rss.xml', region: 'LAT', lang: 'en' },

  // 💻 科技
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', region: 'TEC', lang: 'en' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', region: 'TEC', lang: 'en' },
  { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', region: 'TEC', lang: 'en' },
  { name: 'kottke.org', url: 'https://kottke.org/feed', region: 'TEC', lang: 'en' },
  { name: 'Adactio', url: 'https://adactio.com/journal/feed', region: 'TEC', lang: 'en' },
  { name: 'xkcd', url: 'https://xkcd.com/rss.xml', region: 'TEC', lang: 'en' },
  { name: 'WP Tavern', url: 'https://wptavern.com/feed', region: 'TEC', lang: 'en' },
  { name: 'WPBeginner', url: 'https://www.wpbeginner.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Node Weekly', url: 'https://cprss.s3.amazonaws.com/nodeweekly.com.xml', region: 'TEC', lang: 'en' },

  // 🔬 科學
  { name: 'Science Magazine', url: 'https://www.science.org/rss/current.xml', region: 'SCI', lang: 'en' },
  { name: 'Nature', url: 'https://www.nature.com/nature.rss', region: 'SCI', lang: 'en' },
  { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/', region: 'SCI', lang: 'en' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/', region: 'SCI', lang: 'en' },
  { name: 'Popular Science', url: 'https://www.popsci.com/arcio/rss/', region: 'SCI', lang: 'en' },
  { name: 'ESA Space', url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Science', region: 'SCI', lang: 'en' },
  { name: 'BBC Science', url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml', region: 'SCI', lang: 'en' },

  // 💰 財經
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews', region: 'BUS', lang: 'en' },
  { name: 'Fox Business Markets', url: 'https://moxie.foxbusiness.com/google-publisher/markets.xml', region: 'BUS', lang: 'en' },

  // 🏥 健康
  { name: 'NPR Health', url: 'https://feeds.npr.org/1128/rss.xml', region: 'HLT', lang: 'en' },
  { name: 'NHS News England', url: 'https://www.england.nhs.uk/feed/', region: 'HLT', lang: 'en' },
  { name: 'Running on Real Food', url: 'https://runningonrealfood.com/feed/', region: 'HLT', lang: 'en' },
  { name: "Mark's Daily Apple", url: 'https://feeds2.feedburner.com/MarksDailyApple', region: 'HLT', lang: 'en' },

  // ✈️ 旅遊
  { name: 'Condé Nast Traveler', url: 'https://www.cntraveler.com/feed/rss', region: 'TRV', lang: 'en' },
  { name: 'Nomadic Matt', url: 'https://www.nomadicmatt.com/feed/', region: 'TRV', lang: 'en' },

  // 🎮 遊戲
  { name: 'Stevivor', url: 'https://stevivor.com/feed/', region: 'TEC', lang: 'en' },

  // 🎨 設計
  { name: 'Spoon & Tamago', url: 'https://www.spoon-tamago.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Brand New', url: 'https://www.underconsideration.com/brandnew/feed/', region: 'TEC', lang: 'en' },

  // 📝 個人博客
  { name: 'Craig Mod', url: 'https://craigmod.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Frank Chimero', url: 'https://frankchimero.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Dave Rupert', url: 'https://daverupert.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Jim Nielsen', url: 'https://blog.jim-nielsen.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Austin Kleon', url: 'https://austinkleon.com/feed/', region: 'TEC', lang: 'en' },
  { name: 'Waxy.org', url: 'https://waxy.org/feed/', region: 'TEC', lang: 'en' },
];

// ─── Supabase 工具函數 ────────────────────────────────────────
function getSbHeaders(serviceKey) {
  return {
    'Content-Type': 'application/json',
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Prefer': 'resolution=merge-duplicates',
  };
}

async function supabaseUpsert(supabaseUrl, serviceKey, rows) {
  const res = await fetch(`${supabaseUrl}/rest/v1/news`, {
    method: 'POST',
    headers: getSbHeaders(serviceKey),
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function getExistingLinks(supabaseUrl, serviceKey) {
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/news?select=link&pub_date=gt.${new Date(cutoff).toISOString()}&limit=1000`,
    { headers: getSbHeaders(serviceKey) }
  );
  if (!res.ok) return new Set();
  const data = await res.json();
  if (!Array.isArray(data)) return new Set();
  return new Set(data.map(r => r.link).filter(Boolean));
}

// ─── RSS 解析 ─────────────────────────────────────────────────
function parseXmlFeed(xml) {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const getTag = (blk, tag) => {
    const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
  };
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 20) {
    const blk = m[1];
    const linkRaw = getTag(blk, 'link');
    const linkMatch = linkRaw.match(/[?&]url=([^&]+)/);
    const link = linkMatch ? decodeURIComponent(linkMatch[1]) : linkRaw;
    const title = getTag(blk, 'title');
    const desc = getTag(blk, 'description') || getTag(blk, 'content:encoded') || '';
    const pubDate = getTag(blk, 'pubDate') || new Date().toISOString();
    const source = getTag(blk, 'source') || '';
    if (title && link) {
      items.push({ title, summary: desc, link, source, pubDate });
    }
  }
  return items;
}

function stableId(title, link) {
  const str = `${title}|${link}`.replace(/\s+/g,' ').trim();
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      timeout: 10000,
    });
    if (!res.ok) return { feed, items: [], error: `HTTP ${res.status}` };
    const xml = await res.text();
    const items = parseXmlFeed(xml);
    return { feed, items, error: null };
  } catch (e) {
    return { feed, items: [], error: e.message };
  }
}

// ─── 處理單一 feed（計數+寫 DB）─────────────────────────────
async function processFeed(feed, existingLinks, supabaseUrl, serviceKey) {
  const result = await fetchFeed(feed);
  if (result.error) {
    console.log(`❌ ${feed.name}: ${result.error}`);
    return { feed: result.feed, new: 0, dup: 0, error: result.error };
  }

  // 去重 + 過濾
  const newItems = [];
  for (const item of result.items) {
    if (!item.link || existingLinks.has(item.link)) continue;
    if (item.title.length < 10) continue;
    newItems.push({
      title: item.title.slice(0, 300),
      summary: item.summary.replace(/<[^>]+>/g,'').slice(0, 1000),
      link: item.link,
      source: item.source || feed.name,
      image_url: '',
      pub_date: new Date(item.pubDate).toISOString(),
      region: feed.region,
      lang: feed.lang,
      fetched_at: new Date().toISOString(),
    });
    existingLinks.add(item.link);
  }

  if (newItems.length > 0) {
    const upserted = await supabaseUpsert(supabaseUrl, serviceKey, newItems);
    console.log(`✅ ${feed.name}: ${newItems.length} new / ${result.items.length} total`);
    return { feed: feed.name, new: newItems.length, total: result.items.length, error: null };
  } else {
    console.log(`⏳ ${feed.name}: 0 new (${result.items.length} total, all dup)`);
    return { feed: feed.name, new: 0, total: result.items.length, error: null };
  }
}

// ─── 計時工具 ─────────────────────────────────────────────────
function ts() { return new Date().toISOString().slice(11, 19); }

// ─── 入口 ────────────────────────────────────────────────────
export default {
  async scheduled(controller, env, ctx) {
    const sbUrl = env.SUPABASE_URL || SB_URL_FALLBACK;
    const sbKey = env.SUPABASE_SERVICE_KEY || SB_SVC_KEY_FALLBACK;
    console.log(`[${ts()}] 🔄 Cron 開始 — ${RSS_FEEDS.length} 個 RSS 來源`);
    console.log(`[${ts()}] 📦 Supabase: ${sbUrl}`);

    // 讀取現有 link（去重）
    const existingLinks = await getExistingLinks(sbUrl, sbKey);
    console.log(`[${ts()}] 📦 DB 現有連結: ${existingLinks.size}`);

    let totalNew = 0, totalError = 0;

    // 並發控制：每次 5 個 feed
    for (let i = 0; i < RSS_FEEDS.length; i += 5) {
      const batch = RSS_FEEDS.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(feed => processFeed(feed, existingLinks, sbUrl, sbKey))
      );
      for (const r of batchResults) {
        if (r.error) totalError++;
        else totalNew += r.new;
      }
      console.log(`[${ts()}] Batch ${Math.floor(i/5)+1}: done`);
    }

    console.log(`[${ts()}] ✅ Cron 完成: +${totalNew} new | ${totalError} errors`);
  },

  // ─── HTTP handler（健康檢查 / 手動觸發）──────────────────────
  async fetch(request) {
    const url = new URL(request.url);
    const supabaseUrl = url.searchParams.get('sb') || SB_URL_FALLBACK;
    const serviceKey = url.searchParams.get('key') || SB_SVC_KEY_FALLBACK;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Max-Age': '3600' } });
    }

    // 讀取模式：?read=1
    if (url.searchParams.get('read') === '1') {
      const region = url.searchParams.get('region') || 'ALL';
      const limit = parseInt(url.searchParams.get('limit') || '30');
      const serviceKeyOrAnon = serviceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.KhoDAhJmXcXmqS8g_Z6LdP6LCZPFT4iP5EIJT7JkJlM';
      const filter = region !== 'ALL' ? `and(region.eq.${region},lang.neq.zh)` : '';
      const res = await fetch(
        `${supabaseUrl}/rest/v1/news?select=id,title,summary,link,source,pub_date,region,image_url,lang,category&order=pub_date.desc&limit=${limit}${filter}`,
        { headers: { 'apikey': serviceKeyOrAnon, 'Authorization': `Bearer ${serviceKeyOrAnon}` } }
      );
      if (!res.ok) return new Response(JSON.stringify({ error: 'DB read failed' }), { status: 500, headers: corsHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(Array.isArray(data) ? data : []), { headers: corsHeaders });
    }

    // 狀態模式
    return new Response(JSON.stringify({
      status: 'ok',
      service: 'CF Worker RSS → Supabase',
      feeds: RSS_FEEDS.length,
      mode: 'GET /?read=1&region=ALL&limit=30&key=<service_key>',
    }), { headers: corsHeaders });
  },
};
