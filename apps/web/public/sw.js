const cacheName = "fisiospot-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== cacheName)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const responseToCache = response.clone();
          void caches
            .open(cacheName)
            .then((cache) => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => cachedResponse),
      ),
  );
});
