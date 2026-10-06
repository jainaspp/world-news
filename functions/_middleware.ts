import type { PagesContext } from './env.js';

function pagesDevHost(hostname: string): boolean {
  return hostname === 'pages.dev' || hostname.endsWith('.pages.dev');
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const enabled = context.env.REDIRECT_PAGES_DEV === 'true';
  const hostname = new URL(context.request.url).hostname;
  if (enabled && pagesDevHost(hostname)) {
    const destination = new URL(context.request.url);
    destination.protocol = 'https:';
    destination.hostname = 'world-news.xyz';
    destination.port = '';
    return Response.redirect(destination.toString(), 301);
  }
  return context.next();
}
