// Tefter service worker — cache statike + offline fallback za navigacije.
const CACHE = "tefter-v2";
const STATIC = [
  "/app.css",
  "/app.js",
  "/vendor/htmx.min.js",
  "/vendor/alpine.min.js",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigacije: uvek mreža (svež HTML), offline.html kad nema veze.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Statika: stale-while-revalidate — odgovori odmah iz cache-a, ali uvek povuci
  // svežu verziju u pozadini (inače nova app.css nikad ne stigne do telefona).
  if (STATIC.includes(url.pathname) || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      }),
    );
  }
});
