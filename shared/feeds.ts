/**
 * Public RSS feeds only. No API keys.
 * Cards show the headline, the source name, and a link — not the article body.
 * `terms` is a reminder for the maintainer, not a legal opinion.
 * See LEGAL.md.
 */
import type { CategoryId } from './categories';

export type TermsStatus = 'public-domain' | 'un-reuse' | 'uncertain';

export interface Feed {
  id: string;
  label: string;
  homepage: string;
  url: string;
  regions: string[];
  terms: TermsStatus;
  category?: CategoryId;
  /** Keep an item only when its link contains one of these path fragments. */
  includePaths?: string[];
  /** Keep an item only when one of its RSS category labels is in this list. */
  includeCategories?: string[];
  /** `now` is the Now 新聞 JSON list. `hk01` is the 香港01 zone JSON. Omitted feeds are RSS or Atom. */
  format?: 'now' | 'hk01';
}

export interface Region {
  code: string;
  label: string;
  icon: string;
  color: string;
}

export const REGIONS: Region[] = [
  { code: 'ALL', label: '全球', icon: 'all', color: '#1D4F91' },
  { code: 'HKG', label: '香港', icon: 'hkg', color: '#C8102E' },
  { code: 'TWN', label: '台灣', icon: 'twn', color: '#0B6B4F' },
  { code: 'JPN', label: '日本', icon: 'jpn', color: '#8E1B2C' },
  { code: 'KOR', label: '韓國', icon: 'kor', color: '#0C3C78' },
  { code: 'ASI', label: '亞洲', icon: 'asi', color: '#9A3412' },
  { code: 'EUR', label: '歐洲', icon: 'eur', color: '#1E4D8C' },
  { code: 'USA', label: '美國', icon: 'usa', color: '#1D4E89' },
  { code: 'ME', label: '中東', icon: 'me', color: '#8A4B08' },
  { code: 'INT', label: '國際', icon: 'int', color: '#0F6E56' },
];

const rthk = 'https://rthk9.rthk.hk/rthk/news/rss';
const bbc = 'https://feeds.bbci.co.uk';

/**
 * Workers free CPU is too small to parse many feeds in one invocation
 * (about 20 feeds was over the limit in production). Two feeds per shard
 * stays under that budget. The parent merge makes one subrequest per shard;
 * keep the shard count under 40 so that stays inside the 50-subrequest cap,
 * with room for a cache read. A redirect is followed inside the shard.
 */
export const SHARD_COUNT = 30;
export const FEEDS_PER_SHARD = 2;

export function shardIndex(part: string | null | undefined): number | null {
  if (!part || !/^\d+$/.test(part)) return null;
  const index = Number(part);
  return index >= 0 && index < SHARD_COUNT ? index : null;
}

export function feedsInShard(part: string): Feed[] {
  const index = shardIndex(part);
  if (index == null) return [];
  // Round-robin so a missing shard still leaves every section represented.
  return FEEDS.filter((_, feedIndex) => feedIndex % SHARD_COUNT === index);
}

