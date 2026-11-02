// Service worker for the installable phone app: works offline after the first visit.
// Only the app's own files are cached â€” client data lives encrypted in IndexedDB, never here.
// CACHE is renamed on every publish (scripts/publish-phone.ps1) so phones pick up updates.
const CACHE = "w2g-sp-20261102205434";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add("./")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("w2g-sp-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Pages: latest from the network, cached copy when offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./")))
    );
    return;
  }

  // Scripts, styles, icons, pdf.js worker: cache first (file names are versioned per build).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
