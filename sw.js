// FocusFill 서비스 워커
// 항상 서버에 새 파일이 있는지 먼저 확인하고(바뀐 게 없으면 아주 빠르게 끝나요), 인터넷이 끊기면 저장해 둔 파일을 보여줘요.
// 버전 이름이 바뀌면 브라우저가 새 서비스 워커를 받아서 바로 적용하고, 앱이 자동으로 새로고침돼요.
const VERSION = 'focusfill-v1.5.14';
const CACHE = VERSION;
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'quotes.js', 'firebase-config.js', 'manifest.webmanifest', 'icon-r192.png', 'icon-r512.png', 'favicon-r32.png', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .catch(() => {})
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  e.respondWith(
    // no-cache: 브라우저에 저장된 옛 파일을 그냥 쓰지 않고, 서버에 바뀌었는지 꼭 물어봐요
    // 페이지 이동 요청은 주소로 새로 요청해요 (옛 Safari는 이동 요청에 옵션을 붙이면 실패해요)
    fetch(nav ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' }))
      .then((r) => {
        // Safari는 서비스 워커가 '리디렉션된 응답'을 넘기면 페이지를 열지 못해요 → 깨끗한 응답으로 다시 만들어요
        if (r && r.redirected) return r.blob().then((body) => new Response(body, { status: r.status, statusText: r.statusText, headers: r.headers }));
        return r;
      })
      .then((r) => {
        if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return r;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((m) => m || (nav ? caches.match('index.html').then((i) => i || caches.match('./')) : null))
        .then((m) => m || Response.error()))
  );
});
