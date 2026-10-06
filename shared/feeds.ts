/**
 * Public RSS feeds only. No API keys.
 * Cards show the headline, the source name, and a link — not the article body.
 * `terms` is a reminder for the maintainer, not a legal opinion.
 * See LEGAL.md.
 */
export type TermsStatus = 'public-domain' | 'un-reuse' | 'uncertain';

export interface Feed {
  id: string;
  label: string;
  homepage: string;
  url: string;
  regions: string[];
  terms: TermsStatus;
}

export interface Region {
  code: string;
  label: string;
}

export const REGIONS: Region[] = [
  { code: 'ALL', label: '全球' },
  { code: 'HKG', label: '香港' },
  { code: 'TWN', label: '台灣' },
  { code: 'JPN', label: '日本' },
  { code: 'KOR', label: '韓國' },
  { code: 'ASI', label: '亞洲' },
  { code: 'EUR', label: '歐洲' },
  { code: 'USA', label: '美國' },
  { code: 'ME', label: '中東' },
  { code: 'INT', label: '國際' },
];

export const FEEDS: Feed[] = [
  {
    id: 'un',
    label: 'UN News',
    homepage: 'https://news.un.org',
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    regions: ['INT'],
    terms: 'un-reuse',
  },
  {
    id: 'nasa',
    label: 'NASA',
    homepage: 'https://www.nasa.gov',
    url: 'https://www.nasa.gov/feed/',
    regions: ['USA'],
    terms: 'public-domain',
  },
  {
    id: 'rthk-en',
    label: 'RTHK',
    homepage: 'https://news.rthk.hk',
    url: 'https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_elocal.xml',
    regions: ['HKG'],
    terms: 'uncertain',
  },
  {
    id: 'rthk-zh',
    label: 'RTHK',
    homepage: 'https://news.rthk.hk',
    url: 'https://rthk9.rthk.hk/rthk/news/rss/c_expressnews_clocal.xml',
    regions: ['HKG'],
    terms: 'uncertain',
  },
  {
    id: 'cna',
    label: 'CNA',
    homepage: 'https://www.cna.com.tw',
    url: 'https://feeds.feedburner.com/rsscna/intworld',
    regions: ['TWN'],
    terms: 'uncertain',
  },
  {
    id: 'nhk',
    label: 'NHK',
    homepage: 'https://www3.nhk.or.jp/nhkworld/',
    url: 'https://www.nhk.or.jp/rss/news/cat0.xml',
    regions: ['JPN'],
    terms: 'uncertain',
  },
  {
    id: 'yonhap',
    label: 'Yonhap',
    homepage: 'https://en.yna.co.kr',
    url: 'https://en.yna.co.kr/RSS/news.xml',
    regions: ['KOR'],
    terms: 'uncertain',
  },
  {
    id: 'bbc-asia',
    label: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
    regions: ['ASI'],
    terms: 'uncertain',
  },
  {
    id: 'bbc-world',
    label: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    regions: ['INT'],
    terms: 'uncertain',
  },
  {
    id: 'bbc-europe',
    label: 'BBC News',
    homepage: 'https://www.bbc.com/news',
    url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
    regions: ['EUR'],
    terms: 'uncertain',
  },
  {
    id: 'npr',
    label: 'NPR',
    homepage: 'https://www.npr.org',
    url: 'https://feeds.npr.org/1004/rss.xml',
    regions: ['USA'],
    terms: 'uncertain',
  },
  {
    id: 'guardian',
    label: 'The Guardian',
    homepage: 'https://www.theguardian.com/world',
    url: 'https://www.theguardian.com/world/rss',
    regions: ['EUR'],
    terms: 'uncertain',
  },
  {
    id: 'france24',
    label: 'France 24',
    homepage: 'https://www.france24.com/en/',
    url: 'https://www.france24.com/en/rss',
    regions: ['EUR'],
    terms: 'uncertain',
  },
  {
    id: 'dw',
    label: 'DW',
    homepage: 'https://www.dw.com',
    url: 'https://rss.dw.com/rdf/rss-en-world',
    regions: ['EUR'],
    terms: 'uncertain',
  },
  {
    id: 'aljazeera',
    label: 'Al Jazeera',
    homepage: 'https://www.aljazeera.com',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    regions: ['ME'],
    terms: 'uncertain',
  },
];

export function sourcesForRegion(region: string): string[] {
  const labels = FEEDS.filter((feed) => region === 'ALL' || feed.regions.includes(region)).map(
    (feed) => feed.label,
  );
  return [...new Set(labels)];
}
