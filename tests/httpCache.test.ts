import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../functions/_middleware';
import {
  cacheStamp,
  cacheUrl,
  CDN_CACHE_HEADER,
  conditionalResponse,
  etagMatches,
  sharedKind,
} from '../functions/httpCache';
import type { PagesContext } from '../functions/env';

const HTML = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300' };

function installCache(): Map<string, Response> {
  const store = new Map<string, Response>();
  vi.stubGlobal('caches', {
    default: {
      async match(request: Request) {
        const hit = store.get(request.url);
        return hit ? hit.clone() : undefined;
      },
      async put(request: Request, response: Response) {
        store.set(request.url, response.clone());
      },
    },
  });
  return store;
}

function context(url: string, next: PagesContext['next'], init?: RequestInit): { ctx: PagesContext; pending: Promise<unknown>[] } {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    ctx: {
      request: new Request(url, init),
      env: {},
      waitUntil(promise) { pending.push(promise); },
      next,
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shared cache paths', () => {
  it('shares article HTML and /api/news only', () => {
    expect(sharedKind('/briefing')).toBe('html');
    expect(sharedKind('/briefing/')).toBe('html');
    expect(sharedKind('/briefing/2026-10-25-am')).toBe('html');
    expect(sharedKind('/explainer/2026-10-25-event-0123456789ab')).toBe('html');
    expect(sharedKind('/analysis/')).toBe('html');
    expect(sharedKind('/digest/2026-10-25-am')).toBe('html');
    expect(sharedKind('/weekly/2026-10-25')).toBe('html');
    expect(sharedKind('/topic/bridges')).toBe('html');
    expect(sharedKind('/story/6e78b2cadbc5/')).toBe('html');
    expect(sharedKind('/api/news')).toBe('news');

    expect(sharedKind('/story')).toBeNull();
    expect(sharedKind('/story/')).toBeNull();
    expect(sharedKind('/')).toBeNull();
    expect(sharedKind('/api/news/')).toBeNull();
    expect(sharedKind('/api/generate')).toBeNull();
    expect(sharedKind('/api/crawl')).toBeNull();
    expect(sharedKind('/api/reads')).toBeNull();
    expect(sharedKind('/region/hkg')).toBeNull();
    expect(sharedKind('/category/hk')).toBeNull();
    expect(sharedKind('/search')).toBeNull();
  });

  it('drops tracking params on HTML and keeps /api/news part', () => {
    const html = new URL('https://world-news.xyz/briefing/2026-10-25-am/?utm_source=x&fbclid=1&gclid=2');
    expect(cacheUrl(html)).toBe('https://world-news.xyz/briefing/2026-10-25-am/');
    const news = new URL('https://world-news.xyz/api/news?utm_source=x&part=3');
    expect(cacheUrl(news)).toBe('https://world-news.xyz/api/news?part=3&utm_source=x');
  });

  it('sets a short CDN TTL for public 200s and no-store for everything else', () => {
    const briefing = cacheStamp({
      host: 'world-news.xyz', method: 'GET', pathname: '/briefing/2026-10-25-am/', status: 200,
      cacheControl: HTML['cache-control'], setCookie: false, authorization: false, vary: null,
    });
    expect(briefing).toEqual({
      cdn: 'public, s-maxage=300, stale-while-revalidate=300',
      browserNoStore: false,
      store: true,
      etag: true,
    });
    const news = cacheStamp({
      host: 'world-news.xyz', method: 'HEAD', pathname: '/api/news', status: 200,
      cacheControl: 'public, s-maxage=300, stale-while-revalidate=600', setCookie: false, authorization: false, vary: null,
    });
    expect(news.cdn).toBe('public, s-maxage=300, stale-while-revalidate=600');
    expect(news.store).toBe(false);
    expect(news.etag).toBe(true);

    const home = cacheStamp({
      host: 'world-news.xyz', method: 'GET', pathname: '/', status: 200,
      cacheControl: 'public, max-age=60, s-maxage=120, stale-while-revalidate=600', setCookie: false, authorization: false, vary: null,
    });
    expect(home).toMatchObject({ cdn: 'no-store', browserNoStore: false, store: false });

    expect(cacheStamp({
      host: 'world-news.xyz', method: 'GET', pathname: '/api/news', status: 503,
      cacheControl: 'no-store', setCookie: false, authorization: false, vary: null,
    }).cdn).toBe('no-store');
    expect(cacheStamp({
      host: 'world-news.xyz', method: 'GET', pathname: '/briefing/x', status: 200,
      cacheControl: HTML['cache-control'], setCookie: false, authorization: true, vary: null,
    })).toMatchObject({ cdn: 'no-store', browserNoStore: true, store: false });
    expect(cacheStamp({
      host: 'world-news.xyz', method: 'POST', pathname: '/api/news', status: 200,
      cacheControl: 'public, s-maxage=300', setCookie: false, authorization: false, vary: null,
    }).store).toBe(false);
    expect(cacheStamp({
      host: 'world-news.xyz', method: 'GET', pathname: '/briefing/', status: 200,
      cacheControl: HTML['cache-control'], setCookie: true, authorization: false, vary: null,
    }).browserNoStore).toBe(true);
    expect(cacheStamp({
      host: 'world-news.xyz', method: 'GET', pathname: '/api/generate', status: 200,
      cacheControl: 'public, max-age=60', setCookie: false, authorization: false, vary: 'Cookie',
    })).toMatchObject({ cdn: 'no-store', store: false });
    expect(cacheStamp({
      host: 'preview.pages.dev', method: 'GET', pathname: '/briefing/', status: 200,
      cacheControl: HTML['cache-control'], setCookie: false, authorization: false, vary: null,
    })).toMatchObject({ cdn: 'no-store', browserNoStore: false, store: false });
  });

  it('matches strong and weak validators', () => {
    expect(etagMatches('"abc"', '"abc"')).toBe(true);
    expect(etagMatches('W/"abc"', '"abc"')).toBe(true);
    expect(etagMatches('"no"', '"abc"')).toBe(false);
    const response = new Response('body', { status: 200, headers: { etag: '"abc"', 'cache-control': 'public, max-age=60' } });
    const notModified = conditionalResponse(new Request('https://world-news.xyz/briefing/', { headers: { 'if-none-match': '"abc"' } }), response);
    expect(notModified.status).toBe(304);
    expect(notModified.headers.get('etag')).toBe('"abc"');
  });
});

