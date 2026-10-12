import type { PagesContext } from './env.js';

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
  const response = await context.next();
  // Previews must never be indexed next to world-news.xyz.
  if (url.hostname.endsWith('.pages.dev')) {
    const copy = new Response(response.body, response);
    copy.headers.set('x-robots-tag', 'noindex');
    return copy;
  }
  return response;
}
