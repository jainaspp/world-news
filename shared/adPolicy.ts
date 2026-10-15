/**
 * Manual AdSense units only on the unfiltered homepage and the original columns.
 * One feed unit per this many headlines is sparser than the 1-in-6 ceiling.
 */
export const FEED_AD_EVERY = 8;

/**
 * Review hold until AdSense re-approval. The next window opens 2026-10-22.
 * While this is true, no page emits an ad unit or the pagead loader, even if a slot id is set.
 * Auto ads, vignettes and anchor ads are AdSense console settings. This repository cannot turn
 * them off. Confirm they are disabled in the AdSense account before the next review.
 * After approval, a later change sets this to false. Only then may an indexable page with at
 * least 500 characters of story body emit a manual unit. Auto ads stay off in that first step.
 */
export const ADS_REVIEW_HOLD = true;

export function adsRuntimeEnabled(): boolean {
  return !ADS_REVIEW_HOLD;
}

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
