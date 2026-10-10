/** Local escape so this module does not import contentPage (avoids a cycle). */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * In-flow manual slot. Empty units keep the grey placeholder and do not collapse.
 * `position` is for column pages (top / mid / bottom); homepage omits it.
 */
export function adSlotMarkup(
  variant: 'feed' | 'sidebar' | 'banner',
  slot = '',
  client = 'ca-pub-8392975944327076',
  position?: string,
): string {
  const kind = variant === 'sidebar' ? 'ad-slot-sidebar' : variant === 'banner' ? 'ad-slot-banner' : 'ad-slot-feed';
  const id = slot.trim();
  const format =
    variant === 'feed'
      ? 'data-ad-format="fluid" data-ad-layout="in-article" style="display:block;text-align:center"'
      : variant === 'sidebar'
        ? 'data-ad-format="auto"'
        : 'data-ad-format="auto" data-full-width-responsive="true" style="display:block"';
  const ins = /^\d{6,}$/.test(id)
    ? `<ins class="adsbygoogle" data-ad-client="${esc(client)}" data-ad-slot="${esc(id)}" ${format}></ins>`
    : '';
  const pos = position ? ` data-ad-position="${esc(position)}"` : '';
  return `<div class="ad-slot ${kind}"${pos} aria-label="廣告"><span class="ad-label">廣告</span><p class="ad-placeholder">支持世界頭條</p>${ins}</div>`;
}
