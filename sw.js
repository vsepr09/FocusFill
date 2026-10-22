// FocusFill 서비스 워커
// 사이트 파일: 인터넷이 되면 항상 새것을 받고, 안 되거나 4초 안에 응답이 없으면 저장해 둔 것을 보여줘요.
// Firebase 프로그램·글꼴: 버전이 고정돼 있어서 한 번 받아 두면 저장해 둔 것을 써요 (인터넷 없이도 로그인 상태로 열리도록).
// 버전 이름이 바뀌면 브라우저가 새 서비스 워커를 받아서 바로 적용하고, 앱이 자동으로 새로고침돼요.
const VERSION = 'focusfill-v1.8.1';
const CACHE = VERSION;
const CDN_CACHE = 'focusfill-cdn-v1';   // 버전이 바뀌어도 지우지 않아요
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'quotes.js', 'firebase-config.js', 'manifest.webmanifest', 'icon-r192.png', 'icon-r512.png', 'favicon-r32.png', 'apple-touch-icon.png'];
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const FB_FILES = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'].map((f) => FB + f);
const CDN = ['https://www.gstatic.com/firebasejs/', 'https://cdn.jsdelivr.net/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', (e) => {
  // 사이트 파일을 하나라도 제대로 못 받으면 설치를 멈춰요 → 예전 버전이 그대로 남아서 오프라인에서도 열려요
  // (예전에는 반쯤 받은 채로 새 버전이 켜지고 옛 저장본이 지워져서, 다음 오프라인 때 앱이 안 열릴 수 있었어요)
  const site = caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => {
    const req = new Request(f, { cache: 'reload' });
    return timed(fetch(req), 15000).then((r) => {
      if (!goodApp(req, r)) throw new Error('bad ' + f);
      return c.put(req, r);
    });
  })));
  e.waitUntil(Promise.all([
    site,
    // Firebase 프로그램도 미리 받아 둬요 (앱과 같은 방식의 요청으로)
    caches.open(CDN_CACHE).then((c) => Promise.all(FB_FILES.map((u) => c.match(u).then((hit) => hit || fetch(new Request(u, { mode: 'no-cors' })).then((r) => c.put(u, r))).catch(() => {})))),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== CDN_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 정해진 시간 안에 응답이 없으면 실패로 봐요 (와이파이는 연결됐는데 인터넷이 안 될 때 무한히 기다리지 않게)
let slowUntil = 0;
function timed(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }

function cacheFirst(req) {
  return caches.open(CDN_CACHE).then((c) => c.match(req.url).then((hit) => hit || timed(fetch(req).then((r) => {
    if (r && (r.ok || r.type === 'opaque')) c.put(req.url, r.clone()).catch(() => {});
    return r;
  }), 8000).catch(() => Response.error())));
}

// 학교 와이파이 로그인 화면처럼 엉뚱한 응답은 앱 파일로 저장하지 않아요 (저장되면 다음부터 앱이 깨져요)
function goodApp(req, r) {
  if (!r || !r.ok) return false;
  try { if (r.redirected && new URL(r.url).origin !== self.location.origin) return false; } catch (e) { return false; }
  const ct = (r.headers.get('content-type') || '').toLowerCase();
  const path = new URL(req.url).pathname;
  if (/\.js$/.test(path)) return ct.includes('javascript');
  if (/\.css$/.test(path)) return ct.includes('css');
  if (req.mode === 'navigate' || /\.html$/.test(path) || path.endsWith('/')) return ct.includes('html');
  return true;
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
  // no-cache: 브라우저에 저장된 옛 파일을 그냥 쓰지 않고, 서버에 바뀌었는지 꼭 물어봐요
  // 페이지 이동 요청은 주소로 새로 요청해요 (옛 Safari는 이동 요청에 옵션을 붙이면 실패해요)
  const net = fetch(nav ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' }))
    .then((r) => {
      // Safari는 서비스 워커가 '리디렉션된 응답'을 넘기면 페이지를 열지 못해요 → 깨끗한 응답으로 다시 만들어요
      if (r && r.redirected && goodApp(req, r)) return r.blob().then((body) => new Response(body, { status: r.status, statusText: r.statusText, headers: r.headers }));
      return r;
    })
    .then((r) => {
      if (!goodApp(req, r)) throw new Error('bad response');
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return r;
    });
  net.catch(() => {});
  const fromCache = () => caches.match(req, { ignoreSearch: true })
    .then((m) => m || (nav ? caches.match('index.html').then((i) => i || caches.match('./')) : null));
  // 인터넷이 되면 새 파일, 4초 안에 안 오면 저장해 둔 파일로 바로 열어요 (새 파일은 뒤에서 받아 다음에 써요)
  // 방금 응답이 없었으면 30초 동안은 기다리지 않고 저장해 둔 파일부터 써요 (여러 파일을 하나씩 기다리지 않게)
  const wait = Date.now() < slowUntil ? 0 : 4000;
  e.respondWith(timed(net, wait).then((r) => { slowUntil = 0; return r; }, () => {
    if (wait) slowUntil = Date.now() + 30000;
    return fromCache().then((m) => m || net.catch(() => Response.error()));
  }));
});
