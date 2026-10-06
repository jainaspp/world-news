export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceUrl: string;
  regions: string[];
  pubDate: string;
}

export type TimeRange = 'all' | 'hour' | 'today' | 'week';

export interface NewsPayload {
  items: NewsItem[];
  fetchedAt: string;
  source: 'rss' | 'cache';
  feedErrors: number;
  stale: boolean;
  error?: string;
}
