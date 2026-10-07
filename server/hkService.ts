import {
  assembleHkNow,
  EPD_AQHI,
  HKO_FLW,
  HKO_FND,
  HKO_HOME,
  HKO_NOW,
  HKO_WARN,
  parseAqhi,
  parseHkoNow,
  parseHkoWarnings,
  type HkNow,
} from '../shared/hk.js';

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'world-news.xyz' } });
  } finally {
    clearTimeout(timer);
  }
}

/** Reject oversized bodies so a surprise payload cannot burn Worker CPU. */
async function fetchJson(url: string, max = 200_000, ms = 4000): Promise<unknown> {
  const response = await fetchWithTimeout(url, ms);
  if (!response.ok) throw new Error(String(response.status));
  const text = await response.text();
  if (text.length > max) throw new Error('large');
  return JSON.parse(text) as unknown;
}

async function fetchText(url: string, max = 200_000): Promise<string> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(String(response.status));
  const text = await response.text();
  if (text.length > max) throw new Error('large');
  return text;
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

/**
 * Headline weather plus forecast detail for `/api/hk`.
 * Parallel fetches, small JSON only. The homepage SSR path stays on `loadHkNow`.
 */
export async function loadHkBundle(): Promise<HkNow | null> {
  const [now, warn, aqhi, flw, fnd, home] = await Promise.allSettled([
    fetchJson(HKO_NOW),
    fetchJson(HKO_WARN),
    fetchText(EPD_AQHI),
    fetchJson(HKO_FLW),
    fetchJson(HKO_FND),
    fetchJson(HKO_HOME, 200_000, 6000),
  ]);
  return assembleHkNow({
    now: now.status === 'fulfilled' ? now.value : null,
    warn: warn.status === 'fulfilled' ? warn.value : null,
    aqhiXml: aqhi.status === 'fulfilled' ? aqhi.value : null,
    flw: flw.status === 'fulfilled' ? flw.value : null,
    fnd: fnd.status === 'fulfilled' ? fnd.value : null,
    home: home.status === 'fulfilled' ? home.value : null,
  });
}
