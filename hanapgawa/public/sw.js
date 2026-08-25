/* HanapGawa service worker.
 *
 * Deliberately small and conservative. The one job here is to make the app
 * installable and survive a dropped signal — not to be an offline database.
 *
 * PRIVACY RULE (do not relax without thinking it through): we never cache a
 * navigation response or anything under /api. Those carry the signed-in
 * user's own data — job addresses, chat, wallet balance — and phones in this
 * market are frequently shared. A cache hit for the wrong person is a data
 * breach, so only fingerprinted static assets and the offline page are
 * stored.
 */

const VERSION = "v1";
const STATIC_CACHE = `hg-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/offline.html"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never intercept, never cache

  // Fingerprinted build output and icons: cache-first, they are immutable.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Pages: always network, fall back to the offline card. Nothing is stored.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
});
