const cacheName = "fisiospot-v1";

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((response) => {
        const responseToCache = response.clone();
        void caches
          .open(cacheName)
          .then((cache) => cache.put(event.request, responseToCache));
        return response;
      });
    }),
  );
});
