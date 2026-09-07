/* ثبت Service Worker از هر صفحه (نه فقط index.html) —
   تا اگر کاربر برای اولین‌بار مستقیماً از یک میان‌بر (shortcut)
   وارد یکی از زیرصفحات شود، باز هم قابلیت آفلاین فعال شود. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(function (registration) {
          console.log('HSE Service Worker registered:', registration.scope);
        })
        .catch(function (error) {
          console.warn('HSE Service Worker registration failed:', error);
        });
    });
  }
})();
