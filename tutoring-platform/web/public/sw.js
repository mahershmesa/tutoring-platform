// Service Worker بسيط: يجعل التطبيق قابلاً للتثبيت (PWA) دون تخزين عدواني.
// الاستراتيجية: network-first — نجيب من الشبكة دائماً (بيانات حيّة)، ونرجع
// للكاش فقط عند انقطاع الشبكة. لا نخزّن الصفحات الديناميكية مسبقاً.

const CACHE = "dalili-v1";
const ASSETS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
