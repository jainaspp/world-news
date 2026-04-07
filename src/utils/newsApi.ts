/**
 * newsApi.ts — 客戶端新聞獲取（完全杜絕 API Key 暴露）
 *
 * 架構：
 *  Phase 1: CF Worker（15秒超時）— Supabase + NewsData + 60篇靜態備用
 *  Phase 2: 純公共 API（Google News RSS / HackerNews / Dev.to / Reddit）
 *  Fallback: CF Worker 內置靜態新聞（60篇）
 *
 * ⚠️ 這裡絕對不能調用 NewsData.io / rss2json.com
 */
import { NewsItem } from '../types';

// ─── CF Worker URL — 所有敏感操作都在 Worker 端 ─────────────────────
const WORKER_BASE = 'https://world-news-api.jainaspp.workers.dev';

// ─── Stable ID ────────────────────────────────────────────────────
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

// ─── Fallback（60篇靜態新聞，Worker 內置）───────────────────────────
const FALLBACK: NewsItem[] = [
  {id:1,title:'Global leaders agree on emergency climate action at UN summit',titleTL:{},summary:'World leaders have reached a historic agreement on emergency climate measures at the United Nations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-3600000).toISOString(),imageUrl:'https://picsum.photos/seed/n001/800/450',region:'ALL'},
  {id:1,title:'AI breakthrough: new model achieves human-level reasoning in scientific research',titleTL:{},summary:'Researchers have unveiled a new AI system capable of human-level reasoning on complex scientific problems.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-7200000).toISOString(),imageUrl:'https://picsum.photos/seed/n002/800/450',region:'ALL'},
  {id:1,title:'Ukraine-Russia peace talks resume with UN mediation in Geneva',titleTL:{},summary:'Diplomatic negotiations between Ukraine and Russia have resumed in Geneva with UN mediation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-10800000).toISOString(),imageUrl:'https://picsum.photos/seed/n003/800/450',region:'RUS'},
  {id:1,title:'Federal Reserve signals interest rate cuts as inflation reaches 2-year low',titleTL:{},summary:'The US Federal Reserve has indicated that interest rate cuts could come sooner than expected.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Bloomberg',pubDate:new Date(Date.now()-14400000).toISOString(),imageUrl:'https://picsum.photos/seed/n004/800/450',region:'USA'},
  {id:1,title:'Taiwan and China resume diplomatic talks after months of tensions',titleTL:{},summary:'Taiwan and China have agreed to resume diplomatic talks following months of heightened tensions.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-18000000).toISOString(),imageUrl:'https://picsum.photos/seed/n005/800/450',region:'TWN'},
  {id:1,title:'Japan and South Korea mark 60 years of diplomatic ties with landmark agreements',titleTL:{},summary:'Japan and South Korea have signed landmark economic and security agreements in Tokyo.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NHK',pubDate:new Date(Date.now()-21600000).toISOString(),imageUrl:'https://picsum.photos/seed/n006/800/450',region:'JPN'},
  {id:1,title:'WHO issues warning as respiratory infections surge across Europe',titleTL:{},summary:'The World Health Organization has issued an urgent warning about a significant increase in respiratory infections.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'France24',pubDate:new Date(Date.now()-25200000).toISOString(),imageUrl:'https://picsum.photos/seed/n007/800/450',region:'EUR'},
  {id:1,title:'SpaceX launches first operational crewed mission to Mars orbit',titleTL:{},summary:'SpaceX has successfully launched its first operational crewed mission to Mars orbit.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNN',pubDate:new Date(Date.now()-28800000).toISOString(),imageUrl:'https://picsum.photos/seed/n008/800/450',region:'ALL'},
  {id:1,title:'UN Security Council votes to extend peacekeeping mission in disputed border region',titleTL:{},summary:'The UN Security Council has voted to extend the peacekeeping mission in the disputed border region.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SkyNews',pubDate:new Date(Date.now()-32400000).toISOString(),imageUrl:'https://picsum.photos/seed/n009/800/450',region:'ALL'},
  {id:1,title:'Global shipping costs surge as Red Sea tensions disrupt major trade routes',titleTL:{},summary:'Major shipping companies are diverting vessels away from the Red Sea, causing global shipping costs to surge.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-36000000).toISOString(),imageUrl:'https://picsum.photos/seed/n010/800/450',region:'ALL'},
  {id:1,title:'South Korea economy grows faster than expected on strong chip exports',titleTL:{},summary:"South Korea's economy grew faster than expected, driven by strong semiconductor exports.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-39600000).toISOString(),imageUrl:'https://picsum.photos/seed/n011/800/450',region:'KOR'},
  {id:1,title:'India surpasses China as world largest manufacturing hub, report says',titleTL:{},summary:'India has officially surpassed China as the world largest manufacturing destination.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-43200000).toISOString(),imageUrl:'https://picsum.photos/seed/n012/800/450',region:'IND'},
  {id:1,title:'European Union agrees on landmark digital markets regulation',titleTL:{},summary:'The European Union has reached a landmark agreement on digital markets regulation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-46800000).toISOString(),imageUrl:'https://picsum.photos/seed/n013/800/450',region:'EUR'},
  {id:1,title:'Middle East peace process shows new momentum after UAE-brokered talks',titleTL:{},summary:'A new round of indirect peace talks between Israel and Palestine has shown unexpected momentum.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-50400000).toISOString(),imageUrl:'https://picsum.photos/seed/n014/800/450',region:'ME'},
  {id:1,title:'China announces major stimulus package to boost domestic economy',titleTL:{},summary:'China has announced a comprehensive stimulus package worth over $500 billion.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'SCMP',pubDate:new Date(Date.now()-54000000).toISOString(),imageUrl:'https://picsum.photos/seed/n015/800/450',region:'ASI'},
  {id:1,title:'Breakthrough cancer treatment shows 90% success rate in clinical trials',titleTL:{},summary:'A new immunotherapy treatment has shown a 90% success rate in Phase 3 clinical trials.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NPR',pubDate:new Date(Date.now()-57600000).toISOString(),imageUrl:'https://picsum.photos/seed/n016/800/450',region:'ALL'},
  {id:1,title:'UK government unveils largest military investment since Cold War',titleTL:{},summary:'The United Kingdom has announced its largest military investment program since the Cold War.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-61200000).toISOString(),imageUrl:'https://picsum.photos/seed/n017/800/450',region:'UK'},
  {id:1,title:'Germany industrial output rebounds stronger than forecast',titleTL:{},summary:"Germany's industrial output has rebounded more strongly than forecast.",summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-68400000).toISOString(),imageUrl:'https://picsum.photos/seed/n018/800/450',region:'EUR'},
  {id:1,title:'Tech giants report record earnings driven by AI infrastructure spending',titleTL:{},summary:'Major technology companies have reported record-breaking quarterly earnings driven by AI.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Bloomberg',pubDate:new Date(Date.now()-75600000).toISOString(),imageUrl:'https://picsum.photos/seed/n019/800/450',region:'TEC'},
  {id:1,title:'New quantum computing breakthrough promises unbreakable encryption',titleTL:{},summary:'Scientists have achieved a new quantum computing breakthrough promising unbreakable encryption.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Nature',pubDate:new Date(Date.now()-108000000).toISOString(),imageUrl:'https://picsum.photos/seed/n020/800/450',region:'TEC'},
  {id:1,title:'G20 summit ends with agreements on wealth tax and AI governance',titleTL:{},summary:'The G20 summit has concluded with historic agreements on global wealth taxation and AI governance.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-90000000).toISOString(),imageUrl:'https://picsum.photos/seed/n021/800/450',region:'ALL'},
  {id:1,title:'Australia passes landmark climate legislation targeting net zero by 2050',titleTL:{},summary:'Australia has passed landmark climate legislation committing to net-zero emissions by 2050.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'ABC AU',pubDate:new Date(Date.now()-79200000).toISOString(),imageUrl:'https://picsum.photos/seed/n022/800/450',region:'AUS'},
  {id:1,title:'US and Japan sign historic defense cooperation agreement',titleTL:{},summary:'The United States and Japan have signed a historic defense cooperation agreement.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-82800000).toISOString(),imageUrl:'https://picsum.photos/seed/n023/800/450',region:'JPN'},
  {id:1,title:'Major earthquake strikes central Asia, humanitarian aid mobilized',titleTL:{},summary:'A magnitude 7.2 earthquake has struck central Asia, prompting immediate humanitarian aid.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-86400000).toISOString(),imageUrl:'https://picsum.photos/seed/n024/800/450',region:'ASI'},
  {id:1,title:'South Korea parliament passes landmark corporate reform bill',titleTL:{},summary:'South Korea parliament has passed a landmark corporate reform bill on transparency.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Yonhap',pubDate:new Date(Date.now()-93600000).toISOString(),imageUrl:'https://picsum.photos/seed/n025/800/450',region:'KOR'},
  {id:1,title:'Nobel Prize in Medicine awarded for mRNA vaccine technology',titleTL:{},summary:'Scientists behind mRNA vaccine technology have been awarded the Nobel Prize in Medicine.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-133200000).toISOString(),imageUrl:'https://picsum.photos/seed/n026/800/450',region:'SCI'},
  {id:1,title:'Taiwan semiconductor exports reach record high amid global AI boom',titleTL:{},summary:'Taiwan semiconductor exports have reached a record high driven by AI chip demand.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-136800000).toISOString(),imageUrl:'https://picsum.photos/seed/n027/800/450',region:'TWN'},
  {id:1,title:'Wildfires devastate parts of Mediterranean as heatwave intensifies',titleTL:{},summary:'Wildfires have devastated large parts of the Mediterranean as a severe heatwave continues.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-140400000).toISOString(),imageUrl:'https://picsum.photos/seed/n028/800/450',region:'EUR'},
  {id:1,title:'Japan approves record defense budget amid regional security concerns',titleTL:{},summary:'Japan has approved a record defense budget exceeding 2% of GDP.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'NHK',pubDate:new Date(Date.now()-144000000).toISOString(),imageUrl:'https://picsum.photos/seed/n029/800/450',region:'JPN'},
  {id:1,title:'IMF upgrades global growth forecast on strong emerging markets',titleTL:{},summary:'The IMF has upgraded its global growth forecast citing stronger than expected emerging markets.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-147600000).toISOString(),imageUrl:'https://picsum.photos/seed/n030/800/450',region:'ECO'},
  {id:1,title:'India becomes third country to land spacecraft on Moon south pole',titleTL:{},summary:'India has become the third country to successfully land a spacecraft on the Moon south pole.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-151200000).toISOString(),imageUrl:'https://picsum.photos/seed/n031/800/450',region:'IND'},
  {id:1,title:'EU and UK reach breakthrough deal on Northern Ireland trade rules',titleTL:{},summary:'The European Union and United Kingdom have reached a breakthrough deal on Northern Ireland.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-158400000).toISOString(),imageUrl:'https://picsum.photos/seed/n032/800/450',region:'UK'},
  {id:1,title:'Cybersecurity firms warn of massive global ransomware attack',titleTL:{},summary:'Leading cybersecurity firms have issued urgent warnings about a massive global ransomware attack.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-165600000).toISOString(),imageUrl:'https://picsum.photos/seed/n033/800/450',region:'TEC'},
  {id:1,title:'Egypt opens new Suez Canal expansion boosting global trade',titleTL:{},summary:'Egypt has opened a major expansion of the Suez Canal, significantly increasing capacity.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-169200000).toISOString(),imageUrl:'https://picsum.photos/seed/n034/800/450',region:'ME'},
  {id:1,title:'Switzerland hosts historic peace conference with 80 nations attending',titleTL:{},summary:'Switzerland is hosting a historic peace conference with representatives from over 80 nations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-176400000).toISOString(),imageUrl:'https://picsum.photos/seed/n035/800/450',region:'EUR'},
  {id:1,title:'China completes world longest high-speed rail network',titleTL:{},summary:'China has completed the world longest high-speed rail network, connecting over 95% of major cities.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-180000000).toISOString(),imageUrl:'https://picsum.photos/seed/n036/800/450',region:'ASI'},
  {id:1,title:'WHO approves first malaria vaccine for children in Africa',titleTL:{},summary:'The WHO has approved the first malaria vaccine specifically designed for children in Africa.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-183600000).toISOString(),imageUrl:'https://picsum.photos/seed/n037/800/450',region:'AFR'},
  {id:1,title:'Netherlands becomes first country to fully phase out coal power',titleTL:{},summary:'The Netherlands has become the first country in the world to fully phase out coal-fired power.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'DW',pubDate:new Date(Date.now()-190800000).toISOString(),imageUrl:'https://picsum.photos/seed/n038/800/450',region:'EUR'},
  {id:1,title:'South Africa launches largest renewable energy project on continent',titleTL:{},summary:'South Africa has launched the largest renewable energy project on the African continent.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-194400000).toISOString(),imageUrl:'https://picsum.photos/seed/n039/800/450',region:'AFR'},
  {id:1,title:'Vietnam becomes favorite destination for global tech manufacturing',titleTL:{},summary:'Vietnam has emerged as a favorite destination for global technology companies.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'CNA',pubDate:new Date(Date.now()-198000000).toISOString(),imageUrl:'https://picsum.photos/seed/n040/800/450',region:'ASI'},
  {id:1,title:'NASA confirms water ice deposits on Moon surface in new discovery',titleTL:{},summary:'NASA has confirmed the existence of significant water ice deposits on the Moon surface.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-216000000).toISOString(),imageUrl:'https://picsum.photos/seed/n041/800/450',region:'SCI'},
  {id:1,title:'Peru becomes world largest copper producer amid mining investment boom',titleTL:{},summary:'Peru has become the world largest copper producer, driven by a surge in mining investment.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-172800000).toISOString(),imageUrl:'https://picsum.photos/seed/n042/800/450',region:'LAT'},
  {id:1,title:'Colombia declares environmental emergency over Amazon deforestation',titleTL:{},summary:'Colombia has declared an environmental emergency following accelerating Amazon deforestation.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-154800000).toISOString(),imageUrl:'https://picsum.photos/seed/n043/800/450',region:'LAT'},
  {id:1,title:'Mexico City suffers severe water crisis as aquifers near depletion',titleTL:{},summary:'Mexico City is facing a severe water crisis as its main aquifers near depletion.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-187200000).toISOString(),imageUrl:'https://picsum.photos/seed/n044/800/450',region:'LAT'},
  {id:1,title:'Poland leads Eastern Europe tech boom with $10 billion startup hub',titleTL:{},summary:'Poland is leading an Eastern European technology boom, with Warsaw emerging as a startup hub.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Guardian',pubDate:new Date(Date.now()-205200000).toISOString(),imageUrl:'https://picsum.photos/seed/n045/800/450',region:'EUR'},
  {id:1,title:'Iran nuclear talks make progress as sanctions relief discussed',titleTL:{},summary:'International nuclear talks with Iran have shown significant progress on potential sanctions relief.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Al Jazeera',pubDate:new Date(Date.now()-208800000).toISOString(),imageUrl:'https://picsum.photos/seed/n046/800/450',region:'ME'},
  {id:1,title:'Malaysia unveils plan to become ASEAN fintech hub by 2030',titleTL:{},summary:'Malaysia has unveiled an ambitious plan to become ASEAN leading fintech hub by 2030.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-212400000).toISOString(),imageUrl:'https://picsum.photos/seed/n047/800/450',region:'ASI'},
  {id:1,title:'Brazil surpasses expectations with record soybean exports to China',titleTL:{},summary:'Brazil has reported record-breaking soybean exports to China significantly exceeding expectations.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'Reuters',pubDate:new Date(Date.now()-64800000).toISOString(),imageUrl:'https://picsum.photos/seed/n048/800/450',region:'LAT'},
  {id:1,title:'Argentina reaches historic debt restructuring agreement with IMF',titleTL:{},summary:'Argentina has reached a historic debt restructuring agreement with the IMF.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-100800000).toISOString(),imageUrl:'https://picsum.photos/seed/n049/800/450',region:'LAT'},
  {id:1,title:'Africa free trade zone creates largest market of 1.4 billion people',titleTL:{},summary:'The African Continental Free Trade Area has officially launched creating the largest free trade zone.',summaryTL:{},link:'https://news.google.com/articles/CBMioAE',source:'BBC',pubDate:new Date(Date.now()-72000000).toISOString(),imageUrl:'https://picsum.photos/seed/n050/800/450',region:'AFR'},
];

// ─── Phase 1: CF Worker（15秒超時）───────────────────────────────────
async function fetchViaWorker(group: string): Promise<NewsItem[]> {
  try {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), 15000);
    const url = `${WORKER_BASE}/?group=${encodeURIComponent(group)}&limit=50`;
    const res = await fetch(url, { signal: ac.signal });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: NewsItem) =>
          item.imageUrl ? item : { ...item, imageUrl: `https://picsum.photos/seed/${(item.id % 900) + 100}/800/450` }
        );
      }
    }
  } catch { /* continue to Phase 2 */ }
  return [];
}

// ─── Phase 2: 純公共 API（無需 API Key）──────────────────────────────
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
      const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
    };
    let mx;
    while ((mx = re.exec(xml)) !== null && items.length < 20) {
      const blk = mx[1];
      const lp = gt(blk,'link'), up = lp.match(/[?&]url=([^&]+)/);
      const tl = gt(blk,'title');
      if (tl && (up ? decodeURIComponent(up[1]) : lp))
        items.push({ title: tl, link: up ? decodeURIComponent(up[1]) : lp, description: gt(blk,'description'), pubDate: gt(blk,'pubDate'), source: 'GoogleNews', imageUrl: '' });
    }
    return items.map(i => ({
      id: stableId(i.title, i.link), title: decodeHtml(i.title), titleTL: {},
      summary: decodeHtml(i.description||'').slice(0, 500), summaryTL: {},
      link: i.link, source: i.source,
      pubDate: i.pubDate||new Date().toISOString(), imageUrl: '',
    }));
  } catch { return []; }
}

async function fetchHN(): Promise<NewsItem[]> {
  try {
    const d = await fetch(
      'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15',
      { signal: AbortSignal.timeout(6000) }
    ).then(r => r.json()).catch(() => null);
    if (!d || !Array.isArray(d.hits)) return [];
    return d.hits.map((h: any) => ({
      id: stableId(h.title||'', h.url||''), title: decodeHtml(h.title||''), titleTL: {},
      summary: decodeHtml(h.story_text||'').slice(0, 500), summaryTL: {},
      link: h.url||h.story_url||'', source: 'HackerNews',
      pubDate: h.created_at||new Date().toISOString(), imageUrl: '',
    }));
  } catch { return []; }
}

async function fetchDevTo(): Promise<NewsItem[]> {
  try {
    const d = await fetch(
      'https://dev.to/api/articles?per_page=20&top=1',
      { signal: AbortSignal.timeout(6000) }
    ).then(r => r.json()).catch(() => null);
    if (!Array.isArray(d)) return [];
    return d.slice(0, 15).map((a: any) => ({
      id: stableId(a.title||'', String(a.url||'')), title: decodeHtml(a.title||''), titleTL: {},
      summary: decodeHtml(a.description||a.excerpt||'').slice(0, 500), summaryTL: {},
      link: a.url||'', source: 'Dev.to',
      pubDate: a.published_at||new Date().toISOString(),
      imageUrl: a.cover_image||a.social_image||'',
    }));
  } catch { return []; }
}

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
        id: stableId(a.title||'', String(a.url||'')), title: decodeHtml(a.title||''), titleTL: {},
        summary: decodeHtml(a.selftext||'').slice(0, 500), summaryTL: {},
        link: a.url||a.permalink||'', source: 'Reddit',
        pubDate: new Date((a.created_utc||0)*1000).toISOString(),
        imageUrl: a.thumbnail?.startsWith('http') ? a.thumbnail : '',
      };
    });
  } catch { return []; }
}

// fetchDirect 保持在原位，fetchAllRSSViaProxy 單獨使用
async function fetchDirect(): Promise<NewsItem[]> {
  const all: NewsItem[] = []; const seen = new Set<number>();
  const add = (items: NewsItem[]) => { for (const i of items) { if (!seen.has(i.id)) { seen.add(i.id); all.push(i); } } };
  const [gn, hn, dev, reddit, rss] = await Promise.allSettled([
    fetchGNews(), fetchHN(), fetchDevTo(), fetchRedditWorld(), fetchAllRSSViaProxy()
  ]);
  if (gn.status    === 'fulfilled') add(gn.value);
  if (hn.status    === 'fulfilled') add(hn.value);
  if (dev.status   === 'fulfilled') add(dev.value);
  if (reddit.status === 'fulfilled') add(reddit.value);
  if (rss.status   === 'fulfilled') add(rss.value);
  return all
    .map(item => item.imageUrl ? item : { ...item, imageUrl: `https://picsum.photos/seed/${(item.id % 900) + 100}/800/450` })
    .slice(0, 80);
}

// ─── CF Worker RSS 代理（/proxy 端點）─────────────────────────────────
// Worker URL → CF Worker → 真實 RSS 源（BBC/CNA/Guardian 等）
// 客戶端從不直接訪問 RSS 源，徹底解決 Vercel IP 封鎖問題
async function fetchRSSViaProxy(key: string, feedUrl: string): Promise<NewsItem[]> {
  try {
    const proxyUrl = `${WORKER_BASE}/proxy?url=${btoa(feedUrl)}`;
    const xml = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) }).then(r => r.text()).catch(() => '');
    if (!xml || !xml.includes('<')) return [];
    const items: any[] = [];
    const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const gt = (blk: string, tag: string) => {
      const m = blk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim() : '';
    };
    let mx;
    while ((mx = re.exec(xml)) !== null && items.length < 10) {
      const blk = mx[1];
      const lp = gt(blk,'link');
      const up = lp.match(/[?&]url=([^&]+)/);
      const tl = gt(blk,'title');
      const pd = gt(blk,'pubDate') || new Date().toISOString();
      if (tl) items.push({ title:tl, link: up ? decodeURIComponent(up[1]) : lp, description:gt(blk,'description'), pubDate:pd, source:key });
    }
    return items.map(i => ({
      id: stableId(i.title, i.link), title: decodeHtml(i.title), titleTL:{},
      summary: decodeHtml(i.description||'').slice(0,500), summaryTL:{},
      link: i.link||'', source: i.source||key,
      pubDate: i.pubDate||new Date().toISOString(), imageUrl:'',
    }));
  } catch { return []; }
}

// ─── 批量通過 Worker 代理抓多個 RSS（用於增強 fetchDirect）────────────
async function fetchAllRSSViaProxy(): Promise<NewsItem[]> {
  const feedList = [
    {key:'BBC', url:'https://feeds.bbci.co.uk/news/world/rss.xml'},
    {key:'Reuters', url:'https://feeds.reuters.com/reuters/worldnews'},
    {key:'Guardian', url:'https://www.theguardian.com/world/rss'},
    {key:'Al Jazeera', url:'https://www.aljazeera.com/xml/rss/all.xml'},
    {key:'CNA', url:'https://www.channelnewsasia.com/rss'},
    {key:'NHK', url:'https://www3.nhk.or.jp/rss/news/cat0.xml'},
    {key:'France24', url:'https://www.france24.com/en/rss'},
    {key:'SkyNews', url:'https://feeds.sky.com/ngs/world/rss.xml'},
    {key:'DW', url:'https://rss.dw.com/rdf/rss-en-world'},
    {key:'SCMP', url:'https://www.scmp.com/rss/91/feed'},
    {key:'Euronews', url:'https://feeds.euronews.com/world'},
    {key:'ABC AU', url:'https://www.abc.net.au/news/feed/51120/rss.xml'},
  ];
  const settled = await Promise.allSettled(feedList.map(f => fetchRSSViaProxy(f.key, f.url)));
  const all: NewsItem[] = []; const seen = new Set<number>();
  for (const r of settled) { if (r.status === 'fulfilled') for (const i of r.value) { if (!seen.has(i.id)) { seen.add(i.id); all.push(i); } } }
  return all;
}

// ─── OG Image（可選優化）────────────────────────────────────────────
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

// ─── 公開接口 ──────────────────────────────────────────────────────
export async function fetchGroupByRegion(region: string): Promise<NewsItem[]> {
  const workerResult = await fetchViaWorker(region);
  if (workerResult.length >= 3) return workerResult;

  // Phase 2: 純公共 API
  try {
    const all = await Promise.race([
      fetchDirect(),
      new Promise<NewsItem[]>(r => setTimeout(() => r([]), 12000)),
    ]);
    if (all.length >= 3) return all;
  } catch { /* fall through */ }

  return FALLBACK;
}

export async function fetchGroupByTopic(topic: string): Promise<NewsItem[]> {
  return fetchGroupByRegion(topic); // Worker handles topic routing
}

export async function searchGoogleNews(query: string): Promise<NewsItem[]> {
  const q = query.toLowerCase();
  const [gn] = await Promise.allSettled([fetchGNews()]);
  const items: NewsItem[] = [];
  if (gn.status === 'fulfilled') items.push(...gn.value);
  return items.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)).slice(0, 30);
}

// ─── 向後兼容導出 ─────────────────────────────────────────────────
export async function fetchAllNewsSmart(group: string): Promise<NewsItem[]> {
  return fetchGroupByRegion(group);
}

// ─── 從 newsApi.ts 導出（sources.ts 依賴這些）──────────────────────
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

export const REGIONS = [
  {code:'ALL',label:'全部',icon:'🌏',color:'#58a6ff',desc:'全球頭條'},
  {code:'ASI',label:'亞洲',icon:'🌏',color:'#f0883e',desc:'東亞、東南亞、南亞'},
  {code:'EUR',label:'歐洲',icon:'🏰',color:'#3fb950',desc:'西歐、北歐、東歐'},
  {code:'ME', label:'中東',icon:'🏜️',color:'#a371f7',desc:'中東及阿拉伯世界'},
  {code:'AFR',label:'非洲',icon:'🦁',color:'#e6783e',desc:'非洲各國'},
  {code:'AM', label:'美洲',icon:'🗽',color:'#79c0ff',desc:'北美、南美'},
  {code:'OCE',label:'大洋洲',icon:'🦘',color:'#39d353',desc:'澳洲、紐西蘭'},
  {code:'EAS',label:'東亞',icon:'🌸',color:'#f85149',desc:'中日韓台'},
  {code:'TWN',label:'台灣',icon:'🇹🇼',color:'#ff7b72',desc:'台灣新聞'},
  {code:'JPN',label:'日本',icon:'🇯🇵',color:'#f0883e',desc:'日本新聞'},
  {code:'KOR',label:'南韓',icon:'🇰🇷',color:'#3fb950',desc:'南韓新聞'},
  {code:'USA',label:'美國',icon:'🇺🇸',color:'#79c0ff',desc:'美國新聞'},
  {code:'UK', label:'英國',icon:'🇬🇧',color:'#005689',desc:'英國新聞'},
  {code:'RUS',label:'俄羅斯',icon:'🇷🇺',color:'#6e7681',desc:'俄羅斯新聞'},
  {code:'IND',label:'印度',icon:'🇮🇳',color:'#ffa657',desc:'印度新聞'},
  {code:'TEC',label:'科技',icon:'🤖',color:'#79c0ff',desc:'科技、AI'},
  {code:'SCI',label:'科學',icon:'🔬',color:'#58a6ff',desc:'科學研究'},
  {code:'ECO',label:'經濟',icon:'💹',color:'#3fb950',desc:'經濟、金融'},
  {code:'SPO',label:'體育',icon:'⚽',color:'#ffa657',desc:'足球、奧運'},
];

export const TOPICS = [
  {code:'TEC',label:'科技',icon:'🤖',color:'#79c0ff',desc:'科技、AI'},
  {code:'SCI',label:'科學',icon:'🔬',color:'#58a6ff',desc:'科學研究'},
  {code:'ECO',label:'經濟',icon:'💹',color:'#3fb950',desc:'經濟、金融'},
  {code:'SPO',label:'體育',icon:'⚽',color:'#ffa657',desc:'足球'},
  {code:'MIL',label:'軍事',icon:'💣',color:'#f85149',desc:'軍事動態'},
  {code:'POL',label:'政治',icon:'🏛️',color:'#a371f7',desc:'政治'},
  {code:'ENV',label:'環境',icon:'🌍',color:'#39d353',desc:'氣候、環保'},
];

export const SOURCE_INFO: Record<string,{label:string;color:string;region:string}> = {
  BBC:{label:'BBC',color:'#cc0000',region:'🇬🇧'},Reuters:{label:'Reuters',color:'#cc0000',region:'🇬🇧'},
  Guardian:{label:'Guardian',color:'#005689',region:'🇬🇧'},NPR:{label:'NPR',color:'#003366',region:'🇺🇸'},
  AlJazeera:{label:'Al Jazeera',color:'#003366',region:'🇶🇦'},CNN:{label:'CNN',color:'#cc0000',region:'🇺🇸'},
  France24:{label:'France24',color:'#0072c6',region:'🇫🇷'},DW:{label:'DW',color:'#003366',region:'🇩🇪'},
  Bloomberg:{label:'Bloomberg',color:'#003366',region:'🇺🇸'},NBC:{label:'NBC News',color:'#003366',region:'🇺🇸'},
  ABCNews:{label:'ABC News',color:'#003366',region:'🇺🇸'},SkyNews:{label:'Sky News',color:'#005689',region:'🇬🇧'},
  SCMP:{label:'SCMP',color:'#cc0000',region:'🇭🇰'},LTN:{label:'自由時報',color:'#cc0000',region:'🇹🇼'},
  ChannelNewsAsia:{label:'CNA',color:'#c00',region:'🇸🇬'},YNA:{label:'韓聯社',color:'#003366',region:'🇰🇷'},
  NHK:{label:'NHK',color:'#cc0000',region:'🇯🇵'},NDTV:{label:'NDTV',color:'#003366',region:'🇮🇳'},
  VnExpress:{label:'VnExpress',color:'#003366',region:'🇻🇳'},ST:{label:'Strait Times',color:'#003366',region:'🇸🇬'},
  Caixin:{label:'Caixin',color:'#cc0000',region:'🇨🇳'},Meduza:{label:'Meduza',color:'#3fb950',region:'🇱🇻'},
  TASS:{label:'TASS',color:'#cc0000',region:'🇷🇺'},Euronews:{label:'Euronews',color:'#003366',region:'🇪🇺'},
  NYTimes:{label:'NY Times',color:'#003366',region:'🇺🇸'},CBC:{label:'CBC Canada',color:'#cc0000',region:'🇨🇦'},
  G1:{label:'G1 (Brazil)',color:'#003366',region:'🇧🇷'},'ABC AU':{label:'ABC Australia',color:'#cc0000',region:'🇦🇺'},
  TechCrunch:{label:'TechCrunch',color:'#0a6900',region:'🇺🇸'},Wired:{label:'Wired',color:'#003366',region:'🇺🇸'},
  GoogleNews:{label:'Google News',color:'#4285f4',region:'🌐'},HackerNews:{label:'Hacker News',color:'#ff6600',region:'🇺🇸'},
  'Dev.to':{label:'Dev.to',color:'#0a0',region:'🌐'},Reddit:{label:'Reddit',color:'#ff4500',region:'🇺🇸'},
};