export const FEEDS: Feed[] = [
  { id: 'rthk-hk', label: '香港電台', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_clocal.xml`, regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'rthk-en-hk', label: '港台英文', homepage: 'https://news.rthk.hk', url: `${rthk}/e_expressnews_elocal.xml`, regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'yahoo-hk', label: 'Yahoo 新聞', homepage: 'https://hk.news.yahoo.com', url: 'https://hk.news.yahoo.com/rss', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'now-hk', label: 'Now 新聞', homepage: 'https://news.now.com/home/local', url: 'https://newsapi1.now.com/pccw-news-api/api/getNewsList?category=119&pageNo=1&pageSize=30', regions: ['HKG'], terms: 'uncertain', category: 'hk', format: 'now' },
  { id: 'icable-hk', label: '有線新聞', homepage: 'https://www.i-cable.com', url: 'https://www.i-cable.com/category/%E6%96%B0%E8%81%9E%E8%B3%87%E8%A8%8A/%E6%B8%AF%E8%81%9E/feed/', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'stheadline-hk', label: '星島頭條', homepage: 'https://www.stheadline.com', url: 'https://www.stheadline.com/rss', regions: ['HKG'], terms: 'uncertain', category: 'hk', includePaths: ['/society/', '/breaking-news/', '/politics/'] },
  { id: 'news-gov-hk', label: '政府新聞網', homepage: 'https://www.news.gov.hk', url: 'https://www.news.gov.hk/tc/common/html/topstories.rss.xml', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'gia-hk', label: '新聞公報', homepage: 'https://www.info.gov.hk/gia/', url: 'https://www.info.gov.hk/gia/rss/general_zh.xml', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'hk01-hk', label: '香港01', homepage: 'https://www.hk01.com/zone/1', url: 'https://web-data.api.hk01.com/v2/feed/zone/1', regions: ['HKG'], terms: 'uncertain', category: 'hk', format: 'hk01' },
  { id: 'bastille-hk', label: '巴士的報', homepage: 'https://www.bastillepost.com/hongkong', url: 'https://www.bastillepost.com/hongkong/feed', regions: ['HKG'], terms: 'uncertain', category: 'hk', includeCategories: ['社會事'] },
  { id: 'skbuzz', label: 'SAI KUNG BUZZ', homepage: 'https://hongkongbuzz.hk', url: 'https://hongkongbuzz.hk/feed', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'rthk-china', label: '港台大中華', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_greaterchina.xml`, regions: ['HKG'], terms: 'uncertain', category: 'china' },
  { id: 'rthk-en-china', label: '港台英文大中華', homepage: 'https://news.rthk.hk', url: `${rthk}/e_expressnews_egreaterchina.xml`, regions: ['HKG'], terms: 'uncertain', category: 'china' },
  { id: 'icable-china', label: '有線中國', homepage: 'https://www.i-cable.com', url: 'https://www.i-cable.com/category/%E6%96%B0%E8%81%9E%E8%B3%87%E8%A8%8A/%E4%B8%AD%E5%9C%8B%E5%9C%A8%E7%B7%9A/feed/', regions: ['HKG'], terms: 'uncertain', category: 'china' },
  { id: 'stheadline-china', label: '星島中國', homepage: 'https://www.stheadline.com/realtime-china', url: 'https://www.stheadline.com/rss', regions: ['HKG'], terms: 'uncertain', category: 'china', includePaths: ['/realtime-china/', '/china-topics/', '/china-politics/', '/china/'] },
  { id: 'chinanews', label: '中新網', homepage: 'https://www.chinanews.com.cn', url: 'https://www.chinanews.com.cn/rss/china.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'sixthtone', label: 'Sixth Tone', homepage: 'https://www.sixthtone.com', url: 'https://api.sixthtone.com/cont/output/rssApi', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'hk01-china', label: '香港01中國', homepage: 'https://www.hk01.com/zone/5', url: 'https://web-data.api.hk01.com/v2/feed/zone/5', regions: ['HKG'], terms: 'uncertain', category: 'china', format: 'hk01' },
  { id: 'now-china', label: 'Now 兩岸', homepage: 'https://news.now.com', url: 'https://newsapi1.now.com/pccw-news-api/api/getNewsList?category=120&pageNo=1&pageSize=30', regions: ['HKG'], terms: 'uncertain', category: 'china', format: 'now' },
  { id: 'cgtn-china', label: 'CGTN中國', homepage: 'https://www.cgtn.com', url: 'https://www.cgtn.com/subscribe/rss/section/china.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'jiemian', label: '界面新聞', homepage: 'https://www.jiemian.com', url: 'https://a.jiemian.com/index.php?m=article&a=rss', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'people-politics', label: '人民網時政', homepage: 'https://www.people.com.cn', url: 'https://www.people.com.cn/rss/politics.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'xinhua-politics', label: '新華社時政', homepage: 'https://www.news.cn', url: 'https://www.news.cn/politics/news_politics.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'globaltimes', label: '環球時報', homepage: 'https://www.globaltimes.cn', url: 'https://www.globaltimes.cn/rss/outbrain.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'sina-china', label: '新浪大陸', homepage: 'https://news.sina.com.cn', url: 'https://rss.sina.com.cn/news/china/focus15.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'ecns', label: '中國新聞網英文', homepage: 'https://www.ecns.cn', url: 'https://www.ecns.cn/rss/rss.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'chinanews-scroll', label: '中新網滾動', homepage: 'https://www.chinanews.com.cn', url: 'https://www.chinanews.com.cn/rss/scroll-news.xml', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'people-world', label: '人民網國際', homepage: 'https://www.people.com.cn', url: 'https://www.people.com.cn/rss/world.xml', regions: ['ASI'], terms: 'uncertain', category: 'world' },
  { id: 'cgtn-world', label: 'CGTN國際', homepage: 'https://www.cgtn.com', url: 'https://www.cgtn.com/subscribe/rss/section/world.xml', regions: ['ASI'], terms: 'uncertain', category: 'world' },
  { id: 'nhk', label: 'NHK', homepage: 'https://www3.nhk.or.jp/nhkworld/', url: 'https://news.web.nhk/n-data/conf/na/rss/cat0.xml', regions: ['JPN'], terms: 'uncertain', category: 'asia' },
  { id: 'yonhap', label: 'Yonhap', homepage: 'https://en.yna.co.kr', url: 'https://en.yna.co.kr/RSS/news.xml', regions: ['KOR'], terms: 'uncertain', category: 'asia' },
  { id: 'bbc-asia', label: 'BBC 亞洲', homepage: 'https://www.bbc.com/news', url: `${bbc}/news/world/asia/rss.xml`, regions: ['ASI'], terms: 'uncertain', category: 'asia' },
  { id: 'rthk-world', label: '港台國際', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_cinternational.xml`, regions: ['HKG'], terms: 'uncertain', category: 'world' },
  { id: 'bbc-world', label: 'BBC News', homepage: 'https://www.bbc.com/news', url: `${bbc}/news/world/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'world' },
  { id: 'bbc-europe', label: 'BBC 歐洲', homepage: 'https://www.bbc.com/news', url: `${bbc}/news/world/europe/rss.xml`, regions: ['EUR'], terms: 'uncertain', category: 'world' },
  { id: 'guardian', label: 'The Guardian', homepage: 'https://www.theguardian.com/world', url: 'https://www.theguardian.com/world/rss', regions: ['EUR'], terms: 'uncertain', category: 'world' },
  { id: 'aljazeera', label: 'Al Jazeera', homepage: 'https://www.aljazeera.com', url: 'https://www.aljazeera.com/xml/rss/all.xml', regions: ['ME'], terms: 'uncertain', category: 'world' },
  { id: 'rthk-biz', label: '港台財經', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_cfinance.xml`, regions: ['HKG'], terms: 'uncertain', category: 'business' },
  { id: 'bbc-biz', label: 'BBC 財經', homepage: 'https://www.bbc.com/news/business', url: `${bbc}/news/business/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'business' },
  { id: 'guardian-biz', label: 'Guardian 財經', homepage: 'https://www.theguardian.com/business', url: 'https://www.theguardian.com/uk/business/rss', regions: ['EUR'], terms: 'uncertain', category: 'business' },
  { id: 'cnbc', label: 'CNBC', homepage: 'https://www.cnbc.com', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', regions: ['USA'], terms: 'uncertain', category: 'business' },
  { id: 'bbc-tech', label: 'BBC 科技', homepage: 'https://www.bbc.com/news/technology', url: `${bbc}/news/technology/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'tech' },
  { id: 'guardian-tech', label: 'Guardian 科技', homepage: 'https://www.theguardian.com/technology', url: 'https://www.theguardian.com/uk/technology/rss', regions: ['EUR'], terms: 'uncertain', category: 'tech' },
  { id: 'verge', label: 'The Verge', homepage: 'https://www.theverge.com', url: 'https://www.theverge.com/rss/index.xml', regions: ['USA'], terms: 'uncertain', category: 'tech' },
  { id: 'ars', label: 'Ars Technica', homepage: 'https://arstechnica.com', url: 'https://feeds.arstechnica.com/arstechnica/index', regions: ['USA'], terms: 'uncertain', category: 'tech' },
  { id: 'bbc-sci', label: 'BBC 科學', homepage: 'https://www.bbc.com/news/science_and_environment', url: `${bbc}/news/science_and_environment/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'science' },
  { id: 'guardian-sci', label: 'Guardian 科學', homepage: 'https://www.theguardian.com/science', url: 'https://www.theguardian.com/science/rss', regions: ['EUR'], terms: 'uncertain', category: 'science' },
  { id: 'nasa', label: 'NASA', homepage: 'https://www.nasa.gov', url: 'https://www.nasa.gov/feed/', regions: ['USA'], terms: 'public-domain', category: 'science' },
  { id: 'bbc-health', label: 'BBC 健康', homepage: 'https://www.bbc.com/news/health', url: `${bbc}/news/health/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'health' },
  { id: 'guardian-health', label: 'Guardian 健康', homepage: 'https://www.theguardian.com/society', url: 'https://www.theguardian.com/society/rss', regions: ['EUR'], terms: 'uncertain', category: 'health' },
  { id: 'npr-health', label: 'NPR 健康', homepage: 'https://www.npr.org/sections/health/', url: 'https://feeds.npr.org/1128/rss.xml', regions: ['USA'], terms: 'uncertain', category: 'health' },
  { id: 'rthk-sport', label: '港台體育', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_csport.xml`, regions: ['HKG'], terms: 'uncertain', category: 'sport' },
  { id: 'bbc-sport', label: 'BBC 體育', homepage: 'https://www.bbc.com/sport', url: `${bbc}/sport/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'sport' },
  { id: 'bbc-football', label: 'BBC 足球', homepage: 'https://www.bbc.com/sport/football', url: `${bbc}/sport/football/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'sport' },
  { id: 'guardian-sport', label: 'Guardian 體育', homepage: 'https://www.theguardian.com/sport', url: 'https://www.theguardian.com/uk/sport/rss', regions: ['EUR'], terms: 'uncertain', category: 'sport' },
  { id: 'sky-sport', label: 'Sky Sports', homepage: 'https://www.skysports.com', url: 'https://www.skysports.com/rss/12040', regions: ['EUR'], terms: 'uncertain', category: 'sport' },
  { id: 'bbc-ent', label: 'BBC 文娛', homepage: 'https://www.bbc.com/news/entertainment_and_arts', url: `${bbc}/news/entertainment_and_arts/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'entertainment' },
  { id: 'variety', label: 'Variety', homepage: 'https://variety.com', url: 'https://variety.com/feed/', regions: ['USA'], terms: 'uncertain', category: 'entertainment' },
  { id: 'deadline', label: 'Deadline', homepage: 'https://deadline.com', url: 'https://deadline.com/feed/', regions: ['USA'], terms: 'uncertain', category: 'entertainment' },
];

export function regionByCode(code: string): Region {
  return REGIONS.find((region) => region.code === code) ?? REGIONS[0];
}

export function sourcesForRegion(region: string): string[] {
  const labels = FEEDS.filter((feed) => region === 'ALL' || feed.regions.includes(region)).map(
    (feed) => feed.label,
  );
  return [...new Set(labels)];
}


/**
 * Outlets blocked from Hong Kong and mainland (china) desks for mainland compliance.
 * They are not fetched (removed from FEEDS), including 德國之聲 (`dw-zh`).
 * Cached headlines with these labels/hosts stay off hk/china category pages,
 * HKG focus, and HK/mainland briefings.
 * International-only English desks are unchanged unless listed here.
 */
const BLOCKED_HK_CHINA_LABELS = new Set([
  'RFI 中文',
  '美國之音',
  '自由亞洲',
  '紐約時報中文',
  'BBC 中文',
  '德國之聲',
  'FT中文',
  'Guardian 中國',
  'HKFP',
]);

const BLOCKED_HK_CHINA_HOST = /(?:^|\/\/)(?:www\.)?(?:rfi\.fr|voachinese\.com|voanews\.com|rfa\.org|nytimes\.com|cn\.nytimes\.com|bbc\.com\/zhongwen|feeds\.bbci\.co\.uk\/zhongwen|dw\.com\/zh|rss\.dw\.com|ftchinese\.com|hongkongfp\.com)(?=$|[/?#\s])/i;

/**
 * Taiwan coverage and sensitive political keywords — stripped from HK/mainland pipelines
 * (category hk/china, HKG focus, briefings, hk/china explainers). Not a legal opinion.
 */
const HK_CHINA_STORY_BLOCK_RE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|民進黨|國民黨(?!軍)|蔡英文|賴清德|馬英九|陳水扁|台獨|臺獨|台独|兩岸|两岸|兩岸關係|两岸关系|九二共識|九二共识|武統|護國神山|Free Tibet|西藏流亡|達賴|达赖|Dalai|法輪|法轮|Falun|六四|八九民運|天安門事件|天安门事件|Tiananmen|疆獨|疆独|藏獨|藏独|港獨|港独|自焚.*藏|新疆.*再教育|再教育營|集中營.*新疆|Xinjiang.*(camp|genocide)|活摘|正確記憶|支那/i;

export function blockedHkChinaOutlet(item: { source: string; sourceUrl?: string; link?: string }): boolean {
  if (BLOCKED_HK_CHINA_LABELS.has(item.source.trim())) return true;
  const href = `${item.sourceUrl ?? ''} ${item.link ?? ''}`;
  return BLOCKED_HK_CHINA_HOST.test(href);
}

export function blockedHkChinaStory(item: { title: string; excerpt?: string; source: string; sourceUrl?: string; link?: string }): boolean {
  if (blockedHkChinaOutlet(item)) return true;
  return HK_CHINA_STORY_BLOCK_RE.test(`${item.title}\n${item.excerpt || ''}`);
}

/**
 * Outlets taken off the Taiwan page. They are no longer fetched.
 * A cached headline from one of them stays off that page. Other headlines stay.
 * Hong Kong and mainland outlets are not in this set.
 */
const REMOVED_TAIWAN_SOURCES = new Set(['CNA', 'CNA 兩岸']);

export function removedFromTaiwanPage(item: { source: string; sourceUrl?: string; link?: string }): boolean {
  if (REMOVED_TAIWAN_SOURCES.has(item.source.trim())) return true;
  const href = `${item.sourceUrl ?? ''} ${item.link ?? ''}`;
  return /(?:^|\/\/)(?:www\.)?cna\.com\.tw(?=$|[/?#\s])/i.test(href);
}
