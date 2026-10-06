export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceUrl: string;
  regions: string[];
  pubDate: string;
  image?: string;
  category?: string;
  /** Short plain-text RSS blurb for AI drafts. Not shown on story cards. */
  excerpt?: string;
  /** Set by an upstream feed when the desk has marked the headline as breaking. */
  breaking?: boolean;
}

export type TimeRange = 'all' | 'hour' | 'today' | 'week';

export interface FeedErrorSource {
  source: string;
  reason: string;
}

export interface NewsPayload {
  items: NewsItem[];
  fetchedAt: string;
  source: 'rss' | 'cache';
  feedErrors: number;
  /** Present when a feed returned nothing. Short reason, safe to show after deploy. */
  feedErrorSources?: FeedErrorSource[];
  stale: boolean;
  error?: string;
}
