self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Direct pass-through so the browser loads index.html natively
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
