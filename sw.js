/* ============================================================
   سرویس‌ورکر سامانه ایمنی درکاو
   استراتژی:
   - صفحات HTML: Network First (اول تلاش برای گرفتن نسخه‌ی تازه از
     شبکه، اگر شبکه جواب نداد/کند بود، از کش قبلی نمایش داده می‌شود).
     این یعنی اگر اتصال کاربر لحظه‌ای قطع/کند شود، به‌جای نمایش
     صفحه‌ی خطای سفید یا "Oops"، آخرین نسخه‌ی کش‌شده نمایش داده می‌شود.
   - فایل‌های ثابت (فونت/آیکون/CSS/JS محلی): Cache First (سریع‌تر
     و بدون نیاز به شبکه، چون این فایل‌ها به‌ندرت تغییر می‌کنند).
   - درخواست‌های script.google.com (API): همیشه از شبکه، بدون کش،
     چون داده‌ی زنده (وضعیت کاربر/مجوزها) است.
   ============================================================ */

const CACHE_VERSION = 'hse-dorkav-v2';
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './assets/fonts/vazir/font-face.css'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL).catch(function (err) {
        // اگر یکی از فایل‌ها موقتاً در دسترس نبود، کل نصب سرویس‌ورکر fail نشود
        console.warn('[SW] برخی فایل‌های app-shell کش نشدند:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;

  if (req.method !== 'GET') return; // فقط GET کش می‌شود

  const url = new URL(req.url);

  // درخواست‌های بک‌اند (Google Apps Script) هرگز کش نشوند — همیشه زنده
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com')) {
    return; // اجازه بده مرورگر مستقیم از شبکه بگیرد
  }

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network First برای صفحات HTML
    event.respondWith(
      fetch(req)
        .then(function (resp) {
          const respClone = resp.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, respClone); });
          return resp;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            // اگر خودِ همین صفحه قبلاً کش شده، همان را نشان بده.
            // در غیر این‌صورت (صفحه‌ای که هرگز آفلاین بازدید نشده)،
            // به‌جای نمایش بی‌توضیح صفحه‌ی ورود، صفحه‌ی «عدم اتصال» را نشان بده.
            return cached || caches.match('./offline.html');
          });
        })
    );
    return;
  }

  // Cache First برای فایل‌های ثابت (فونت/آیکون/CSS/JS محلی همین سایت)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (resp) {
          const respClone = resp.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, respClone); });
          return resp;
        });
      })
    );
  }
});
