/**
 * Edge policy for public article HTML and GET/HEAD /api/news.
 *
 * Cloudflare sets cf-cache-status at request time. HTML and JSON are not default
 * cached extensions, so Cache-Control alone stays DYNAMIC. caches.default is the
 * colo Cache API: a hit still runs the Function, so cf-cache-status stays DYNAMIC.
 * cf.cacheTtl only applies to a fetch() this worker makes, not to the Response it
 * returns. A zone Cache Rule has to mark the URL eligible before HIT/REVALIDATED
 * can appear. Cloudflare-CDN-Cache-Control is the header that rule should respect,
 * and no-store there is what keeps secrets and non-public routes unshared.
 */

export const CDN_CACHE_HEADER = 'cloudflare-cdn-cache-control';
export const PAGES_CACHE_HEADER = 'x-pages-cache';
export const CACHED_AT_HEADER = 'x-cached-at';
export const REFRESH_HEADER = 'x-pages-cache-refresh';

export const PRODUCTION_HOST = 'world-news.xyz';

/** Hard cap so a mistaken long max-age on HTML cannot pin the edge. */
const EDGE_MAX_S = 600;
const MAX_CACHE_BYTES = 1_500_000;

const HTML_PREFIXES = ['/briefing', '/explainer', '/analysis', '/digest', '/weekly', '/topic'];

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'yclid',
]);

export type SharedKind = 'html' | 'news';

export interface CacheStamp {
  cdn: string;
  /** Shared URL that must not be stored by any cache (error, secret, Set-Cookie). */
  browserNoStore: boolean;
  /** Colo Cache API. Article HTML only; /api/news keeps its own shard cache. */
  store: boolean;
  /** Buffer the body and set ETag so a zone revalidation can be 304. */
  etag: boolean;
}

export function sharedKind(pathname: string): SharedKind | null {
  if (pathname === '/api/news') return 'news';
  // /story and /story/ redirect home. Only a real id is an article.
  if (/^\/story\/[^/]+\/?$/.test(pathname)) return 'html';
  for (const prefix of HTML_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return 'html';
  }
  return null;
}

export function directiveValue(header: string, name: string): number | null {
  const match = header.match(new RegExp(`(?:^|,)\\s*${name}\\s*=\\s*(\\d+)\\s*(?:,|$)`, 'i'));
  return match ? Number(match[1]) : null;
}

export function varyBlocksShare(vary: string | null): boolean {
  if (!vary) return false;
  return vary.split(',').some((part) => {
    const name = part.trim().toLowerCase();
    return name === '*' || name === 'cookie' || name === 'authorization';
  });
}

