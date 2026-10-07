import { esc } from './contentPage.js';
import type { HkNow } from './hk.js';
import { formatIndex, formatSigned, hsiDirection, HSI_QUOTE_URL, type HsiQuote } from './hsi.js';
import type { MarketTick } from './markets.js';

export interface HkInfoParts {
  weather: string;
  hsi: string;
  direction: 'up' | 'down' | 'flat' | null;
}

const HKO_URL = 'https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm';

/** One line: `24°C · AQHI 4` and/or `恒生 24,280.56  +1.00%`. Empty when both sides are missing. */
export function hkInfoParts(hk: HkNow | null | undefined, quote: HsiQuote | null | undefined): HkInfoParts | null {
  const weatherBits: string[] = [];
  if (hk && typeof hk.temperature === 'number') weatherBits.push(`${hk.temperature}°C`);
  if (hk?.aqhi && Number.isFinite(hk.aqhi.value)) weatherBits.push(`AQHI ${Math.floor(hk.aqhi.value)}`);
  const weather = weatherBits.join(' · ');
  const hsi = quote && Number.isFinite(quote.price) && Number.isFinite(quote.changePercent)
    ? `恒生 ${formatIndex(quote.price)}  ${formatSigned(quote.changePercent)}%`
    : '';
  if (!weather && !hsi) return null;
  return {
    weather,
    hsi,
    direction: quote && hsi ? hsiDirection(quote.change) : null,
  };
}

export function renderHkInfo(hk: HkNow | null | undefined, quote: HsiQuote | null | undefined, ticks: MarketTick[] = []): string {
  const parts = hkInfoParts(hk, quote);
  const bits: string[] = [];
  if (parts?.weather) {
    bits.push(`<a class="hk-info-wx" href="${HKO_URL}" target="_blank" rel="noopener noreferrer">${esc(parts.weather)}</a>`);
  }
  if (parts?.hsi) {
    bits.push(`<a class="hk-info-hsi hsi-${parts.direction}" href="${HSI_QUOTE_URL}" target="_blank" rel="noopener noreferrer">${esc(parts.hsi)}</a>`);
  }
  for (const tick of ticks) {
    bits.push(`<a class="hk-info-tick hsi-${tick.direction}" href="${esc(tick.href)}" title="${esc(tick.title)}" target="_blank" rel="noopener noreferrer">${esc(tick.text)}</a>`);
  }
  if (!bits.length) return '';
  const sep = '<span class="hk-info-sep" aria-hidden="true">|</span>';
  return `<section class="hk-info" aria-label="香港天氣同恒生指數">${bits.join(sep)}</section>`;
}
