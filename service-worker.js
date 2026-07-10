const CACHE_NAME = 'floc-2026-cache-v12';
const STATIC_CACHE = 'floc-2026-static-v12';

const staticAssets = [
  'program.css', 'site.js', 'service-worker.js', 'last-updated.js', 'build-info.json',
  'app-icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
];

// Safari refuses to serve a cached Response whose `redirected` flag is set
// ("Response served by service worker has redirections"), so any response that
// went through a redirect is rebuilt as a plain, non-redirected Response before
// it's stored — this applies both at install-time precache and at fetch-time.
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
  // Never let one bad asset sink the whole precache: an uncaught rejection here propagates
  // through Promise.all and fails the entire 'install' event, which can leave other assets
  // (e.g. program.css) uncached too — that's what made the offline page look unstyled.
  try {
    const response = await fetch(url);
    if (response.ok) {
      await putWithoutRedirect(cache, url, response);
    }
  } catch (e) {
    // best-effort precache; offline capability degrades gracefully
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
    // Static assets are requested with a `?v=...` cache-busting query that changes on every
    // generator run. Caching under the full URL would fragment the entry on each deploy and
    // could leave an offline visitor with a cache miss (and a blank stylesheet) if the query
    // in the currently-loaded HTML doesn't match what's stored. Cache/match them under the
    // bare URL instead, matching the key the install-time precache already uses.
    const cacheKey = isStaticAsset ? new Request(url.origin + url.pathname) : event.request;
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Keep the SW alive until the cache write lands — without waitUntil, the
          // browser can recycle the worker right after respondWith resolves, silently
          // dropping the write and leaving the just-visited page missing offline.
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
          // Hitting an uncached page while offline: show a dedicated "no internet" page
          // instead of the browser's generic offline error.
          if (event.request.destination === 'document') {
            return caches.match('offline.html');
          }
          return undefined;
        })
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