/** Stable Cache API / CDN key. Tracking params are dropped for HTML only; /api/news keeps `part`. */
export function cacheUrl(input: URL): string {
  const url = new URL(input.href);
  url.hash = '';
  if (url.pathname !== '/api/news') {
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString();
}

export function cacheStamp(input: {
  host: string;
  method: string;
  pathname: string;
  status: number;
  cacheControl: string | null;
  setCookie: boolean;
  authorization: boolean;
  vary: string | null;
}): CacheStamp {
  const method = input.method.toUpperCase();
  const kind = sharedKind(input.pathname);
  const unsafe = input.setCookie
    || input.authorization
    || varyBlocksShare(input.vary)
    || (method !== 'GET' && method !== 'HEAD');
  const onApex = input.host.toLowerCase() === PRODUCTION_HOST;
  if (!kind || !onApex || unsafe || input.status !== 200) {
    return {
      cdn: 'no-store',
      browserNoStore: Boolean(kind) && onApex && (unsafe || input.status !== 200),
      store: false,
      etag: false,
    };
  }
  const cc = input.cacheControl ?? '';
  if (/\bno-store\b/i.test(cc) || /\bprivate\b/i.test(cc)) {
    return { cdn: 'no-store', browserNoStore: true, store: false, etag: false };
  }
  const sMax = directiveValue(cc, 's-maxage') ?? directiveValue(cc, 'max-age');
  const explicitPublic = /\bpublic\b/i.test(cc) || /\bs-maxage\s*=/i.test(cc);
  if (!explicitPublic || sMax == null || sMax <= 0) {
    return { cdn: 'no-store', browserNoStore: true, store: false, etag: false };
  }
  const edge = Math.min(sMax, EDGE_MAX_S);
  const swr = Math.min(directiveValue(cc, 'stale-while-revalidate') ?? Math.min(edge, 300), EDGE_MAX_S);
  return {
    cdn: `public, s-maxage=${edge}, stale-while-revalidate=${swr}`,
    browserNoStore: false,
    // News already stale-while-revalidates inside functions/api/news.ts. A second
    // Cache API clock here would treat a stale shard body as fresh again.
    store: kind === 'html',
    etag: true,
  };
}

export function cacheAge(headers: Headers, now = Date.now()): { age: number; fresh: number; swr: number } {
  const stamped = Number(headers.get(CACHED_AT_HEADER) || '0');
  const age = stamped > 0 ? Math.max(0, (now - stamped) / 1000) : Number.POSITIVE_INFINITY;
  const cc = headers.get(CDN_CACHE_HEADER) || headers.get('cache-control') || '';
  const fresh = directiveValue(cc, 's-maxage') ?? directiveValue(cc, 'max-age') ?? 0;
  const swr = directiveValue(cc, 'stale-while-revalidate') ?? 0;
  return { age, fresh, swr };
}

/** Conditional requests and explicit no-cache must rebuild once the colo copy is stale. */
export function isRevalidation(request: Request): boolean {
  if (request.headers.has('if-none-match') || request.headers.has('if-modified-since')) return true;
  if (/\bno-cache\b/i.test(request.headers.get('cache-control') || '')) return true;
  return /\bno-cache\b/i.test(request.headers.get('pragma') || '');
}

export function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header.split(',').some((part) => {
    const value = part.trim();
    return value === etag || value === `W/${etag}` || value.replace(/^W\//, '') === etag;
  });
}

export async function etagOf(body: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', body);
  const hex = [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `"${hex}"`;
}

function applyStamp(headers: Headers, stamp: CacheStamp, hostname: string): void {
  headers.set(CDN_CACHE_HEADER, stamp.cdn);
  if (stamp.browserNoStore) headers.set('cache-control', 'no-store');
  if (hostname.endsWith('.pages.dev')) headers.set('x-robots-tag', 'noindex');
}

export async function prepareCachedResponse(request: Request, response: Response, now = Date.now()): Promise<{ response: Response; store: boolean }> {
  const url = new URL(request.url);
  const stamp = cacheStamp({
    host: url.hostname,
    method: request.method,
    pathname: url.pathname,
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    setCookie: response.headers.has('set-cookie'),
    authorization: request.headers.has('authorization'),
    vary: response.headers.get('vary'),
  });
  if (!stamp.etag) {
    const headers = new Headers(response.headers);
    applyStamp(headers, stamp, url.hostname);
    return {
      response: new Response(response.body, { status: response.status, statusText: response.statusText, headers }),
      store: false,
    };
  }
  let body: ArrayBuffer;
  try {
    body = await response.arrayBuffer();
  } catch {
    const headers = new Headers(response.headers);
    applyStamp(headers, { ...stamp, store: false }, url.hostname);
    return { response: new Response(null, { status: response.status, headers }), store: false };
  }
  if (body.byteLength === 0 || body.byteLength > MAX_CACHE_BYTES) {
    const headers = new Headers(response.headers);
    applyStamp(headers, stamp, url.hostname);
    return { response: new Response(body, { status: response.status, headers }), store: false };
  }
  const headers = new Headers(response.headers);
  applyStamp(headers, stamp, url.hostname);
  headers.set('etag', response.headers.get('etag') || await etagOf(body));
  if (stamp.store) {
    headers.set(CACHED_AT_HEADER, String(now));
    headers.set(PAGES_CACHE_HEADER, 'MISS');
  }
  return { response: new Response(body, { status: response.status, headers }), store: stamp.store };
}

export function serveCached(request: Request, hit: Response, now = Date.now()): { response: Response; refresh: boolean } | null {
  const { age, fresh, swr } = cacheAge(hit.headers, now);
  if (!(fresh > 0) || !(age < fresh + swr)) {
    hit.body?.cancel();
    return null;
  }
  const refresh = age >= fresh;
  const headers = new Headers(hit.headers);
  headers.set('age', String(Math.floor(age)));
  headers.set(PAGES_CACHE_HEADER, refresh ? 'STALE' : 'HIT');
  if (request.method === 'HEAD') hit.body?.cancel();
  return {
    response: new Response(request.method === 'HEAD' ? null : hit.body, { status: hit.status, headers }),
    refresh,
  };
}

export function conditionalResponse(request: Request, response: Response): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') return response;
  if (response.status !== 200) return response;
  const etag = response.headers.get('etag');
  if (!etag || !etagMatches(request.headers.get('if-none-match'), etag)) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  response.body?.cancel();
  return new Response(null, { status: 304, headers });
}

export function cacheKeyFor(url: URL): Request {
  return new Request(cacheUrl(url), { method: 'GET' });
}
