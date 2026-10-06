/** Hang Seng Index from Yahoo's public chart endpoint. No API key. */

export interface HsiQuote {
  price: number;
  change: number;
  changePercent: number;
  updated: string;
  currency: string;
  symbol: string;
}

export const HSI_CHART_URLS = [
  'https://query1.finance.yahoo.com/v8/finance/chart/%5EHSI?interval=1d&range=5d',
  'https://query2.finance.yahoo.com/v8/finance/chart/%5EHSI?interval=1d&range=5d',
];

export const HSI_QUOTE_URL = 'https://finance.yahoo.com/quote/%5EHSI/';

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Index points with thousands separators. Sign is included only when negative. */
export function formatIndex(value: number): string {
  const negative = value < -0.004;
  const [whole, frac] = Math.abs(value).toFixed(2).split('.');
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}.${frac}`;
}

export function formatSigned(value: number): string {
  if (value > 0.004) return `+${formatIndex(value)}`;
  return formatIndex(value);
}

/** Hong Kong quote boards use red for a rise and green for a fall. */
export function hsiDirection(change: number): 'up' | 'down' | 'flat' {
  if (change > 0.005) return 'up';
  if (change < -0.005) return 'down';
  return 'flat';
}

/**
 * Yahoo's `fulldayChange` matches the last completed daily close, which is not always
 * `chartPreviousClose` (that field jumps with the requested range). Prefer the candle
 * before the live price, then fall back to the meta change.
 */
export function parseYahooHsi(json: unknown): HsiQuote | null {
  const chart = (json && typeof json === 'object' ? json as { chart?: { result?: unknown[] | null } } : {}).chart;
  const result = chart?.result?.[0];
  if (!result || typeof result !== 'object') return null;
  const row = result as {
    meta?: Record<string, unknown>;
    indicators?: { quote?: Array<{ close?: unknown[] | null }> };
  };
  const meta = row.meta ?? {};
  const price = num(meta.regularMarketPrice);
  if (price == null || price <= 0) return null;

  const closes = (row.indicators?.quote?.[0]?.close ?? [])
    .map(num)
    .filter((value): value is number => value != null && value > 0);

  let change = num(meta.fulldayChange);
  let changePercent = num(meta.fulldayChangePercent);
  if (closes.length) {
    const last = closes[closes.length - 1]!;
    const prior = closes.length >= 2 ? closes[closes.length - 2]! : null;
    const previous = Math.abs(last - price) < 0.5 && prior != null ? prior : last;
    if (Math.abs(previous - price) > 0.0001) {
      change = price - previous;
      changePercent = (change / previous) * 100;
    }
  }
  if ((change == null || changePercent == null) && num(meta.chartPreviousClose)) {
    const previous = num(meta.chartPreviousClose)!;
    change = price - previous;
    changePercent = (change / previous) * 100;
  }
  if (change == null || changePercent == null || !Number.isFinite(change) || !Number.isFinite(changePercent)) return null;

  const seconds = num(meta.regularMarketTime);
  const updated = seconds != null ? new Date(seconds * 1000).toISOString() : '';
  const currency = typeof meta.currency === 'string' && meta.currency ? meta.currency : 'HKD';
  const symbol = typeof meta.symbol === 'string' && meta.symbol ? meta.symbol : '^HSI';
  return { price, change, changePercent, updated, currency, symbol };
}
