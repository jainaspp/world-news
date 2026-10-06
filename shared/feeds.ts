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

export const FEEDS: Feed[] = [
  {
    id: 'un',
    label: 'UN News',
    homepage: 'https://news.un.org',
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    regions: ['INT'],
    terms: 'un-reuse',
    category: 'world',
  },
  {
    id: 'nasa',
    label: 'NASA',
    homepage: 'https://www.nasa.gov',
    url: 'https://www.nasa.gov/feed/',
    regions: ['USA'],
    terms: 'public-domain',
    category: 'health',
  },
  {
    id: 'rthk-en',
    label: 'RTHK',
    homepage: 'https://news.rthk.hk',
    url: 'https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_elocal.xml',
    regions: ['HKG'],
    terms: 'uncertain',
    category: 'hk',
  },
  {
    id: 'rthk-zh',
    label: 'RTHK',
    homepage: 'https://news.rthk.hk',
    url: 'https://rthk9.rthk.hk/rthk/news/rss/c_expressnews_clocal.xml',
    regions: ['HKG'],
    terms: 'uncertain',
    category: 'hk',
  },
  {
    id: 'cna',
    label: 'CNA',
    homepage: 'https://www.cna.com.tw',
    url: 'https://feeds.feedburner.com/rsscna/intworld',
    regions: ['TWN'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'nhk',
    label: 'NHK',
    homepage: 'https://www3.nhk.or.jp/nhkworld/',
    url: 'https://www.nhk.or.jp/rss/news/cat0.xml',
    regions: ['JPN'],
    terms: 'uncertain',
    category: 'asia',
  },
  {
    id: 'yonhap',
    label: 'Yonhap',
    homepage: 'https://en.yna.co.kr',
    url: 'https://en.yna.co.kr/RSS/news.xml',
    regions: ['KOR'],
    terms: 'uncertain',
    category: 'asia',
  },
  {
    id: 'bbc-asia',
    label: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
    regions: ['ASI'],
    terms: 'uncertain',
    category: 'asia',
  },
  {
    id: 'bbc-world',
    label: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    regions: ['INT'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'bbc-europe',
    label: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
    regions: ['EUR'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'npr',
    label: 'NPR',
    homepage: 'https://www.npr.org',
    url: 'https://feeds.npr.org/1004/rss.xml',
    regions: ['USA'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'guardian',
    label: 'The Guardian',
    homepage: 'https://www.theguardian.com/world',
    url: 'https://www.theguardian.com/world/rss',
    regions: ['EUR'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'france24',
    label: 'France 24',
    homepage: 'https://www.france24.com/en/',
    url: 'https://www.france24.com/en/rss',
    regions: ['EUR'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'dw',
    label: 'DW',
    homepage: 'https://www.dw.com',
    url: 'https://rss.dw.com/rdf/rss-en-world',
    regions: ['EUR'],
    terms: 'uncertain',
    category: 'world',
  },
  {
    id: 'aljazeera',
    label: 'Al Jazeera',
    homepage: 'https://www.aljazeera.com',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    regions: ['ME'],
    terms: 'uncertain',
    category: 'world',
  },
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
