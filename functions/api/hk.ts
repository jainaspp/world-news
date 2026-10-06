import { EPD_AQHI, HKO_NOW, HKO_WARN, parseAqhi, parseHkoNow, parseHkoWarnings, type HkNow } from '../../shared/hk.js';
import { edgeCache, type PagesContext } from '../env.js';

const TTL = 600;

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'world-news.xyz' } });
  } finally {
    clearTimeout(timer);
  }
}

/** /api/hk: HKO current weather + warnings and EPD AQHI, cached at the edge for 10 minutes. */
export async function onRequest(context: PagesContext): Promise<Response> {
  const cache = edgeCache();
  const key = new Request('https://world-news.xyz/api/hk-cache-v1');
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined;
  if (hit) return hit;
  const [now, warn, aqhi] = await Promise.allSettled([
    fetchWithTimeout(HKO_NOW).then((r) => r.json()),
    fetchWithTimeout(HKO_WARN).then((r) => r.json()),
    fetchWithTimeout(EPD_AQHI).then((r) => r.text()),
  ]);
  const body: HkNow = {
    ...parseHkoNow(now.status === 'fulfilled' ? now.value : null),
    warnings: warn.status === 'fulfilled' ? parseHkoWarnings(warn.value) : [],
    aqhi: aqhi.status === 'fulfilled' ? parseAqhi(aqhi.value) : null,
    source: '香港天文台、環境保護署',
  };
  const ok = now.status === 'fulfilled';
  const response = Response.json(body, {
    headers: { 'cache-control': `public, max-age=${ok ? 300 : 30}, s-maxage=${ok ? TTL : 30}` },
  });
  if (cache && ok) context.waitUntil(cache.put(key, response.clone()).catch(() => undefined));
  return response;
}
