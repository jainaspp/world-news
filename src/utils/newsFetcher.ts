/**
 * newsFetcher.ts — Production news fetch architecture
 *
 * Strategy:
 *  Layer 1 (primary):   CF Worker → Google News RSS（瀏覽器 → Worker → Google，乾淨無 WAF）
 *  Layer 2 (backup):    直接請求 Google News RSS（CORS friendly endpoints）
 *  Layer 3 (last opt):  CORS 代理（corsproxy.io / allorigins.win）
 *  Base (always):       localStorage cache（即時展示 + 後台刷新）
 *  Fallback:            50 篇靜態新聞（網絡完全失敗時）
 */
import { NewsItem } from '../types';

// ─── Constants ────────────────────────────────────────────────
const CACHE_PREFIX = 'wn_v3_';
const CACHE_TTL    = 10 * 60 * 1000;

// ─── Supabase（主要來源，cron 寫入）──────────────────
const SB_URL = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.7vMNxsKczXGxzzGmimlN338BsK7tSHzejaw4bC2kOs4';

// ─── Google News RSS（直接，無代理）───────────────────
const GN_CONFIG: Record<string, { hl: string; gl: string; ceid: string }> = {
  ALL: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ASI: { hl: 'en-US', gl: 'SG', ceid: 'SG:en' },
  TWN: { hl: 'zh-TW', gl: 'TW', ceid: 'TW:zh-Hant' },
  CHN: { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh' },
  HKG: { hl: 'zh-HK', gl: 'HK', ceid: 'HK:zh' },
  JPN: { hl: 'ja-JP', gl: 'JP', ceid: 'JP:ja' },
  KOR: { hl: 'ko-KR', gl: 'KR', ceid: 'KR:ko' },
  IND: { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
  EUR: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  UK:  { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  FRA: { hl: 'fr-FR', gl: 'FR', ceid: 'FR:fr' },
  DEU: { hl: 'de-DE', gl: 'DE', ceid: 'DE:de' },
  RUS: { hl: 'ru-RU', gl: 'RU', ceid: 'RU:ru' },
  ME:  { hl: 'en-AE', gl: 'AE', ceid: 'AE:en' },
  AFR: { hl: 'en-ZA', gl: 'ZA', ceid: 'ZA:en' },
  LAT: { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt' },
  USA: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  AUS: { hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
  TEC: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  SCI: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  BUS: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
};

// ─── 50 篇靜態 Fallback（永不失效）───────────────────
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
  {id:15,title:'China announces major stimulus package to boost domestic economy',titleTL:{},summary:'China has announced a comprehensive stimulus package worth over $500 billion.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SCMP',pubDate:new Date(Date.now()-54000000).toISOString(),imageUrl:'https://picsum.photos/seed/15/800/450',region:'CHN'},
  {id:16,title:'Breakthrough cancer treatment shows 90% success rate in clinical trials',titleTL:{},summary:'A new immunotherapy treatment has shown a 90% success rate in Phase 3 clinical trials.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NPR',pubDate:new Date(Date.now()-57600000).toISOString(),imageUrl:'https://picsum.photos/seed/16/800/450',region:'ALL'},
  {id:17,title:'UK government unveils largest military investment since Cold War',titleTL:{},summary:'The United Kingdom has announced its largest military investment program since the Cold War.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-61200000).toISOString(),imageUrl:'https://picsum.photos/seed/17/800/450',region:'UK'},
  {id:18,title:'Germany industrial output rebounds stronger than forecast',titleTL:{},summary:"Germany's industrial output has rebounded more strongly than forecast.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-68400000).toISOString(),imageUrl:'https://picsum.photos/seed/18/800/450',region:'DEU'},
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
  {id:30,title:'IMF upgrades global growth forecast on strong emerging markets',titleTL:{},summary:'The IMF has upgraded its global growth forecast citing stronger than expected emerging markets.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-147600000).toISOString(),imageUrl:'https://picsum.photos/seed/30/800/450',region:'ALL'},
  {id:31,title:'India becomes third country to land spacecraft on Moon south pole',titleTL:{},summary:'India has become the third country to successfully land a spacecraft on the Moon south pole.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-151200000).toISOString(),imageUrl:'https://picsum.photos/seed/31/800/450',region:'IND'},
  {id:32,title:'EU and UK reach breakthrough deal on Northern Ireland trade rules',titleTL:{},summary:'The European Union and United Kingdom have reached a breakthrough deal on Northern Ireland.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-158400000).toISOString(),imageUrl:'https://picsum.photos/seed/32/800/450',region:'UK'},
  {id:33,title:'Cybersecurity firms warn of massive global ransomware attack',titleTL:{},summary:'Leading cybersecurity firms have issued urgent warnings about a massive global ransomware attack.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-165600000).toISOString(),imageUrl:'https://picsum.photos/seed/33/800/450',region:'TEC'},
  {id:34,title:'Egypt opens new Suez Canal expansion boosting global trade',titleTL:{},summary:'Egypt has opened a major expansion of the Suez Canal, significantly increasing capacity.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-169200000).toISOString(),imageUrl:'https://picsum.photos/seed/34/800/450',region:'ME'},
  {id:35,title:'Switzerland hosts historic peace conference with 80 nations attending',titleTL:{},summary:'Switzerland is hosting a historic peace conference with representatives from over 80 nations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-176400000).toISOString(),imageUrl:'https://picsum.photos/seed/35/800/450',region:'EUR'},
  {id:36,title:'China completes world longest high-speed rail network',titleTL:{},summary:'China has completed the world longest high-speed rail network, connecting over 95% of major cities.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-180000000).toISOString(),imageUrl:'https://picsum.photos/seed/36/800/450',region:'CHN'},
  {id:37,title:'WHO approves first malaria vaccine for children in Africa',titleTL:{},summary:'The WHO has approved the first malaria vaccine specifically designed for children in Africa.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-183600000).toISOString(),imageUrl:'https://picsum.photos/seed/37/800/450',region:'AFR'},
  {id:38,title:'Netherlands becomes first country to fully phase out coal power',titleTL:{},summary:'The Netherlands has become the first country in the world to fully phase out coal-fired power.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-190800000).toISOString(),imageUrl:'https://picsum.photos/seed/38/800/450',region:'EUR'},
  {id:39,title:'South Africa launches largest renewable energy project on continent',titleTL:{},summary:'South Africa has launched the largest renewable energy project on the African continent.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-194400000).toISOString(),imageUrl:'https://picsum.photos/seed/39/800/450',region:'AFR'},
  {id:40,title:'Vietnam becomes favorite destination for global tech manufacturing',titleTL:{},summary:'Vietnam has emerged as a favorite destination for global technology companies.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-198000000).toISOString(),imageUrl:'https://picsum.photos/seed/40/800/450',region:'ASI'},
  {id:41,title:'NASA confirms water ice deposits on Moon surface in new discovery',titleTL:{},summary:'NASA has confirmed the existence of significant water ice deposits on the Moon surface.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-216000000).toISOString(),imageUrl:'https://picsum.photos/seed/41/800/450',region:'SCI'},
  {id:42,title:'Peru becomes world largest copper producer amid mining investment boom',titleTL:{},summary:'Peru has become the world largest copper producer, driven by a surge in mining investment.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-172800000).toISOString(),imageUrl:'https://picsum.photos/seed/42/800/450',region:'LAT'},
  {id:43,title:'Colombia declares environmental emergency over Amazon deforestation',titleTL:{},summary:'Colombia has declared an environmental emergency following accelerating Amazon deforestation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-154800000).toISOString(),imageUrl:'https://picsum.photos/seed/43/800/450',region:'LAT'},
  {id:44,title:'Mexico City suffers severe water crisis as aquifers near depletion',titleTL:{},summary:'Mexico City is facing a severe water crisis as its main aquifers near depletion.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-187200000).toISOString(),imageUrl:'https://picsum.photos/seed/44/800/450',region:'LAT'},
  {id:45,title:'Poland leads Eastern Europe tech boom with billion startup hub',titleTL:{},summary:'Poland is leading an Eastern European technology boom, with Warsaw emerging as a startup hub.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-205200000).toISOString(),imageUrl:'https://picsum.photos/seed/45/800/450',region:'EUR'},
  {id:46,title:'Iran nuclear talks make progress as sanctions relief discussed',titleTL:{},summary:'International nuclear talks with Iran have shown significant progress on potential sanctions relief.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-208800000).toISOString(),imageUrl:'https://picsum.photos/seed/46/800/450',region:'ME'},
  {id:47,title:'Malaysia unveils plan to become ASEAN fintech hub by 2030',titleTL:{},summary:'Malaysia has unveiled an ambitious plan to become ASEAN leading fintech hub by 2030.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-212400000).toISOString(),imageUrl:'https://picsum.photos/seed/47/800/450',region:'ASI'},
  {id:48,title:'Brazil surpasses expectations with record soybean exports to China',titleTL:{},summary:'Brazil has reported record-breaking soybean exports to China significantly exceeding expectations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-64800000).toISOString(),imageUrl:'https://picsum.photos/seed/48/800/450',region:'LAT'},
  {id:49,title:'Argentina reaches historic debt restructuring agreement with IMF',titleTL:{},summary:'Argentina has reached a historic debt restructuring agreement with the IMF.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-100800000).toISOString(),imageUrl:'https://picsum.photos/seed/49/800/450',region:'LAT'},
  {id:50,title:'Africa free trade zone creates largest market of 1.4 billion people',titleTL:{},summary:'The African Continental Free Trade Area has officially launched creating the largest free trade zone.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-72000000).toISOString(),imageUrl:'https://picsum.photos/seed/50/800/450',region:'AFR'},
];

// ─── Helpers ────────────────────────────────────────────────────
function sid(t: string, l: string): number {
  const s = (t + '|' + l).replace(/\s+/g, ' ').trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function dh(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(+c))
    .replace(/<[^>]+>/g, '').trim();
}

// ─── RSS Parser ────────────────────────────────────────────────
function parseRSS(xml: string, source: string, region = 'ALL'): NewsItem[] {
  if (!xml || xml.length < 50) return [];
  const items: NewsItem[] = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const gt = (blk: string, tag: string) => {
    const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
  };
  let mx;
  while ((mx = itemRe.exec(xml)) !== null && items.length < 15) {
    const blk = mx[1];
    const lp = gt(blk,'link'), up = lp.match(/[?&]url=([^&]+)/);
    const link = up ? decodeURIComponent(up[1]) : lp;
    const title = gt(blk,'title');
    if (!title || !link) continue;
    const imgM = blk.match(/<media:content[^>]+url=["']([^"']+)["']/i)
              || blk.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
              || blk.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const desc = gt(blk,'description');
    const pd = gt(blk,'pubDate') || new Date().toISOString();
    items.push({
      id: sid(dh(title), dh(link)),
      title: dh(title),
      titleTL: {},
      summary: dh(desc).slice(0, 300),
      summaryTL: {},
      link,
      source,
      pubDate: pd,
      imageUrl: imgM ? imgM[1] : '',
      region,
    });
  }
  return items;
}

// ─── Layer 1: Supabase DB（CF Worker cron 寫入的 RSS 新聞）────────────────
async function fetchFromSupabase(group: string): Promise<NewsItem[]> {
  try {
    const limit = group === 'ALL' ? 60 : 30;
    const regionFilter = group !== 'ALL' ? `and(region.eq.${group})` : '';
    const res = await fetch(
      `${SB_URL}/rest/v1/news?select=id,title,summary,link,source,pub_date,region,image_url&order=pub_date.desc&limit=${limit}${regionFilter}`,
      {
        signal: AbortSignal.timeout(6000),
        headers: {
          'apikey': SB_ANON_KEY,
          'Authorization': `Bearer ${SB_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((r: any) => ({
      id: r.id || sid(String(r.title||''), String(r.link||'')),
      title: dh(String(r.title||'')),
      titleTL: {},
      summary: dh(String(r.summary||'')).slice(0, 300),
      summaryTL: {},
      link: String(r.link||''),
      source: String(r.source||''),
      pubDate: String(r.pub_date||new Date().toISOString()),
      imageUrl: String(r.image_url||''),
      region: String(r.region||group),
    }));
  } catch { return []; }
}

// ─── Layer 2: 直接 Google News RSS ─────────────────────────────
async function fetchDirectGN(group: string): Promise<NewsItem[]> {
  const cfg = GN_CONFIG[group.toUpperCase()] || GN_CONFIG.ALL;
  const url = `https://news.google.com/rss?hl=${encodeURIComponent(cfg.hl)}&gl=${encodeURIComponent(cfg.gl)}&ceid=${encodeURIComponent(cfg.ceid)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, 'GoogleNews', group);
  } catch { return []; }
}

// ─── Layer 3: CORS 代理（備用）───────────────────────────────
const CORS_PROXIES = [
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

async function fetchWithCorsProxy(url: string, region = 'ALL'): Promise<NewsItem[]> {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const res = await fetch(makeProxy(url), { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRSS(xml, 'GoogleNews-via-Proxy', region);
      if (items.length > 0) return items;
    } catch { continue; }
  }
  return [];
}

// ─── Cache ─────────────────────────────────────────────────────
function getCache(group: string): NewsItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + group);
    if (!raw) return null;
    const { items, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return items;
  } catch { return null; }
}

function setCache(group: string, items: NewsItem[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + group, JSON.stringify({ items, ts: Date.now() }));
  } catch { /* ignore */ }
}

// ─── 處理 + 去重 ────────────────────────────────────────────────
function process(items: NewsItem[]): NewsItem[] {
  const seen = new Set<number>();
  const uniq: NewsItem[] = [];
  items.forEach(i => { if (!seen.has(i.id)) { seen.add(i.id); uniq.push(i); } });
  const cutoff = Date.now() - 48 * 3600 * 1000;
  return uniq
    .filter(i => { try { return new Date(i.pubDate).getTime() > cutoff; } catch { return false; } })
    .sort((a, b) => { try { return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(); } catch { return 0; } })
    .slice(0, 60)
    .map((i, idx) => i.imageUrl ? i : { ...i, imageUrl: `https://picsum.photos/seed/${(i.id % 900) + 100}/800/450` });
}

// ─── 主函數 ───────────────────────────────────────────────────
export async function fetchAllNews(group = 'ALL'): Promise<NewsItem[]> {
  // 0. Cache（立即返回，避免白屏）
  const cached = getCache(group);
  if (cached && cached.length > 0) {
    refreshBg(group).catch(() => {});
    return cached;
  }

  // 1. Supabase DB（CF Worker cron 寫入的 RSS 新聞）
  const dbNews = await Promise.race([
    fetchFromSupabase(group),
    new Promise<NewsItem[]>(r => setTimeout(() => r([]), 6000)),
  ]);

  // 如果結果夠用，直接返回
  if (dbNews.length >= 5) {
    setCache(group, dbNews);
    return process(dbNews);
  }

  // DB 空或結果少 → 直接 Google News RSS 補救
  if (group !== 'ALL' && dbNews.length > 0) {
    const allNews = await Promise.race([
      fetchFromSupabase('ALL'),
      new Promise<NewsItem[]>(r => setTimeout(() => r([]), 5000)),
    ]);
    const merged = [...dbNews, ...allNews.filter(n => n.region !== 'ALL').slice(0, 20)];
    setCache(group, merged);
    return process(merged);
  }

  // 2. 直接 Google News RSS（DB 為空時的即時 fallback）
  const directNews = await fetchDirectGN(group);
  if (directNews.length >= 5) {
    setCache(group, directNews);
    return process(directNews);
  }

  // 3. CORS 代理
  const cfg = GN_CONFIG[group.toUpperCase()] || GN_CONFIG.ALL;
  const gnUrl = `https://news.google.com/rss?hl=${encodeURIComponent(cfg.hl)}&gl=${encodeURIComponent(cfg.gl)}&ceid=${encodeURIComponent(cfg.ceid)}`;
  const proxyNews = await fetchWithCorsProxy(gnUrl, group);
  if (proxyNews.length >= 5) {
    setCache(group, proxyNews);
    return process(proxyNews);
  }

  // 4. Fallback：靜態新聞（按地區過濾）
  const regionFallback = FALLBACK.filter(n => n.region === group || n.region === 'ALL');
  const fallback = group === 'ALL' ? FALLBACK : [...FALLBACK.filter(n => n.region === group), ...FALLBACK.filter(n => n.region === 'ALL').slice(0, 20)];
  if (  fallback.length > 0) {
    return process(fallback);
  }

  // 5. 全靜態 fallback（完全不依赖网络）
  return process(FALLBACK);
}

// ─── 後台刷新（非阻塞）────────────────────────────────────────
async function refreshBg(group: string) {
  try {
    const news = await fetchFromSupabase(group);
    if (news.length > 0) setCache(group, news);
  } catch { /* silent */ }
}

// ─── 按地區/話題分組（兼容介面）──────────────────────────────
export async function fetchGroupByRegion(region: string): Promise<NewsItem[]> {
  return fetchAllNews(region);
}

export async function fetchGroupByTopic(topic: string): Promise<NewsItem[]> {
  return fetchAllNews(topic);
}

export async function searchGoogleNews(query: string): Promise<NewsItem[]> {
  const q = query.toLowerCase();
  const cfg = GN_CONFIG.ALL;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${encodeURIComponent(cfg.hl)}&gl=${encodeURIComponent(cfg.gl)}&ceid=${encodeURIComponent(cfg.ceid)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return FALLBACK;
    const xml = await res.text();
    const items = parseRSS(xml, 'GoogleNews-Search');
    return items.filter(i => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)).slice(0, 30);
  } catch {
    return FALLBACK.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q));
  }
}
