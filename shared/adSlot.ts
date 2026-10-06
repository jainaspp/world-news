import { esc } from './contentPage.js';

/** In-flow manual slot. Empty units keep the grey placeholder and do not collapse. */
export function adSlotMarkup(variant: 'feed' | 'sidebar', slot = '', client = 'ca-pub-8392975944327076'): string {
  const kind = variant === 'sidebar' ? 'ad-slot-sidebar' : 'ad-slot-feed';
  const id = slot.trim();
  const ins = /^\d{6,}$/.test(id)
    ? `<ins class="adsbygoogle" data-ad-client="${esc(client)}" data-ad-slot="${esc(id)}" ${variant === 'feed' ? 'data-ad-format="fluid" data-ad-layout="in-article"' : 'data-ad-format="auto"'}></ins>`
    : '';
  return `<div class="ad-slot ${kind}" aria-label="廣告"><span class="ad-label">廣告</span><p class="ad-placeholder">支持世界頭條</p>${ins}</div>`;
}
