const CACHE_VERSION = 'wn-v13';
const STATIC_CACHE   = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';
const OFFLINE_URL   = '/offline.html';

// ─── 預緩存清單（首次安裝）────────────────────────────────────
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg',
];

// ─── 需要 network-first 的 URL（始終試網絡，降級到快取）────────
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /newsdata/,
  /supabase/,
  /translate\.googleapis/,
  /mymemory\.translated/,
];

// ─── 需要 cache-first 的 URL（靜態資源）───────────────────────
const CACHE_FIRST_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?/,
  /\.png$/,
  /\.jpg$/,
  /\.svg$/,
  /\.ico$/,
  /picsum\.photos/,
  /google\.com\/s2\/favicons/,
];

// ─── install：預緩存關鍵資源 ─────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ─── activate：清理舊缓存 ─────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('wn-') && k !== CACHE_VERSION && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── fetch：混合策略 ──────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 只緩存同源 + 白名單外部資源
  if (request.method !== 'GET') return;
  if (url.protocol === 'data:') return;

  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some((p) => p.test(url.href));
  const isCacheFirst   = CACHE_FIRST_PATTERNS.some((p) => p.test(url.href));

  if (isNetworkFirst) {
    e.respondWith(networkFirst(request));
  } else if (isCacheFirst) {
    e.respondWith(cacheFirst(request));
  } else {
    // 預設：network-first，兼顧客廳
    e.respondWith(networkFirst(request));
  }
});

// ─── network-first：先網絡，失敗則回快取 ───────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // API/新聞請求失敗 → 回 offline 頁
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return caches.match('/');
  }
}

// ─── cache-first：先快取，沒有才網絡 ───────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

// ─── push 通知 ────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || '🌏 世界頭條', {
      body: data.body || data.message || '即時新聞更新',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'world-news',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
