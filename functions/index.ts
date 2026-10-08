import { loadHkNow } from '../server/hkService.js';
import { loadHsiQuote } from '../server/hsiService.js';
import { applyRuntimeEnv } from '../server/runtimeEnv.js';
import { injectHomeShell, type HomeMarket } from '../shared/homePage.js';
import { latestBriefingLinks } from '../shared/writers.js';
import { loadList } from './board/list.js';
import { readBoard, scheduleBoard } from './board/store.js';
import { readIndex, type ContentEnv } from './content/store.js';
import { edgeCache, type PagesContext } from './env.js';

const CACHE_KEY = new Request('https://world-news.xyz/ssr-home-v6');
const FRESH_S = 120;

function envSlot(env: Record<string, unknown>): string {
  for (const key of ['VITE_AD_SLOT_FEED', 'AD_SLOT_FEED', 'AD_SLOT_MID']) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/**
 * Server-render the homepage feed into the Vite shell so mobile LCP does not wait on
 * React hydration + /api/news. SPA behaviour takes over after load via #wn-bootstrap.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const assets = context.env.ASSETS as { fetch(request: Request): Promise<Response> } | undefined;
  if (!assets) return context.next();

  const shellResponse = await assets.fetch(new Request(new URL('/index.html', context.request.url)));
  if (!shellResponse.ok) return context.next();
  const shell = await shellResponse.text();

  const cache = edgeCache();
  if (cache) {
    try {
      const hit = await cache.match(CACHE_KEY);
      if (hit) {
        const age = (Date.now() - Number(hit.headers.get('x-cached-at') || '0')) / 1000;
        if (age < FRESH_S) return hit;
      }
    } catch {
      /* read-through */
    }
  }

  let items: Awaited<ReturnType<typeof loadList>> = [];
  let market: HomeMarket = { hk: null, hsi: null };
  let counts = new Map<string, number>();
  let major: Parameters<typeof injectHomeShell>[5] = null;
  try {
    const [list, hk, hsi, snapshot] = await Promise.all([
      loadList(context),
      loadHkNow().catch(() => null),
      loadHsiQuote().catch(() => null),
      readBoard(context.env as ContentEnv),
    ]);
    items = list;
    market = { hk, hsi };
    if (snapshot) {
      counts = new Map(Object.entries(snapshot.counts));
      major = snapshot.banner;
    } else {
      scheduleBoard(context);
    }
  } catch {
    items = [];
  }
  let briefings: { href: string; label: string }[] | undefined;
  try {
    briefings = latestBriefingLinks(await readIndex(context.env as ContentEnv, 'briefing'));
  } catch {
    briefings = undefined;
  }
  const html = injectHomeShell(shell, items, counts, market, envSlot(context.env), major, '', briefings);
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
    'x-cached-at': String(Date.now()),
  });
  const response = new Response(html, { status: 200, headers });
  if (cache && items.length) {
    context.waitUntil(cache.put(CACHE_KEY, response.clone()).catch(() => undefined));
  }
  return response;
}
