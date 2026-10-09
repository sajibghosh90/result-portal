// সার্ভিস ওয়ার্কার — শুধু অ্যাপ ইন্সটল ও অফলাইন বার্তার জন্য।
// গুরুত্বপূর্ণ: /api ও লগইন-করা পেজের ডেটা কখনো ক্যাশ হয় না, তাই রেজাল্ট সবসময় সার্ভার থেকে তাজা আসে।
const VERSION = "v2";
const STATIC_CACHE = "result-portal-static-" + VERSION;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // API ও অন্য সব ডেটা রিকোয়েস্ট সরাসরি নেটওয়ার্কে যাবে — ক্যাশ নয়
  if (url.pathname.startsWith("/api/")) return;

  // পেজ নেভিগেশন: নেটওয়ার্ক আগে; ইন্টারনেট না থাকলে অফলাইন পেজ
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // আইকন: ক্যাশ আগে
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
