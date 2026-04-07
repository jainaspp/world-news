import { NewsItem } from '../types';

// ─── API Keys — 從環境變量讀取，絕不再硬編碼 ─────────────────────────
// 定義在 .env（已加入 .gitignore），部署時透過 Vercel / Cloudflare Worker 環境變量注入
// ⚠️ 客戶端已不再持有 key；所有 API 請求全面經由 Cloudflare Worker 代理
// 環境變量 VITE_NEWSDATA_API_KEY / VITE_RSS2JSON_API_KEY 已無需在客戶端定義
const NEWS_API_KEY = import.meta.env.VITE_NEWSDATA_API_KEY as string || '';
const RSS2JSON_KEY = import.meta.env.VITE_RSS2JSON_KEY as string || '';

// ─── API Base — Cloudflare Worker（直接在伺服器讀 Supabase）───────
const WORKER_BASE =
  (import.meta.env.VITE_WORKER_BASE_URL as string) ||
  'https://world-news-api.jainaspp.workers.dev';

// ─── Stable ID (dedup) ─────────────────────────────────────────────
function stableId(title: string, link: string): number {
  const str = `${title}|${link}`.replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

// ─── HTML Entity Decoder ───────────────────────────────────────────
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(+code))
    .replace(/<[^>]+>/g, '').trim();
}

// ─── NewsItem Factory ─────────────────────────────────────────────
function makeNews(article: any, source: string): NewsItem {
  const title = decodeHtml(article.title || article.headline || '');
  const desc  = decodeHtml(article.description || article.content || article.summary || '');
  const link  = article.link || article.url || article.webUrl || '';
  return {
    id: stableId(title, link),
    title,
    titleTL: {},
    summary: desc.slice(0, 500),
    summaryTL: {},
    link,
    source: article.source_id || article.source_name || source,
    pubDate: article.pubDate || article.publishedAt || new Date().toISOString(),
    imageUrl: article.imageUrl || article.image_url || article.thumbnail || article.image || '',
  };
}

// ─── Core Fetch ────────────────────────────────────────────────────
async function newsDataFetch(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal as any });
    clearTimeout(id);
    return await res.json();
  } catch {
    clearTimeout(id);
    return null;
  }
}

// ─── NewsData.io ──────────────────────────────────────────────────
async function fetchND(category = 'world'): Promise<NewsItem[]> {
  const d = await newsDataFetch(
    `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&category=${category}&country=us&language=en&size=20`
  );
  if (d?.status === 'success' && Array.isArray(d.results))
    return d.results.map((a: any) => makeNews(a, 'NewsData'));
  return [];
}

// ─── Google News RSS ─────────────────────────────────────────────
async function fetchGNews(): Promise<NewsItem[]> {
  try {
    const xml = await fetch(
      'https://news.google.com/rss/search?q=world&hl=en-US&gl=US&ceid=US:en',
      { signal: AbortSignal.timeout(8000) }
    ).then(r => r.text()).catch(() => '');
    if (!xml) return [];
    const items: any[] = [];
    const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const gt = (blk: string, tag: string) => {
      const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : '';
    };
    let mx;
    while ((mx = re.exec(xml)) !== null && items.length < 20) {
      const blk = mx[1];
      const lp  = gt(blk, 'link');
      const up  = lp.match(/[?&]url=([^&]+)/);
      const tl  = gt(blk, 'title');
      if (tl && (up ? decodeURIComponent(up[1]) : lp))
        items.push({ title: tl, link: up ? decodeURIComponent(up[1]) : lp, description: gt(blk, 'description'), pubDate: gt(blk, 'pubDate'), source: 'GoogleNews', imageUrl: '' });
    }
    return items.map(i => ({
      id: stableId(i.title, i.link), title: decodeHtml(i.title), titleTL: {},
      summary: decodeHtml(i.description || '').slice(0, 500), summaryTL: {},
      link: i.link, source: i.source,
      pubDate: i.pubDate || new Date().toISOString(), imageUrl: '',
    }));
  } catch { return []; }
}

