// Offline support: static assets cache-first, pages network-first with the last copy as fallback,
// headlines and HK weather network-first with the last copy kept, so the app opens offline with the last news.
const CACHE = 'wn-v17';
const PRECACHE = ['/', '/offline.html', '/manifest.json', '/favicon.svg', '/site.css', '/columns.css', '/columns.js'];
const RUNTIME_API = ['/api/news', '/api/hk'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

async function put(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/ads.txt') return;

  if (RUNTIME_API.includes(url.pathname)) {
    // Network first so polling sees new headlines; the last good copy is the offline fallback.
    event.respondWith(
      fetch(request)
        .then((response) => put(new Request(url.pathname), response))
        .catch(async () => (await caches.match(new Request(url.pathname))) || new Response(JSON.stringify({ items: [], error: '離線中，暫時未有已儲存的頭條' }), { headers: { 'content-type': 'application/json' } })),
    );
    return;
  }
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/')) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => put(request, response))));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => (request.mode === 'navigate' ? put(request, response) : response))
      .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html'))),
  );
});
