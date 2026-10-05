// sw.js — offline-fähigkeit für den mvp v2 (network-first, fallback cache).
const CACHE = "mein-praktikant-mvp2-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/db.js",
  "./js/dates.js",
  "./js/ui.js",
  "./js/core.js",
  "./js/extract.js",
  "./js/importers.js",
  "./js/scheduler.js",
  "./js/progress.js",
  "./js/weather.js",
  "./js/ics.js",
  "./js/demo.js",
  "./js/onboarding.js",
  "./js/view-heute.js",
  "./js/view-eingang.js",
  "./js/view-abend.js",
  "./js/view-ziele.js",
  "./js/view-profil.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("mein-praktikant-mvp2") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
