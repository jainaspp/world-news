import { adsRuntimeEnabled } from './adPolicy.js';

/** Local escape so this module does not import contentPage (avoids a cycle). */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SLOT_ID = /^\d{6,}$/;

/** AdSense ad-unit ids are numeric. Anything else, including an empty env var, is not a slot. */
export function validAdSlot(slot: string | undefined | null): string {
  const id = (slot ?? '').trim();
  return SLOT_ID.test(id) ? id : '';
}

export function hasManualSlots(slots: Array<string | undefined | null>): boolean {
  return slots.some((slot) => validAdSlot(slot) !== '');
}

/**
 * Manual unit. An empty or non-numeric slot returns nothing: no grey box, no「支持世界頭條」.
 * Callers also skip this unless the page itself is allowed to carry ads.
 */
export function adSlotMarkup(
  variant: 'feed' | 'sidebar' | 'banner',
  slot = '',
  client = 'ca-pub-8392975944327076',
  position?: string,
): string {
  const id = validAdSlot(slot);
  if (!adsRuntimeEnabled() || !id) return '';
  const kind = variant === 'sidebar' ? 'ad-slot-sidebar' : variant === 'banner' ? 'ad-slot-banner' : 'ad-slot-feed';
  const format =
    variant === 'feed'
      ? 'data-ad-format="fluid" data-ad-layout="in-article" style="display:block;text-align:center"'
      : variant === 'sidebar'
        ? 'data-ad-format="auto"'
        : 'data-ad-format="auto" data-full-width-responsive="true" style="display:block"';
  const pos = position ? ` data-ad-position="${esc(position)}"` : '';
  const ins = `<ins class="adsbygoogle" data-ad-client="${esc(client)}" data-ad-slot="${esc(id)}" ${format}></ins>`;
  return `<div class="ad-slot ${kind}"${pos} aria-label="廣告"><span class="ad-label">廣告</span>${ins}</div>`;
}
