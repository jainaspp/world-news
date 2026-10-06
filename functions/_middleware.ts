import type { PagesContext } from './env.js';

/** The production pages.dev alias. Branch previews are <branch>.world-news-b5e.pages.dev and are not redirected. */
const PRODUCTION_PAGES_DEV = 'world-news-b5e.pages.dev';

export function shouldRedirect(hostname: string, pathname: string, setting: unknown): boolean {
  if (setting === 'false') return false;
  if (pathname.startsWith('/api/')) return false; // the warm workflow may POST to pages.dev
  if (hostname === PRODUCTION_PAGES_DEV) return true;
  // REDIRECT_PAGES_DEV=true also covers any other *.pages.dev host (old behaviour).
  return setting === 'true' && (hostname === 'pages.dev' || hostname.endsWith('.pages.dev'));
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
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
