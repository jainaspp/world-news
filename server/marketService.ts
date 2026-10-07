import { MARKET_SPECS, tickFromQuote, yahooChartUrl, type MarketSpec, type MarketTick } from '../shared/markets.js';
import { parseYahooHsi } from '../shared/hsi.js';

const HEADERS = {
  accept: 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

async function fetchChart(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: HEADERS });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadSymbol(symbol: string) {
  for (const host of ['query1', 'query2'] as const) {
    const json = await fetchChart(yahooChartUrl(symbol, host));
    const quote = parseYahooHsi(json);
    if (quote) return quote;
  }
  return null;
}

/** USD/HKD, CNY/HKD, gold and Brent. A failed symbol is left out. */
export async function loadMarketTicks(): Promise<MarketTick[]> {
  const quotes = await Promise.all(MARKET_SPECS.map((spec) => loadSymbol(spec.symbol)));
  return MARKET_SPECS.flatMap((spec, index) => {
    const tick = tickFromQuote(spec, quotes[index] ?? null);
    return tick ? [tick] : [];
  });
}

export interface MarketQuote {
  id: MarketSpec['id'];
  price: number;
  updated: string;
}

/** Latest prices for the daily data pages. Only the requested symbols are fetched. */
export async function loadMarketQuotes(ids: Array<MarketSpec['id']>): Promise<MarketQuote[]> {
  const specs = MARKET_SPECS.filter((spec) => ids.includes(spec.id));
  const quotes = await Promise.all(specs.map((spec) => loadSymbol(spec.symbol)));
  return specs.flatMap((spec, index) => {
    const quote = quotes[index];
    if (!quote || !(quote.price > 0)) return [];
    return [{ id: spec.id, price: quote.price, updated: quote.updated }];
  });
}
