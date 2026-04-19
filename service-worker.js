const CACHE_NAME = "g-gis-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./favicon.ico",
  "./rq-inn-logo.png",
  "./images/icon-64.png",
  "./images/icon-192.png",
  "./images/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request, { cache: "no-store" });
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      const fallback = await cache.match("./index.html");
      if (request.mode === "navigate" && fallback) return fallback;
      throw error;
    }
  })());
});
