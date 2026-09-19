const CACHE_NAME = 'ifp-cache-v2';

// 1. Install without hard failure if an asset fails
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Clean old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Network-first: Always try the live web first, never break live Firebase/site
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Firebase/external APIs
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and store valid responses dynamically
        if (response && response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
