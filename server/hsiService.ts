import { HSI_CHART_URLS, parseYahooHsi, type HsiQuote } from '../shared/hsi.js';

const HEADERS = {
  accept: 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

async function fetchChart(url: string): Promise<HsiQuote | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: HEADERS });
    if (!response.ok) return null;
    return parseYahooHsi(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Try the public Yahoo chart hosts. Returns null when every host fails. */
export async function loadHsiQuote(): Promise<HsiQuote | null> {
  for (const url of HSI_CHART_URLS) {
    const quote = await fetchChart(url);
    if (quote) return quote;
  }
  return null;
}
