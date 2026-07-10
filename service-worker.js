const CACHE_NAME = 'floc-2026-cache-v16';
const STATIC_CACHE = 'floc-2026-static-v16';

const staticAssets = [
  'program.css', 'site.js', 'service-worker.js', 'last-updated.js', 'build-info.json',
  'app-icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
];

async function putWithoutRedirect(cache, request, response) {
  const storable = response.redirected
    ? new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : response.clone();
  await cache.put(request, storable);
}

async function fetchAndCache(cache, url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      await putWithoutRedirect(cache, url, response);
    }
  } catch (e) {
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => Promise.all(staticAssets.map((asset) => fetchAndCache(cache, asset)))),
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch('precache-pages.json', { cache: 'no-store' });
          if (response.ok) {
            const { pages } = await response.json();
            await Promise.all(pages.map((page) => fetchAndCache(cache, page)));
          }
        } catch (e) {
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
    const cacheKey = isStaticAsset ? new Request(url.origin + url.pathname) : event.request;
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          event.waitUntil(
            caches.open(cacheName).then(async (cache) => {
              await cache.delete(cacheKey, { ignoreSearch: true });
              await putWithoutRedirect(cache, cacheKey, response);
            })
          );
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(cacheKey, { ignoreSearch: true });
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('offline.html');
          }
          return undefined;
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (event.request.method === 'GET' && url.origin === self.location.origin && response.ok) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => putWithoutRedirect(cache, event.request, response))
            );
          }
          return response;
        })
        .catch(() => undefined);
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
