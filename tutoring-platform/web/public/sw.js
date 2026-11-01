// Service Worker بسيط: يجعل التطبيق قابلاً للتثبيت (PWA) دون تخزين عدواني.
// الاستراتيجية: network-first — نجيب من الشبكة دائماً (بيانات حيّة)، ونرجع
// للكاش فقط عند انقطاع الشبكة. لا نخزّن الصفحات الديناميكية مسبقاً.

const CACHE = "dalili-v2";
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

// نتدخّل فقط للأصول المُخزّنة مسبقاً (الأيقونات). نترك HTML وJS وRSC والتنقّل
// للمتصفح تماماً — هذا يمنع أن يُرجع الـ SW استجابة غير صالحة عند فشل جلب عابر
// (وهو ما يسبّب ChunkLoadError / "client-side exception" خصوصاً على الموبايل
// بعد نشر جديد). cache-first للأيقونات فقط.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!ASSETS.includes(url.pathname)) return; // بقية الطلبات: سلوك المتصفح الطبيعي
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

// ---------- الإشعارات الفورية (Web Push) ----------

// وصول رسالة دفع: نعرض إشعاراً. البيانات JSON: { title, body, url }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "دليلي";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    dir: "rtl",
    lang: "ar",
    // اهتزاز على الموبايل (أندرويد)
    vibrate: [200, 100, 200],
    // يبقى الإشعار ظاهراً حتى يتفاعل المستخدم (ديسكتوب/أندرويد) — متل تطبيق رسائل
    requireInteraction: true,
    // تجميع حسب المحادثة + إعادة التنبيه عند كل جديد ضمن نفس الخيط
    tag: data.tag || undefined,
    renotify: data.tag ? true : undefined,
    data: { url: data.url || "/inbox" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// الضغط على الإشعار: نركّز نافذة مفتوحة أو نفتح الرابط.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // أمان: لا نسمح إلا بمسارات داخلية نسبية (منع إعادة توجيه خارجية)
  let target = (event.notification.data && event.notification.data.url) || "/inbox";
  if (typeof target !== "string" || !target.startsWith("/")) target = "/inbox";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
