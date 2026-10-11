// 홈 화면 앱용 서비스 워커: 항상 새 파일을 먼저 받고, 인터넷이 끊기면 저장해 둔 파일을 보여줘요.
const VERSION = 'focusfill-v1.4.1';
const CACHE = VERSION;
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'quotes.js', 'firebase-config.js', 'manifest.webmanifest', 'icon-r192.png', 'icon-r512.png', 'favicon-r32.png', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
