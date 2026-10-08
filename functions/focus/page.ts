import { loadHkNow } from '../../server/hkService.js';
import { loadHsiQuote } from '../../server/hsiService.js';
import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { removedFromTaiwanPage } from '../../shared/feeds.js';
import { focusKey, focusPages, parseFocus, renderWeekFocus, type FocusPage } from '../../shared/focus.js';
import { injectHomeShell, type HomeMarket } from '../../shared/homePage.js';
import { loadList } from '../board/list.js';
import { readBoard } from '../board/store.js';
import { readValue, type ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

function envSlot(env: Record<string, unknown>): string {
  for (const key of ['VITE_AD_SLOT_FEED', 'AD_SLOT_FEED', 'AD_SLOT_MID']) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
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
  try {
    const [list, hk, hsi, snapshot, saved] = await Promise.all([
      loadList(context),
      loadHkNow().catch(() => null),
      loadHsiQuote().catch(() => null),
      readBoard(env),
      readValue(env, focusKey(page)).catch(() => null),
    ]);
    items = page.scope === 'region' && page.id.toLowerCase() === 'twn'
      ? list.filter((item) => !removedFromTaiwanPage(item))
      : list;
    market = { hk, hsi };
    if (snapshot) {
      counts = new Map(Object.entries(snapshot.counts));
      major = snapshot.banner;
    }
    focusHtml = renderWeekFocus(parseFocus(saved)?.text ?? '');
  } catch {
    items = [];
  }
  const html = injectHomeShell(shell, items, counts, market, envSlot(context.env), major, focusHtml);
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
    },
  });
}
