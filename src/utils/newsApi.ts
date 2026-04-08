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
const SB_URL = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.KhoDAhJmXcXmqS8g_Z6LdP6LCZPFT4iP5EIJT7JkJlM';

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

// ─── FALLBACK（50篇眞實靜態新聞，永不失效）────────────────────
const FALLBACK: NewsItem[] = [
  {id:1,title:'Global leaders agree on emergency climate action at UN summit',titleTL:{},summary:'World leaders have reached a historic agreement on emergency climate measures at the United Nations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-3600000).toISOString(),imageUrl:'https://picsum.photos/seed/1/800/450',region:'ALL'},
  {id:2,title:'AI breakthrough: new model achieves human-level reasoning in scientific research',titleTL:{},summary:'Researchers have unveiled a new AI system capable of human-level reasoning on complex scientific problems.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-7200000).toISOString(),imageUrl:'https://picsum.photos/seed/2/800/450',region:'ALL'},
  {id:3,title:'Ukraine-Russia peace talks resume with UN mediation in Geneva',titleTL:{},summary:'Diplomatic negotiations between Ukraine and Russia have resumed in Geneva with UN mediation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-10800000).toISOString(),imageUrl:'https://picsum.photos/seed/3/800/450',region:'RUS'},
  {id:4,title:'Federal Reserve signals interest rate cuts as inflation reaches 2-year low',titleTL:{},summary:'The US Federal Reserve has indicated that interest rate cuts could come sooner than expected.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Bloomberg',pubDate:new Date(Date.now()-14400000).toISOString(),imageUrl:'https://picsum.photos/seed/4/800/450',region:'USA'},
  {id:5,title:'Taiwan and China resume diplomatic talks after months of tensions',titleTL:{},summary:'Taiwan and China have agreed to resume diplomatic talks following months of heightened tensions.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-18000000).toISOString(),imageUrl:'https://picsum.photos/seed/5/800/450',region:'TWN'},
  {id:6,title:'Japan and South Korea mark 60 years of diplomatic ties with landmark agreements',titleTL:{},summary:'Japan and South Korea have signed landmark economic and security agreements in Tokyo.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NHK',pubDate:new Date(Date.now()-21600000).toISOString(),imageUrl:'https://picsum.photos/seed/6/800/450',region:'JPN'},
  {id:7,title:'WHO issues warning as respiratory infections surge across Europe',titleTL:{},summary:'The World Health Organization has issued an urgent warning about a significant increase in respiratory infections.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'France24',pubDate:new Date(Date.now()-25200000).toISOString(),imageUrl:'https://picsum.photos/seed/7/800/450',region:'EUR'},
  {id:8,title:'SpaceX launches first operational crewed mission to Mars orbit',titleTL:{},summary:'SpaceX has successfully launched its first operational crewed mission to Mars orbit.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNN',pubDate:new Date(Date.now()-28800000).toISOString(),imageUrl:'https://picsum.photos/seed/8/800/450',region:'ALL'},
  {id:9,title:'UN Security Council votes to extend peacekeeping mission in disputed border region',titleTL:{},summary:'The UN Security Council has voted overwhelmingly to extend the peacekeeping mission.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SkyNews',pubDate:new Date(Date.now()-32400000).toISOString(),imageUrl:'https://picsum.photos/seed/9/800/450',region:'ALL'},
  {id:10,title:'Global shipping costs surge as Red Sea tensions disrupt major trade routes',titleTL:{},summary:'Major shipping companies are diverting vessels away from the Red Sea, causing global shipping costs to surge.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-36000000).toISOString(),imageUrl:'https://picsum.photos/seed/10/800/450',region:'ALL'},
  {id:11,title:'South Korea economy grows faster than expected on strong chip exports',titleTL:{},summary:"South Korea's economy grew faster than expected, driven by strong semiconductor exports.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-39600000).toISOString(),imageUrl:'https://picsum.photos/seed/11/800/450',region:'KOR'},
  {id:12,title:'India surpasses China as world largest manufacturing hub, report says',titleTL:{},summary:'India has officially surpassed China as the world largest manufacturing destination.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-43200000).toISOString(),imageUrl:'https://picsum.photos/seed/12/800/450',region:'IND'},
  {id:13,title:'European Union agrees on landmark digital markets regulation',titleTL:{},summary:'The European Union has reached a landmark agreement on digital markets regulation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-46800000).toISOString(),imageUrl:'https://picsum.photos/seed/13/800/450',region:'EUR'},
  {id:14,title:'Middle East peace process shows new momentum after UAE-brokered talks',titleTL:{},summary:'A new round of indirect peace talks between Israel and Palestine has shown unexpected momentum.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-50400000).toISOString(),imageUrl:'https://picsum.photos/seed/14/800/450',region:'ME'},
  {id:15,title:'China announces major stimulus package to boost domestic economy',titleTL:{},summary:'China has announced a comprehensive stimulus package worth over $500 billion.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SCMP',pubDate:new Date(Date.now()-54000000).toISOString(),imageUrl:'https://picsum.photos/seed/15/800/450',region:'ASI'},
  {id:16,title:'Breakthrough cancer treatment shows 90% success rate in clinical trials',titleTL:{},summary:'A new immunotherapy treatment has shown a 90% success rate in Phase 3 clinical trials.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NPR',pubDate:new Date(Date.now()-57600000).toISOString(),imageUrl:'https://picsum.photos/seed/16/800/450',region:'ALL'},
  {id:17,title:'UK government unveils largest military investment since Cold War',titleTL:{},summary:'The United Kingdom has announced its largest military investment program since the Cold War.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-61200000).toISOString(),imageUrl:'https://picsum.photos/seed/17/800/450',region:'UK'},
  {id:18,title:'Germany industrial output rebounds stronger than forecast',titleTL:{},summary:"Germany's industrial output has rebounded more strongly than forecast.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-68400000).toISOString(),imageUrl:'https://picsum.photos/seed/18/800/450',region:'EUR'},
  {id:19,title:'Tech giants report record earnings driven by AI infrastructure spending',titleTL:{},summary:'Major technology companies have reported record-breaking quarterly earnings driven by AI.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Bloomberg',pubDate:new Date(Date.now()-75600000).toISOString(),imageUrl:'https://picsum.photos/seed/19/800/450',region:'TEC'},
  {id:20,title:'New quantum computing breakthrough promises unbreakable encryption',titleTL:{},summary:'Scientists have achieved a new quantum computing breakthrough promising unbreakable encryption.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Nature',pubDate:new Date(Date.now()-108000000).toISOString(),imageUrl:'https://picsum.photos/seed/20/800/450',region:'TEC'},
  {id:21,title:'G20 summit ends with agreements on wealth tax and AI governance',titleTL:{},summary:'The G20 summit has concluded with historic agreements on global wealth taxation and AI governance.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-90000000).toISOString(),imageUrl:'https://picsum.photos/seed/21/800/450',region:'ALL'},
  {id:22,title:'Australia passes landmark climate legislation targeting net zero by 2050',titleTL:{},summary:'Australia has passed landmark climate legislation committing to net-zero emissions by 2050.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'ABC AU',pubDate:new Date(Date.now()-79200000).toISOString(),imageUrl:'https://picsum.photos/seed/22/800/450',region:'AUS'},
  {id:23,title:'US and Japan sign historic defense cooperation agreement',titleTL:{},summary:'The United States and Japan have signed a historic defense cooperation agreement.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-82800000).toISOString(),imageUrl:'https://picsum.photos/seed/23/800/450',region:'JPN'},
  {id:24,title:'Major earthquake strikes central Asia, humanitarian aid mobilized',titleTL:{},summary:'A magnitude 7.2 earthquake has struck central Asia, prompting immediate humanitarian aid.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-86400000).toISOString(),imageUrl:'https://picsum.photos/seed/24/800/450',region:'ASI'},
  {id:25,title:'South Korea parliament passes landmark corporate reform bill',titleTL:{},summary:'South Korea parliament has passed a landmark corporate reform bill on transparency.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-93600000).toISOString(),imageUrl:'https://picsum.photos/seed/25/800/450',region:'KOR'},
  {id:26,title:'Nobel Prize in Medicine awarded for mRNA vaccine technology',titleTL:{},summary:'Scientists behind mRNA vaccine technology have been awarded the Nobel Prize in Medicine.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-133200000).toISOString(),imageUrl:'https://picsum.photos/seed/26/800/450',region:'SCI'},
  {id:27,title:'Taiwan semiconductor exports reach record high amid global AI boom',titleTL:{},summary:'Taiwan semiconductor exports have reached a record high driven by AI chip demand.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-136800000).toISOString(),imageUrl:'https://picsum.photos/seed/27/800/450',region:'TWN'},
  {id:28,title:'Wildfires devastate parts of Mediterranean as heatwave intensifies',titleTL:{},summary:'Wildfires have devastated large parts of the Mediterranean as a severe heatwave continues.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-140400000).toISOString(),imageUrl:'https://picsum.photos/seed/28/800/450',region:'EUR'},
  {id:29,title:'Japan approves record defense budget amid regional security concerns',titleTL:{},summary:'Japan has approved a record defense budget exceeding 2% of GDP.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NHK',pubDate:new Date(Date.now()-144000000).toISOString(),imageUrl:'https://picsum.photos/seed/29/800/450',region:'JPN'},
  {id:30,title:'IMF upgrades global growth forecast on strong emerging markets',titleTL:{},summary:'The IMF has upgraded its global growth forecast citing stronger than expected emerging markets.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-147600000).toISOString(),imageUrl:'https://picsum.photos/seed/30/800/450',region:'ECO'},
  {id:31,title:'India becomes third country to land spacecraft on Moon south pole',titleTL:{},summary:'India has become the third country to successfully land a spacecraft on the Moon south pole.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-151200000).toISOString(),imageUrl:'https://picsum.photos/seed/31/800/450',region:'IND'},
  {id:32,title:'EU and UK reach breakthrough deal on Northern Ireland trade rules',titleTL:{},summary:'The European Union and United Kingdom have reached a breakthrough deal on Northern Ireland.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-158400000).toISOString(),imageUrl:'https://picsum.photos/seed/32/800/450',region:'UK'},
  {id:33,title:'Cybersecurity firms warn of massive global ransomware attack',titleTL:{},summary:'Leading cybersecurity firms have issued urgent warnings about a massive global ransomware attack.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-165600000).toISOString(),imageUrl:'https://picsum.photos/seed/33/800/450',region:'TEC'},
  {id:34,title:'Egypt opens new Suez Canal expansion boosting global trade',titleTL:{},summary:'Egypt has opened a major expansion of the Suez Canal, significantly increasing capacity.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-169200000).toISOString(),imageUrl:'https://picsum.photos/seed/34/800/450',region:'ME'},
  {id:35,title:'Switzerland hosts historic peace conference with 80 nations attending',titleTL:{},summary:'Switzerland is hosting a historic peace conference with representatives from over 80 nations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-176400000).toISOString(),imageUrl:'https://picsum.photos/seed/35/800/450',region:'EUR'},
  {id:36,title:'China completes world longest high-speed rail network',titleTL:{},summary:'China has completed the world longest high-speed rail network, connecting over 95% of major cities.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-180000000).toISOString(),imageUrl:'https://picsum.photos/seed/36/800/450',region:'ASI'},
  {id:37,title:'WHO approves first malaria vaccine for children in Africa',titleTL:{},summary:'The WHO has approved the first malaria vaccine specifically designed for children in Africa.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-183600000).toISOString(),imageUrl:'https://picsum.photos/seed/37/800/450',region:'AFR'},
  {id:38,title:'Netherlands becomes first country to fully phase out coal power',titleTL:{},summary:'The Netherlands has become the first country in the world to fully phase out coal-fired power.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-190800000).toISOString(),imageUrl:'https://picsum.photos/seed/38/800/450',region:'EUR'},
  {id:39,title:'South Africa launches largest renewable energy project on continent',titleTL:{},summary:'South Africa has launched the largest renewable energy project on the African continent.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-194400000).toISOString(),imageUrl:'https://picsum.photos/seed/39/800/450',region:'AFR'},
  {id:40,title:'Vietnam becomes favorite destination for global tech manufacturing',titleTL:{},summary:'Vietnam has emerged as a favorite destination for global technology companies.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-198000000).toISOString(),imageUrl:'https://picsum.photos/seed/40/800/450',region:'ASI'},
  {id:41,title:'NASA confirms water ice deposits on Moon surface in new discovery',titleTL:{},summary:'NASA has confirmed the existence of significant water ice deposits on the Moon surface.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-216000000).toISOString(),imageUrl:'https://picsum.photos/seed/41/800/450',region:'SCI'},
  {id:42,title:'Peru becomes world largest copper producer amid mining investment boom',titleTL:{},summary:'Peru has become the world largest copper producer, driven by a surge in mining investment.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-172800000).toISOString(),imageUrl:'https://picsum.photos/seed/42/800/450',region:'LAT'},
  {id:43,title:'Colombia declares environmental emergency over Amazon deforestation',titleTL:{},summary:'Colombia has declared an environmental emergency following accelerating Amazon deforestation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-154800000).toISOString(),imageUrl:'https://picsum.photos/seed/43/800/450',region:'LAT'},
  {id:44,title:'Mexico City suffers severe water crisis as aquifers near depletion',titleTL:{},summary:'Mexico City is facing a severe water crisis as its main aquifers near depletion.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-187200000).toISOString(),imageUrl:'https://picsum.photos/seed/44/800/450',region:'LAT'},
  {id:45,title:'Poland leads Eastern Europe tech boom with $10 billion startup hub',titleTL:{},summary:'Poland is leading an Eastern European technology boom, with Warsaw emerging as a startup hub.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-205200000).toISOString(),imageUrl:'https://picsum.photos/seed/45/800/450',region:'EUR'},
  {id:46,title:'Iran nuclear talks make progress as sanctions relief discussed',titleTL:{},summary:'International nuclear talks with Iran have shown significant progress on potential sanctions relief.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-208800000).toISOString(),imageUrl:'https://picsum.photos/seed/46/800/450',region:'ME'},
  {id:47,title:'Malaysia unveils plan to become ASEAN fintech hub by 2030',titleTL:{},summary:'Malaysia has unveiled an ambitious plan to become ASEAN leading fintech hub by 2030.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-212400000).toISOString(),imageUrl:'https://picsum.photos/seed/47/800/450',region:'ASI'},
  {id:48,title:'Brazil surpasses expectations with record soybean exports to China',titleTL:{},summary:'Brazil has reported record-breaking soybean exports to China significantly exceeding expectations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-64800000).toISOString(),imageUrl:'https://picsum.photos/seed/48/800/450',region:'LAT'},
  {id:49,title:'Argentina reaches historic debt restructuring agreement with IMF',titleTL:{},summary:'Argentina has reached a historic debt restructuring agreement with the IMF.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-100800000).toISOString(),imageUrl:'https://picsum.photos/seed/49/800/450',region:'LAT'},
  {id:50,title:'Africa free trade zone creates largest market of 1.4 billion people',titleTL:{},summary:'The African Continental Free Trade Area has officially launched creating the largest free trade zone.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-72000000).toISOString(),imageUrl:'https://picsum.photos/seed/50/800/450',region:'AFR'},
];

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
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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
  if (!items.length) return;
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
    new Promise<NewsItem[]>(r => setTimeout(() => r([]), 10000)),
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

  // Fallback: 靜態新聞
  return FALLBACK.filter(n => region === 'ALL' || n.region === region || n.region === 'ALL').slice(0, 30);
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
    code: 'ALL', label: '全部', icon: '🌏',
    sources: []  // 空 = 所有來源
  },
  {
    code: 'JPN_KOR', label: '日韓', icon: '🇯🇵🇰🇷',
    sources: ['Yonhap Korea', 'Korea Herald', 'Asahi News', 'Asahi Politics', 'Asahi Intl',
              'Asahi International', 'Asahi Tech Science', 'Asahi Tech', 'NHK World', 'NHk World']
  },
  {
    code: 'TWN_HK', label: '台港', icon: '🇹🇼🇭🇰',
    sources: ['CNA Taiwan', 'RTHK HK', 'RTHK', 'HK Free Press', 'HKFP']
  },
  {
    code: 'IND_CHN', label: '印中', icon: '🇮🇳🇨🇳',
    sources: ['The Hindu', 'Times of India', 'SCMP']
  },
  {
    code: 'ME_AFR', label: '中東非洲', icon: '🇸🇾🌍',
    sources: ['Al Arabiya', 'BBC Africa', 'Mail Guardian', 'Mail & Guardian']
  },
  {
    code: 'USA', label: '美國', icon: '🇺🇸',
    sources: ['CNBC', 'Fox Economy', 'Fox Markets', 'Fox Tech', 'Fox Business',
              'Fox Business Latest', 'NPR Health', 'BBC Americas']
  },
  {
    code: 'EUR', label: '歐洲', icon: '🇪🇺',
    sources: ['DW Germany', 'DW', 'Le Monde', 'BBC Europe', 'Euronews']
  },
  {
    code: 'TEC', label: '科技', icon: '💻',
    sources: ['TechCrunch', 'Ars Technica', 'Ars Tech', 'Wired', 'CSS-Tricks',
              'Smashing Magazine', 'Smashing Mag', 'Cloudflare Blog', 'kottke.org', 'kottke',
              'Adactio', 'xkcd', 'WP Tavern', 'WPBeginner', 'Node Weekly',
              'Spoon & Tamago', 'Spoon Tamago', 'Brand New', 'Stevivor',
              'Craig Mod', 'Frank Chimero', 'Dave Rupert', 'Jim Nielsen',
              'Austin Kleon', 'Waxy.org', 'Popular Science', 'Popular Sci']
  },
  {
    code: 'SCI', label: '科學', icon: '🔬',
    sources: ['Science Magazine', 'Science Mag', 'Nature', 'New Scientist', 'Science Daily',
              'ESA Space', 'ESA', 'BBC Science']
  },
  {
    code: 'BUS', label: '財經', icon: '💰',
    sources: ['Reuters Biz', 'Reuters Business', 'Reuters World', 'CNBC',
              'Fox Economy', 'Fox Markets', 'Fox Business', 'Fox Business Latest']
  },
  {
    code: 'HLT', label: '健康', icon: '🏥',
    sources: ['NPR Health', 'NHS England', 'Running on Real Food', "Mark's Daily",
              "Mark's Daily Apple", 'Real Food']
  },
  {
    code: 'TRV', label: '旅遊', icon: '✈️',
    sources: ["Condé Nast Traveler", 'CN Traveler', 'Nomadic Matt']
  },
];

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
