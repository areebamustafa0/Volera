/* Velora Books service worker
 *
 * Caches: app shell, static assets, and cover images.
 * NEVER caches: purchased eBook content, downloads, reader pages, account,
 * admin, or any API mutation. Bump CACHE_VERSION to invalidate everything.
 */
const CACHE_VERSION = "v3";
const SHELL_CACHE = `velora-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `velora-covers-${CACHE_VERSION}`;
const IMAGE_CACHE_LIMIT = 80;

const OFFLINE_URL = "/offline";
const SHELL_URLS = ["/", "/shop", "/offline", "/manifest.json", "/icon.png"];

/** Anything private must never touch the cache. */
function isPrivate(pathname) {
  return (
    pathname.startsWith("/api/downloads") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/payments") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/reader") ||
    pathname.startsWith("/api/maintenance") ||
    pathname.startsWith("/reader") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout")
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== IMAGE_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Allows the page to trigger an immediate update. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (isPrivate(url.pathname)) return; // straight to network, never cached

  // Cover images: cache-first with a bounded cache
  if (req.destination === "image") {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) {
            cache.put(req, res.clone());
            trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Navigations: network-first, fall back to cache, then the offline shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || (await caches.match(OFFLINE_URL)) || Response.error();
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (url.origin === self.location.origin && /\.(css|js|woff2?|svg|png|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
