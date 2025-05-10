// public/service-worker.js

const CACHE_NAME = "app-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/main.js",
  "/styles.css",
  // Add any other files you want to cache
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
      }),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
