import { edgeCache, type PagesContext } from './env.js';
import {
  cacheKeyFor,
  cacheUrl,
  CDN_CACHE_HEADER,
  conditionalResponse,
  directiveValue,
  isRevalidation,
  prepareCachedResponse,
  PRODUCTION_HOST,
  REFRESH_HEADER,
  serveCached,
  sharedKind,
} from './httpCache.js';

/** The production pages.dev alias. Branch previews are <branch>.world-news-b5e.pages.dev and are not redirected. */
const PRODUCTION_PAGES_DEV = 'world-news-b5e.pages.dev';
const APEX_HOST = 'world-news.xyz';
const WWW_HOST = 'www.world-news.xyz';

/**
 * Hard-404 directory URLs. The homepage is the live hub.
 * /story/:id stays on its route, including the noindex 已下架 page.
 * The same paths are in public/_redirects for static fallthrough.
 */
export const BARE_HUB_REDIRECTS = ['/focus', '/focus/', '/board', '/board/', '/story', '/story/'];

export function shouldRedirect(hostname: string, pathname: string, setting: unknown): boolean {
  if (setting === 'false') return false;
  if (pathname.startsWith('/api/')) return false; // the warm workflow may POST to pages.dev
  if (hostname === PRODUCTION_PAGES_DEV) return true;
  // REDIRECT_PAGES_DEV=true also covers any other *.pages.dev host (old behaviour).
  return setting === 'true' && (hostname === 'pages.dev' || hostname.endsWith('.pages.dev'));
}

/** 301 target for www → apex (path and query kept) and for bare hubs on either host. */
export function apexRedirect(hostname: string, pathname: string, search: string): string | null {
  const host = hostname.toLowerCase();
  const www = host === WWW_HOST;
  const apex = host === APEX_HOST;
  if (!www && !apex) return null;
  const bare = BARE_HUB_REDIRECTS.includes(pathname);
  if (!www && !bare) return null;
  const path = bare ? '/' : pathname;
  return `https://${APEX_HOST}${path}${search}`;
}

async function refreshShared(url: URL): Promise<void> {
  const headers = new Headers();
  headers.set(REFRESH_HEADER, '1');
  try {
    // cache: no-store so this subrequest is not answered by the zone cache it is trying to fill.
    await fetch(cacheUrl(url), { method: 'GET', headers, redirect: 'manual', cache: 'no-store' });
  } catch {
    /* a later viewer rebuilds */
  }
}

function clientResponse(request: Request, response: Response): Response {
  if (request.method !== 'HEAD') return conditionalResponse(request, response);
  response.body?.cancel();
  return conditionalResponse(request, new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  }));
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const target = apexRedirect(url.hostname, url.pathname, url.search);
  if (target) {
    return new Response(null, {
      status: 301,
      headers: { location: target, 'cache-control': 'public, max-age=86400' },
    });
  }
  if (shouldRedirect(url.hostname, url.pathname, context.env.REDIRECT_PAGES_DEV)) {
    const destination = new URL(context.request.url);
    destination.protocol = 'https:';
    destination.hostname = 'world-news.xyz';
    destination.port = '';
    return Response.redirect(destination.toString(), 301);
  }

  const method = context.request.method.toUpperCase();
  const refresh = context.request.headers.get(REFRESH_HEADER) === '1';
  // HTML only. /api/news has its own shard Cache API and must not be wrapped again.
  const shareable = sharedKind(url.pathname) === 'html'
    && url.hostname.toLowerCase() === PRODUCTION_HOST
    && (method === 'GET' || method === 'HEAD')
    && !context.request.headers.has('authorization')
    && !context.request.headers.has('range');
  const cache = shareable ? edgeCache() : null;
  const key = cache ? cacheKeyFor(url) : null;

  if (cache && key && !refresh) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const served = serveCached(context.request, hit);
        if (served && !(isRevalidation(context.request) && served.refresh)) {
          if (served.refresh) context.waitUntil(refreshShared(url));
          return clientResponse(context.request, served.response);
        }
      }
    } catch {
      /* rebuild */
    }
  }

  const upstream = await context.next();
  const prepared = await prepareCachedResponse(context.request, upstream);
  if (cache && key && prepared.store) {
    // Browser max-age is shorter than the edge window. Keep the colo copy for the
    // whole s-maxage + stale-while-revalidate period; the client still sees the original header.
    const stored = prepared.response.clone();
    const headers = new Headers(stored.headers);
    const cdn = headers.get(CDN_CACHE_HEADER) || '';
    const retain = (directiveValue(cdn, 's-maxage') ?? 0) + (directiveValue(cdn, 'stale-while-revalidate') ?? 0);
    if (retain > 0) headers.set('cache-control', `public, max-age=${retain}, s-maxage=${retain}`);
    context.waitUntil(cache.put(key, new Response(stored.body, { status: stored.status, headers })).catch(() => undefined));
  }
  return clientResponse(context.request, prepared.response);
}
