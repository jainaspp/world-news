/**
 * Manual AdSense units only on the unfiltered homepage and the original columns.
 * One feed unit per this many headlines is sparser than the 1-in-6 ceiling.
 */
export const FEED_AD_EVERY = 8;

export interface HomeAdView {
  region: string;
  category: string;
  source: string;
  q: string;
  time: string;
  bookmarks?: boolean;
  following?: boolean;
}

/** Search, region, category, source, time, bookmarks and follows are thin result lists. */
export function homeAllowsAds(view: HomeAdView): boolean {
  const time = view.time || 'all';
  return !view.q.trim()
    && view.region === 'ALL'
    && view.category === 'all'
    && !view.source.trim()
    && time === 'all'
    && !view.bookmarks
    && !view.following;
}
