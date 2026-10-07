import { formatIndex, hsiDirection, parseYahooHsi, type HsiQuote } from './hsi.js';

export interface MarketSpec {
  id: 'usd' | 'cny' | 'gold' | 'oil';
  label: string;
  title: string;
  symbol: string;
  href: string;
  digits: number;
}

/** Keyless Yahoo chart symbols. Gold is the COMEX front contract (USD/oz); Brent is BZ=F. */
export const MARKET_SPECS: MarketSpec[] = [
  { id: 'usd', label: '美元', title: '美元/港元', symbol: 'USDHKD=X', href: 'https://finance.yahoo.com/quote/USDHKD=X/', digits: 2 },
  { id: 'cny', label: '人民幣', title: '人民幣/港元', symbol: 'CNYHKD=X', href: 'https://finance.yahoo.com/quote/CNYHKD=X/', digits: 2 },
  { id: 'gold', label: '金', title: '金價（美元/盎司）', symbol: 'GC=F', href: 'https://finance.yahoo.com/quote/GC=F/', digits: 0 },
  { id: 'oil', label: '油', title: '布倫特原油', symbol: 'BZ=F', href: 'https://finance.yahoo.com/quote/BZ=F/', digits: 2 },
];

export interface MarketTick {
  id: MarketSpec['id'];
  label: string;
  title: string;
  text: string;
  href: string;
  direction: 'up' | 'down' | 'flat';
}

export function yahooChartUrl(symbol: string, host: 'query1' | 'query2' = 'query1'): string {
  return `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
}

export function formatMarketPrice(price: number, digits: number): string {
  if (digits <= 0) {
    const negative = price < -0.5;
    const whole = Math.abs(price).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${negative ? '-' : ''}${whole}`;
  }
  return formatIndex(price);
}

export function tickFromQuote(spec: MarketSpec, quote: HsiQuote | null): MarketTick | null {
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) return null;
  return {
    id: spec.id,
    label: spec.label,
    title: spec.title,
    text: `${spec.label} ${formatMarketPrice(quote.price, spec.digits)}`,
    href: spec.href,
    direction: hsiDirection(quote.change),
  };
}

export function ticksFromQuotes(quotes: Array<HsiQuote | null>): MarketTick[] {
  return MARKET_SPECS.flatMap((spec, index) => {
    const tick = tickFromQuote(spec, quotes[index] ?? null);
    return tick ? [tick] : [];
  });
}

export { parseYahooHsi };
