const CACHE_NAME = "ifp-v2";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
   * Never interfere with Firebase requests.
   */
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("identitytoolkit")
  ) {
    return;
  }

  /*
   * Images:
   * Cache them after the first successful download.
   * This makes repeat visits much faster.
   */
  if (
    request.destination === "image" ||
    /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(request);

          if (response && response.ok) {
            cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          return cached || Response.error();
        }
      })
    );

    return;
  }

  /*
   * HTML:
   * Network first so visitors receive the newest website.
   * If offline, use the cached copy.
   */
  if (
    request.destination === "document" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
          }

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  /*
   * Other local assets.
   */
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
