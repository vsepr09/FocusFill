// FocusFill 서비스 워커
// 사이트 파일: 인터넷이 되면 항상 새것을 받고, 안 되면 저장해 둔 것을 보여줘요.
// Firebase 프로그램·글꼴: 버전이 고정돼 있어서 한 번 받아 두면 저장해 둔 것을 써요 (인터넷 없이도 로그인 상태로 열리도록).
// 버전 이름이 바뀌면 브라우저가 새 서비스 워커를 받아서 바로 적용하고, 앱이 자동으로 새로고침돼요.
const VERSION = 'focusfill-v1.7.5';
const CACHE = VERSION;
const CDN_CACHE = 'focusfill-cdn-v1';   // 버전이 바뀌어도 지우지 않아요
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'quotes.js', 'firebase-config.js', 'manifest.webmanifest', 'icon-r192.png', 'icon-r512.png', 'favicon-r32.png', 'apple-touch-icon.png'];
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const FB_FILES = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'].map((f) => FB + f);
const CDN = ['https://www.gstatic.com/firebasejs/', 'https://cdn.jsdelivr.net/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).catch(() => {}),
    // Firebase 프로그램도 미리 받아 둬요 (앱과 같은 방식의 요청으로)
    caches.open(CDN_CACHE).then((c) => Promise.all(FB_FILES.map((u) => c.match(u).then((hit) => hit || fetch(new Request(u, { mode: 'no-cors' })).then((r) => c.put(u, r))).catch(() => {})))),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== CDN_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function cacheFirst(req) {
  return caches.open(CDN_CACHE).then((c) => c.match(req.url).then((hit) => hit || fetch(req).then((r) => {
    if (r && (r.ok || r.type === 'opaque')) c.put(req.url, r.clone()).catch(() => {});
    return r;
  })));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    if (CDN.some((p) => req.url.startsWith(p))) e.respondWith(cacheFirst(req));
    return;   // Firebase 데이터 통신은 건드리지 않아요
  }
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
