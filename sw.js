const CACHE_NAME = 'ifp-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install: Cache critical assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old versions, take immediate control (NO UNREGISTERING)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Speed up images & static assets with instant cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never intercept Firebase backend calls or non-GET requests
  if (
    req.method !== 'GET' ||
    url.origin.includes('firestore') ||
    url.origin.includes('identitytoolkit') ||
    url.origin.includes('googleapis.com')
  ) {
    return;
  }

  // 2. Cache-First for Images & Fonts (Instant loading on revisit)
  if (
    req.destination === 'image' ||
    req.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|woff2?)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200) {
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch (err) {
          return cached;
        }
      })
    );
    return;
  }

  // 3. Network-First for HTML/Scripts, fallback to cache if offline
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => caches.match(req))
  );
});
