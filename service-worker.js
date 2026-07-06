const CACHE_NAME = 'floc-2026-cache-v2';
const STATIC_CACHE = 'floc-2026-static-v2';

const staticAssets = ['program.css', 'install-detection.js', 'service-worker.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(staticAssets)),
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch('precache-pages.json', { cache: 'no-store' });
          if (response.ok) {
            const { pages } = await response.json();
            await cache.addAll(pages);
          }
        } catch (e) {
          // best-effort precache; offline capability degrades gracefully
        }
      })
    ])
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isStaticAsset = staticAssets.some((path) => url.pathname.endsWith(path));

  if (event.request.destination === 'document' || isStaticAsset) {
    const cacheName = isStaticAsset ? STATIC_CACHE : CACHE_NAME;
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          caches.open(cacheName).then(async (cache) => {
            await cache.delete(event.request, { ignoreSearch: true });
            await cache.put(event.request, response.clone());
          });
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== STATIC_CACHE) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});
