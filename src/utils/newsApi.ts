/**
 * newsApi.ts — 新聞獲取
 *
 * 策略（顛倒優先級）：
 *  Phase 1: CF Worker → Google News RSS（瀏覽器 → Worker → Google News，乾淨無 WAF）
 *  Phase 2: 直接 fetch Google News RSS（部分 endpoint 有 CORS）
 *  Fallback: 50 篇靜態新聞（永不失效）
 *
 * ⚠️ 不在客戶端直接調用 NewsData.io / rss2json.com
 */
import { NewsItem } from '../types';

// ─── CF Worker URL — Google News RSS 代理──────────────────────
const WORKER_BASE = 'https://world-news-api.jainaspp.workers.dev';

// ─── Supabase（只用於 cache 讀寫）────────────────────────────
const SB_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.KhoDAhJmXcXmqS8g_Z6LdP6LCZPFT4iP5EIJT7JkJlM';

// ─── 工具函數 ────────────────────────────────────────────────
function stableId(title: string, link: string): number {
  const str = `${title}|${link}`.replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

function decodeHtml(html: string): string {
  return String(html || '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g, (_,c) => String.fromCharCode(+c))
    .replace(/<[^>]+>/g,'').trim();
}

// ─── FALLBACK RSS FEEDS（真實、新聞可信賴）────────────────────
// 當 Worker + Google News RSS 雙雙失敗時的最後一道防線。
// 這些全是公開的 RSS/Atom 端點，無需 API Key，適合客戶端 fetch。
// 資料來源：BBC World、Reuters、Al Jazeera、NHK World、France24、ABC Australia、
//          DW（德國之聲）、Euronews、Sky News、UN News — 全部是具有新聞信譽的公共機構。
//
// ⚠️ 所有 URL 均為公開端點，請勿加入需要付費牆或登入的新聞源。
const FALLBACK_RSS_FEEDS = [
  // ── 英語主流媒體 ──
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                           label: 'BBC World',              region: 'ALL' },
  { url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',                      label: 'BBC Asia',               region: 'ASI' },
  { url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',                    label: 'BBC Europe',             region: 'EUR' },
  { url: 'https://www.reutersagency.com/feed/?best-regions=europe&post_type=best', label: 'Reuters Europe',       region: 'EUR' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',                            label: 'Al Jazeera',             region: 'ALL' },
  { url: 'https://www.nhk.or.jp/rss/news/cat0.xml',                              label: 'NHK World',              region: 'JPN' },
  { url: 'https://www.france24.com/en/rss',                                      label: 'France24 English',       region: 'EUR' },
  { url: 'https://www.skynews.com.au/rss/',                                      label: 'Sky News',               region: 'AUS' },
  { url: 'https://www.abc.net.au/news/feeds/rss/worldnews.xml',                  label: 'ABC Australia',          region: 'AUS' },
  // ── 德語 / 歐洲 ──
  { url: 'https://rss.dw.com/rss/rss.php-en',                                    label: 'DW (English)',            region: 'EUR' },
  { url: 'https://www.euronews.com/rss',                                        label: 'Euronews',               region: 'EUR' },
  // ── 亞洲 ──
  { url: 'https://english.kyodonews.net/rss/papers.xml',                        label: 'Kyodo News',             region: 'ASI' },
  { url: 'https://www.channelnewsasia.com/rss',                                 label: 'Channel News Asia',      region: 'ASI' },
  { url: 'https://www.scmp.com/rss/feed.xml',                                    label: 'SCMP',                   region: 'ASI' },
  // ── 聯合國 / 國際組織 ──
  { url: 'https://news.un.org/feed/subscribe/en/news.rss',                      label: 'UN News',                region: 'ALL' },
  // ── 備用 Google News 搜尋（涵蓋突發新聞）──
  { url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',               label: 'Google News US',         region: 'USA' },
  { url: 'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en',               label: 'Google News UK',        region: 'UK'  },
  { url: 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh',               label: 'Google News Taiwan',     region: 'TWN' },
  { url: 'https://news.google.com/rss?hl=ja-JP&gl=JP&ceid=JP:ja',               label: 'Google News Japan',      region: 'JPN' },
  { url: 'https://news.google.com/rss?hl=ko-KR&gl=KR&ceid=KR:ko',               label: 'Google News Korea',      region: 'KOR' },
  { url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',               label: 'Google News India',      region: 'IND' },
  { url: 'https://news.google.com/rss?hl=zh-HK&gl=HK&ceid=HK:zh',               label: 'Google News HK',        region: 'HKG' },
  { url: 'https://news.google.com/rss?hl=en-AU&gl=AU&ceid=AU:en',               label: 'Google News Australia',  region: 'AUS' },
  { url: 'https://news.google.com/rss?hl=ar&gl=AE&ceid=AE:ar',                  label: 'Google News Middle East',region: 'ME'  },
  { url: 'https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr',                  label: 'Google News France',     region: 'EUR' },
  { url: 'https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de',                  label: 'Google News Germany',   region: 'EUR' },
  { url: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt',               label: 'Google News Brazil',     region: 'LAT' },
  { url: 'https://news.google.com/rss?hl=en&gl=ZA&ceid=ZA:en',                  label: 'Google News Africa',     region: 'AFR' },
  { url: 'https://news.google.com/rss?hl=ru&gl=RU&ceid=RU:ru',                  label: 'Google News Russia',    region: 'RUS' },
];

// ─── 解析 RSS/Atom XML ───────────────────────────────────────
function parseRSS(xml: string, sourceLabel: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item\b([\s\S]*?)<\/item>/gi;
  const gt = (blk: string, tag: string) => {
    const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
  };
  let mx;
  while ((mx = re.exec(xml)) !== null && items.length < 10) {
    const blk = mx[1];
    const tl = gt(blk,'title');
    if (!tl) continue;
    const rawLink = gt(blk,'link');
    const up = rawLink.match(/url=([^&]+)/);
    const link = up ? decodeURIComponent(up[1]) : rawLink;
    const desc = decodeHtml(gt(blk,'description')).slice(0, 400);
    const pubRaw = gt(blk,'pubDate') || gt(blk,'dc:date') || new Date().toISOString();
    // media:content / media:thumbnail
    const mc = blk.match(/url=["']([^"']+)["']/i);
    const img = mc ? mc[1] : '';
    items.push({
      id: stableId(tl, link),
      title: tl,
      titleTL: {},
      summary: desc,
      summaryTL: {},
      link,
      source: gt(blk,'source') || sourceLabel,
      pubDate: new Date(pubRaw).toISOString(),
      imageUrl: img,
      region: 'ALL',
    });
  }
  return items;
}

// ─── FALLBACK：依 region 動態抓取真實 RSS ──────────────────
// 最多並發 5 個 feed，總超時 12 秒
async function fetchFallbackByRegion(targetRegion: string): Promise<NewsItem[]> {
  // 依 region 過濾 feed；若 region==='ALL' 取前8個英文主 feed
  const pool = targetRegion === 'ALL'
    ? FALLBACK_RSS_FEEDS.slice(0, 8)
    : FALLBACK_RSS_FEEDS.filter(f => f.region === targetRegion || f.region === 'ALL').slice(0, 6);

  if (pool.length === 0) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const results = await Promise.allSettled(
      pool.map(f =>
        fetch(f.url, { signal: controller.signal as AbortSignal, mode: 'cors' } as RequestInit)
          .then(r => r.text())
          .then(xml => parseRSS(xml, f.label))
          .catch(() => [] as NewsItem[])
      )
    );
    clearTimeout(timer);
    const all: NewsItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }
    // 去重 + 時間排序
    const seen = new Set<string>();
    return all
      .filter(n => {
        const key = n.title.slice(0, 60);
        if (seen.has(key)) return false;
        seen.add(key); return true;
      })
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 30);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

// ─── CF Worker 請求（Google News RSS 代理）────────────────────
async function fetchViaWorker(group = 'ALL'): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${WORKER_BASE}/?group=${encodeURIComponent(group)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((r: any) => ({
      id: r.id || stableId(r.title || '', r.link || ''),
      title: decodeHtml(r.title || ''),
      titleTL: {},
      summary: decodeHtml(r.summary || '').slice(0, 500),
      summaryTL: {},
      link: r.link || '',
      source: r.source || 'Google News',
      pubDate: r.pubDate || new Date().toISOString(),
      imageUrl: r.imageUrl || '',
      region: r.region || group,
    }));
  } catch { return []; }
}

// ─── 直接請求 Google News RSS（CORS 代理）───────────────────
async function fetchDirectGoogleNews(group = 'ALL'): Promise<NewsItem[]> {
  const FEEDS: Record<string, string> = {
    ALL: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
    USA: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
    UK:  'https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en',
    TWN: 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh',
    JPN: 'https://news.google.com/rss?hl=ja-JP&gl=JP&ceid=JP:ja',
    KOR: 'https://news.google.com/rss?hl=ko-KR&gl=KR&ceid=KR:ko',
    HK:  'https://news.google.com/rss?hl=zh-HK&gl=HK&ceid=HK:zh',
    IND: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
    AUS: 'https://news.google.com/rss?hl=en-AU&gl=AU&ceid=AU:en',
    EUR: 'https://news.google.com/rss?hl=en-GB&gl=DE&ceid=DE:en',
    ASI: 'https://news.google.com/rss?hl=en-US&gl=SG&ceid=SG:en',
    ME:  'https://news.google.com/rss?hl=en-GB&gl=AE&ceid=AE:en',
    AFR: 'https://news.google.com/rss?hl=en-GB&gl=ZA&ceid=ZA:en',
    LAT: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt',
    RUS: 'https://news.google.com/rss?hl=ru-RU&gl=RU&ceid=RU:ru',
    TEC: 'https://news.google.com/rss/search?q=AI+OR+technology+OR+Apple+OR+Google',
    SCI: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQXAB',
    BUS: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQXAB',
  };
  const url = FEEDS[group.toUpperCase()] || FEEDS.ALL;
  try {
    const res = await proxyFetch(url) || new Response('', { status: 0 });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: any[] = [];
    const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const gt = (blk: string, tag: string) => {
      const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
    };
    let mx;
    while ((mx = re.exec(xml)) !== null && items.length < 25) {
      const blk = mx[1];
      const lp = gt(blk,'link'), up = lp.match(/[?&]url=([^&]+)/);
      const tl = gt(blk,'title');
      if (!tl) continue;
      const link = up ? decodeURIComponent(up[1]) : lp;
      items.push({
        id: stableId(tl, link),
        title: decodeHtml(tl),
        titleTL: {},
        summary: decodeHtml(gt(blk,'description')).slice(0, 500),
        summaryTL: {},
        link,
        source: gt(blk,'source') || 'Google News',
        pubDate: gt(blk,'pubDate') || new Date().toISOString(),
        imageUrl: '',
        region: group,
      });
    }
    return items;
  } catch { return []; }
}

// ─── 寫入 Supabase cache（非阻塞）────────────────────────────
function writeToCache(items: NewsItem[]) {
  if (!items.length || !SB_ANON_KEY) return;
  const rows = items.slice(0, 20).map(i => ({
    title: String(i.title).slice(0, 300),
    summary: String(i.summary || ''),
    link: String(i.link),
    source: String(i.source || 'GoogleNews'),
    image_url: String(i.imageUrl || ''),
    pub_date: String(i.pubDate || new Date().toISOString()),
    region: String(i.region || 'ALL'),
    lang: 'en',
    fetched_at: new Date().toISOString(),
  }));
  fetch(`${SB_URL}/rest/v1/news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_ANON_KEY,
      'Authorization': `Bearer ${SB_ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  }).catch(() => {});
}

// ─── 公開接口 ───────────────────────────────────────────────
export async function fetchGroupByRegion(region: string): Promise<NewsItem[]> {
  // Phase 1: CF Worker → Google News RSS（首選，10秒超時）
  const workerNews = await Promise.race([
    fetchViaWorker(region),
    new Promise<NewsItem[]>(r => setTimeout(() => r([]), 6000)),
  ]);
  if (workerNews.length >= 5) {
    writeToCache(workerNews);
    return workerNews;
  }

  // Phase 2: 直接請求 Google News RSS
  const directNews = await Promise.race([
    fetchDirectGoogleNews(region),
    new Promise<NewsItem[]>(r => setTimeout(() => r([]), 5000)),
  ]);
  if (directNews.length >= 5) {
    writeToCache(directNews);
    return directNews;
  }

  // Fallback: 動態抓取真實 RSS（永不返回虛構內容）
  return fetchFallbackByRegion(region);
}

export async function fetchGroupByTopic(topic: string): Promise<NewsItem[]> {
  return fetchGroupByRegion(topic);
}

export async function fetchAllNewsSmart(group: string): Promise<NewsItem[]> {
  return fetchGroupByRegion(group);
}

export async function searchGoogleNews(query: string): Promise<NewsItem[]> {
  const q = query.toLowerCase();
  const results = await Promise.allSettled([
    fetchDirectGoogleNews('TEC'),
    fetchViaWorker('ALL'),
  ]);
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)).slice(0, 30);
}

// ─── 兼容導出（sources.ts 需要）───────────────────────────────
export const RSS_FEEDS = [];

// ─── RSS 來源分類（晶片欄 1）───────────────────────────────
// 按實際 RSS 來源分組，去重後顯示
export const RSS_SOURCES = [
  {
    code: 'ALL', label: '全球', icon: '🌏',
    sources: []
  },
  {
    code: 'HKG', label: '香港', icon: '🇭🇰',
    sources: []
  },
  {
    code: 'SRC', label: '來源', icon: '📡',
    sources: [
      { code: 'BBC',        label: 'BBC',         flag: '🇬🇧' },
      { code: 'Reuters',    label: 'Reuters',      flag: '🇺🇳' },
      { code: 'Al Jazeera', label: 'Al Jazeera',   flag: '🇶🇦' },
      { code: 'NHK',        label: 'NHK',          flag: '🇯🇵' },
      { code: 'France24',   label: 'France24',     flag: '🇫🇷' },
      { code: 'DW',         label: 'DW',           flag: '🇩🇪' },
      { code: 'CNA',        label: 'CNA',          flag: '🇸🇬' },
      { code: 'SCMP',       label: 'SCMP',         flag: '🇭🇰' },
      { code: 'Euronews',   label: 'Euronews',     flag: '🇪🇺' },
      { code: 'UN',         label: 'UN News',      flag: '🇺🇳' },
    ]
  },
];

// ─── 區域分類（供 sources.ts 使用）──────────────────────
export const REGIONS = RSS_SOURCES;

// ─── 主題分類（晶片欄 2）────────────────────────────────
// 過濾規則：source 包含關鍵詞
export const TOPICS = [
  {
    code: 'ALL', label: '全部', icon: '🌏', keywords: []
  },
  {
    code: 'TEC', label: '科技', icon: '💻',
    keywords: ['tech', 'ai', 'google', 'apple', 'microsoft', 'software', 'app', 'startup', 'robot', 'digital', 'internet', 'cyber', '科技', '技術']
  },
  {
    code: 'MIL', label: '軍事', icon: '🪖',
    keywords: ['military', 'army', 'war', 'defense', 'defence', 'troop', 'missile', 'drone', 'aircraft carrier', 'nuclear weapon', '軍隊', '軍事', '戰爭', '導彈', '軍備']
  },
  {
    code: 'ECO', label: '經濟', icon: '📈',
    keywords: ['economy', 'economic', 'gdp', 'inflation', 'trade war', 'tariff', 'oil price', 'stock market', 'finance', 'banking', 'crisis', '宏觀經濟', 'GDP', '通脹', '股市', '央行']
  },
  {
    code: 'POL', label: '政治', icon: '🏛️',
    keywords: ['politics', 'election', 'government', 'president', 'parliament', 'congress', 'vote', 'sanction', 'diplomatic', 'summit', '政治', '選舉', '政府', '總統', '峰會']
  },
  {
    code: 'ENT', label: '娛樂', icon: '🎬',
    keywords: ['film', 'movie', 'music', 'celebrity', 'hollywood', 'netflix', 'art', 'museum', 'exhibition', 'book', '電影', '音樂', '明星', '荷里活']
  },
  {
    code: 'SPT', label: '體育', icon: '⚽',
    keywords: ['football', 'soccer', 'basketball', 'nba', 'olympic', 'marathon', 'championship', 'tournament', 'score', 'match', '球賽', '足球', '奧運', '冠軍']
  },
];

export const SOURCE_INFO: Record<string, { name: string; url: string; color: string }> = {
  'Reuters World':    { name: 'Reuters',    url: 'https://reuters.com',         color: '#ff8000' },
  'BBC World':        { name: 'BBC News',   url: 'https://bbc.com/news',        color: '#bb1919' },
  'CNN World':        { name: 'CNN',        url: 'https://cnn.com',             color: '#cc0000' },
  'Al Jazeera':       { name: 'Al Jazeera', url: 'https://aljazeera.com',       color: '#003366' },
  'AP News':          { name: 'AP News',    url: 'https://apnews.com',          color: '#cc0000' },
  'NPR World':        { name: 'NPR',        url: 'https://npr.org',             color: '#003366' },
  'France24':         { name: 'France24',   url: 'https://france24.com',        color: '#003366' },
  'The Guardian':     { name: 'Guardian',   url: 'https://theguardian.com',      color: '#005689' },
  'Fox Business':     { name: 'Fox Business',url: 'https://foxbusiness.com',    color: '#003366' },
  'DW Germany':       { name: 'DW',         url: 'https://dw.com',               color: '#003366' },
  'Le Monde':         { name: 'Le Monde',   url: 'https://lemonde.fr',          color: '#003366' },
  'BBC Europe':       { name: 'BBC Europe', url: 'https://bbc.com/news',        color: '#bb1919' },
  'Euronews':         { name: 'Euronews',   url: 'https://euronews.com',       color: '#003366' },
  'Asahi News':       { name: 'Asahi',      url: 'https://asahi.com',           color: '#003366' },
  'NHK World':        { name: 'NHK',        url: 'https://nhkworld.jp',         color: '#003366' },
  'CNA Taiwan':       { name: 'CNA',        url: 'https://cna.com.tw',          color: '#003366' },
  'RTHK HK':          { name: 'RTHK',       url: 'https://rthk.hk',            color: '#003366' },
  'HK Free Press':    { name: 'HKFP',       url: 'https://hongkongfp.com',      color: '#003366' },
  'Yonhap Korea':     { name: 'Yonhap',     url: 'https://yna.co.kr',           color: '#003366' },
  'Korea Herald':     { name: 'Korea Herald',url: 'https://koreaherald.com',    color: '#003366' },
  'The Hindu':        { name: 'The Hindu',  url: 'https://thehindu.com',       color: '#ff8000' },
  'Times of India':   { name: 'ToI',        url: 'https://timesofindia.com',   color: '#cc0000' },
  'SCMP':             { name: 'SCMP',        url: 'https://scmp.com',           color: '#003366' },
  'Al Arabiya':       { name: 'Al Arabiya',  url: 'https://alarabiya.net',      color: '#003366' },
  'BBC Africa':       { name: 'BBC Africa',  url: 'https://bbc.com/news',        color: '#bb1919' },
  'Mail Guardian':     { name: 'M&G',         url: 'https://mg.co.za',           color: '#003366' },
  'BBC LatAm':        { name: 'BBC LatAm',   url: 'https://bbc.com/news',        color: '#bb1919' },
  'TechCrunch':       { name: 'TechCrunch', url: 'https://techcrunch.com',     color: '#003366' },
  'Ars Technica':     { name: 'Ars Tech',   url: 'https://arstechnica.com',    color: '#003366' },
  'Wired':            { name: 'Wired',      url: 'https://wired.com',           color: '#111111' },
  'Science Mag':      { name: 'Science',     url: 'https://science.org',        color: '#003366' },
  'Nature':           { name: 'Nature',      url: 'https://nature.com',          color: '#003366' },
  'New Scientist':    { name: 'New Scientist',url: 'https://newscientist.com', color: '#003366' },
  'Science Daily':    { name: 'Science Daily',url: 'https://sciencedaily.com', color: '#003366' },
  'ESA Space':        { name: 'ESA',         url: 'https://esa.int',            color: '#003366' },
  'BBC Science':      { name: 'BBC Science', url: 'https://bbc.com/news',       color: '#bb1919' },
  'Reuters Biz':      { name: 'Reuters Biz', url: 'https://reuters.com',        color: '#ff8000' },
  'Fox Markets':      { name: 'Fox Markets', url: 'https://foxbusiness.com',     color: '#003366' },
  'NPR Health':       { name: 'NPR Health', url: 'https://npr.org',            color: '#003366' },
  'NHS England':      { name: 'NHS',         url: 'https://england.nhs.uk',     color: '#003366' },
  'Real Food':        { name: 'Real Food',   url: 'https://runningonrealfood.com', color: '#003366' },
  "Mark's Daily":     { name: "Mark's Daily",url: 'https://marksdailyapple.com',color: '#003366' },
  'CN Traveler':      { name: 'CNT',         url: 'https://cntraveler.com',     color: '#003366' },
  'Nomadic Matt':     { name: 'Nomadic Matt',url: 'https://nomadicmatt.com',    color: '#003366' },
  'xkcd':             { name: 'xkcd',        url: 'https://xkcd.com',          color: '#003366' },
  'kottke.org':       { name: 'kottke',      url: 'https://kottke.org',         color: '#003366' },
};