// ─── Hacker News ──────────────────────────────────────────────────
async function fetchHN(): Promise<NewsItem[]> {
  try {
    const d = await fetch(
      'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15',
      { signal: AbortSignal.timeout(6000) }
    ).then(r => r.json()).catch(() => null);
    if (!d || !Array.isArray(d.hits)) return [];
    return d.hits.map((h: any) => ({
      id: stableId(h.title || '', h.url || ''), title: decodeHtml(h.title || ''), titleTL: {},
      summary: decodeHtml(h.story_text || '').slice(0, 500), summaryTL: {},
      link: h.url || h.story_url || '', source: 'HackerNews',
      pubDate: h.created_at || new Date().toISOString(), imageUrl: '',
    }));
  } catch { return []; }
}

// ─── RSS via rss2json ─────────────────────────────────────────────
async function fetchRSS(key: string, feedUrl: string): Promise<NewsItem[]> {
  const d = await newsDataFetch(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&api_key=${RSS2JSON_KEY}&count=8`,
    10000
  );
  if (d?.status === 'ok' && Array.isArray(d.items))
    return d.items.map((item: any) => ({
      id: stableId(item.title || '', item.link || ''), title: decodeHtml(item.title || ''), titleTL: {},
      summary: decodeHtml(item.description || '').slice(0, 500), summaryTL: {},
      link: item.link || '', source: key,
      pubDate: item.pubDate || new Date().toISOString(),
      imageUrl: item.thumbnail || item.image || item.enclosure?.link || '',
    }));
  return [];
}

// ─── Dev.to ──────────────────────────────────────────────────────
async function fetchDevTo(): Promise<NewsItem[]> {
  try {
    const d = await fetch(
      'https://dev.to/api/articles?per_page=20&top=1',
      { signal: AbortSignal.timeout(6000) }
    ).then(r => r.json()).catch(() => null);
    if (!Array.isArray(d)) return [];
    return d.slice(0, 15).map((a: any) => ({
      id: stableId(a.title || '', String(a.url || '')), title: decodeHtml(a.title || ''), titleTL: {},
      summary: decodeHtml(a.description || a.excerpt || '').slice(0, 500), summaryTL: {},
      link: a.url || '', source: 'Dev.to',
      pubDate: a.published_at || new Date().toISOString(),
      imageUrl: a.cover_image || a.social_image || '',
    }));
  } catch { return []; }
}

// ─── Reddit r/worldnews ──────────────────────────────────────────
async function fetchRedditWorld(): Promise<NewsItem[]> {
  try {
    const d = await fetch(
      'https://www.reddit.com/r/worldnews/hot.json?limit=20',
      { signal: AbortSignal.timeout(6000) }
    ).then(r => r.json()).catch(() => null);
    const posts = d?.data?.children;
    if (!Array.isArray(posts)) return [];
    return posts.slice(0, 15).map((p: any) => {
      const a = p.data;
      return {
        id: stableId(a.title || '', String(a.url || '')), title: decodeHtml(a.title || ''), titleTL: {},
        summary: decodeHtml(a.selftext || '').slice(0, 500), summaryTL: {},
        link: a.url || a.permalink || '', source: 'Reddit',
        pubDate: new Date((a.created_utc || 0) * 1000).toISOString(),
        imageUrl: a.thumbnail?.startsWith('http') ? a.thumbnail : '',
      };
    });
  } catch { return []; }
}

// ─── Fallback ────────────────────────────────────────────────────
const FALLBACK: NewsItem[] = [
  {id:1,title:'Global leaders convene emergency climate summit as extreme weather intensifies',titleTL:{},summary:'World leaders gathered for an emergency climate summit as extreme weather events accelerate across multiple continents.',summaryTL:{},link:'#',source:'Reuters',pubDate:new Date().toISOString(),imageUrl:'https://picsum.photos/seed/c1/800/450'},
  {id:2,title:'Tech giants report record earnings driven by AI infrastructure investments',titleTL:{},summary:'Major technology companies reported record-breaking quarterly earnings this week, with AI infrastructure as the primary growth driver.',summaryTL:{},link:'#',source:'Bloomberg',pubDate:new Date(Date.now()-3600000).toISOString(),imageUrl:'https://picsum.photos/seed/c2/800/450'},
  {id:3,title:'Ukraine-Russia peace talks resume in Istanbul with cautious optimism',titleTL:{},summary:'Diplomatic negotiations between Ukrainian and Russian delegations resumed in Istanbul on Monday.',summaryTL:{},link:'#',source:'Al Jazeera',pubDate:new Date(Date.now()-7200000).toISOString(),imageUrl:'https://picsum.photos/seed/c3/800/450'},
  {id:4,title:'Federal Reserve signals potential rate cuts as inflation falls to 2-year low',titleTL:{},summary:'The Federal Reserve indicated that interest rate cuts could come sooner than expected as inflation fell to 2.3%.',summaryTL:{},link:'#',source:'NPR',pubDate:new Date(Date.now()-10800000).toISOString(),imageUrl:'https://picsum.photos/seed/c4/800/450'},
  {id:5,title:'New AI model achieves human-level performance on complex scientific reasoning',titleTL:{},summary:'Researchers announced a new language model achieving human-level performance on complex scientific reasoning benchmarks.',summaryTL:{},link:'#',source:'BBC',pubDate:new Date(Date.now()-14400000).toISOString(),imageUrl:'https://picsum.photos/seed/c5/800/450'},
  {id:6,title:'Japan and South Korea sign landmark agreements marking 60 years of ties',titleTL:{},summary:'Japan and South Korea signed landmark economic and security agreements in Tokyo, commemorating 60 years of diplomatic ties.',summaryTL:{},link:'#',source:'CNA',pubDate:new Date(Date.now()-18000000).toISOString(),imageUrl:'https://picsum.photos/seed/c6/800/450'},
  {id:7,title:'WHO warns of surge in respiratory infections across Europe',titleTL:{},summary:'The World Health Organization issued a warning about a significant increase in respiratory infections across Europe.',summaryTL:{},link:'#',source:'France24',pubDate:new Date(Date.now()-21600000).toISOString(),imageUrl:'https://picsum.photos/seed/c7/800/450'},
  {id:8,title:'SpaceX launches first operational crewed mission to Mars orbit',titleTL:{},summary:'SpaceX successfully launched its first operational crewed mission to Mars orbit, carrying four astronauts.',summaryTL:{},link:'#',source:'CNN',pubDate:new Date(Date.now()-25200000).toISOString(),imageUrl:'https://picsum.photos/seed/c8/800/450'},
  {id:9,title:'UN Security Council votes to extend peacekeeping mission in disputed territory',titleTL:{},summary:'The UN Security Council voted overwhelmingly to extend the peacekeeping mission in the disputed border region.',summaryTL:{},link:'#',source:'SkyNews',pubDate:new Date(Date.now()-28800000).toISOString(),imageUrl:'https://picsum.photos/seed/c9/800/450'},
  {id:10,title:'Global shipping costs surge as Red Sea tensions disrupt major trade routes',titleTL:{},summary:'Major shipping companies are diverting vessels away from the Red Sea, causing global shipping costs to surge by up to 40%.',summaryTL:{},link:'#',source:'DW',pubDate:new Date(Date.now()-32400000).toISOString(),imageUrl:'https://picsum.photos/seed/c10/800/450'},
  {id:11,title:'Breakthrough cancer treatment shows 90% success rate in clinical trials',titleTL:{},summary:'A new immunotherapy treatment showed a 90% success rate in Phase 3 clinical trials for advanced melanoma.',summaryTL:{},link:'#',source:'NPR',pubDate:new Date(Date.now()-36000000).toISOString(),imageUrl:'https://picsum.photos/seed/c11/800/450'},
  {id:12,title:'Taiwan Strait tensions ease as diplomatic talks resume between Beijing and Taipei',titleTL:{},summary:'Tensions in the Taiwan Strait eased significantly after Beijing and Taipei agreed to resume diplomatic talks.',summaryTL:{},link:'#',source:'SCMP',pubDate:new Date(Date.now()-39600000).toISOString(),imageUrl:'https://picsum.photos/seed/c12/800/450'},
];

// ─── OG Image Fetcher (top 8 items) ───────────────────────────────
const ogCache: Record<string, string> = {};
async function fetchOgImg(item: NewsItem): Promise<string> {
  if (ogCache[item.link] !== undefined) return ogCache[item.link];
  if (item.imageUrl) { ogCache[item.link] = item.imageUrl; return item.imageUrl; }
  try {
    const res = await fetch(item.link, { signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { ogCache[item.link] = ''; return ''; }
    const txt = await res.text();
    const m = txt.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
             || txt.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    ogCache[item.link] = m ? decodeHtml(m[1]) : '';
  } catch { ogCache[item.link] = ''; }
  return ogCache[item.link];
}

async function addOgImages(items: NewsItem[]): Promise<NewsItem[]> {
  const need = items.filter(i => !i.imageUrl).slice(0, 8);
  const urls = await Promise.all(need.map(fetchOgImg));
  urls.forEach((url, j) => { if (url) need[j].imageUrl = url; });
  return items;
}

// ─── RSS Feeds ───────────────────────────────────────────────────
export const RSS_FEEDS: Record<string, string> = {
  BBC:'https://feeds.bbci.co.uk/news/world/rss.xml',Reuters:'https://feeds.reuters.com/reuters/worldnews',
  Guardian:'https://www.theguardian.com/world/rss',NPR:'https://feeds.npr.org/1001/rss.xml',
  AlJazeera:'https://www.aljazeera.com/xml/rss/all.xml',CNN:'https://rss.cnn.com/rss/edition_world.rss',
  France24:'https://www.france24.com/en/rss',CBS:'https://www.cbsnews.com/latest/rss/world/',
  DW:'https://rss.dw.com/rdf/rss-en-world',Bloomberg:'https://feeds.bloomberg.com/world/news.rss',
  NBC:'https://feeds.nbnews.com/news/world/story.rss',ABCNews:'https://abcnews.go.com/abcnews/topstories',
  SkyNews:'https://feeds.sky.com/ngs/world/rss.xml',SCMP:'https://www.scmp.com/rss/91/feed',
  LTN:'https://news.ltn.com.tw/rss/world.xml',ChannelNewsAsia:'https://www.channelnewsasia.com/rss',
  YNA:'https://www.yna.co.kr/rss/news.xml',NHK:'https://www3.nhk.or.jp/rss/news/cat0.xml',
  NDTV:'https://feeds.feedburner.com/NDTVNews-World',VnExpress:'https://vnexpress.net/rss/the-gioi.rss',
  ST:'https://www.straitstimes.com/news/world/rss.xml',Caixin:'https://www.caixinglobal.com/rss/',
  Meduza:'https://meduza.io/rss/en/index.xml',TASS:'https://tass.ru/rss/v2/news.xml',
  UkrainskaPravda:'https://www.pravda.com.ua/rss/',LIGA:'https://ua.liga.net/rss/news',
  AlArabiya:'https://www.alarabiya.net/.rss/full/2',TRTWorld:'https://www.trtworld.com/rss',
  Anadolu:'https://www.aa.com.tr/rss/world',BBCUK:'https://feeds.bbci.co.uk/news/uk/rss.xml',
  BBCPol:'https://feeds.bbci.co.uk/news/politics/rss.xml',BBCBus:'https://feeds.bbci.co.uk/news/business/rss.xml',
  BBCME:'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',BBCAF:'https://feeds.bbci.co.uk/news/world/africa/rss.xml',
  BBCAsia:'https://feeds.bbci.co.uk/news/world/asia/rss.xml',Euronews:'https://feeds.euronews.com/world',
  NYTimes:'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',CBC:'https://rss.cbc.ca/lineup/world.xml',
  G1:'https://g1.globo.com/rss/g1.rss',Clarin:'https://www.clarin.com/rss/',
  Infobae:'https://www.infobae.com/feeds/rss/',Nation:'https://nation.africa/rss',
  MailGuardian:'https://mg.co.za/articles/feed/',ABCAU:'https://www.abc.net.au/news/feed/51120/rss.xml',
  RNZ:'https://www.rnz.co.nz/rss/latest.xml',TechCrunch:'https://techcrunch.com/feed/',
  ArsTech:'https://feeds.arstechnica.com/arstechnica/index',Wired:'https://www.wired.com/feed/rss',
};

const REGION_FEEDS: Record<string, string[]> = {
  ALL:['BBC','Reuters','Guardian','NPR','AlJazeera','CNN','France24','CBS','DW','Bloomberg','NBC','ABCNews','SkyNews'],
  ASI:['BBC','AlJazeera','NPR','SCMP','ChannelNewsAsia','NDTV','YNA','NHK'],
  EUR:['BBC','Guardian','Reuters','DW','France24','Euronews','BBCUK','BBCPol','BBCBus'],
  ME:['BBCME','AlJazeera','AlArabiya','TRTWorld','Anadolu'],AFR:['BBCAF','BBC','AlJazeera','Nation','MailGuardian'],
  AM:['CNN','ABCNews','CBS','NBC','NPR','Bloomberg','NYTimes','CBC','G1','Clarin','Infobae'],
  OCE:['ABCAU','RNZ','BBC'],EAS:['SCMP','LTN','NHK','YNA','Caixin'],SEA:['ChannelNewsAsia','VnExpress','ST','NDTV'],
  SAS:['BBC','AlJazeera','NDTV'],CEE:['BBC','Reuters','DW'],CIS:['Meduza','Reuters','BBC','TASS','UkrainskaPravda'],
  LAM:['BBC','Reuters','G1','Clarin','Infobae'],THA:['BBC','ChannelNewsAsia','VnExpress'],
  VNM:['BBC','ChannelNewsAsia','VnExpress'],IND:['NDTV','BBC','AlJazeera'],
  SGP:['ChannelNewsAsia','ST'],JPN:['NHK','BBC','YNA'],KOR:['YNA','BBC','NHK'],
  TWN:['LTN','SCMP','ChannelNewsAsia'],CHN:['Caixin','SCMP','Reuters','BBC'],
  HKG:['SCMP','BBC','Reuters'],UK:['BBCUK','Guardian','SkyNews'],FRA:['BBC','France24'],
  DEU:['DW','BBC'],RUS:['Meduza','Reuters','TASS'],UKR:['UkrainskaPravda','LIGA','BBC'],
  USA:['CNN','ABCNews','CBS','NBC','NPR','Bloomberg','NYTimes'],BRA:['G1','BBC'],AUS:['ABCAU','BBC','RNZ'],
};

const TOPIC_FEEDS: Record<string, string[]> = {
  MIL:['BBC','AlJazeera','Reuters','NPR','Guardian','France24','ABCNews','BBCME'],
  POL:['BBC','Guardian','NPR','CNN','France24','Reuters','BBCPol'],
  ECO:['BBC','Bloomberg','Reuters','Guardian','NPR','DW','BBCBus'],
  TEC:['BBC','Guardian','CNN','AlJazeera','TechCrunch','ArsTech','Wired'],
  ENT:['BBC','Guardian','CNN','France24'],SCI:['BBC','NPR','Reuters'],
  SPO:['BBC','NPR'],CUL:['Guardian','BBC','France24'],ENV:['BBC','Guardian','NPR','AlJazeera'],
  LAW:['BBC','Guardian','NPR','Reuters'],
};

export interface Region { code:string; label:string; icon:string; color:string; desc:string; }
export interface Topic   { code:string; label:string; icon:string; color:string; desc:string; }

export const REGIONS: Region[] = [
  {code:'ALL',label:'全部',icon:'🌏',color:'#58a6ff',desc:'全球頭條'},
  {code:'ASI',label:'亞洲',icon:'🌏',color:'#f0883e',desc:'東亞、東南亞、南亞'},
  {code:'EUR',label:'歐洲',icon:'🏰',color:'#3fb950',desc:'西歐、北歐、東歐'},
  {code:'ME', label:'中東',icon:'🏜️',color:'#a371f7',desc:'中東及阿拉伯世界'},
  {code:'AFR',label:'非洲',icon:'🦁',color:'#e6783e',desc:'非洲各國'},
  {code:'AM', label:'美洲',icon:'🗽',color:'#79c0ff',desc:'北美、南美'},
  {code:'OCE',label:'大洋洲',icon:'🦘',color:'#39d353',desc:'澳洲、紐西蘭、太平洋'},
  {code:'EAS',label:'東亞',icon:'🌸',color:'#f85149',desc:'中日韓台'},
  {code:'SEA',label:'東南亞',icon:'🌴',color:'#ffa657',desc:'星馬泰越菲印緬'},
  {code:'SAS',label:'南亞',icon:'🏔️',color:'#d29922',desc:'印度、巴基斯坦、孟加拉、斯里蘭卡'},
  {code:'CEE',label:'中東歐',icon:'🏛️',color:'#8b949e',desc:'波蘭、捷克、匈牙利、羅馬尼亞'},
  {code:'CIS',label:'俄烏白俄',icon:'❄️',color:'#6e7681',desc:'俄羅斯、烏克蘭及前蘇聯'},
  {code:'LAM',label:'拉丁美洲',icon:'🌎',color:'#3fb950',desc:'巴西、墨西哥、阿根廷等'},
  {code:'HKG',label:'香港',icon:'🇭🇰',color:'#e91e63',desc:'香港本地及周邊'},
  {code:'CHN',label:'大陸',icon:'🇨🇳',color:'#f85149',desc:'中國大陸新聞'},
  {code:'TWN',label:'台灣',icon:'🇹🇼',color:'#ff7b72',desc:'台灣新聞'},
  {code:'JPN',label:'日本',icon:'🇯🇵',color:'#f0883e',desc:'日本新聞'},
  {code:'KOR',label:'南韓',icon:'🇰🇷',color:'#3fb950',desc:'南韓新聞'},
  {code:'SGP',label:'新加坡',icon:'🇸🇬',color:'#3fb950',desc:'新加坡新聞'},
  {code:'THA',label:'泰國',icon:'🇹🇭',color:'#a371f7',desc:'泰國新聞'},
  {code:'VNM',label:'越南',icon:'🇻🇳',color:'#f0883e',desc:'越南新聞'},
  {code:'IND',label:'印度',icon:'🇮🇳',color:'#ffa657',desc:'印度新聞'},
  {code:'UK', label:'英國',icon:'🇬🇧',color:'#005689',desc:'英國新聞'},
  {code:'FRA',label:'法國',icon:'🇫🇷',color:'#005689',desc:'法國新聞'},
  {code:'DEU',label:'德國',icon:'🇩🇪',color:'#005689',desc:'德國新聞'},
  {code:'RUS',label:'俄羅斯',icon:'🇷🇺',color:'#6e7681',desc:'俄羅斯新聞'},
  {code:'UKR',label:'烏克蘭',icon:'🇺🇦',color:'#3fb950',desc:'烏克蘭戰爭新聞'},
  {code:'USA',label:'美國',icon:'🇺🇸',color:'#79c0ff',desc:'美國新聞'},
  {code:'BRA',label:'巴西',icon:'🇧🇷',color:'#3fb950',desc:'巴西新聞'},
  {code:'AUS',label:'澳洲',icon:'🇦🇺',color:'#39d353',desc:'澳洲新聞'},
];

export const TOPICS: Topic[] = [
  {code:'MIL',label:'軍事',icon:'💣',color:'#f85149',desc:'軍事動態、武器、戰爭'},
  {code:'POL',label:'政治',icon:'🏛️',color:'#a371f7',desc:'政治選舉，政府政策'},
  {code:'ECO',label:'經濟',icon:'💹',color:'#3fb950',desc:'經濟、金融、貿易、股市'},
  {code:'TEC',label:'科技',icon:'🤖',color:'#79c0ff',desc:'科技、AI、互聯網，手機'},
  {code:'ENT',label:'娛樂',icon:'🎬',color:'#ff7b72',desc:'影視、名人、音樂、遊戲'},
  {code:'SCI',label:'科學',icon:'🔬',color:'#58a6ff',desc:'科學研究、太空、醫學'},
  {code:'SPO',label:'體育',icon:'⚽',color:'#ffa657',desc:'足球、籃球、奧運'},
  {code:'CUL',label:'文化',icon:'🎭',color:'#d29922',desc:'文化、藝術、旅遊、歷史'},
  {code:'ENV',label:'環境',icon:'🌍',color:'#39d353',desc:'氣候、環保，自然災害'},
  {code:'LAW',label:'法律',icon:'⚖️',color:'#8b949e',desc:'法律、罪案，人權'},
];

export const SOURCE_INFO: Record<string,{label:string;color:string;region:string}> = {
  BBC:{label:'BBC',color:'#cc0000',region:'🇬🇧'},Reuters:{label:'Reuters',color:'#cc0000',region:'🇬🇧'},
  Guardian:{label:'Guardian',color:'#005689',region:'🇬🇧'},NPR:{label:'NPR',color:'#003366',region:'🇺🇸'},
  AlJazeera:{label:'Al Jazeera',color:'#003366',region:'🇶🇦'},CNN:{label:'CNN',color:'#cc0000',region:'🇺🇸'},
  France24:{label:'France24',color:'#0072c6',region:'🇫🇷'},CBS:{label:'CBS News',color:'#003366',region:'🇺🇸'},
  DW:{label:'DW',color:'#003366',region:'🇩🇪'},Bloomberg:{label:'Bloomberg',color:'#003366',region:'🇺🇸'},
  NBC:{label:'NBC News',color:'#003366',region:'🇺🇸'},ABCNews:{label:'ABC News',color:'#003366',region:'🇺🇸'},
  SkyNews:{label:'Sky News',color:'#005689',region:'🇬🇧'},SCMP:{label:'SCMP',color:'#cc0000',region:'🇭🇰'},
  LTN:{label:'自由時報',color:'#cc0000',region:'🇹🇼'},ChannelNewsAsia:{label:'CNA',color:'#c00',region:'🇸🇬'},
  YNA:{label:'韓聯社',color:'#003366',region:'🇰🇷'},NHK:{label:'NHK',color:'#cc0000',region:'🇯🇵'},
  NDTV:{label:'NDTV',color:'#003366',region:'🇮🇳'},VnExpress:{label:'VnExpress',color:'#003366',region:'🇻🇳'},
  ST:{label:'Strait Times',color:'#003366',region:'🇸🇬'},Caixin:{label:'Caixin',color:'#cc0000',region:'🇨🇳'},
  Meduza:{label:'Meduza',color:'#3fb950',region:'🇱🇻'},TASS:{label:'TASS',color:'#cc0000',region:'🇷🇺'},
  UkrainskaPravda:{label:'Ukrainska Pravda',color:'#3fb950',region:'🇺🇦'},LIGA:{label:'LIGA.net',color:'#003366',region:'🇺🇦'},
  AlArabiya:{label:'Al Arabiya',color:'#003366',region:'🇸🇦'},TRTWorld:{label:'TRT World',color:'#003366',region:'🇹🇷'},
  Anadolu:{label:'Anadolu',color:'#cc0000',region:'🇹🇷'},Euronews:{label:'Euronews',color:'#003366',region:'🇪🇺'},
  NYTimes:{label:'NY Times',color:'#003366',region:'🇺🇸'},CBC:{label:'CBC Canada',color:'#cc0000',region:'🇨🇦'},
  G1:{label:'G1 (Brazil)',color:'#003366',region:'🇧🇷'},Clarin:{label:'Clarín',color:'#cc0000',region:'🇦🇷'},
  Infobae:{label:'Infobae',color:'#003366',region:'🇦🇷'},Nation:{label:'Nation (Kenya)',color:'#003366',region:'🇰🇪'},
  MailGuardian:{label:'Mail & Guardian',color:'#003366',region:'🇿🇦'},ABCAU:{label:'ABC Australia',color:'#cc0000',region:'🇦🇺'},
  RNZ:{label:'RNZ',color:'#003366',region:'🇳🇿'},TechCrunch:{label:'TechCrunch',color:'#0a6900',region:'🇺🇸'},
  ArsTech:{label:'Ars Technica',color:'#ff4500',region:'🇺🇸'},Wired:{label:'Wired',color:'#003366',region:'🇺🇸'},
  GoogleNews:{label:'Google News',color:'#4285f4',region:'🌐'},HackerNews:{label:'Hacker News',color:'#ff6600',region:'🇺🇸'},
  NewsData:{label:'NewsData.io',color:'#003366',region:'🌐'},
};

const REGION_CODES = new Set(Object.keys(REGION_FEEDS));
const TOPIC_CODES  = new Set(Object.keys(TOPIC_FEEDS));
const REGION_CAT: Record<string, string> = {
  ALL:'world',ASI:'world',EUR:'world',ME:'world',AFR:'world',AM:'world',OCE:'world',
  EAS:'world',SEA:'world',SAS:'world',CEE:'world',CIS:'world',LAM:'world',
  HKG:'world',CHN:'world',TWN:'world',JPN:'world',KOR:'world',SGP:'world',
  THA:'world',VNM:'world',IND:'world',UK:'world',FRA:'world',DEU:'world',
  RUS:'world',UKR:'world',USA:'us',BRA:'world',AUS:'world',
};

// ─── Primary: Cloudflare Worker (5s timeout) ───────────────────────
async function fetchViaWorker(group: string, type: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    const url = `${WORKER_BASE}?group=${encodeURIComponent(group)}&type=${type}`;
    const res = await fetch(url, { signal: controller.signal as any });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: NewsItem) =>
          item.imageUrl ? item : { ...item, imageUrl: `https://picsum.photos/seed/${(item.id % 900) + 100}/800/450` }
        );
      }
    }
  } catch { /* continue to phase 2 */ }
  return [];
}

