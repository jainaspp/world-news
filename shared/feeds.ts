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

function googleTopic(topic: string): string {
  return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=zh-HK&gl=HK&ceid=HK:zh-Hant`;
}

export const FEEDS: Feed[] = [
  { id: 'rthk-hk', label: '香港電台', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_clocal.xml`, regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'hkfp', label: 'HKFP', homepage: 'https://hongkongfp.com', url: 'https://hongkongfp.com/feed/', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'scmp-hk', label: 'SCMP', homepage: 'https://www.scmp.com', url: 'https://www.scmp.com/rss/2/feed', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'yahoo-hk', label: 'Yahoo 新聞', homepage: 'https://hk.news.yahoo.com', url: 'https://hk.news.yahoo.com/rss', regions: ['HKG'], terms: 'uncertain', category: 'hk' },
  { id: 'rthk-china', label: '港台大中華', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_greaterchina.xml`, regions: ['HKG'], terms: 'uncertain', category: 'china' },
  { id: 'bbc-zh', label: 'BBC 中文', homepage: 'https://www.bbc.com/zhongwen/trad', url: `${bbc}/zhongwen/trad/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'china' },
  { id: 'g-china', label: 'Google 中國', homepage: 'https://news.google.com', url: 'https://news.google.com/rss/search?q=%E4%B8%AD%E5%9C%8B+when:2d&hl=zh-HK&gl=HK&ceid=HK:zh-Hant', regions: ['ASI'], terms: 'uncertain', category: 'china' },
  { id: 'cna', label: 'CNA', homepage: 'https://www.cna.com.tw', url: 'https://feeds.feedburner.com/rsscna/intworld', regions: ['TWN'], terms: 'uncertain', category: 'asia' },
  { id: 'nhk', label: 'NHK', homepage: 'https://www3.nhk.or.jp/nhkworld/', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', regions: ['JPN'], terms: 'uncertain', category: 'asia' },
  { id: 'yonhap', label: 'Yonhap', homepage: 'https://en.yna.co.kr', url: 'https://en.yna.co.kr/RSS/news.xml', regions: ['KOR'], terms: 'uncertain', category: 'asia' },
  { id: 'bbc-asia', label: 'BBC 亞洲', homepage: 'https://www.bbc.com/news', url: `${bbc}/news/world/asia/rss.xml`, regions: ['ASI'], terms: 'uncertain', category: 'asia' },
  { id: 'rthk-world', label: '港台國際', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_cinternational.xml`, regions: ['HKG'], terms: 'uncertain', category: 'world' },
  { id: 'dw-zh', label: '德國之聲', homepage: 'https://www.dw.com/zh', url: 'https://rss.dw.com/xml/rss-chi-all', regions: ['EUR'], terms: 'uncertain', category: 'world' },
  { id: 'rfi-zh', label: 'RFI 中文', homepage: 'https://www.rfi.fr/cn/', url: 'https://www.rfi.fr/cn/rss', regions: ['EUR'], terms: 'uncertain', category: 'world' },
  { id: 'bbc-world', label: 'BBC News', homepage: 'https://www.bbc.com/news', url: `${bbc}/news/world/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'world' },
  { id: 'bbc-europe', label: 'BBC 歐洲', homepage: 'https://www.bbc.com/news', url: `${bbc}/news/world/europe/rss.xml`, regions: ['EUR'], terms: 'uncertain', category: 'world' },
  { id: 'guardian', label: 'The Guardian', homepage: 'https://www.theguardian.com/world', url: 'https://www.theguardian.com/world/rss', regions: ['EUR'], terms: 'uncertain', category: 'world' },
  { id: 'aljazeera', label: 'Al Jazeera', homepage: 'https://www.aljazeera.com', url: 'https://www.aljazeera.com/xml/rss/all.xml', regions: ['ME'], terms: 'uncertain', category: 'world' },
  { id: 'g-world', label: 'Google 國際', homepage: 'https://news.google.com', url: googleTopic('WORLD'), regions: ['INT'], terms: 'uncertain', category: 'world' },
  { id: 'rthk-biz', label: '港台財經', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_cfinance.xml`, regions: ['HKG'], terms: 'uncertain', category: 'business' },
  { id: 'bbc-biz', label: 'BBC 財經', homepage: 'https://www.bbc.com/news/business', url: `${bbc}/news/business/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'business' },
  { id: 'guardian-biz', label: 'Guardian 財經', homepage: 'https://www.theguardian.com/business', url: 'https://www.theguardian.com/business/rss', regions: ['EUR'], terms: 'uncertain', category: 'business' },
  { id: 'cnbc', label: 'CNBC', homepage: 'https://www.cnbc.com', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', regions: ['USA'], terms: 'uncertain', category: 'business' },
  { id: 'g-biz', label: 'Google 財經', homepage: 'https://news.google.com', url: googleTopic('BUSINESS'), regions: ['INT'], terms: 'uncertain', category: 'business' },
  { id: 'bbc-tech', label: 'BBC 科技', homepage: 'https://www.bbc.com/news/technology', url: `${bbc}/news/technology/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'tech' },
  { id: 'guardian-tech', label: 'Guardian 科技', homepage: 'https://www.theguardian.com/technology', url: 'https://www.theguardian.com/technology/rss', regions: ['EUR'], terms: 'uncertain', category: 'tech' },
  { id: 'verge', label: 'The Verge', homepage: 'https://www.theverge.com', url: 'https://www.theverge.com/rss/index.xml', regions: ['USA'], terms: 'uncertain', category: 'tech' },
  { id: 'ars', label: 'Ars Technica', homepage: 'https://arstechnica.com', url: 'https://feeds.arstechnica.com/arstechnica/index', regions: ['USA'], terms: 'uncertain', category: 'tech' },
  { id: 'g-tech', label: 'Google 科技', homepage: 'https://news.google.com', url: googleTopic('TECHNOLOGY'), regions: ['INT'], terms: 'uncertain', category: 'tech' },
  { id: 'bbc-sci', label: 'BBC 科學', homepage: 'https://www.bbc.com/news/science_and_environment', url: `${bbc}/news/science_and_environment/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'science' },
  { id: 'guardian-sci', label: 'Guardian 科學', homepage: 'https://www.theguardian.com/science', url: 'https://www.theguardian.com/science/rss', regions: ['EUR'], terms: 'uncertain', category: 'science' },
  { id: 'nasa', label: 'NASA', homepage: 'https://www.nasa.gov', url: 'https://www.nasa.gov/feed/', regions: ['USA'], terms: 'public-domain', category: 'science' },
  { id: 'g-sci', label: 'Google 科學', homepage: 'https://news.google.com', url: googleTopic('SCIENCE'), regions: ['INT'], terms: 'uncertain', category: 'science' },
  { id: 'bbc-health', label: 'BBC 健康', homepage: 'https://www.bbc.com/news/health', url: `${bbc}/news/health/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'health' },
  { id: 'guardian-health', label: 'Guardian 健康', homepage: 'https://www.theguardian.com/society', url: 'https://www.theguardian.com/society/rss', regions: ['EUR'], terms: 'uncertain', category: 'health' },
  { id: 'g-health', label: 'Google 健康', homepage: 'https://news.google.com', url: googleTopic('HEALTH'), regions: ['INT'], terms: 'uncertain', category: 'health' },
  { id: 'rthk-sport', label: '港台體育', homepage: 'https://news.rthk.hk', url: `${rthk}/c_expressnews_csport.xml`, regions: ['HKG'], terms: 'uncertain', category: 'sport' },
  { id: 'bbc-sport', label: 'BBC 體育', homepage: 'https://www.bbc.com/sport', url: `${bbc}/sport/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'sport' },
  { id: 'guardian-sport', label: 'Guardian 體育', homepage: 'https://www.theguardian.com/sport', url: 'https://www.theguardian.com/sport/rss', regions: ['EUR'], terms: 'uncertain', category: 'sport' },
  { id: 'g-sport', label: 'Google 體育', homepage: 'https://news.google.com', url: googleTopic('SPORTS'), regions: ['INT'], terms: 'uncertain', category: 'sport' },
  { id: 'bbc-ent', label: 'BBC 文娛', homepage: 'https://www.bbc.com/news/entertainment_and_arts', url: `${bbc}/news/entertainment_and_arts/rss.xml`, regions: ['INT'], terms: 'uncertain', category: 'entertainment' },
  { id: 'variety', label: 'Variety', homepage: 'https://variety.com', url: 'https://variety.com/feed/', regions: ['USA'], terms: 'uncertain', category: 'entertainment' },
  { id: 'g-ent', label: 'Google 娛樂', homepage: 'https://news.google.com', url: googleTopic('ENTERTAINMENT'), regions: ['INT'], terms: 'uncertain', category: 'entertainment' },
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
