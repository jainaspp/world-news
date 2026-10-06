import { EPD_AQHI, HKO_NOW, HKO_WARN, parseAqhi, parseHkoNow, parseHkoWarnings, type HkNow } from '../shared/hk.js';

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'world-news.xyz' } });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * HKO current weather + warnings and EPD AQHI.
 * Returns null when neither temperature nor AQHI arrived, so the strip can omit that side.
 */
export async function loadHkNow(): Promise<HkNow | null> {
  const [now, warn, aqhi] = await Promise.allSettled([
    fetchWithTimeout(HKO_NOW).then((response) => (response.ok ? response.json() : Promise.reject())),
    fetchWithTimeout(HKO_WARN).then((response) => (response.ok ? response.json() : Promise.reject())),
    fetchWithTimeout(EPD_AQHI).then((response) => (response.ok ? response.text() : Promise.reject())),
  ]);
  const body: HkNow = {
    ...parseHkoNow(now.status === 'fulfilled' ? now.value : null),
    warnings: warn.status === 'fulfilled' ? parseHkoWarnings(warn.value) : [],
    aqhi: aqhi.status === 'fulfilled' ? parseAqhi(aqhi.value) : null,
    source: '香港天文台、環境保護署',
  };
  if (body.temperature == null && !body.aqhi) return null;
  return body;
}