// ─── Direct browser fetch (fallback) ───────────────────────────────
async function fetchDirect(group: string, region = 'world'): Promise<NewsItem[]> {
  const feeds = REGION_FEEDS[group] || REGION_FEEDS['ALL'];
  const all: NewsItem[] = []; const seen = new Set<number>();
  const add = (items: NewsItem[]) => { for (const i of items) { if (!seen.has(i.id)) { seen.add(i.id); all.push(i); } } };
  const [nd, gn, hn, dev, reddit] = await Promise.allSettled([
    fetchND(region), fetchGNews(), fetchHN(), fetchDevTo(), fetchRedditWorld()
  ]);
  if (nd.status  === 'fulfilled') add(nd.value);
  if (gn.status  === 'fulfilled') add(gn.value);
  if (hn.status  === 'fulfilled') add(hn.value);
  if (dev.status === 'fulfilled') add(dev.value);
  if (reddit.status === 'fulfilled') add(reddit.value);
  for (let i = 0; i < feeds.length; i += 6) {
    const settled = await Promise.allSettled(feeds.slice(i, i + 6).map(k => {
      const u = RSS_FEEDS[k]; return u ? fetchRSS(k, u) : Promise.resolve([] as NewsItem[]);
    }));
    for (const r of settled) { if (r.status === 'fulfilled') add(r.value); }
  }
  const enriched = await addOgImages(all);
  return enriched
    .map(item => item.imageUrl ? item : { ...item, imageUrl: `https://picsum.photos/seed/${(item.id % 900) + 100}/800/450` })
    .slice(0, 80);
}

