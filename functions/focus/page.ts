import { loadHkNow } from '../../server/hkService.js';
import { loadHsiQuote } from '../../server/hsiService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { homeAllowsAds, type HomeAdView } from '../../shared/adPolicy.js';
import { filterNews } from '../../shared/filter.js';
import { focusKey, focusPages, parseFocus, renderWeekFocus, type FocusPage } from '../../shared/focus.js';
import { esc } from '../../shared/contentPage.js';
import { injectHomeShell, type HomeMarket } from '../../shared/homePage.js';
import { mustReadForSurface } from '../../shared/mustRead.js';
import { loadList } from '../board/list.js';
import { readBoard } from '../board/store.js';
import { loadMustRead } from '../content/mustRead.js';
import { readValue, type ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

function envSlot(env: Record<string, unknown>): string {
  for (const key of ['VITE_AD_SLOT_FEED', 'AD_SLOT_FEED', 'AD_SLOT_MID']) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** Same list the SPA shows for /region/:code and /category/:slug. */
export function focusFeedItems(items: Parameters<typeof filterNews>[0], page: FocusPage) {
  return page.scope === 'region'
    ? filterNews(items, { region: page.id.toUpperCase() })
    : filterNews(items, { category: page.id.toLowerCase() });
}

function focusAdView(page: FocusPage): HomeAdView {
  return page.scope === 'region'
    ? { region: page.id.toUpperCase(), category: 'all', source: '', q: '', time: 'all' }
    : { region: 'ALL', category: page.id.toLowerCase(), source: '', q: '', time: 'all' };
}

function retargetShell(html: string, path: string, title: string, noindex: boolean): string {
  let next = html.replace(
    '<link rel="canonical" href="https://world-news.xyz/" />',
    `<link rel="canonical" href="https://world-news.xyz${path}" />`,
  );
  next = next.replace(
    '<meta property="og:url" content="https://world-news.xyz/" />',
    `<meta property="og:url" content="https://world-news.xyz${path}" />`,
  );
  next = next.replace(
    '<link rel="alternate" hreflang="zh-HK" href="https://world-news.xyz/" />',
    `<link rel="alternate" hreflang="zh-HK" href="https://world-news.xyz${path}" />`,
  );
  next = next.replace(
    '<title>世界頭條 — 新聞標題、來源、原文連結</title>',
    `<title>${esc(title)} — 世界頭條</title>`,
  );
  if (noindex) {
    next = next.replace(
      '<meta name="robots" content="index, follow" />',
      '<meta name="robots" content="noindex, follow" />',
    );
  }
  return next;
}

/** Homepage shell for a region or category URL, with the stored weekly intro above the list. */
export async function serveFocusHome(context: PagesContext, page: FocusPage): Promise<Response> {
  if (!focusPages().some((row) => row.scope === page.scope && row.id === page.id)) return context.next();
  applyRuntimeEnv(context.env);
  const assets = context.env.ASSETS as { fetch(request: Request): Promise<Response> } | undefined;
  if (!assets) return context.next();
  const shellResponse = await assets.fetch(new Request(new URL('/index.html', context.request.url)));
  if (!shellResponse.ok) return context.next();
  const shell = await shellResponse.text();
  const env = context.env as ContentEnv;
  let items: Awaited<ReturnType<typeof loadList>> = [];
  let market: HomeMarket = { hk: null, hsi: null };
  let counts = new Map<string, number>();
  let major: Parameters<typeof injectHomeShell>[5] = null;
  let focusHtml = '';
  let mustRead: Awaited<ReturnType<typeof loadMustRead>> = [];
  try {
    const [list, hk, hsi, snapshot, saved, packs] = await Promise.all([
      loadList(context),
      loadHkNow().catch(() => null),
      loadHsiQuote().catch(() => null),
      readBoard(env),
      readValue(env, focusKey(page)).catch(() => null),
      loadMustRead(env).catch(() => []),
    ]);
    items = focusFeedItems(list, page);
    market = { hk, hsi };
    if (snapshot) {
      counts = new Map(Object.entries(snapshot.counts));
      major = snapshot.banner;
    }
    focusHtml = renderWeekFocus(parseFocus(saved)?.text ?? '');
    mustRead = packs;
  } catch {
    items = [];
  }
  const allowAds = homeAllowsAds(focusAdView(page));
  const known = focusPages().find((row) => row.scope === page.scope && row.id === page.id);
  const path = page.scope === 'region' ? `/region/${page.id}` : `/category/${page.id}`;
  const noindex = page.scope === 'region' && page.id === 'twn';
  const html = retargetShell(
    injectHomeShell(
      shell,
      items,
      counts,
      market,
      allowAds ? envSlot(context.env) : '',
      major,
      focusHtml,
      undefined,
      mustReadForSurface(mustRead, page.scope === 'category' ? page.id : ''),
      true,
    ),
    path,
    known?.label || page.label,
    noindex,
  );
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      ...(noindex ? { 'x-robots-tag': 'noindex, follow' } : {}),
    },
  });
}
