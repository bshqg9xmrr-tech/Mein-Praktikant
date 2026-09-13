// sw.js — minimaler service worker, macht die app offline verfügbar
// (voraussetzung für "zum home-bildschirm hinzufügen" auf dem iphone).

// v2 (review-korrektur, siehe CHANGELOG.md): die precache-liste listete noch
// module, die seit der "strom/kompass/verlauf"-umstrukturierung von keinem
// tab mehr importiert werden (goals-view.js/today.js/overview.js), und
// fehlten dafür mehrere tatsächlich genutzte module (strom.js/kompass.js/
// verlauf.js/auth-gate.js/onboarding.js/avatars.js/colors.js/areas-ui.js) —
// dadurch war die offline-garantie direkt nach der PWA-installation nicht
// zuverlässig, sondern hing an einem ersten erfolgreichen online-ladevorgang.
const CACHE = "mein-praktikant-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./js/main.js",
  "./js/storage.js",
  "./js/cloud.js",
  "./js/auth-gate.js",
  "./js/onboarding.js",
  "./js/avatars.js",
  "./js/colors.js",
  "./js/areas-ui.js",
  "./js/goals.js",
  "./js/strom.js",
  "./js/kompass.js",
  "./js/verlauf.js",
  "./js/notes.js",
  "./js/journal.js",
  "./js/habits.js",
  "./js/settings.js",
  "./js/ui.js",
  "./js/ics.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// network-first für eigene dateien (damit updates ankommen), fallback auf cache wenn offline.
// externe cdn-requests (supabase-client) werden nicht abgefangen — reines online-feature.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