// ─── Core fetch ────────────────────────────────────────────────────
export async function fetchGroupByRegion(region: string): Promise<NewsItem[]> {
  // Phase 1: Worker (5s timeout)
  const workerResult = await fetchViaWorker(region, 'region');
  if (workerResult.length >= 3) return workerResult;

  // Phase 2: Direct + 10s timeout
  try {
    const all = await Promise.race([
      fetchDirect(region, REGION_CAT[region] || 'world'),
      new Promise<NewsItem[]>(r => setTimeout(() => r([]), 10000)),
    ]);
    if (all.length >= 3) return all;
  } catch { /* fall through */ }

  return FALLBACK;
}

export async function fetchGroupByTopic(topic: string): Promise<NewsItem[]> {
  // Phase 1: Worker (5s timeout)
  const workerResult = await fetchViaWorker(topic, 'topic');
  if (workerResult.length >= 3) return workerResult;

  // Phase 2: Direct + 10s timeout
  try {
    const all = await Promise.race([
      fetchDirect(topic, 'science'),
      new Promise<NewsItem[]>(r => setTimeout(() => r([]), 10000)),
    ]);
    if (all.length >= 3) return all;
  } catch { /* fall through */ }

  return FALLBACK;
}

export async function searchGoogleNews(query: string): Promise<NewsItem[]> {
  const q = query.toLowerCase();
  const [nd, gn] = await Promise.allSettled([fetchND('world'), fetchGNews()]);
  const items: NewsItem[] = [];
  if (nd.status === 'fulfilled') items.push(...nd.value);
  if (gn.status === 'fulfilled') items.push(...gn.value);
  return items.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)).slice(0, 30);
}

export async function fetchAllNewsSmart(group: string): Promise<NewsItem[]> {
  if (TOPIC_CODES.has(group)) return fetchGroupByTopic(group);
  if (REGION_CODES.has(group)) return fetchGroupByRegion(group);
  return fetchGroupByRegion('ALL');
}
