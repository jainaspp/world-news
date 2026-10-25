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
 * The homepage shell also drops inline Auto ads bootstraps (enable_page_level_ads, google_ad_client,
 * including vignette and anchor overlays). columns.js does not call adsbygoogle unless that loader
 * tag is already in the document, so explainer and civilization pages stay quiet during the hold.
 * Story, briefing, and explainer documents keep the pagead script off the LCP path. Explainer and
 * briefing pages reserve #ad-after-sources after the source list and, when a mid slot id is set,
 * one #ad-mid after the body. They never emit enable_page_level_ads, vignette, or anchor overlays.
 * When the hold is off, that script is inserted from requestIdleCallback after the first paint,
 * not from the document head.
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

/**
 * Search, region, category, source, bookmarks and follows are thin result lists.
 * Today is the only time preset and the homepage default, so it still counts as the unfiltered home.
 * Retired presets (all, hour, week) do not.
 */
export function homeAllowsAds(view: HomeAdView): boolean {
  const time = view.time || 'today';
  return !view.q.trim()
    && view.region === 'ALL'
    && view.category === 'all'
    && !view.source.trim()
    && time === 'today'
    && !view.bookmarks
    && !view.following;
}