describe('middleware cache', () => {
  it('serves the second briefing from the colo cache and leaves the homepage body alone', async () => {
    installCache();
    let briefings = 0;
    const first = context('https://world-news.xyz/briefing/2026-10-25-am/?utm_source=nl', async () => {
      briefings += 1;
      return new Response('導讀正文', { status: 200, headers: HTML });
    });
    const opened = await onRequest(first.ctx);
    expect(await opened.text()).toBe('導讀正文');
    expect(opened.headers.get('cache-control')).toBe(HTML['cache-control']);
    expect(opened.headers.get(CDN_CACHE_HEADER)).toBe('public, s-maxage=300, stale-while-revalidate=300');
    expect(opened.headers.get('x-pages-cache')).toBe('MISS');
    expect(opened.headers.get('etag')).toMatch(/^"[0-9a-f]+"$/);
    await Promise.all(first.pending);

    const second = context('https://world-news.xyz/briefing/2026-10-25-am/', async () => {
      briefings += 1;
      return new Response('should not run', { status: 200, headers: HTML });
    });
    const again = await onRequest(second.ctx);
    expect(briefings).toBe(1);
    expect(again.headers.get('x-pages-cache')).toBe('HIT');
    expect(await again.text()).toBe('導讀正文');

    const home = context('https://world-news.xyz/?region=HKG', async () => new Response('<div id="root"></div>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600' },
    }));
    const shell = await onRequest(home.ctx);
    expect(await shell.text()).toBe('<div id="root"></div>');
    expect(shell.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=120, stale-while-revalidate=600');
    expect(shell.headers.get(CDN_CACHE_HEADER)).toBe('no-store');
    expect(shell.headers.get('x-pages-cache')).toBeNull();
  });

  it('does not store an authorized, cookie-setting, or failed article', async () => {
    const store = installCache();
    const auth = context('https://world-news.xyz/briefing/', async () => new Response('secret view', { status: 200, headers: HTML }), {
      headers: { authorization: 'Bearer secret' },
    });
    const hidden = await onRequest(auth.ctx);
    expect(hidden.headers.get('cache-control')).toBe('no-store');
    expect(hidden.headers.get(CDN_CACHE_HEADER)).toBe('no-store');
    await Promise.all(auth.pending);
    expect(store.size).toBe(0);

    const cookie = context('https://world-news.xyz/explainer/demo/', async () => new Response('personalized', {
      status: 200,
      headers: { ...HTML, 'set-cookie': 'session=1' },
    }));
    const baked = await onRequest(cookie.ctx);
    expect(baked.headers.get('cache-control')).toBe('no-store');
    await Promise.all(cookie.pending);
    expect(store.size).toBe(0);

    const missing = context('https://world-news.xyz/story/missing/', async () => new Response('gone', {
      status: 404,
      headers: { ...HTML, 'x-robots-tag': 'noindex, follow' },
    }));
    const notFound = await onRequest(missing.ctx);
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get('cache-control')).toBe('no-store');
    expect(notFound.headers.get(CDN_CACHE_HEADER)).toBe('no-store');
    await Promise.all(missing.pending);
    expect(store.size).toBe(0);
  });

  it('stamps /api/news without taking over its shard cache', async () => {
    installCache();
    let calls = 0;
    const run = () => context('https://world-news.xyz/api/news', async () => {
      calls += 1;
      return new Response('{"items":[]}', {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
          'x-pages-cache': 'HIT',
        },
      });
    });
    const first = run();
    const opened = await onRequest(first.ctx);
    expect(opened.headers.get(CDN_CACHE_HEADER)).toBe('public, s-maxage=300, stale-while-revalidate=600');
    expect(opened.headers.get('x-pages-cache')).toBe('HIT');
    expect(opened.headers.get('etag')).toMatch(/^"[0-9a-f]+"$/);
    const second = run();
    await onRequest(second.ctx);
    expect(calls).toBe(2);
  });

  it('revalidates a fresh article with 304 and refreshes a stale one in the background', async () => {
    const store = installCache();
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init]);
      return Promise.resolve(new Response('refreshed'));
    });
    const first = context('https://world-news.xyz/topic/bridges/', async () => new Response('專題', { status: 200, headers: HTML }));
    const opened = await onRequest(first.ctx);
    const etag = opened.headers.get('etag');
    await opened.arrayBuffer();
    await Promise.all(first.pending);

    const fresh = context('https://world-news.xyz/topic/bridges/', async () => new Response('nope', { status: 200, headers: HTML }), {
      headers: { 'if-none-match': etag || '' },
    });
    const validated = await onRequest(fresh.ctx);
    expect(validated.status).toBe(304);
    expect(calls).toHaveLength(0);

    const cached = [...store.values()][0];
    expect(cached).toBeDefined();
    cached!.headers.set('x-cached-at', String(Date.now() - 400_000));
    const stale = context('https://world-news.xyz/topic/bridges/', async () => new Response('nope', { status: 200, headers: HTML }));
    const served = await onRequest(stale.ctx);
    expect(served.headers.get('x-pages-cache')).toBe('STALE');
    expect(await served.text()).toBe('專題');
    await Promise.all(stale.pending);
    expect(calls.map(([input]) => String(input))).toEqual(['https://world-news.xyz/topic/bridges/']);
    expect(calls[0]?.[1]?.cache).toBe('no-store');
    expect(new Headers(calls[0]?.[1]?.headers).get('x-pages-cache-refresh')).toBe('1');
  });
});
