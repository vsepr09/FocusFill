/* FocusFill — 도파민 디톡스 기록 (ProFill과 같은 계정) */
(() => {
  'use strict';

  /* ====================== 상수 ====================== */
  const APP_VERSION = '1.3.0';
  const EMAIL_DOMAIN = 'iasa-protein.app'; // ProFill과 같은 규칙: 아이디@도메인 (메일은 보내지 않음)
  const ID_RE = /^[a-z0-9_]{3,20}$/;
  const PROFILL_URL = 'https://vsepr09.github.io/ProFill/';
  const C = {
    users: 'focusfill_users',      // 비공개 (본인만)
    pub: 'focusfill_public',       // 친구에게 보이는 정보
    codes: 'focusfill_codes',      // 친구 코드 → uid
    req: 'focusfill_friendreq',    // 친구 요청/관계
  };
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const MILESTONES = [
    { id: 'h1', ms: HOUR, label: '1시간', short: '1H', bonus: 5 },
    { id: 'd1', ms: DAY, label: '1일', short: '1D', bonus: 20 },
    { id: 'd3', ms: 3 * DAY, label: '3일', short: '3D', bonus: 40 },
    { id: 'd7', ms: 7 * DAY, label: '7일', short: '7D', bonus: 80 },
    { id: 'd14', ms: 14 * DAY, label: '14일', short: '14D', bonus: 120 },
    { id: 'd30', ms: 30 * DAY, label: '30일', short: '30D', bonus: 200 },
    { id: 'd50', ms: 50 * DAY, label: '50일', short: '50D', bonus: 300 },
    { id: 'd100', ms: 100 * DAY, label: '100일', short: '100D', bonus: 500 },
  ];
  const XP = { hour: 1, urgeWin: 10, journal: 5, comeback: 15, monthGoal: 50, pledge: 5, check: 10 };
  // 연속 배수: 오래 버틸수록 모든 보상이 커져요 (시험 기간엔 여기에 2배 더)
  const MULT_TIERS = [{ ms: 30 * DAY, x: 2, label: '30일' }, { ms: 7 * DAY, x: 1.5, label: '7일' }, { ms: 3 * DAY, x: 1.2, label: '3일' }];
  const ATTEND_REWARDS = [5, 5, 10, 10, 15, 15, 50];
  const PLEDGES = ['오늘은 쇼츠 안 보기', '공부할 땐 기기 멀리 두기', '자기 전 30분 화면 끄기', '충동이 오면 참기 누르기', '쉬는 시간엔 화면 대신 걷기'];
  const PLEDGE_CHECK_HOUR = 16;
  const PLEDGE_MAX = 5, PLEDGE_XP_MAX = 3;
  const GOAL_MAX = 5;
  const EXAM_LEAD_DAYS = 14;   // 시험 시작 2주 전부터 시험 기간
  const TIERS = { c: { name: '일반', xp: 15, star: '★' }, r: { name: '희귀', xp: 50, star: '★★' }, l: { name: '전설', xp: 150, star: '★★★' } };
  const ACHS = [
    { id: 'urge1', cat: '참기', tier: 'c', key: 'wins', need: 1, name: '첫 승리', desc: '참기 첫 성공' },
    { id: 'urge10', cat: '참기', tier: 'c', key: 'wins', need: 10, name: '버티는 손', desc: '참기 10번 성공' },
    { id: 'urge50', cat: '참기', tier: 'r', key: 'wins', need: 50, name: '충동 사냥꾼', desc: '참기 50번 성공' },
    { id: 'urge100', cat: '참기', tier: 'l', key: 'wins', need: 100, name: '흔들리지 않는 마음', desc: '참기 100번 성공' },
    { id: 'triple', cat: '참기', tier: 'r', key: 'maxDayWins', need: 3, name: '하루 세 번', desc: '하루에 참기 3번 성공' },
    { id: 'risk5', cat: '참기', tier: 'r', key: 'riskWins', need: 5, name: '위기의 순간', desc: '위험 시간대에 참기 5번 성공' },
    { id: 'j1', cat: '기록', tier: 'c', key: 'journals', need: 1, name: '첫 줄', desc: '첫 일기 쓰기' },
    { id: 'j7', cat: '기록', tier: 'c', key: 'jBest', need: 7, name: '일주일 일기', desc: '일기 7일 연속' },
    { id: 'j30', cat: '기록', tier: 'r', key: 'jBest', need: 30, name: '한 달 일기', desc: '일기 30일 연속' },
    { id: 'j100', cat: '기록', tier: 'l', key: 'journals', need: 100, name: '기록하는 사람', desc: '일기 100개' },
    { id: 'sit10', cat: '기록', tier: 'c', key: 'sitResets', need: 10, name: '나를 아는 중', desc: '상황까지 고른 종료 기록 10번' },
    { id: 'cb1', cat: '회복', tier: 'c', key: 'comebacks', need: 1, name: '다시 일어서기', desc: '재도전 목표 첫 달성' },
    { id: 'cb5', cat: '회복', tier: 'r', key: 'comebacks', need: 5, name: '오뚝이', desc: '재도전 목표 5번 달성' },
    { id: 'cb15', cat: '회복', tier: 'l', key: 'comebacks', need: 15, name: '절대 포기 안 함', desc: '재도전 목표 15번 달성' },
    { id: 'rec3', cat: '회복', tier: 'r', key: 'recordBreaks', need: 3, name: '기록 경신', desc: '최장 기록을 3번 갈아치우기' },
    { id: 'goal1', cat: '목표', tier: 'c', key: 'goalsDone', need: 1, name: '목표 달성', desc: '이번 달 목표 첫 달성' },
    { id: 'goal3', cat: '목표', tier: 'r', key: 'goalsDone', need: 3, name: '목표 수집가', desc: '월 목표 3개 달성' },
    { id: 'goal10', cat: '목표', tier: 'l', key: 'goalsDone', need: 10, name: '목표 장인', desc: '월 목표 10개 달성' },
    { id: 'goalAll', cat: '목표', tier: 'r', key: 'goalAllMonths', need: 1, name: '올클리어', desc: '한 달 목표 3개 이상을 모두 달성' },
    { id: 'goalrun3', cat: '목표', tier: 'l', key: 'goalRun', need: 3, name: '세 달 연속', desc: '3달 연속으로 월 목표 달성' },
    { id: 'keep7', cat: '다짐', tier: 'c', key: 'kept', need: 7, name: '약속 지키기', desc: '다짐 7번 지키기' },
    { id: 'keep30', cat: '다짐', tier: 'r', key: 'kept', need: 30, name: '말한 대로', desc: '다짐 30번 지키기' },
    { id: 'keep100', cat: '다짐', tier: 'l', key: 'kept', need: 100, name: '약속의 사람', desc: '다짐 100번 지키기' },
    { id: 'keepDay3', cat: '다짐', tier: 'r', key: 'allKeptDays', need: 1, name: '완벽한 하루', desc: '하루 다짐 3개 이상을 모두 지키기' },
    { id: 'f1', cat: '친구', tier: 'c', key: 'friends', need: 1, name: '함께라면', desc: '첫 친구 추가' },
    { id: 'f3', cat: '친구', tier: 'r', key: 'friends', need: 3, name: '디톡스 크루', desc: '친구 3명' },
    { id: 'top1', cat: '친구', tier: 'r', key: 'top1', need: 1, name: '1등', desc: '친구 순위에서 진행 시간 1등' },
    { id: 'att7', cat: '꾸준함', tier: 'c', key: 'attBest', need: 7, name: '개근', desc: '출석 7일 연속' },
    { id: 'att30', cat: '꾸준함', tier: 'r', key: 'attBest', need: 30, name: '한 달 개근', desc: '출석 30일 연속' },
    { id: 'att100', cat: '꾸준함', tier: 'l', key: 'attTotal', need: 100, name: '백 일', desc: '출석 총 100일' },
    { id: 'lv5', cat: '꾸준함', tier: 'c', key: 'level', need: 5, name: '레벨 5', desc: '레벨 5 달성' },
    { id: 'lv10', cat: '꾸준함', tier: 'r', key: 'level', need: 10, name: '레벨 10', desc: '레벨 10 달성' },
    { id: 'lv20', cat: '꾸준함', tier: 'l', key: 'level', need: 20, name: '레벨 20', desc: '레벨 20 달성' },
    { id: 'exam1', cat: '시험', tier: 'l', key: 'examClean', need: 1, name: '시험 기간 완주', desc: '시험 기간을 종료 없이 버티기' },
    { id: 'exam3', cat: '시험', tier: 'l', key: 'examClean', need: 3, name: '시험의 달인', desc: '시험 기간 3번을 종료 없이 버티기' },
  ];
  const SITUATIONS = ['심심함', '피곤함', '스트레스', '혼자 있음', '잠들기 전', '할 일 미루는 중'];
  const GOAL_TYPES = {
    resets_max: { name: '종료 횟수', short: '종료', unit: '번 이하', def: 3, max: true, desc: '이번 달 종료 횟수를 이 안으로' },
    okdays_min: { name: '지킨 날', short: '종료 없이 지킨 날', unit: '일 이상', def: 20, desc: '종료 없이 디톡스한 날을 이만큼' },
    streak_min: { name: '연속 버티기', short: '한 번에 버티기', unit: '일 이상', def: 7, desc: '이번 달 안에서 한 번에 이만큼 이어서 버티기' },
    wins_min: { name: '참기 성공', short: '참기 성공', unit: '번 이상', def: 10, desc: '충동을 이만큼 이겨내기' },
    pledge_min: { name: '다짐 지키기', short: '다짐 지키기', unit: '번 이상', def: 20, desc: '오늘의 다짐을 이만큼 지키기' },
    attend_min: { name: '출석', short: '출석', unit: '일 이상', def: 25, desc: '출석 보상을 이만큼 받기' },
    journal_min: { name: '일기', short: '일기 쓰기', unit: '일 이상', def: 15, desc: '한 줄 일기를 이만큼 쓰기' },
  };
  const TITLES = ['새싹', '견습 수행자', '집중 입문자', '절제 수련생', '루틴 지킴이', '도파민 사냥꾼', '몰입 장인', '절제의 달인', '마인드 마스터', '전설의 수도승'];
  const BASE_TARGETS = ['쇼츠', '게임', '웹툰', 'SNS'];
  const MALE_TARGETS = ['야동', '딸'];
  const DEFAULT_ACTIVITIES = [
    '물 한 잔 마시기', '1분 스트레칭', '문제 하나 풀기', '창밖 보며 심호흡 10번', '책상 정리하기',
    '팔굽혀펴기 10개', '내일 할 일 3개 적기', '친구한테 말 걸기', '세수하고 오기', '좋아하는 노래 한 곡 듣기',
  ];
  const FALLBACK_QUOTE = '오늘 하루를 내가 고른 것들로 채우자.';
  const MOODS = ['😀', '🙂', '😐', '😕', '😣'];
  const BUCKETS = [
    { label: '새벽', from: 0, to: 6 }, { label: '오전', from: 6, to: 12 },
    { label: '오후', from: 12, to: 18 }, { label: '저녁·밤', from: 18, to: 24 },
  ];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const ICON = {
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/></svg>',
  };

  /* ====================== 도우미 ====================== */
  const $ = (id) => document.getElementById(id);
  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idOf = (email) => (email || '').split('@')[0];
  const now = () => Date.now();
  const uid6 = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function addDays(ts, n) { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); }
  function dateKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function keyTs(k) { return new Date(k + 'T00:00:00').getTime(); }
  function weekStart(ts) { const d = new Date(dayStart(ts)); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d.getTime(); }
  function weekKey(ts = now()) { return dateKey(weekStart(ts)); }
  function monthKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
  function monthRange(mk) { const [y, m] = mk.split('-').map(Number); return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]; }
  function nextMonthKey(mk) { const [y, m] = mk.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; }
  function hourRange(from) { return `${from}–${(from + 3) % 24 || 24}시`; }
  // 받침에 따라 이/가 고르기
  function iga(word) {
    const c = String(word).trim().slice(-1).charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return word + ((c - 0xAC00) % 28 ? '이' : '가');
    return word + '가';
  }
  function hm(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function md(ts) { const d = new Date(ts); return `${d.getMonth() + 1}월 ${d.getDate()}일`; }
  function mdShort(ts) { const d = new Date(ts); return `${d.getMonth() + 1}.${d.getDate()}`; }

  function fmtDur(ms) {
    ms = Math.max(0, ms);
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN);
    if (d) return `${d}일 ${h}시간`;
    if (h) return `${h}시간 ${m}분`;
    return `${m}분`;
  }
  function fmtLive(ms) {
    ms = Math.max(0, ms);
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
    return (d ? `${d}일 ` : '') + `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  const levelOf = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1;
  const xpForLevel = (lv) => 25 * (lv - 1) * (lv - 1);
  const titleOf = (lv) => TITLES[Math.min(TITLES.length - 1, lv - 1)];

  /* ====================== 저장소 ====================== */
  const cfg = window.FIREBASE_CONFIG || {};
  const useFirebase = !!(cfg.apiKey && !String(cfg.apiKey).startsWith('YOUR'));
  function authError(code) { const e = new Error(code); e.code = code; return e; }

  // 테스트 모드: 모든 데이터를 이 브라우저에만 저장 (여러 계정 테스트 가능)
  function LocalBackend() {
    const KEY = 'focusfill_local_v1';
    let s;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s) s = { accounts: {}, session: null, docs: {} };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
    let listener = () => {};
    const userOf = (uid) => {
      if (!uid) return null;
      const email = Object.keys(s.accounts).find((k) => s.accounts[k].uid === uid);
      return { uid, email };
    };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const children = (col) => Object.keys(s.docs)
      .filter((p) => p.startsWith(col + '/') && !p.slice(col.length + 1).includes('/'))
      .map((p) => ({ id: p.slice(col.length + 1), ...clone(s.docs[p]) }));
    return {
      mode: 'local',
      onAuth(cb) { listener = cb; cb(userOf(s.session)); },
      async signUp(email, pw) {
        if (s.accounts[email]) throw authError('auth/email-already-in-use');
        const uid = 'u' + uid6();
        s.accounts[email] = { pw, uid }; s.session = uid; save(); listener(userOf(uid));
      },
      async signIn(email, pw) {
        const a = s.accounts[email];
        if (!a || a.pw !== pw) throw authError('auth/invalid-credential');
        s.session = a.uid; save(); listener(userOf(a.uid));
      },
      async signOut() { s.session = null; save(); listener(null); },
      async get(path) { return s.docs[path] ? clone(s.docs[path]) : null; },
      async set(path, data) { s.docs[path] = { ...(s.docs[path] || {}), ...clone(data) }; save(); },
      async put(path, data) { s.docs[path] = clone(data); save(); },
      async add(col, data) { const id = uid6(); s.docs[col + '/' + id] = clone(data); save(); return id; },
      async del(path) { delete s.docs[path]; save(); },
      async list(col) { return children(col); },
      async query(col, field, value) { return children(col).filter((d) => d[field] === value); },
    };
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = src; el.onload = res; el.onerror = () => rej(new Error('load ' + src));
      document.head.appendChild(el);
    });
  }

  async function FirebaseBackend() {
    const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
    firebase.initializeApp(cfg);
    const auth = firebase.auth(), fs = firebase.firestore();
    try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return {
      mode: 'firebase',
      onAuth(cb) { auth.onAuthStateChanged((u) => cb(u ? { uid: u.uid, email: u.email } : null)); },
      signUp: (e, p) => auth.createUserWithEmailAndPassword(e, p),
      signIn: (e, p) => auth.signInWithEmailAndPassword(e, p),
      signOut: () => auth.signOut(),
      async get(path) { const d = await fs.doc(path).get(); return d.exists ? d.data() : null; },
      set: (path, data) => fs.doc(path).set(data, { merge: true }),
      put: (path, data) => fs.doc(path).set(data),
      async add(col, data) { const r = await fs.collection(col).add(data); return r.id; },
      del: (path) => fs.doc(path).delete(),
      async list(col) { return docs(await fs.collection(col).get()); },
      async query(col, field, value) { return docs(await fs.collection(col).where(field, '==', value).get()); },
    };
  }

  const AUTH_ERR = {
    'auth/email-already-in-use': '이미 있는 아이디예요. ProFill 계정이면 로그인으로 들어오세요.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
    'auth/too-many-requests': '시도가 너무 많았어요. 잠시 뒤 다시 해 주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  };
  function authMsg(e) {
    const code = e && e.code;
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials', 'auth/invalid-email'].includes(code)) return '아이디 또는 비밀번호가 맞지 않아요.';
    return AUTH_ERR[code] || `처리하지 못했어요 (${code || '알 수 없음'}).`;
  }

  /* ====================== 상태 ====================== */
  let db = null;          // 저장소
  let me = null;          // { uid, email }
  let U = null;           // 내 비공개 문서
  const S = { streaks: [], urges: [], journal: {} };   // 내 기록 (streaks = 끝난 디톡스 구간)
  const F = { list: [], incoming: [], outgoing: [], rank: 'time', loaded: false, loading: false, msg: '' };
  const ui = { tab: 'home', recTab: 'report', calMonth: null, selDay: null, weekOff: 1, monthOff: 1, year: null, editJournal: false, mood: null, journalAll: false };
  let tickTimer = null;

  const userPath = () => `${C.users}/${me.uid}`;
  const pubPath = () => `${C.pub}/${me.uid}`;
  const isActive = () => U && U.startAt != null;   // 디톡스 진행 중인지 (종료 후 시작 전이면 false)
  const curMs = () => (isActive() ? Math.max(0, now() - U.startAt) : 0);

  function normalize(u) {
    const d = {
      nickname: idOf(me.email), gender: 'none', targets: [...BASE_TARGETS], activities: [...DEFAULT_ACTIVITIES],
      urgeMinutes: 10, startAt: null, endedAt: null, lastDur: 0, bestMs: 0, urgeWins: 0, urge: null, xp: 0, xpHours: 0, badges: {},
      quotes: [], share: { time: true, best: true, level: true, badges: true, urges: true },
      reportSeen: '', monthSeen: '', yearSeen: null, friendCode: '', codeOk: false,
      riskOn: true, comeback: null, monthGoals: {}, exams: [],
      attend: {}, daily: {}, achievements: {},
      comebackDone: 0, recordBreaks: 0, maxFriends: 0, wasTop1: false,
    };
    const out = { ...d, ...u };
    out.share = { ...d.share, ...(u.share || {}) };
    out.badges = u.badges || {};
    out.attend = u.attend || {};
    out.daily = u.daily || {};
    out.achievements = u.achievements || {};
    // 이번 달 목표: 예전 버전(달마다 하나) → 여러 개
    const mg = {};
    Object.entries(u.monthGoals || {}).forEach(([mk, g]) => {
      mg[mk] = (Array.isArray(g) ? g : [g]).filter(Boolean).map((x, i) => ({ id: x.id || `g${i}`, ...x }));
    });
    out.monthGoals = mg;
    // 시험: 예전 버전(하나) → 여러 개
    out.exams = Array.isArray(u.exams) ? u.exams : (u.exam && u.exam.start ? [{ id: 'e0', ...u.exam }] : []);
    if (u.startAt === undefined) out.startAt = now();
    if (!out.trackStart) out.trackStart = Math.min(out.startAt || now(), u.createdAt || now());
    return out;
  }

  /* ====================== 화면 전환 / 공통 UI ====================== */
  const SCREENS = ['screen-loading', 'screen-auth', 'screen-onboard', 'screen-app'];
  function go(id) { SCREENS.forEach((s) => (s === id ? show($(s)) : hide($(s)))); }

  let toastTimer = null;
  function toast(text, action, ms = 2600) {
    $('toast-text').textContent = text;
    const btn = $('toast-btn');
    if (action) { show(btn); btn.onclick = () => { hideToast(); action(); }; } else hide(btn);
    show($('toast'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms);
  }
  function hideToast() { hide($('toast')); clearTimeout(toastTimer); }

  function openSheet(html, bind) {
    $('sheet-body').innerHTML = html;
    show($('modal-sheet'));
    if (bind) bind($('sheet-body'));
  }
  function closeSheet() { hide($('modal-sheet')); }
  function confirmSheet(title, body, okLabel, onOk, danger = true) {
    openSheet(`<h2>${esc(title)}</h2><p class="muted">${esc(body)}</p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-ok type="button">${esc(okLabel)}</button></div>`,
    (el) => {
      el.querySelector('[data-close]').onclick = closeSheet;
      el.querySelector('[data-ok]').onclick = async () => { closeSheet(); await onOk(); };
    });
  }

  // 축하 화면 (배지, 재도전, 목표, 업적, 시험)
  const celQueue = [];
  let celOn = false;
  function celebrate(o) { celQueue.push(o); if (!celOn) nextCelebrate(); }
  function nextCelebrate() {
    const o = celQueue.shift();
    if (!o) { celOn = false; hide($('celebrate')); return; }
    celOn = true;
    $('cel-medal').textContent = o.medal;
    $('cel-medal').className = 'cel-medal' + (o.kind ? ' ' + o.kind : '');
    $('cel-kicker').textContent = o.kicker || '';
    $('cel-title').textContent = o.title;
    $('cel-sub').textContent = o.sub || '';
    $('cel-xp').textContent = o.xp ? `+${o.xp} XP` : '';
    show($('celebrate'));
    confetti();
  }
  function confetti() {
    const cv = $('confetti');
    if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const ctx = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const colors = [css.getPropertyValue('--accent'), css.getPropertyValue('--heat-2'), css.getPropertyValue('--heat-1'), '#FFD166', '#ffffff'].map((c) => c.trim() || '#D9480F');
    const parts = Array.from({ length: 110 }, () => ({
      x: Math.random() * cv.width, y: -20 * dpr - Math.random() * cv.height * 0.5,
      w: (6 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr,
      vy: (2 + Math.random() * 3.5) * dpr, vx: (Math.random() - 0.5) * 2.5 * dpr,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t - t0 < 3200 && celOn) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  function applyTheme(t) {
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    try { if (t === 'dark' || t === 'light') localStorage.setItem('focusfill_theme', t); else localStorage.removeItem('focusfill_theme'); } catch (e) {}
    const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    const btn = $('theme-btn');
    if (btn) { btn.innerHTML = dark ? ICON.sun : ICON.moon; btn.setAttribute('aria-label', dark ? '라이트 모드로' : '다크 모드로'); }
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = dark ? '#121110' : '#F4F3F1';
  }
  function currentTheme() {
    try { return localStorage.getItem('focusfill_theme') || 'system'; } catch (e) { return 'system'; }
  }

  /* ====================== 저장 ====================== */
  async function saveUser(fields) {
    Object.assign(U, fields);
    try { await db.set(userPath(), fields); }
    catch (e) { toast(navigator.onLine === false ? '인터넷이 끊겨 있어요. 연결되면 다시 저장해요.' : '저장하지 못했어요. 다시 시도해 주세요.'); throw e; }
  }

  function weekWins() {
    const ws = weekStart(now());
    return S.urges.filter((u) => u.result === 'win' && u.at >= ws).length;
  }
  function publicData() {
    const sh = U.share;
    return {
      nickname: U.nickname,
      startAt: sh.time && isActive() ? U.startAt : null,
      paused: sh.time ? !isActive() : null,
      bestMs: sh.best ? U.bestMs : null,
      level: sh.level ? levelOf(U.xp) : null,
      badges: sh.badges ? Object.keys(U.badges).length : null,
      weekWins: sh.urges ? weekWins() : null,
      weekKey: weekKey(),
      updatedAt: now(),
    };
  }
  let pubTimer = null;
  function savePublic(immediate) {
    clearTimeout(pubTimer);
    const run = () => db.set(pubPath(), publicData()).catch(() => {});
    if (immediate) return run();
    pubTimer = setTimeout(run, 800);
  }

  async function addXp(n) {
    const before = levelOf(U.xp);
    U.xp = (U.xp || 0) + n;
    const after = levelOf(U.xp);
    if (after > before) setTimeout(() => toast(`레벨 업! Lv.${after} ${titleOf(after)}`), 400);
    return after > before;
  }

  /* ====================== 로그인 ====================== */
  let authMode = 'login';
  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll('#auth-seg .seg-btn').forEach((x) => x.classList.toggle('active', x.dataset.mode === mode));
    const signup = mode === 'signup';
    $('auth-pw2-wrap').classList.toggle('hidden', !signup);
    $('auth-submit').textContent = signup ? '가입하기' : '로그인';
    $('auth-pw').autocomplete = signup ? 'new-password' : 'current-password';
    $('auth-hint').textContent = signup
      ? '비밀번호는 찾을 수 없으니 꼭 기억해 주세요. ProFill 계정이 있다면 가입 말고 로그인하세요.'
      : 'ProFill 아이디와 비밀번호로 바로 로그인할 수 있어요.';
    $('auth-error').textContent = '';
  }
  function setupAuth() {
    document.querySelectorAll('#auth-seg .seg-btn').forEach((b) => { b.onclick = () => setAuthMode(b.dataset.mode); });
    $('auth-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const id = $('auth-id').value.trim().toLowerCase();
      const pw = $('auth-pw').value;
      const err = $('auth-error');
      err.textContent = '';
      if (!ID_RE.test(id)) { err.textContent = '아이디는 영어 소문자, 숫자, _ 로 3–20자예요.'; return; }
      if (pw.length < 6) { err.textContent = '비밀번호는 6자 이상이어야 해요.'; return; }
      if (authMode === 'signup' && pw !== $('auth-pw2').value) { err.textContent = '비밀번호 확인이 일치하지 않아요.'; return; }
      const email = `${id}@${EMAIL_DOMAIN}`;
      const btn = $('auth-submit'); btn.disabled = true; btn.textContent = '잠시만요';
      try {
        if (authMode === 'signup') await db.signUp(email, pw); else await db.signIn(email, pw);
      } catch (e) { err.textContent = authMsg(e); }
      btn.disabled = false; btn.textContent = authMode === 'signup' ? '가입하기' : '로그인';
    };
  }

  /* ====================== 온보딩 ====================== */
  const ob = { step: 0, gender: null, targets: [], custom: [], start: null };
  const OB_STEPS = 4;
  function obAllTargets() {
    const list = [...BASE_TARGETS];
    if (ob.gender === 'male') list.push(...MALE_TARGETS);
    ob.custom.forEach((t) => { if (!list.includes(t)) list.push(t); });
    return list;
  }
  function renderObTargets() {
    $('ob-targets').innerHTML = obAllTargets().map((t) =>
      `<button type="button" class="chip${ob.targets.includes(t) ? ' selected' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    $('ob-targets').querySelectorAll('.chip').forEach((c) => {
      c.onclick = () => {
        const t = c.dataset.t;
        ob.targets = ob.targets.includes(t) ? ob.targets.filter((x) => x !== t) : [...ob.targets, t];
        renderObTargets();
      };
    });
  }
  function obShow() {
    document.querySelectorAll('.ob-step').forEach((s) => s.classList.toggle('active', +s.dataset.step === ob.step));
    $('ob-dots').innerHTML = Array.from({ length: OB_STEPS }, (_, i) => `<span class="${i <= ob.step ? 'on' : ''}"></span>`).join('');
    $('ob-back').style.visibility = ob.step === 0 ? 'hidden' : 'visible';
    $('ob-next').textContent = ob.step === OB_STEPS - 1 ? '시작하기' : '다음';
    $('ob-error').textContent = '';
    if (ob.step === 2) renderObTargets();
  }
  const obError = (m) => { $('ob-error').textContent = m; };
  function toLocalInput(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }

  function setupOnboarding() {
    document.querySelectorAll('#ob-gender .choice').forEach((b) => {
      b.onclick = () => {
        const prev = ob.gender;
        ob.gender = b.dataset.v;
        document.querySelectorAll('#ob-gender .choice').forEach((x) => x.classList.toggle('selected', x === b));
        if (ob.gender === 'male' && prev !== 'male') MALE_TARGETS.forEach((t) => { if (!ob.targets.includes(t)) ob.targets.push(t); });
        if (ob.gender !== 'male') ob.targets = ob.targets.filter((t) => !MALE_TARGETS.includes(t) || ob.custom.includes(t));
      };
    });
    const addTarget = () => {
      const v = $('ob-target-input').value.trim();
      if (!v) return;
      if (!obAllTargets().includes(v)) ob.custom.push(v);
      if (!ob.targets.includes(v)) ob.targets.push(v);
      $('ob-target-input').value = '';
      renderObTargets();
    };
    $('ob-target-add').onclick = addTarget;
    $('ob-target-input').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addTarget(); } };
    document.querySelectorAll('#ob-start .choice').forEach((b) => {
      b.onclick = () => {
        ob.start = b.dataset.v;
        document.querySelectorAll('#ob-start .choice').forEach((x) => x.classList.toggle('selected', x === b));
        const inp = $('ob-start-time');
        if (ob.start === 'past') {
          show(inp); inp.max = toLocalInput(new Date());
          if (!inp.value) inp.value = toLocalInput(new Date(now() - DAY));
        } else hide(inp);
      };
    });
    $('ob-back').onclick = () => { if (ob.step > 0) { ob.step--; obShow(); } };
    $('ob-next').onclick = async () => {
      if (ob.step === 0 && !$('ob-nick').value.trim()) return obError('닉네임을 입력해 주세요.');
      if (ob.step === 1 && !ob.gender) return obError('하나를 골라주세요.');
      if (ob.step === 2 && !ob.targets.length) return obError('하나 이상 골라주세요.');
      if (ob.step < OB_STEPS - 1) { ob.step++; return obShow(); }
      if (!ob.start) return obError('시작 방법을 골라주세요.');
      let startAt = now();
      if (ob.start === 'past') {
        const t = new Date($('ob-start-time').value).getTime();
        if (!t || t > now()) return obError('지금보다 이전 시각을 입력해 주세요.');
        startAt = t;
      }
      $('ob-next').disabled = true;
      try { await finishOnboarding(startAt); } catch (e) { obError('저장하지 못했어요. 다시 시도해 주세요.'); }
      $('ob-next').disabled = false;
    };
  }

  function resetOnboarding(nick) {
    Object.assign(ob, { step: 0, gender: null, targets: [...BASE_TARGETS], custom: [], start: null });
    $('ob-nick').value = nick || '';
    document.querySelectorAll('#screen-onboard .choice').forEach((x) => x.classList.remove('selected'));
    hide($('ob-start-time'));
  }

  // 온보딩은 기존 문서(친구 코드 등)를 살리면서 새로 시작
  let obKeep = {};
  async function finishOnboarding(startAt) {
    const ordered = obAllTargets().filter((t) => ob.targets.includes(t));
    const data = {
      ...obKeep,
      nickname: $('ob-nick').value.trim().slice(0, 12), gender: ob.gender, targets: ordered,
      activities: [...DEFAULT_ACTIVITIES], urgeMinutes: 10, startAt, trackStart: startAt, endedAt: null, lastDur: 0,
      bestMs: 0, urgeWins: 0, urge: null, xp: 0, xpHours: 0, badges: {}, onboarded: true, createdAt: now(),
    };
    U = normalize(data);
    await db.put(userPath(), U);
    S.streaks = []; S.urges = []; S.journal = {};
    obKeep = {};
    await enterApp();
  }

  /* ====================== 친구 코드 ====================== */
  function makeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }
  async function ensureCode() {
    if (U.codeOk && U.friendCode) return;
    let code = U.friendCode || makeCode();
    for (let i = 0; i < 6; i++) {
      let ex = null;
      try { ex = await db.get(`${C.codes}/${code}`); } catch (e) { ex = null; }
      if (!ex || ex.uid === me.uid) break;
      code = makeCode();
    }
    await db.set(`${C.codes}/${code}`, { uid: me.uid, nickname: U.nickname });
    await saveUser({ friendCode: code, codeOk: true });
  }

  /* ====================== 앱 진입 ====================== */
  async function loadRecords() {
    const [streaks, urges, journal] = await Promise.all([
      db.list(`${userPath()}/streaks`).catch(() => []),
      db.list(`${userPath()}/urges`).catch(() => []),
      db.list(`${userPath()}/journal`).catch(() => []),
    ]);
    S.streaks = streaks.sort((a, b) => a.end - b.end);
    S.urges = urges.sort((a, b) => a.at - b.at);
    S.journal = {};
    journal.forEach((j) => { S.journal[j.id] = j; });
  }

  async function enterApp() {
    go('screen-app');
    $('top-name').textContent = U.nickname;
    applyTheme(currentTheme());
    ui.calMonth = null; ui.selDay = dateKey(now()); ui.editJournal = false; ui.mood = null; ui.journalAll = false;
    ui.weekOff = U.trackStart < weekStart(now()) ? 1 : 0;
    ui.monthOff = U.trackStart < monthRange(monthKey(now()))[0] ? 1 : 0;
    ui.recTab = 'report'; ui.year = null;
    F.loaded = false;
    switchTab('home');
    startTick();
    if (U.urge && isActive()) openUrge(true);
    ensureCode().then(() => savePublic(true)).catch(() => savePublic(true));
    setTimeout(() => { checkGoals(); checkAchievements(); }, 600);
    loadFriends(true);
  }

  function startTick() {
    clearInterval(tickTimer);
    tick();
    tickTimer = setInterval(tick, 1000);
  }

  /* ====================== 매초 갱신 ====================== */
  let lastDay = dateKey(now());
  let lastHour = new Date().getHours();
  function tick() {
    if (!U) return;
    const t = now();
    if (ui.tab === 'home') updateHero();
    if (ui.tab === 'friends') document.querySelectorAll('[data-live]').forEach((el) => {
      el.textContent = fmtLive(t - Number(el.dataset.live));
    });
    if (U.urge) renderUrge();
    if (isActive()) checkProgress(curMs());
    if (Math.floor(t / 1000) % 30 === 0) checkAchievements();
    const dk = dateKey(t);
    if (dk !== lastDay) { lastDay = dk; checkGoals(); if (ui.tab === 'home') renderHome(); }
    const hr = new Date(t).getHours();
    if (hr !== lastHour) { lastHour = hr; if (ui.tab === 'home' && !(document.activeElement && document.activeElement.matches('input'))) renderHome(); }
  }

  /* ====================== 연속 배수 · 시험 기간 ====================== */
  function streakMult(ms) { const t = MULT_TIERS.find((x) => ms >= x.ms); return t ? t.x : 1; }
  function examStatus(e, t = now()) {
    const s = keyTs(e.start), ps = addDays(s, -EXAM_LEAD_DAYS), pe = addDays(keyTs(e.end), 1);
    const dday = Math.round((s - dayStart(t)) / DAY);
    if (t >= pe) return { state: 'over', s, ps, pe, dday };
    if (t >= ps) return { state: 'on', s, ps, pe, dday };
    return { state: 'before', s, ps, pe, dday };
  }
  function examLabel(e, st) { return st.dday > 0 ? `D-${st.dday}` : st.dday === 0 ? 'D-day' : '시험 중'; }
  function activeExam() {
    return U.exams.map((e) => ({ e, st: examStatus(e) })).filter((x) => x.st.state === 'on').sort((a, b) => a.st.s - b.st.s)[0] || null;
  }
  function nextExam() {
    return U.exams.map((e) => ({ e, st: examStatus(e) })).filter((x) => x.st.state === 'before').sort((a, b) => a.st.s - b.st.s)[0] || null;
  }
  const examOn = () => !!activeExam();
  function mult() { return Math.round(streakMult(curMs()) * (examOn() ? 2 : 1) * 10) / 10; }
  async function gain(base) { const n = Math.round(base * mult()); await addXp(n); return n; }
  const fmtX = (x) => `×${Number.isInteger(x) ? x : x.toFixed(1)}`;

  /* ====================== 진행 상황 (경험치·배지·재도전) ====================== */
  let progressBusy = false;
  async function checkProgress(ms) {
    if (progressBusy || !isActive()) return;
    const x = mult();
    const hours = Math.floor(ms / HOUR);
    let gained = 0;
    const fields = {};
    const cels = [];
    if (hours > (U.xpHours || 0)) { gained += Math.round((hours - (U.xpHours || 0)) * XP.hour * x); fields.xpHours = hours; U.xpHours = hours; }
    MILESTONES.forEach((m) => {
      if (ms >= m.ms && !U.badges[m.id]) {
        U.badges[m.id] = now(); fields.badges = U.badges;
        const b = Math.round(m.bonus * x); gained += b;
        cels.push({ medal: m.short, kicker: '배지 획득', title: `${m.label} 버티기 성공!`, sub: `${m.label} 동안 한 번도 무너지지 않았어요.`, xp: b });
      }
    });
    const cb = U.comeback;
    if (cb && cb.startAt === U.startAt && ms >= cb.targetMs) {
      const b = Math.round(XP.comeback * x); gained += b;
      U.comeback = null; fields.comeback = null;
      U.comebackDone = (U.comebackDone || 0) + 1; fields.comebackDone = U.comebackDone;
      cels.push({ medal: '↻', kind: 'alt', kicker: '재도전 목표 달성', title: `${fmtDur(cb.targetMs)} 버텼어요!`, sub: '종료 후 다시 일어섰어요. 이 기세 그대로 가요.', xp: b });
    }
    if (!Object.keys(fields).length) return;
    progressBusy = true;
    if (gained) { await addXp(gained); fields.xp = U.xp; }
    cels.forEach(celebrate);
    try { await saveUser(fields); } catch (e) {}
    savePublic();
    progressBusy = false;
    if (ui.tab === 'home') { if (cels.length) renderHome(); else renderLevelCard(); }
    if (cels.length) checkAchievements();
  }

  /* ====================== 기록 계산 ====================== */
  function intervals() {
    const list = S.streaks.map((s) => ({ start: s.start, end: s.end }));
    if (isActive()) list.push({ start: U.startAt, end: now() });
    return list;
  }
  function overlap(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
  function detoxIn(a, b) { return intervals().reduce((s, iv) => s + overlap(iv.start, iv.end, a, b), 0); }
  function longestIn(a, b) { return Math.max(0, ...intervals().map((iv) => overlap(iv.start, iv.end, a, b))); }
  function endsIn(a, b) { return S.streaks.filter((s) => s.end >= a && s.end < b); }
  function bucketOf(ts) { const h = new Date(ts).getHours(); return BUCKETS.findIndex((b) => h >= b.from && h < b.to); }
  function topOf(counts) {
    let best = null, n = 0;
    Object.keys(counts).forEach((k) => { if (counts[k] > n) { best = k; n = counts[k]; } });
    return best;
  }
  // 종료 없이, 실제로 디톡스한 날인지
  function okDay(d0) {
    const d1 = addDays(d0, 1);
    return !endsIn(d0, d1).length && detoxIn(d0, Math.min(d1, now())) > 0;
  }

  /* ====================== 하루 기록 (출석·다짐) ====================== */
  const dailyOf = (k) => (U.daily && U.daily[k]) || {};
  function pledgesOf(k) {
    const d = dailyOf(k);
    if (Array.isArray(d.pledges)) return d.pledges;
    if (d.pledge) return [{ id: 'p0', text: d.pledge, check: d.check || null, xp: d.checkXp || 0 }];
    return [];
  }
  async function setDaily(k, patch, extra = {}) {
    const daily = { ...(U.daily || {}) };
    daily[k] = { ...(daily[k] || {}), ...patch };
    try { await saveUser({ daily, ...extra }); } catch (e) {}
  }

  /* ====================== 이번 달 목표 (여러 개) ====================== */
  function goalValue(type, a, b) {
    const end = Math.min(b, now());
    let cur = 0;
    if (type === 'resets_max') return endsIn(a, b).length;
    if (type === 'wins_min') return S.urges.filter((u) => u.result === 'win' && u.at >= a && u.at < b).length;
    if (type === 'streak_min') return Math.floor(longestIn(a, end) / DAY);
    for (let d = a; d < end; d = addDays(d, 1)) {
      const k = dateKey(d);
      if (type === 'journal_min' && S.journal[k]) cur++;
      if (type === 'attend_min' && dailyOf(k).att) cur++;
      if (type === 'pledge_min') cur += pledgesOf(k).filter((p) => p.check === 'yes').length;
      if (type === 'okdays_min' && d >= dayStart(U.trackStart) && okDay(d)) cur++;
    }
    return cur;
  }
  function goalStatusOf(mk, g) {
    const [a, b] = monthRange(mk);
    const cur = goalValue(g.type, a, b);
    const ended = b <= now();
    const t = GOAL_TYPES[g.type] || GOAL_TYPES.wins_min;
    let state;
    if (t.max) state = cur > g.n ? 'fail' : ended ? 'done' : 'ongoing';
    else state = cur >= g.n ? 'done' : ended ? 'fail' : 'ongoing';
    return { g, cur, state, daysLeft: Math.max(0, Math.ceil((b - now()) / DAY)) };
  }
  const goalsOf = (mk) => (U.monthGoals[mk] || []).map((g) => goalStatusOf(mk, g));
  function goalLabel(g) { const t = GOAL_TYPES[g.type] || GOAL_TYPES.wins_min; return `${t.short} ${g.n}${t.unit}`; }
  const stateText = (s) => (s === 'done' ? '달성' : s === 'fail' ? '실패' : '진행 중');

  async function checkGoals() {
    if (!U) return;
    const all = { ...U.monthGoals };
    let changed = false;
    for (const mk of Object.keys(all)) {
      const list = all[mk].map((g) => ({ ...g }));
      for (const g of list) {
        const st = goalStatusOf(mk, g);
        if (g.rewarded || st.state !== 'done') continue;
        g.rewarded = now(); changed = true;
        const got = await gain(XP.monthGoal);
        const m = Number(mk.split('-')[1]);
        celebrate({ medal: `${m}월`, kind: 'alt', kicker: '이번 달 목표 달성', title: `${goalLabel(g)} 달성!`, sub: `${m}월 목표를 지켜냈어요.`, xp: got });
      }
      all[mk] = list;
    }
    if (changed) { try { await saveUser({ monthGoals: all, xp: U.xp }); } catch (e) {} savePublic(); checkAchievements(); if (ui.tab === 'home') renderHome(); }
  }

  function openGoalSheet(id) {
    const mk = monthKey(now());
    const list = U.monthGoals[mk] || [];
    const cur = id ? list.find((g) => g.id === id) : null;
    const used = list.filter((g) => !cur || g.id !== cur.id).map((g) => g.type);
    let type = cur ? cur.type : Object.keys(GOAL_TYPES).find((k) => !used.includes(k)) || 'wins_min';
    const m = Number(mk.split('-')[1]);
    openSheet(`<h2>${m}월 목표 ${cur ? '바꾸기' : '추가'}</h2><p class="muted">목표마다 달성하면 +${XP.monthGoal} XP (배수 적용)</p>
      <p class="label">무엇을</p>
      <div class="chips" id="goal-type">${Object.entries(GOAL_TYPES).map(([k, t]) => `<button type="button" class="chip${used.includes(k) ? ' used' : ''}" data-k="${k}" ${used.includes(k) ? 'disabled' : ''}>${t.name}</button>`).join('')}</div>
      <p class="muted small" id="goal-desc" style="margin-top:10px"></p>
      <p class="label">얼마나</p>
      <div class="time-row"><input type="number" id="goal-n" min="1" max="99" inputmode="numeric" style="width:6em" /><span id="goal-unit"></span></div>
      <p class="form-err" id="goal-err"></p>
      <div class="sheet-actions">${cur ? '<button class="btn danger-ghost" data-del type="button">목표 지우기</button>' : '<button class="btn ghost" data-close type="button">취소</button>'}
        <button class="btn primary" data-ok type="button">저장</button></div>`,
    (el) => {
      const sync = () => {
        el.querySelectorAll('#goal-type .chip').forEach((b) => b.classList.toggle('selected', b.dataset.k === type));
        $('goal-unit').textContent = GOAL_TYPES[type].unit;
        $('goal-desc').textContent = GOAL_TYPES[type].desc;
        $('goal-n').value = cur && cur.type === type ? cur.n : GOAL_TYPES[type].def;
      };
      sync();
      el.querySelectorAll('#goal-type .chip').forEach((b) => { b.onclick = () => { if (b.disabled) return; type = b.dataset.k; sync(); }; });
      const c = el.querySelector('[data-close]'); if (c) c.onclick = closeSheet;
      const d = el.querySelector('[data-del]');
      if (d) d.onclick = async () => {
        const goals = { ...U.monthGoals, [mk]: list.filter((g) => g.id !== cur.id) };
        closeSheet(); await saveUser({ monthGoals: goals }).catch(() => {}); renderHome();
      };
      el.querySelector('[data-ok]').onclick = async () => {
        const n = Math.round(Number($('goal-n').value));
        if (!n || n < 1 || n > 99) { $('goal-err').textContent = '1부터 99 사이 숫자로 정해 주세요.'; return; }
        const g = { id: cur ? cur.id : 'g' + uid6(), type, n, setAt: now() };
        const next = cur ? list.map((x) => (x.id === cur.id ? g : x)) : [...list, g];
        closeSheet();
        try { await saveUser({ monthGoals: { ...U.monthGoals, [mk]: next } }); toast(cur ? '목표를 바꿨어요' : '목표를 추가했어요'); } catch (e) {}
        renderHome(); checkGoals();
      };
    });
  }

  /* ====================== 위험 시간대 ====================== */
  function hourCounts() {
    const counts = Array(24).fill(0);
    S.streaks.forEach((r) => { counts[new Date(r.end).getHours()]++; });
    return counts;
  }
  // 3시간 묶음 중 종료가 가장 많은 시간대
  function riskiestWindow() {
    if (S.streaks.length < 3) return null;
    const c = hourCounts();
    let best = -1, from = 0;
    for (let h = 0; h < 24; h++) { const n = c[h] + c[(h + 1) % 24] + c[(h + 2) % 24]; if (n > best) { best = n; from = h; } }
    return best >= 2 ? { from, n: best, total: S.streaks.length } : null;
  }
  // 지금이 위험 시간대인지 (시험 기간엔 더 민감하게)
  function riskNow(ts) {
    const exam = examOn();
    if (!U.riskOn || !isActive() || S.streaks.length < (exam ? 2 : 3)) return null;
    const c = hourCounts(), h = new Date(ts).getHours();
    let best = null;
    for (let k = 0; k < 3; k++) {
      const from = (h - k + 24) % 24;
      const n = c[from] + c[(from + 1) % 24] + c[(from + 2) % 24];
      if (!best || n > best.n) best = { from, n };
    }
    if (best.n < (exam ? 1 : 2) || best.n / S.streaks.length < (exam ? 0.15 : 0.25)) return null;
    return { ...best, total: S.streaks.length };
  }

  /* ====================== 일기 연속 ====================== */
  function journalStreak() {
    let d = dayStart(now());
    if (!S.journal[dateKey(d)]) d = addDays(d, -1);
    let n = 0;
    while (S.journal[dateKey(d)]) { n++; d = addDays(d, -1); }
    return n;
  }
  function journalBest() {
    const keys = Object.keys(S.journal).sort();
    let best = 0, run = 0, prev = null;
    keys.forEach((k) => {
      run = prev != null && dateKey(addDays(prev, 1)) === k ? run + 1 : 1;
      best = Math.max(best, run); prev = keyTs(k);
    });
    return best;
  }

  /* ====================== 탭 ====================== */
  function switchTab(tab) {
    ui.tab = tab;
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
    ['home', 'records', 'friends', 'settings'].forEach((n) => $('page-' + n).classList.toggle('hidden', n !== tab));
    if (tab === 'home') renderHome();
    if (tab === 'records') renderRecords();
    if (tab === 'friends') { renderFriends(); loadFriends(); }
    if (tab === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }

  /* ====================== 오늘의 문장 (매일 아침 8시에 바뀜) ====================== */
  const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  function quoteDayTs() { return now() - 8 * HOUR; }
  function quoteOfDay() {
    const Q = window.FF_QUOTES && window.FF_QUOTES.length ? window.FF_QUOTES : [FALLBACK_QUOTE];
    const d = new Date(quoteDayTs());
    let day = d.getDate();
    if (d.getMonth() === 1 && day === 29) day = 28;
    return Q[(CUM_DAYS[d.getMonth()] + day - 1) % Q.length];
  }
  function myQuoteOfDay() {
    if (!U.quotes || !U.quotes.length) return null;
    const n = Math.floor(dayStart(quoteDayTs()) / DAY);
    return U.quotes[((n % U.quotes.length) + U.quotes.length) % U.quotes.length];
  }

  /* ====================== 출석 ====================== */
  function attendNext() {
    const a = U.attend || {};
    const today = dateKey(now()), yest = dateKey(addDays(dayStart(now()), -1));
    if (a.last === today) return null;
    const streak = a.last === yest ? (a.streak || 0) + 1 : 1;
    const pos = (streak - 1) % 7;
    return { streak, pos, base: ATTEND_REWARDS[pos] };
  }
  function attendCardHtml() {
    const n = attendNext();
    if (!n) return '';
    const x = mult();
    return `<section class="card attend-card">
      <div class="sec-head"><h2>출석 보상</h2><span class="muted small">${n.streak}일째 출석${n.streak > 1 ? ' 연속' : ''}</span></div>
      <div class="att-row">${ATTEND_REWARDS.map((r, i) => `<div class="att${i < n.pos ? ' got' : ''}${i === n.pos ? ' now' : ''}${i === 6 ? ' big' : ''}"><span>${i + 1}일</span><b>+${Math.round(r * x)}</b></div>`).join('')}</div>
      <button class="btn primary wide" data-act="claim-attend" type="button">출석 보상 받기 +${Math.round(n.base * x)} XP</button>
    </section>`;
  }
  async function claimAttend() {
    const n = attendNext();
    if (!n) return;
    const a = U.attend || {};
    const today = dateKey(now());
    const got = await gain(n.base);
    const attend = { last: today, streak: n.streak, total: (a.total || 0) + 1, best: Math.max(a.best || 0, n.streak) };
    const daily = { ...(U.daily || {}) }; daily[today] = { ...(daily[today] || {}), att: 1 };
    try { await saveUser({ attend, daily, xp: U.xp }); } catch (e) {}
    savePublic();
    if (n.pos === 6) celebrate({ medal: '7', kind: 'alt', kicker: '7일 연속 출석', title: '일주일 내내 왔어요!', sub: '내일부터 다시 1일째 보상이 시작돼요.', xp: got });
    else toast(`출석 ${n.streak}일째 (+${got} XP)`);
    renderHome(); checkGoals(); checkAchievements();
  }

  /* ====================== 오늘의 다짐 (여러 개) ====================== */
  function pledgeRow(k, p, canCheck) {
    const x = mult();
    const state = p.check === 'yes' ? `<span class="pl-state yes">${ICON.check}지켰어요 +${p.xp || 0}</span>`
      : p.check === 'no' ? '<span class="pl-state no">못 지켰어요</span>'
        : canCheck ? `<span class="pl-acts"><button class="btn small primary" data-act="check-pledge" data-k="${k}" data-id="${esc(p.id)}" data-v="yes" type="button">지켰어요 +${Math.round(XP.check * x)}</button>
            <button class="btn small ghost" data-act="check-pledge" data-k="${k}" data-id="${esc(p.id)}" data-v="no" type="button">못 지켰어요</button></span>`
          : `<button class="icon-btn small" data-act="del-pledge" data-k="${k}" data-id="${esc(p.id)}" type="button" aria-label="다짐 지우기">${ICON.x}</button>`;
    return `<li class="pl${p.check ? ' ' + p.check : ''}"><span class="pl-text">${esc(p.text)}</span>${state}</li>`;
  }
  function pledgeCardHtml() {
    const k = dateKey(now()), yk = dateKey(addDays(dayStart(now()), -1));
    const list = pledgesOf(k), ylist = pledgesOf(yk).filter((p) => !p.check);
    const hr = new Date().getHours();
    const canCheck = hr >= PLEDGE_CHECK_HOUR;
    const kept = list.filter((p) => p.check === 'yes').length;
    const left = PLEDGE_MAX - list.length;
    const xpLeft = PLEDGE_XP_MAX - (dailyOf(k).pledgeXpCount || 0);
    const unused = PLEDGES.filter((t) => !list.some((p) => p.text === t));
    return `<section class="card pledge-card">
      <div class="sec-head"><h2>오늘의 다짐</h2><span class="muted small">${list.length ? `${kept}/${list.length} 지킴` : `최대 ${PLEDGE_MAX}개`}</span></div>
      ${ylist.length && hr < 12 ? `<p class="pl-sub">어제 다짐, 지켰나요?</p><ul class="pl-list">${ylist.map((p) => pledgeRow(yk, p, true)).join('')}</ul>` : ''}
      ${list.length ? `<ul class="pl-list">${list.map((p) => pledgeRow(k, p, canCheck)).join('')}</ul>` : '<p class="muted small" style="margin-bottom:10px">오늘 지킬 것을 정해요. 저녁에 하나씩 지켰는지 체크해요.</p>'}
      ${list.length && !canCheck && list.some((p) => !p.check) ? `<p class="hint" style="margin-top:6px">오후 ${PLEDGE_CHECK_HOUR - 12}시부터 체크할 수 있어요. 저녁에 못 하면 내일 정오 전까지 해도 돼요.</p>` : ''}
      ${left > 0 ? `<div class="pl-add">
        ${unused.length ? `<div class="chips">${unused.map((p) => `<button type="button" class="chip" data-act="pick-pledge" data-p="${esc(p)}">${ICON.plus}${esc(p)}</button>`).join('')}</div>` : ''}
        <div class="inline-add"><input id="pledge-input" maxlength="40" placeholder="직접 쓰기" /><button class="btn primary" data-act="make-pledge" type="button">다짐 추가${xpLeft > 0 ? ` +${Math.round(XP.pledge * mult())}` : ''}</button></div></div>` : ''}
    </section>`;
  }
  async function makePledge(text) {
    text = (text || '').trim();
    if (!text) { toast('다짐을 적어주세요'); return; }
    const k = dateKey(now());
    const list = pledgesOf(k);
    if (list.length >= PLEDGE_MAX) return toast(`다짐은 하루 ${PLEDGE_MAX}개까지예요`);
    if (list.some((p) => p.text === text)) return toast('이미 있는 다짐이에요');
    const cnt = dailyOf(k).pledgeXpCount || 0;
    let got = 0;
    if (cnt < PLEDGE_XP_MAX) got = await gain(XP.pledge);
    await setDaily(k, { pledges: [...list, { id: 'p' + uid6(), text, check: null, xp: 0, at: now() }], pledge: null, pledgeXpCount: cnt + (got ? 1 : 0) }, { xp: U.xp });
    savePublic();
    toast(got ? `다짐했어요 (+${got} XP)` : '다짐했어요');
    renderHome();
  }
  async function checkPledge(k, id, v) {
    const list = pledgesOf(k).map((p) => ({ ...p }));
    const p = list.find((x) => x.id === id);
    if (!p || p.check) return;
    let got = 0;
    if (v === 'yes') got = await gain(XP.check);
    p.check = v; p.xp = got; p.checkAt = now();
    await setDaily(k, { pledges: list, pledge: null }, { xp: U.xp });
    savePublic();
    toast(v === 'yes' ? `다짐을 지켰어요! (+${got} XP)` : '괜찮아요. 다음엔 꼭!');
    renderHome(); checkGoals(); checkAchievements();
  }
  async function delPledge(k, id) {
    const list = pledgesOf(k).filter((p) => p.id !== id);
    await setDaily(k, { pledges: list, pledge: null });
    renderHome();
  }

  /* ====================== 홈 ====================== */
  function goalsCardHtml() {
    const mk = monthKey(now());
    const list = goalsOf(mk);
    const m = new Date().getMonth() + 1;
    const done = list.filter((s) => s.state === 'done').length;
    const rows = list.map(({ g, cur, state, daysLeft }) => {
      const t = GOAL_TYPES[g.type] || GOAL_TYPES.wins_min;
      const pct = Math.min(100, (cur / g.n) * 100);
      const unit1 = t.unit.slice(0, 1);
      const line = t.max
        ? (state === 'fail' ? `${g.n}번을 넘었어요 (${cur}번)` : `${cur}번 · 앞으로 ${g.n - cur}번까지 괜찮아요`)
        : (state === 'done' ? '달성!' : `${cur}${unit1} / ${g.n}${unit1} · ${daysLeft}일 남음`);
      return `<button type="button" class="goal-row ${state}" data-act="edit-goal" data-id="${esc(g.id)}">
        <span class="goal-top"><b>${goalLabel(g)}</b><span class="goal-state">${stateText(state)}</span></span>
        <span class="bar thin"><span class="fill" style="width:${pct.toFixed(1)}%"></span></span>
        <span class="goal-line">${line}</span></button>`;
    }).join('');
    return `<section class="card goals-card">
      <div class="sec-head"><h2>이번 달 목표</h2><span class="muted small">${list.length ? `${done}/${list.length} 달성` : `${m}월`}</span></div>
      ${list.length ? `<div class="goal-list">${rows}</div>` : `<p class="muted small" style="margin-bottom:10px">${m}월에 지킬 목표를 정해보세요. 목표마다 달성하면 +${XP.monthGoal} XP</p>`}
      ${list.length < GOAL_MAX ? `<button class="btn ${list.length ? 'ghost' : 'primary'} small add-goal" data-act="add-goal" type="button">${ICON.plus}목표 추가</button>` : ''}
    </section>`;
  }

  function examChipHtml() {
    const a = activeExam();
    if (a) return `<span class="exam-chip on">${esc(a.e.name)} ${examLabel(a.e, a.st)} · 보상 2배</span>`;
    const n = nextExam();
    if (n && n.st.dday <= 60) return `<span class="exam-chip">${esc(n.e.name)} D-${n.st.dday}</span>`;
    return '';
  }

  function renderHome() {
    const today = dateKey(now());
    const j = S.journal[today];
    const active = isActive();
    const showReport = U.reportSeen !== weekKey() && U.trackStart < weekStart(now());
    const showMonth = U.monthSeen !== monthKey(now()) && U.trackStart < monthRange(monthKey(now()))[0];
    const yr = yearBannerYear();
    const cbOn = active && U.comeback && U.comeback.startAt === U.startAt;
    const risk = riskNow(now());
    const jStreak = journalStreak();
    const mq = myQuoteOfDay();
    const nextCb = U.lastDur ? Math.max(HOUR, Math.round(U.lastDur / 2 / MIN) * MIN) : 0;
    const hero = active ? `
      <section class="hero">
        <div class="hero-top"><span class="live-dot"></span><span>디톡스 진행 중</span>
          <span class="record-chip hidden" id="h-record">신기록</span>
          <span class="mult-chip hidden" id="h-mult"></span>${examChipHtml()}</div>
        <div class="big"><span class="days"><b id="h-days">0</b><span>일</span></span><span class="clock" id="h-clock">00:00:00</span></div>
        <div class="hero-meta"><span>최장 기록 <b id="h-best">-</b></span><span>시작 <b>${md(U.startAt)} ${hm(U.startAt)}</b></span>
          <span id="h-mult-next"></span>${U.urgeWins ? `<span>충동 <b>${U.urgeWins}번</b> 이겨냄</span>` : ''}</div>
        <div class="badge-progress">
          <div class="bar"><div class="fill" id="h-bar"></div></div>
          <div class="bar-labels"><span id="h-bar-l"></span><span id="h-bar-r"></span></div>
        </div>
        ${cbOn ? `<div class="comeback">
          <div class="cb-head"><span class="cb-tag">재도전 목표</span><b>${fmtDur(U.comeback.targetMs)} 버티기</b><span class="muted small">지난 기록 ${fmtDur(U.comeback.prevMs)}의 절반</span></div>
          <div class="bar thin"><div class="fill" id="cb-bar"></div></div>
          <div class="bar-labels"><span id="cb-l"></span><span id="cb-r"></span></div></div>` : ''}
        <div class="hero-actions">
          <button class="btn primary" data-act="urge" type="button">참기</button>
          <button class="btn danger-ghost hold-btn" data-hold="end" type="button" aria-label="종료 (3초 동안 누르기)"><span class="hold-fill"></span><span class="hold-label">종료<small>3초 꾹</small></span></button>
        </div>
      </section>` : `
      <section class="hero paused">
        <div class="hero-top"><span class="live-dot off"></span><span>디톡스 쉬는 중</span>${examChipHtml()}</div>
        <div class="big"><span class="clock muted-clock" id="p-clock">00:00:00</span></div>
        <div class="hero-meta"><span>${md(U.endedAt || now())} ${hm(U.endedAt || now())}에 종료했어요</span>${U.lastDur ? `<span>지난 기록 <b>${fmtDur(U.lastDur)}</b></span>` : ''}</div>
        <p class="pause-note">쉬는 동안은 디톡스 시간으로 세지 않아요. 준비되면 시작하기를 눌러요.${nextCb ? ` 다시 시작하면 재도전 목표는 <b>${fmtDur(nextCb)}</b>이에요.` : ''}</p>
        <div class="hero-actions single"><button class="btn primary start-btn" data-act="start" type="button">${ICON.play}시작하기</button></div>
      </section>`;
    $('page-home').innerHTML = `${hero}
      <section class="card quote-card"><p class="quote-kicker">오늘의 문장 · 매일 아침 8시에 바뀌어요</p>
        <div class="quote">${esc(quoteOfDay())}</div>
        ${mq ? `<p class="my-quote">내 문구 · ${esc(mq)}</p>` : ''}</section>
      ${attendCardHtml()}
      ${risk ? `<div class="risk-banner"><div class="rb-text"><b>지금은 평소에 자주 무너지는 시간이에요</b>
        <span>${hourRange(risk.from)} · 지금까지 종료 ${risk.total}번 중 ${risk.n}번이 이때였어요</span></div>
        <button class="btn small primary" data-act="urge" type="button">미리 참기</button></div>` : ''}
      ${yr ? `<button class="report-banner" data-act="open-year" data-y="${yr}" type="button"><span>${yr}년 결산이 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${showMonth ? `<button class="report-banner" data-act="open-month" type="button"><span>지난달 리포트가 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${showReport ? `<button class="report-banner" data-act="open-report" type="button"><span>지난주 리포트가 나왔어요</span>${ICON.arrow}</button>` : ''}
      <div class="grid-2">${pledgeCardHtml()}${goalsCardHtml()}</div>
      <div class="grid-2">
        <section class="card" id="level-card"></section>
        <section class="card">
          <div class="sec-head"><h2>한 줄 일기 ${jStreak ? `<span class="streak-chip">${jStreak}일 연속</span>` : ''}</h2>${j && !ui.editJournal ? '<button class="link" data-act="edit-journal" type="button">고치기</button>' : `<span class="muted small">${md(now())}</span>`}</div>
          ${j && !ui.editJournal ? `<div class="journal-view"><span class="m">${esc(j.mood || '📝')}</span><p>${esc(j.text)}</p></div>` : `
            <div class="moods">${MOODS.map((m) => `<button type="button" class="mood${(ui.mood || (j && j.mood)) === m ? ' selected' : ''}" data-mood="${m}">${m}</button>`).join('')}</div>
            <div class="inline-add"><input id="journal-input" maxlength="80" placeholder="오늘 남는 시간에 뭘 했나요?" value="${esc(j ? j.text : '')}" />
            <button class="btn primary" data-act="save-journal" type="button">저장</button></div>
            ${j ? '' : `<p class="hint">${jStreak ? `오늘 쓰면 ${jStreak + 1}일 연속 · ` : ''}처음 쓰면 +${Math.round(XP.journal * mult())} XP</p>`}`}
        </section>
      </div>`;
    renderLevelCard();
    updateHero();
  }

  function renderLevelCard() {
    const el = $('level-card');
    if (!el) return;
    const lv = levelOf(U.xp), cur = xpForLevel(lv), next = xpForLevel(lv + 1);
    const pct = ((U.xp - cur) / (next - cur)) * 100;
    const a = U.attend || {};
    const attOk = a.last === dateKey(now());
    el.innerHTML = `<div class="sec-head"><h2>레벨</h2><span class="muted small">업적 ${Object.keys(U.achievements || {}).filter((k) => ACHS.some((x) => x.id === k)).length}/${ACHS.length} · 배지 ${Object.keys(U.badges).length}/${MILESTONES.length}</span></div>
      <div class="level-row"><span class="lv">Lv.${lv}</span><span class="title">${titleOf(lv)}</span></div>
      <div class="bar thin"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="level-sub"><span>${U.xp} XP</span><span>다음 레벨까지 ${next - U.xp} XP</span></div>
      ${attOk ? `<p class="att-done">출석 ${a.streak}일 연속 · 오늘 출석 완료</p>` : ''}`;
  }

  function updateHero() {
    if (!isActive()) {
      const p = $('p-clock');
      if (p) p.textContent = fmtLive(now() - (U.endedAt || now()));
      return;
    }
    const dEl = $('h-days');
    if (!dEl) return;
    const ms = curMs();
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
    dEl.textContent = d;
    $('h-clock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const best = U.bestMs || 0;
    $('h-best').textContent = best || ms > MIN ? fmtDur(Math.max(best, ms)) : '첫 기록 쌓는 중';
    $('h-record').classList.toggle('hidden', !(best > 0 && ms > best));
    const x = mult();
    $('h-mult').textContent = `보상 ${fmtX(x)}`;
    $('h-mult').classList.toggle('hidden', x <= 1);
    const nextTier = [...MULT_TIERS].reverse().find((t) => t.ms > ms);
    $('h-mult-next').innerHTML = nextTier ? `${nextTier.label}째부터 보상 <b>${fmtX(nextTier.x)}</b>` : '보상 배수 <b>최대</b>';
    const next = MILESTONES.find((y) => y.ms > ms);
    if (next) {
      const i = MILESTONES.indexOf(next);
      const from = i > 0 ? MILESTONES[i - 1].ms : 0;
      $('h-bar').style.width = (((ms - from) / (next.ms - from)) * 100).toFixed(2) + '%';
      $('h-bar-l').innerHTML = `다음 배지 <b>${next.label}</b>`;
      $('h-bar-r').textContent = `${fmtDur(next.ms - ms)} 남음`;
    } else {
      $('h-bar').style.width = '100%';
      $('h-bar-l').innerHTML = '<b>모든 배지 달성</b>';
      $('h-bar-r').textContent = '';
    }
    if ($('cb-bar') && U.comeback) {
      const c = U.comeback;
      $('cb-bar').style.width = Math.min(100, (ms / c.targetMs) * 100).toFixed(2) + '%';
      $('cb-l').textContent = `${Math.floor(Math.min(100, (ms / c.targetMs) * 100))}% · 달성하면 +${Math.round(XP.comeback * x)} XP`;
      $('cb-r').textContent = `${fmtDur(c.targetMs - ms)} 남음`;
    }
  }

  async function saveJournal() {
    const text = ($('journal-input').value || '').trim();
    const key = dateKey(now());
    const prev = S.journal[key];
    const mood = ui.mood || (prev && prev.mood) || '';
    if (!text) { toast('한 줄이라도 적어주세요'); return; }
    const entry = { text, mood, updatedAt: now() };
    try {
      await db.set(`${userPath()}/journal/${key}`, entry);
      S.journal[key] = { id: key, ...entry };
      ui.editJournal = false; ui.mood = null;
      const js = journalStreak();
      if (!prev) { const got = await gain(XP.journal); await saveUser({ xp: U.xp }); savePublic(); toast(js > 1 ? `일기 ${js}일 연속! (+${got} XP)` : `일기 저장 (+${got} XP)`); } else toast('일기를 고쳤어요');
      checkGoals(); checkAchievements();
    } catch (e) { toast('저장하지 못했어요'); }
    renderHome();
  }

  /* ====================== 종료 · 시작하기 ====================== */
  const HOLD_MS = 3000;
  let hold = null;
  function holdStart(el) {
    if (hold) return;
    el.classList.add('holding');
    hold = { el, t0: now(), timer: setTimeout(() => holdDone(el), HOLD_MS) };
  }
  function holdEnd(cancelled) {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold.el.classList.remove('holding');
    if (cancelled && now() - hold.t0 < 450) toast('종료는 3초 동안 꾹 눌러주세요');
    hold = null;
  }
  function holdDone(el) {
    if (!hold) return;
    hold = null;
    el.classList.remove('holding');
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    openEndGate();
  }
  function openEndGate() {
    const x = mult();
    openSheet(`<h2>정말 종료할까요?</h2>
      <p class="muted">충동 때문이라면 ${U.urgeMinutes || 10}분만 참아보는 건 어때요? 이기면 +${Math.round(XP.urgeWin * x)} XP${x > 1 ? `, 지금 보상 ${fmtX(x)}도 지킬 수 있어요` : ''}.</p>
      <div class="sheet-actions"><button class="btn danger-ghost" data-go-end type="button">이미 무너졌어요</button>
      <button class="btn primary" data-go-urge type="button">참기 해볼게요</button></div>`,
    (el) => {
      el.querySelector('[data-go-end]').onclick = () => { closeSheet(); openEnd(); };
      el.querySelector('[data-go-urge]').onclick = () => { closeSheet(); openUrge(false); };
    });
  }

  let endReason = null;
  let endSits = [];
  function openEnd() {
    if (!isActive()) return;
    endReason = null; endSits = [];
    $('reset-sub').textContent = `지금까지 ${fmtDur(curMs())} 버텼어요. 종료하면 시작하기를 누를 때까지 쉬는 시간이 돼요. 경험치와 배지는 그대로 남아요.`;
    const box = $('reset-reasons');
    box.innerHTML = [...U.targets, '기타'].map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    box.querySelectorAll('.chip').forEach((c) => {
      c.onclick = () => {
        endReason = c.dataset.t;
        box.querySelectorAll('.chip').forEach((x) => x.classList.toggle('selected', x === c));
        $('reset-error').textContent = '';
      };
    });
    const sb = $('reset-situations');
    sb.innerHTML = SITUATIONS.map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    sb.querySelectorAll('.chip').forEach((c) => {
      c.onclick = () => {
        const t = c.dataset.t;
        endSits = endSits.includes(t) ? endSits.filter((x) => x !== t) : [...endSits, t];
        c.classList.toggle('selected', endSits.includes(t));
      };
    });
    $('reset-memo').value = '';
    $('reset-error').textContent = '';
    show($('modal-reset'));
  }

  async function doEnd() {
    if (!endReason) { $('reset-error').textContent = '이유를 하나 골라주세요.'; return; }
    if (!isActive()) { hide($('modal-reset')); return; }
    const t = now();
    const dur = t - U.startAt;
    const prev = { startAt: U.startAt, bestMs: U.bestMs || 0, xpHours: U.xpHours || 0, comeback: U.comeback || null, recordBreaks: U.recordBreaks || 0, endedAt: U.endedAt || null, lastDur: U.lastDur || 0 };
    const streak = { start: U.startAt, end: t, durationMs: dur, reason: endReason, situations: endSits, memo: $('reset-memo').value.trim() };
    const recordBreaks = (U.recordBreaks || 0) + (prev.bestMs > 0 && dur > prev.bestMs ? 1 : 0);
    $('reset-confirm').disabled = true;
    try {
      const id = await db.add(`${userPath()}/streaks`, streak);
      S.streaks.push({ id, ...streak });
      await saveUser({ startAt: null, endedAt: t, lastDur: dur, bestMs: Math.max(prev.bestMs, dur), xpHours: 0, comeback: null, urge: null, recordBreaks });
      savePublic(true);
      hide($('modal-reset'));
      if (ui.tab === 'home') renderHome(); else if (ui.tab === 'records') renderRecords();
      toast('종료했어요. 준비되면 시작하기를 눌러요', () => undoEnd(id, prev), 10000);
      checkAchievements();
    } catch (e) { $('reset-error').textContent = '저장하지 못했어요. 다시 시도해 주세요.'; }
    $('reset-confirm').disabled = false;
  }

  async function undoEnd(id, prev) {
    try {
      await db.del(`${userPath()}/streaks/${id}`);
      S.streaks = S.streaks.filter((s) => s.id !== id);
      await saveUser(prev);
      savePublic(true);
      if (ui.tab === 'home') renderHome(); else if (ui.tab === 'records') renderRecords();
      toast('되돌렸어요');
    } catch (e) { toast('되돌리지 못했어요'); }
  }

  async function startAgain() {
    if (isActive()) return;
    const t = now();
    const comeback = U.lastDur ? { startAt: t, prevMs: U.lastDur, targetMs: Math.max(HOUR, Math.round(U.lastDur / 2 / MIN) * MIN) } : null;
    try { await saveUser({ startAt: t, endedAt: null, xpHours: 0, comeback }); } catch (e) { return; }
    savePublic(true);
    renderHome();
    toast(comeback ? `다시 시작! 재도전 목표: ${fmtDur(comeback.targetMs)} 버티기` : '디톡스를 시작했어요');
  }

  /* ====================== 참기 ====================== */
  function pickActivity(except) {
    const list = (U.activities.length ? U.activities : DEFAULT_ACTIVITIES).filter((a) => a !== except);
    return list[Math.floor(Math.random() * list.length)] || except;
  }
  function openUrge(resume) {
    if (!isActive()) return toast('디톡스를 시작한 뒤에 쓸 수 있어요');
    if (resume) { showUrgeMain(); return; }
    const box = $('urge-targets');
    box.innerHTML = [...U.targets.map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`),
      '<button type="button" class="chip" data-t="">잘 모르겠어요</button>'].join('');
    box.querySelectorAll('.chip').forEach((c) => { c.onclick = () => startUrge(c.dataset.t); });
    show($('urge-pick')); hide($('urge-main'));
    show($('urge'));
  }
  function startUrge(target) {
    const mins = U.urgeMinutes || 10;
    const t = now();
    U.urge = { startedAt: t, endsAt: t + mins * MIN, minutes: mins, target: target || '', activity: pickActivity() };
    db.set(userPath(), { urge: U.urge }).catch(() => {});
    showUrgeMain();
  }
  function showUrgeMain() {
    hide($('urge-pick')); show($('urge-main'));
    $('urge-activity').textContent = U.urge.activity;
    show($('urge'));
    renderUrge();
  }
  function renderUrge() {
    const u = U.urge;
    if (!u) return;
    const left = Math.max(0, u.endsAt - now());
    const total = u.endsAt - u.startedAt;
    const secs = Math.ceil(left / 1000);
    $('urge-clock').textContent = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
    $('urge-bar').style.width = (((total - left) / total) * 100).toFixed(1) + '%';
    const done = left === 0;
    $('urge-title').textContent = done ? '버텼어요! 지금 기분은 어때요?' : '충동은 몇 분이면 지나가요';
    $('urge-running').classList.toggle('hidden', done);
    $('urge-done').classList.toggle('hidden', !done);
  }
  async function finishUrge(result) {
    const u = U.urge;
    if (!u) return;
    U.urge = null;
    hide($('urge'));
    const rec = { at: u.startedAt, minutes: u.minutes, activity: u.activity, target: u.target || '', result };
    try {
      const id = await db.add(`${userPath()}/urges`, rec);
      S.urges.push({ id, ...rec });
    } catch (e) {}
    const fields = { urge: null };
    let got = 0;
    if (result === 'win') {
      fields.urgeWins = (U.urgeWins || 0) + 1;
      got = await gain(XP.urgeWin);
      fields.xp = U.xp;
    }
    try { await saveUser(fields); } catch (e) {}
    savePublic();
    if (ui.tab === 'home') renderHome();
    if (result === 'win') toast(`충동을 이겨냈어요! (+${got} XP)`);
    else { openEnd(); if (u.target && U.targets.includes(u.target)) { const c = $('reset-reasons').querySelector(`[data-t="${CSS.escape(u.target)}"]`); if (c) c.click(); } }
    checkGoals(); checkAchievements();
  }

  /* ====================== 업적 ====================== */
  function achStats() {
    const wins = S.urges.filter((u) => u.result === 'win');
    const byDay = {};
    wins.forEach((u) => { const k = dateKey(u.at); byDay[k] = (byDay[k] || 0) + 1; });
    const rw = riskiestWindow();
    const inRisk = (ts) => { if (!rw) return false; const h = new Date(ts).getHours(); return [rw.from, (rw.from + 1) % 24, (rw.from + 2) % 24].includes(h); };
    let kept = 0, allKeptDays = 0;
    Object.keys(U.daily || {}).forEach((k) => {
      const ps = pledgesOf(k);
      const y = ps.filter((p) => p.check === 'yes').length;
      kept += y;
      if (ps.length >= 3 && y === ps.length) allKeptDays++;
    });
    let goalsDone = 0, goalAllMonths = 0, run = 0, bestRun = 0, prev = null;
    Object.keys(U.monthGoals).sort().forEach((mk) => {
      const list = goalsOf(mk);
      const d = list.filter((s) => s.state === 'done').length;
      goalsDone += d;
      if (list.length >= 3 && d === list.length) goalAllMonths++;
      if (d) { run = prev && nextMonthKey(prev) === mk ? run + 1 : 1; bestRun = Math.max(bestRun, run); prev = mk; } else { run = 0; prev = null; }
    });
    return {
      wins: wins.length, maxDayWins: Math.max(0, ...Object.values(byDay)), riskWins: wins.filter((u) => inRisk(u.at)).length,
      journals: Object.keys(S.journal).length, jBest: journalBest(),
      sitResets: S.streaks.filter((s) => s.situations && s.situations.length).length,
      comebacks: U.comebackDone || 0, recordBreaks: U.recordBreaks || 0,
      goalsDone, goalAllMonths, goalRun: bestRun, kept, allKeptDays,
      friends: U.maxFriends || 0, top1: U.wasTop1 ? 1 : 0,
      attBest: (U.attend && U.attend.best) || 0, attTotal: (U.attend && U.attend.total) || 0,
      level: levelOf(U.xp), examClean: U.exams.filter((e) => e.clean).length + (U.examCleanOld || 0),
    };
  }

  // 끝난 시험 기간을 종료 없이 지켰는지 한 번씩 확인
  async function checkExams() {
    let changed = false;
    const exams = U.exams.map((e) => {
      const st = examStatus(e);
      if (st.state !== 'over' || e.evaluated) return e;
      changed = true;
      const clean = st.ps >= U.trackStart && !endsIn(st.ps, st.pe).length && detoxIn(st.ps, st.pe) >= (st.pe - st.ps) - MIN;
      if (clean) celebrate({ medal: 'A+', kind: 'alt', kicker: '시험 기간 완주', title: `${e.name}을 종료 없이 버텼어요!`, sub: '가장 힘든 때를 이겨냈어요.' });
      return { ...e, evaluated: true, clean };
    });
    if (changed) { try { await saveUser({ exams }); } catch (e) {} }
  }

  let achBusy = false;
  async function checkAchievements() {
    if (!U || achBusy) return;
    achBusy = true;
    await checkExams();
    const st = achStats();
    const got = { ...(U.achievements || {}) };
    const fresh = ACHS.filter((a) => !got[a.id] && st[a.key] >= a.need);
    if (fresh.length) {
      let xp = 0;
      fresh.forEach((a) => { got[a.id] = now(); xp += TIERS[a.tier].xp; });
      await addXp(xp);
      try { await saveUser({ achievements: got, xp: U.xp }); } catch (e) {}
      savePublic();
      fresh.forEach((a) => celebrate({ medal: TIERS[a.tier].star, kind: 'tier-' + a.tier, kicker: `${TIERS[a.tier].name} 업적 달성`, title: a.name, sub: a.desc, xp: TIERS[a.tier].xp }));
      if (ui.tab === 'home') renderLevelCard();
      if (ui.tab === 'records' && ui.recTab === 'achieve') renderRecords();
    }
    achBusy = false;
  }

  function achCard() {
    const st = achStats();
    const got = U.achievements || {};
    const cats = [...new Set(ACHS.map((a) => a.cat))];
    const done = ACHS.filter((a) => got[a.id]).length;
    return `<section class="card">
      <div class="sec-head"><h2>업적</h2><span class="muted small">${done}/${ACHS.length} 달성</span></div>
      <div class="bar thin" style="margin-bottom:6px"><div class="fill" style="width:${((done / ACHS.length) * 100).toFixed(1)}%"></div></div>
      <div class="legend" style="margin:8px 0 4px">${Object.entries(TIERS).map(([k, t]) => `<span><i class="tier-dot tier-${k}"></i>${t.name} +${t.xp} XP</span>`).join('')}</div>
      ${cats.map((c) => `<h3 class="ach-cat">${c}</h3><div class="ach-list">${ACHS.filter((a) => a.cat === c).map((a) => {
        const cur = Math.min(a.need, st[a.key] || 0), ok = !!got[a.id];
        return `<div class="ach${ok ? ' got' : ''}"><span class="ach-medal tier-${a.tier}">${TIERS[a.tier].star}</span>
          <div class="ach-info"><div class="ach-name">${esc(a.name)}</div><div class="ach-desc">${esc(a.desc)}</div>
          ${ok ? `<div class="ach-date">${mdShort(got[a.id])} 달성</div>` : `<div class="ach-prog"><div class="bar thin"><div class="fill" style="width:${((cur / a.need) * 100).toFixed(1)}%"></div></div><span>${cur}/${a.need}</span></div>`}</div></div>`;
      }).join('')}</div>`).join('')}
    </section>`;
  }

  /* ====================== 리포트 ====================== */
  function rangeReport(a, b) {
    const end = Math.min(b, now());
    const ends = endsIn(a, b);
    const tries = S.urges.filter((u) => u.at >= a && u.at < b);
    const wins = tries.filter((u) => u.result === 'win').length;
    const reasons = {}, sits = {}, buckets = {};
    ends.forEach((r) => {
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
      (r.situations || []).forEach((x) => { sits[x] = (sits[x] || 0) + 1; });
      const bl = BUCKETS[bucketOf(r.end)].label; buckets[bl] = (buckets[bl] || 0) + 1;
    });
    let jdays = 0, att = 0, pledged = 0, kept = 0, okDays = 0, days = 0;
    for (let d = dayStart(Math.max(a, U.trackStart)); d < end; d = addDays(d, 1)) {
      const k = dateKey(d);
      days++;
      if (S.journal[k]) jdays++;
      if (dailyOf(k).att) att++;
      const ps = pledgesOf(k);
      pledged += ps.length; kept += ps.filter((p) => p.check === 'yes').length;
      if (okDay(d)) okDays++;
    }
    const ach = Object.values(U.achievements || {}).filter((t) => t >= a && t < b).length;
    return { ends: ends.length, tries: tries.length, wins, longest: longestIn(a, end), detox: detoxIn(Math.max(a, U.trackStart), end), topReason: topOf(reasons), topSit: topOf(sits), weakBucket: topOf(buckets), jdays, att, pledged, kept, okDays, days, ach };
  }

  function reportCard() {
    const ws = addDays(weekStart(now()), -7 * ui.weekOff);
    const r = rangeReport(ws, addDays(ws, 7)), p = rangeReport(addDays(ws, -7), ws);
    const label = ui.weekOff === 0 ? '이번 주 (진행 중)' : ui.weekOff === 1 ? '지난주' : `${ui.weekOff}주 전`;
    const canPrev = ws > weekStart(U.trackStart);
    const diff = r.ends - p.ends;
    const notes = [];
    if (r.topReason) notes.push(`가장 많이 무너진 이유는 <b>${esc(r.topReason)}</b>`);
    if (r.weakBucket) notes.push(`가장 약했던 시간대는 <b>${r.weakBucket}</b>`);
    if (r.topSit) notes.push(`무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b>`);
    if (!r.ends && ws + 7 * DAY <= now() && r.okDays === 7) notes.push('한 번도 종료하지 않은 완벽한 한 주였어요');
    if (r.tries) notes.push(`참기 ${r.tries}번 중 <b>${r.wins}번</b> 이겨냈어요`);
    if (r.pledged) notes.push(`다짐 ${r.pledged}개 중 <b>${r.kept}개</b>를 지켰어요`);
    return `<section class="card">
      <div class="sec-head"><h2>주간 리포트</h2>
        <div class="week-nav">
          <button class="icon-btn small" data-act="week-prev" type="button" aria-label="이전 주" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <span class="label">${label} · ${mdShort(ws)}–${mdShort(addDays(ws, 6))}</span>
          <button class="icon-btn small" data-act="week-next" type="button" aria-label="다음 주" ${ui.weekOff > 0 ? '' : 'disabled'}>${ICON.right}</button>
        </div></div>
      <div class="tiles">
        <div class="tile"><div class="k">종료</div><div class="v">${r.ends}<small>번</small></div>
          <div class="d ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff === 0 ? '전 주와 같아요' : `전 주보다 ${Math.abs(diff)}번 ${diff > 0 ? '많아요' : '적어요'}`}</div></div>
        <div class="tile"><div class="k">디톡스한 시간</div><div class="v">${fmtDur(r.detox)}</div><div class="d">쉰 시간은 빼고</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div><div class="d">이번 주 안에서</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${r.wins}<small>/ ${r.tries}</small></div><div class="d">시도 대비 성공</div></div>
        <div class="tile"><div class="k">지킨 날</div><div class="v">${r.okDays}<small>일</small></div><div class="d">종료 없이 디톡스한 날</div></div>
        <div class="tile"><div class="k">일기 쓴 날</div><div class="v">${r.jdays}<small>일</small></div><div class="d">7일 중</div></div>
      </div>
      ${notes.length ? `<ul class="report-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function monthCard() {
    const base = new Date(); base.setDate(1); base.setHours(0, 0, 0, 0);
    base.setMonth(base.getMonth() - ui.monthOff);
    const mk = monthKey(base.getTime());
    const [a, b] = monthRange(mk);
    const pm = new Date(a); pm.setMonth(pm.getMonth() - 1);
    const [pa, pb] = monthRange(monthKey(pm.getTime()));
    const r = rangeReport(a, b), p = rangeReport(pa, pb);
    const m = base.getMonth() + 1;
    const gl = goalsOf(mk);
    const ts = new Date(U.trackStart);
    const canPrev = a > new Date(ts.getFullYear(), ts.getMonth(), 1).getTime();
    const diff = r.ends - p.ends;
    const label = ui.monthOff === 0 ? `${m}월 (진행 중)` : `${base.getFullYear()}년 ${m}월`;
    const notes = [];
    if (gl.length) notes.push(`${m}월 목표 ${gl.length}개 중 <b>${gl.filter((s) => s.state === 'done').length}개</b> 달성 (${gl.map((s) => `${goalLabel(s.g)} ${stateText(s.state)}`).join(', ')})`);
    if (r.days) notes.push(`${r.days}일 중 <b>${r.okDays}일</b>을 종료 없이 지켰어요`);
    if (r.topReason) notes.push(`가장 많이 무너진 이유는 <b>${esc(r.topReason)}</b>`);
    if (r.topSit) notes.push(`무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b>`);
    if (r.pledged) notes.push(`다짐 ${r.pledged}개 중 <b>${r.kept}개</b>를 지켰어요`);
    if (r.ach) notes.push(`이번 달에 업적 <b>${r.ach}개</b>를 새로 달성했어요`);
    return `<section class="card">
      <div class="sec-head"><h2>월간 리포트</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="month-prev" type="button" aria-label="이전 달" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <span class="label">${label}</span>
          <button class="icon-btn small" data-act="month-next" type="button" aria-label="다음 달" ${ui.monthOff > 0 ? '' : 'disabled'}>${ICON.right}</button></div></div>
      <div class="tiles">
        <div class="tile"><div class="k">종료</div><div class="v">${r.ends}<small>번</small></div>
          <div class="d ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff === 0 ? '지난달과 같아요' : `지난달보다 ${Math.abs(diff)}번 ${diff > 0 ? '많아요' : '적어요'}`}</div></div>
        <div class="tile"><div class="k">디톡스한 시간</div><div class="v">${fmtDur(r.detox)}</div><div class="d">쉰 시간은 빼고</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div><div class="d">이 달 안에서</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${r.wins}<small>/ ${r.tries}</small></div><div class="d">시도 대비 성공</div></div>
        <div class="tile"><div class="k">다짐 지킴</div><div class="v">${r.kept}<small>/ ${r.pledged}</small></div><div class="d">출석 ${r.att}일</div></div>
        <div class="tile"><div class="k">일기 쓴 날</div><div class="v">${r.jdays}<small>일</small></div><div class="d">${r.days}일 중</div></div>
      </div>
      ${notes.length ? `<ul class="report-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function yearBannerYear() {
    const d = new Date();
    const y = d.getMonth() === 11 && d.getDate() >= 25 ? d.getFullYear() : d.getMonth() === 0 && d.getDate() <= 15 ? d.getFullYear() - 1 : null;
    if (!y || U.yearSeen === y || new Date(U.trackStart).getFullYear() > y) return null;
    return y;
  }
  function yearCard() {
    const y = ui.year || new Date().getFullYear();
    const a = new Date(y, 0, 1).getTime(), b = new Date(y + 1, 0, 1).getTime();
    const r = rangeReport(a, b);
    const ongoing = b > now();
    const months = [];
    for (let m = 0; m < 12; m++) {
      const ma = new Date(y, m, 1).getTime(), mb = new Date(y, m + 1, 1).getTime();
      if (ma > now() || mb <= U.trackStart) continue;
      const rr = rangeReport(ma, mb);
      months.push({ m: m + 1, ok: rr.days ? rr.okDays / rr.days : 0, ends: rr.ends });
    }
    const bestMonth = months.length ? months.reduce((p, c) => (c.ok > p.ok ? c : p)) : null;
    const goalsDone = Object.keys(U.monthGoals).filter((mk) => mk.startsWith(y + '-')).reduce((s, mk) => s + goalsOf(mk).filter((x) => x.state === 'done').length, 0);
    const canPrev = new Date(U.trackStart).getFullYear() < y;
    return `<section class="card year-card">
      <div class="sec-head"><h2>${y}년 결산${ongoing ? ' <span class="muted small">(진행 중)</span>' : ''}</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="year-prev" type="button" aria-label="이전 해" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <button class="icon-btn small" data-act="year-next" type="button" aria-label="다음 해" ${y < new Date().getFullYear() ? '' : 'disabled'}>${ICON.right}</button></div></div>
      <div class="year-hero"><span class="muted small">올해 디톡스한 시간</span><b class="num">${Math.floor(r.detox / DAY)}<small>일</small> ${Math.floor((r.detox % DAY) / HOUR)}<small>시간</small></b></div>
      <div class="tiles">
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div><div class="d">올해 안에서</div></div>
        <div class="tile"><div class="k">종료 없이 지킨 날</div><div class="v">${r.okDays}<small>일</small></div><div class="d">${r.days}일 중</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${r.wins}<small>번</small></div><div class="d">시도 ${r.tries}번</div></div>
        <div class="tile"><div class="k">다짐 지킴</div><div class="v">${r.kept}<small>개</small></div><div class="d">다짐 ${r.pledged}개 중</div></div>
        <div class="tile"><div class="k">새로 달성한 업적</div><div class="v">${r.ach}<small>개</small></div><div class="d">월 목표 달성 ${goalsDone}개</div></div>
        <div class="tile"><div class="k">일기 쓴 날</div><div class="v">${r.jdays}<small>일</small></div><div class="d">출석 ${r.att}일</div></div>
      </div>
      <ul class="report-notes">
        ${bestMonth ? `<li>가장 잘 버틴 달은 <b>${bestMonth.m}월</b> (종료 ${bestMonth.ends}번)</li>` : ''}
        ${r.topReason ? `<li>올해 가장 큰 적은 <b>${esc(r.topReason)}</b>였어요</li>` : ''}
        ${r.topSit ? `<li>무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b></li>` : ''}
        <li>${ongoing ? '남은 날도 지금처럼!' : '한 해 동안 수고 많았어요. 내년에도 함께 가요.'}</li>
      </ul>
    </section>`;
  }

  /* ====================== 기록 화면 ====================== */
  function renderRecords() {
    const el = $('page-records');
    const tabs = [['report', '리포트'], ['calendar', '달력'], ['stats', '통계'], ['achieve', '업적']];
    const body = ui.recTab === 'calendar' ? calendarCard() + journalCard()
      : ui.recTab === 'stats' ? statsCard() + badgesCard()
        : ui.recTab === 'achieve' ? achCard()
          : reportCard() + monthCard() + yearCard();
    el.innerHTML = `<div class="seg rec-tabs">${tabs.map(([k, l]) => `<button class="seg-btn${ui.recTab === k ? ' active' : ''}" data-act="rec-tab" data-k="${k}" type="button">${l}</button>`).join('')}</div>${body}`;
    if (ui.recTab === 'report') {
      const seen = {};
      if (U.reportSeen !== weekKey() && ui.weekOff === 1) seen.reportSeen = weekKey();
      if (U.monthSeen !== monthKey(now()) && ui.monthOff === 1) seen.monthSeen = monthKey(now());
      const yb = yearBannerYear();
      if (yb && (ui.year || new Date().getFullYear()) === yb) seen.yearSeen = yb;
      if (Object.keys(seen).length) saveUser(seen).catch(() => {});
    }
  }

  function dayInfo(key) {
    const d0 = keyTs(key), d1 = addDays(d0, 1);
    const ends = endsIn(d0, d1);
    const urges = S.urges.filter((u) => u.at >= d0 && u.at < d1);
    const wins = urges.filter((u) => u.result === 'win').length;
    let status;
    if (d0 > now()) status = 'future';
    else if (d1 <= U.trackStart) status = 'before';
    else if (ends.length) status = 'reset';
    else if (!detoxIn(d0, Math.min(d1, now()))) status = 'off';
    else status = wins >= 3 ? 'ok3' : wins >= 1 ? 'ok2' : 'ok1';
    return { d0, d1, ends, urges, wins, status };
  }

  function calendarCard() {
    const base = ui.calMonth || (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    ui.calMonth = base;
    const m = new Date(base);
    const year = m.getFullYear(), month = m.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const todayKey = dateKey(now());
    let cells = DOW.map((d) => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < firstDow; i++) cells += '<div class="d blank"></div>';
    for (let d = 1; d <= days; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      const info = dayInfo(key);
      const cls = ['d', info.status, key === todayKey ? 'today' : '', key === ui.selDay ? 'sel' : ''].join(' ');
      cells += info.status !== 'future'
        ? `<button type="button" class="${cls}" data-act="sel-day" data-k="${key}" aria-label="${month + 1}월 ${d}일">${d}</button>`
        : `<div class="${cls}">${d}</div>`;
    }
    const ts = new Date(U.trackStart);
    const prevOk = new Date(year, month, 1).getTime() > new Date(ts.getFullYear(), ts.getMonth(), 1).getTime();
    const nextOk = new Date(year, month + 1, 1).getTime() <= now();
    const gl = goalsOf(`${year}-${pad(month + 1)}`);
    return `<section class="card">
      <div class="cal-head"><h2>${year}년 ${month + 1}월</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="cal-prev" type="button" aria-label="이전 달" ${prevOk ? '' : 'disabled'}>${ICON.left}</button>
        <button class="icon-btn small" data-act="cal-next" type="button" aria-label="다음 달" ${nextOk ? '' : 'disabled'}>${ICON.right}</button></div></div>
      ${gl.length ? `<p class="muted small cal-goal">${month + 1}월 목표 <b>${gl.filter((s) => s.state === 'done').length}/${gl.length}</b> 달성</p>` : ''}
      <div class="cal">${cells}</div>
      <div class="legend">
        <span><i style="background:var(--heat-1)"></i>지킨 날</span>
        <span><i style="background:var(--heat-2)"></i>참기 1–2번</span>
        <span><i style="background:var(--heat-3)"></i>참기 3번 이상</span>
        <span><i style="background:var(--danger-soft);border:1px solid var(--danger)"></i>종료</span>
        <span><i style="background:var(--surface-2);border:1px dashed var(--muted)"></i>쉰 날</span>
      </div>
      ${dayDetail(ui.selDay)}
    </section>`;
  }

  function dayDetail(key) {
    if (!key) return '';
    const info = dayInfo(key);
    if (info.status === 'future') return '';
    const d = keyTs(key);
    const dd = new Date(d);
    const j = S.journal[key];
    const ps = pledgesOf(key);
    const evs = [
      ...info.ends.map((r) => ({ t: r.end, html: `<span class="tag r">종료</span><span>${esc(r.reason)} · ${fmtDur(r.durationMs)} 버팀${r.situations && r.situations.length ? ` · ${r.situations.map(esc).join(', ')}` : ''}${r.memo ? ` · ${esc(r.memo)}` : ''}</span>` })),
      ...info.urges.map((u) => ({ t: u.at, html: `<span class="tag ${u.result === 'win' ? 'w' : 'l'}">${u.result === 'win' ? '참기 성공' : '참기 실패'}</span><span>${u.target ? `${esc(u.target)} · ` : ''}${esc(u.activity)}</span>` })),
    ].sort((a, b) => a.t - b.t);
    const status = info.status === 'before' ? '기록 시작 전' : info.status === 'reset' ? `종료 ${info.ends.length}번` : info.status === 'off' ? '쉰 날' : '종료 없이 지킨 날';
    return `<div class="day-detail">
      <h3>${dd.getMonth() + 1}월 ${dd.getDate()}일 (${DOW[dd.getDay()]}) · <span class="muted">${status}</span></h3>
      ${evs.length ? evs.map((e) => `<div class="ev"><span class="t">${hm(e.t)}</span>${e.html}</div>`).join('') : '<p class="empty">이날은 종료·참기 기록이 없어요.</p>'}
      ${ps.length ? `<div class="ev"><span class="t">다짐</span><span>${ps.map((p) => `${p.check === 'yes' ? '✓' : p.check === 'no' ? '✗' : '·'} ${esc(p.text)}`).join(' &nbsp; ')}</span></div>` : ''}
      ${j ? `<div class="ev"><span class="t">일기</span><span>${esc(j.mood || '')} ${esc(j.text)}</span></div>` : ''}
    </div>`;
  }

  function statsCard() {
    const done = S.streaks;
    const avg = done.length ? done.reduce((a, s) => a + s.durationMs, 0) / done.length : null;
    const tries = S.urges.length, wins = S.urges.filter((u) => u.result === 'win').length;
    const reasons = {}; done.forEach((s) => { reasons[s.reason] = (reasons[s.reason] || 0) + 1; });
    const rList = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
    const bCounts = BUCKETS.map(() => 0); done.forEach((s) => { bCounts[bucketOf(s.end)]++; });
    const maxR = Math.max(1, ...rList.map((x) => x[1])), maxB = Math.max(1, ...bCounts);
    const sits = {}; done.forEach((s) => (s.situations || []).forEach((x) => { sits[x] = (sits[x] || 0) + 1; }));
    const sList = Object.entries(sits).sort((a, b) => b[1] - a[1]);
    const maxS = Math.max(1, ...sList.map((x) => x[1]));
    const rw = riskiestWindow();
    const bar = (name, n, max) => `<div class="hbar"><span class="name">${esc(name)}</span><span class="track"><i style="width:${(n / max) * 100}%"></i></span><span class="n">${n}</span></div>`;
    return `<section class="card">
      <h2 style="margin-bottom:12px">통계</h2>
      <div class="tiles">
        <div class="tile"><div class="k">총 디톡스 시간</div><div class="v">${fmtDur(detoxIn(U.trackStart, now()))}</div><div class="d">${md(U.trackStart)}부터 · 쉰 시간 빼고</div></div>
        <div class="tile"><div class="k">최장 기록</div><div class="v">${fmtDur(Math.max(U.bestMs || 0, curMs()))}</div><div class="d">현재 기록 포함</div></div>
        <div class="tile"><div class="k">평균 기록</div><div class="v">${avg == null ? '-' : fmtDur(avg)}</div><div class="d">종료 ${done.length}번 기준</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${wins}<small>번</small></div><div class="d">성공률 ${tries ? Math.round((wins / tries) * 100) : 0}%</div></div>
        <div class="tile"><div class="k">위험 시간대</div><div class="v">${rw ? hourRange(rw.from) : '-'}</div><div class="d">${rw ? `종료 ${rw.total}번 중 ${rw.n}번` : '종료 3번부터 보여줘요'}</div></div>
        <div class="tile"><div class="k">일기 연속</div><div class="v">${journalStreak()}<small>일</small></div><div class="d">최고 ${journalBest()}일</div></div>
      </div>
      <div class="grid-2" style="margin-top:18px">
        <div><h3 style="margin-bottom:10px">종료 이유</h3>
          ${rList.length ? `<div class="hbars">${rList.map(([k, n]) => bar(k, n, maxR)).join('')}</div>` : '<p class="empty">아직 종료한 적이 없어요.</p>'}</div>
        <div><h3 style="margin-bottom:10px">종료한 시간대</h3>
          ${done.length ? `<div class="hbars">${BUCKETS.map((b, i) => bar(b.label, bCounts[i], maxB)).join('')}</div>` : '<p class="empty">기록이 쌓이면 보여드릴게요.</p>'}</div>
        <div><h3 style="margin-bottom:10px">무너질 때 상황</h3>
          ${sList.length ? `<div class="hbars">${sList.map(([k, n]) => bar(k, n, maxS)).join('')}</div>` : '<p class="empty">종료할 때 상황을 고르면 여기에 모여요.</p>'}</div>
      </div>
    </section>`;
  }

  function journalCard() {
    const keys = Object.keys(S.journal).sort().reverse();
    const shown = ui.journalAll ? keys : keys.slice(0, 7);
    const st = journalStreak();
    return `<section class="card">
      <div class="sec-head"><h2>일기 모아보기</h2><span class="muted small">${st ? `지금 ${st}일 연속 · ` : ''}최고 ${journalBest()}일 · 총 ${keys.length}일</span></div>
      ${keys.length ? `<div class="journal-list">${shown.map((k) => {
        const d = new Date(keyTs(k)), j = S.journal[k];
        return `<div class="jl"><span class="jd">${d.getMonth() + 1}.${d.getDate()} <small>${DOW[d.getDay()]}</small></span><span class="jm">${esc(j.mood || '📝')}</span><span class="jt">${esc(j.text)}</span></div>`;
      }).join('')}</div>
      ${keys.length > 7 ? `<button class="link" data-act="journal-all" type="button" style="margin-top:8px">${ui.journalAll ? '접기' : `전체 ${keys.length}개 보기`}</button>` : ''}` : '<p class="empty">홈에서 한 줄 일기를 쓰면 여기에 모여요.</p>'}
    </section>`;
  }

  function badgesCard() {
    return `<section class="card">
      <div class="sec-head"><h2>배지</h2><span class="muted small">${Object.keys(U.badges).length}/${MILESTONES.length}</span></div>
      <div class="badges">${MILESTONES.map((m) => {
        const got = U.badges[m.id];
        return `<div class="badge${got ? ' got' : ''}"><div class="medal">${m.short}</div><div class="bn">${m.label}</div>
          <div class="bd">${got ? mdShort(got) + ' 획득' : `+${m.bonus} XP`}</div></div>`;
      }).join('')}</div>
      <p class="hint">한 번에 이어서 버틴 시간으로 받아요. 종료해도 받은 배지는 사라지지 않아요.</p>
    </section>`;
  }

  /* ====================== 친구 ====================== */
  async function loadFriends(silent) {
    if (F.loading) return;
    F.loading = true;
    try {
      const [out, inc] = await Promise.all([db.query(C.req, 'from', me.uid), db.query(C.req, 'to', me.uid)]);
      F.incoming = inc.filter((r) => r.status === 'pending');
      F.outgoing = out.filter((r) => r.status === 'pending');
      const accepted = [...out, ...inc].filter((r) => r.status === 'accepted');
      const profs = await Promise.all(accepted.map((r) => db.get(`${C.pub}/${r.from === me.uid ? r.to : r.from}`).catch(() => null)));
      F.list = accepted.map((r, i) => {
        const uid = r.from === me.uid ? r.to : r.from;
        const nick = r.from === me.uid ? r.toNick : r.fromNick;
        return { uid, reqId: r.id, ...(profs[i] || { nickname: nick, missing: true }) };
      });
      F.loaded = true; F.msg = '';
      if (F.list.length > (U.maxFriends || 0)) { saveUser({ maxFriends: F.list.length }).catch(() => {}); checkAchievements(); }
    } catch (e) {
      F.msg = '친구 정보를 불러오지 못했어요.';
    }
    F.loading = false;
    refreshFriendDot();
    if (ui.tab === 'friends' && !silent) renderFriends();
  }
  function refreshFriendDot() { $('friend-dot').classList.toggle('hidden', !F.incoming.length); }

  function rankValue(p, mode) {
    if (mode === 'time') return p.startAt == null ? -1 : now() - p.startAt;
    if (mode === 'level') return p.level == null ? -1 : p.level * 1e6 + (p.badges || 0);
    if (mode === 'urges') return p.weekWins == null ? -1 : (p.weekKey === weekKey() ? p.weekWins : 0);
    return 0;
  }

  function renderFriends() {
    const mine = { uid: me.uid, isMe: true, ...publicData(), startAt: isActive() ? U.startAt : null, paused: !isActive(), bestMs: U.bestMs, level: levelOf(U.xp), badges: Object.keys(U.badges).length, weekWins: weekWins() };
    const people = [mine, ...F.list].sort((a, b) => rankValue(b, F.rank) - rankValue(a, F.rank));
    if (F.rank === 'time' && F.list.length && people[0].isMe && isActive() && !U.wasTop1) { saveUser({ wasTop1: true }).then(checkAchievements).catch(() => {}); }
    const valueHtml = (p) => {
      if (F.rank === 'time') {
        if (p.startAt != null) return `<span class="val" data-live="${p.startAt}">${fmtLive(now() - p.startAt)}</span>`;
        return `<span class="val hidden-val">${p.paused ? '쉬는 중' : '비공개'}</span>`;
      }
      if (F.rank === 'level') return p.level == null ? '<span class="val hidden-val">비공개</span>' : `<span class="val">Lv.${p.level}</span>`;
      return p.weekWins == null ? '<span class="val hidden-val">비공개</span>' : `<span class="val">${p.weekKey === weekKey() ? p.weekWins : 0}번</span>`;
    };
    const subHtml = (p) => {
      const bits = [];
      if (p.bestMs != null) bits.push(`최장 ${fmtDur(p.bestMs)}`);
      if (p.badges != null) bits.push(`배지 ${p.badges}개`);
      if (F.rank !== 'level' && p.level != null) bits.push(`Lv.${p.level}`);
      return bits.join(' · ') || (p.missing ? '아직 FocusFill을 시작하지 않았어요' : '');
    };
    $('page-friends').innerHTML = `
      <section class="card">
        <h2>내 친구 코드</h2>
        <p class="muted small" style="margin:4px 0 12px">친구에게 이 코드를 알려주면 친구 요청을 보낼 수 있어요.</p>
        <div class="code-row"><span class="friend-code">${esc(U.friendCode || '······')}</span>
          <button class="btn small" data-act="copy-code" type="button">${ICON.copy}복사</button></div>
      </section>
      <section class="card">
        <h2>친구 추가</h2>
        <div class="inline-add" style="margin-top:12px"><input id="friend-code-input" maxlength="6" placeholder="친구 코드 6자리" autocapitalize="characters" autocorrect="off" spellcheck="false" />
          <button class="btn primary" data-act="add-friend" type="button">요청 보내기</button></div>
        <p class="form-err" id="friend-err">${esc(F.msg)}</p>
        ${F.incoming.length || F.outgoing.length ? `<div style="margin-top:14px">
          ${F.incoming.map((r) => `<div class="req"><span class="who">${esc(r.fromNick)} <span class="muted small">님이 친구 요청을 보냈어요</span></span>
            <button class="btn small primary" data-act="accept" data-id="${esc(r.id)}" type="button">수락</button>
            <button class="btn small ghost" data-act="decline" data-id="${esc(r.id)}" type="button">거절</button></div>`).join('')}
          ${F.outgoing.map((r) => `<div class="req"><span class="who">${esc(r.toNick)} <span class="muted small">님의 수락을 기다리는 중</span></span>
            <button class="btn small ghost" data-act="cancel-req" data-id="${esc(r.id)}" type="button">취소</button></div>`).join('')}
        </div>` : ''}
      </section>
      <section class="card">
        <div class="sec-head"><h2>순위</h2><button class="icon-btn small" data-act="refresh-friends" type="button" aria-label="새로고침">${ICON.refresh}</button></div>
        <div class="seg">
          <button class="seg-btn${F.rank === 'time' ? ' active' : ''}" data-act="rank" data-r="time" type="button">진행 시간</button>
          <button class="seg-btn${F.rank === 'level' ? ' active' : ''}" data-act="rank" data-r="level" type="button">레벨</button>
          <button class="seg-btn${F.rank === 'urges' ? ' active' : ''}" data-act="rank" data-r="urges" type="button">이번 주 참기</button>
        </div>
        <div class="rank-list">${people.map((p, i) => `
          <div class="rank${p.isMe ? ' me' : ''}${i === 0 && people.length > 1 ? ' top1' : ''}">
            <span class="pos">${i + 1}</span>
            <div class="info"><div class="nm">${esc(p.nickname)}${p.isMe ? ' <span class="muted small">(나)</span>' : ''}</div><div class="sub">${subHtml(p)}</div></div>
            ${valueHtml(p)}
            ${p.isMe ? '' : `<button class="icon-btn small" data-act="remove-friend" data-id="${esc(p.reqId)}" data-n="${esc(p.nickname)}" type="button" aria-label="친구 삭제">${ICON.x}</button>`}
          </div>`).join('')}</div>
        ${!F.list.length && F.loaded ? '<p class="hint">아직 친구가 없어요. 위에서 친구 코드로 요청을 보내보세요.</p>' : ''}
        ${!F.loaded ? '<p class="hint">불러오는 중…</p>' : ''}
        <p class="hint">친구에게는 닉네임과 내가 공개한 항목만 보여요. 종료 이유, 메모, 일기, 다짐은 절대 보이지 않아요.</p>
      </section>`;
  }

  async function addFriend() {
    const err = $('friend-err');
    const code = ($('friend-code-input').value || '').trim().toUpperCase();
    err.textContent = '';
    if (!/^[A-Z0-9]{6}$/.test(code)) { err.textContent = '코드는 6자리예요.'; return; }
    if (code === U.friendCode) { err.textContent = '내 코드예요.'; return; }
    let c = null;
    try { c = await db.get(`${C.codes}/${code}`); } catch (e) { err.textContent = '확인하지 못했어요. 다시 시도해 주세요.'; return; }
    if (!c) { err.textContent = '없는 코드예요. 다시 확인해 주세요.'; return; }
    if (F.list.some((f) => f.uid === c.uid)) { err.textContent = '이미 친구예요.'; return; }
    if (F.outgoing.some((r) => r.to === c.uid)) { err.textContent = '이미 요청을 보냈어요.'; return; }
    try {
      const rev = F.incoming.find((r) => r.from === c.uid);
      if (rev) { await db.set(`${C.req}/${rev.id}`, { status: 'accepted', acceptedAt: now() }); toast(`${c.nickname}님과 친구가 됐어요`); }
      else {
        await db.set(`${C.req}/${me.uid}_${c.uid}`, { from: me.uid, to: c.uid, fromNick: U.nickname, toNick: c.nickname, status: 'pending', createdAt: now() });
        toast(`${c.nickname}님에게 친구 요청을 보냈어요`);
      }
      await loadFriends();
    } catch (e) { err.textContent = '요청을 보내지 못했어요.'; }
  }

  /* ====================== 설정 ====================== */
  function examListHtml() {
    if (!U.exams.length) return '';
    const list = [...U.exams].sort((a, b) => a.start.localeCompare(b.start));
    return `<ul class="plain-list exam-list">${list.map((e) => {
      const st = examStatus(e);
      const tag = st.state === 'on' ? `<span class="ex-tag on">${examLabel(e, st)} · 보상 2배</span>`
        : st.state === 'before' ? `<span class="ex-tag">D-${st.dday}</span>`
          : `<span class="ex-tag done">${e.evaluated ? (e.clean ? '완주' : '끝남') : '끝남'}</span>`;
      return `<li><span><b>${esc(e.name)}</b><br><small class="muted">시험 ${mdShort(keyTs(e.start))}–${mdShort(keyTs(e.end))} · 보상 2배 ${mdShort(st.ps)}부터</small></span>${tag}
        <button class="icon-btn small" data-act="del-exam" data-id="${esc(e.id)}" type="button" aria-label="삭제">${ICON.x}</button></li>`;
    }).join('')}</ul>`;
  }

  function renderSettings() {
    const th = currentTheme();
    const sw = (key, label, desc) => `<div class="set-row"><div><div class="lbl">${label}</div>${desc ? `<div class="desc">${desc}</div>` : ''}</div>
      <label class="switch"><input type="checkbox" data-act="share" data-k="${key}" ${U.share[key] ? 'checked' : ''} /><span></span></label></div>`;
    $('page-settings').innerHTML = `
      <section class="card set-sec">
        <h2>프로필</h2>
        <div class="set-row"><div><div class="lbl">아이디</div><div class="desc">ProFill과 같은 계정이에요</div></div><b>${esc(idOf(me.email))}</b></div>
        <div class="inline-add"><input id="set-nick" maxlength="12" value="${esc(U.nickname)}" placeholder="닉네임" /><button class="btn" data-act="save-nick" type="button">닉네임 저장</button></div>
        <div><div class="lbl" style="margin-bottom:8px;font-weight:650">성별 <span class="muted small">(친구에게 안 보여요)</span></div>
          <div class="seg">${[['male', '남자'], ['female', '여자'], ['none', '선택 안 함']].map(([v, l]) =>
            `<button class="seg-btn${U.gender === v ? ' active' : ''}" data-act="gender" data-v="${v}" type="button">${l}</button>`).join('')}</div></div>
      </section>

      <section class="card set-sec">
        <h2>디톡스 대상</h2>
        <p class="muted small" style="margin-top:-6px">종료할 때 고르는 이유 목록이에요.</p>
        <div class="chips">${U.targets.map((t, i) => `<span class="chip">${esc(t)}<button class="x" data-act="del-target" data-i="${i}" type="button" aria-label="${esc(t)} 삭제">×</button></span>`).join('')}</div>
        <div class="inline-add"><input id="set-target" maxlength="10" placeholder="새 대상" /><button class="btn" data-act="add-target" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>시험 기간</h2>
        <p class="muted small" style="margin-top:-6px">시험 시작 2주 전부터 끝나는 날까지가 시험 기간이에요. 이 기간엔 모든 보상이 2배가 되고 위험 시간대 경고가 더 민감해져요. 시험 전날이 D-1, 시험 첫날이 D-day예요.</p>
        ${examListHtml()}
        <input id="exam-name" maxlength="20" placeholder="이름 (예: 2학기 기말고사)" />
        <div class="time-row"><span class="muted small">시험</span><input type="date" id="exam-start" /><span>부터</span>
          <input type="date" id="exam-end" /><span>까지</span></div>
        <div><button class="btn primary" data-act="add-exam" type="button">${ICON.plus}시험 추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>참기</h2>
        <div><div class="lbl" style="margin-bottom:8px;font-weight:650">참기 시간</div>
          <div class="seg">${[5, 10, 15].map((m) => `<button class="seg-btn${U.urgeMinutes === m ? ' active' : ''}" data-act="urge-min" data-m="${m}" type="button">${m}분</button>`).join('')}</div></div>
        <div class="lbl" style="font-weight:650">대체 활동</div>
        <ul class="plain-list">${U.activities.map((a, i) => `<li><span>${esc(a)}</span><button class="icon-btn small" data-act="del-act" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></li>`).join('')}</ul>
        <div class="inline-add"><input id="set-act" maxlength="30" placeholder="새 대체 활동" /><button class="btn" data-act="add-act" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>위험 시간대 알림</h2>
        <div class="set-row"><div><div class="lbl">홈에 경고 띄우기</div><div class="desc">${(() => { const rw = riskiestWindow(); return rw ? `지금까지 가장 위험한 시간대는 ${hourRange(rw.from)}예요.` : '종료 기록이 3번 쌓이면 자주 무너지는 시간을 찾아서 알려줘요.'; })()}</div></div>
          <label class="switch"><input type="checkbox" data-act="risk-on" ${U.riskOn ? 'checked' : ''} /><span></span></label></div>
      </section>

      <section class="card set-sec">
        <h2>동기 문구</h2>
        <p class="muted small" style="margin-top:-6px">기본 문장 365개가 매일 아침 8시에 바뀌어요. 내가 추가한 문구는 그 아래에 하루씩 번갈아 보여요.</p>
        ${U.quotes.length ? `<ul class="plain-list">${U.quotes.map((q, i) => `<li><span>${esc(q)}</span><button class="icon-btn small" data-act="del-quote" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></li>`).join('')}</ul>` : ''}
        <div class="inline-add"><input id="set-quote" maxlength="60" placeholder="나만의 문구 추가" /><button class="btn" data-act="add-quote" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>친구 공개 범위</h2>
        <p class="muted small" style="margin-top:-6px">닉네임은 항상 보여요. 종료 이유, 메모, 일기, 다짐, 성별은 절대 공개되지 않아요.</p>
        ${sw('time', '현재 진행 시간')}${sw('best', '최장 기록')}${sw('level', '레벨')}${sw('badges', '배지 수')}${sw('urges', '이번 주 참기 성공 수')}
      </section>

      <section class="card set-sec">
        <h2>화면</h2>
        <div class="seg">${[['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']].map(([v, l]) =>
          `<button class="seg-btn${th === v ? ' active' : ''}" data-act="theme" data-v="${v}" type="button">${l}</button>`).join('')}</div>
        <p class="muted small">아이패드 사파리에서 공유 버튼 → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요.</p>
      </section>

      <section class="card set-sec">
        <h2>ProFill 연결</h2>
        <p class="muted small" style="margin-top:-6px">같은 계정이라 따로 로그인하지 않아도 돼요.</p>
        <a class="btn primary" href="${PROFILL_URL}">ProFill 열기 ${ICON.arrow}</a>
      </section>

      <section class="card set-sec">
        <h2>계정</h2>
        <p class="muted small" style="margin-top:-6px">${db.mode === 'local' ? '테스트 모드 · 이 기기에만 저장돼요' : '클라우드에 저장 중'}</p>
        <div class="danger-zone"><button class="btn" data-act="logout" type="button">로그아웃</button>
          <button class="btn danger-ghost" data-act="wipe" type="button">기록 전체 초기화</button></div>
      </section>
      <p class="app-ver">FocusFill v${APP_VERSION}</p>`;
  }

  async function settingsUpdate(fields, toastMsg, alsoPublic) {
    try { await saveUser(fields); if (toastMsg) toast(toastMsg); } catch (e) {}
    if (alsoPublic) savePublic(true);
    renderSettings();
  }

  /* ---------- 기록 전체 초기화 ---------- */
  function openWipe() {
    openSheet(`<h2>기록을 전부 지울까요?</h2>
      <p class="muted">디톡스 기록, 참기·종료 기록, 일기, 다짐, 목표, 시험, 경험치, 배지, 업적이 모두 지워지고 처음부터 다시 시작해요. 아이디와 친구는 그대로 남아요. <b>되돌릴 수 없어요.</b></p>
      <p class="label">확인을 위해 <b>초기화</b>라고 적어주세요</p>
      <input id="wipe-input" placeholder="초기화" autocomplete="off" />
      <p class="form-err" id="wipe-err"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button>
        <button class="btn danger" data-ok type="button">전부 지우기</button></div>`,
    (el) => {
      el.querySelector('[data-close]').onclick = closeSheet;
      el.querySelector('[data-ok]').onclick = async () => {
        if ($('wipe-input').value.trim() !== '초기화') { $('wipe-err').textContent = '초기화라고 정확히 적어주세요.'; return; }
        el.querySelector('[data-ok]').disabled = true;
        el.querySelector('[data-ok]').textContent = '지우는 중…';
        try { await wipeAll(); closeSheet(); }
        catch (e) { $('wipe-err').textContent = '지우지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.'; el.querySelector('[data-ok]').disabled = false; el.querySelector('[data-ok]').textContent = '전부 지우기'; }
      };
    });
  }
  async function wipeAll() {
    const base = userPath();
    for (const col of ['streaks', 'urges', 'journal']) {
      const docs = await db.list(`${base}/${col}`);
      await Promise.all(docs.map((d) => db.del(`${base}/${col}/${d.id}`)));
    }
    const keep = { nickname: U.nickname, friendCode: U.friendCode || '', codeOk: !!U.codeOk, share: U.share, onboarded: false };
    await db.put(base, keep);
    await db.set(pubPath(), { nickname: U.nickname, startAt: null, paused: true, bestMs: null, level: null, badges: null, weekWins: null, weekKey: weekKey(), updatedAt: now() }).catch(() => {});
    clearInterval(tickTimer);
    hide($('urge')); hide($('modal-reset'));
    celQueue.length = 0; celOn = false; hide($('celebrate'));
    U = null; S.streaks = []; S.urges = []; S.journal = {};
    obKeep = { friendCode: keep.friendCode, codeOk: keep.codeOk, share: keep.share };
    resetOnboarding(keep.nickname);
    go('screen-onboard'); obShow();
    toast('기록을 모두 지웠어요. 처음부터 시작해요');
  }

  /* ====================== 클릭 처리 ====================== */
  async function onAction(act, el) {
    switch (act) {
      case 'urge': return openUrge(false);
      case 'start': el.disabled = true; return startAgain();
      case 'open-report': ui.weekOff = 1; ui.recTab = 'report'; return switchTab('records');
      case 'open-month': ui.monthOff = 1; ui.recTab = 'report'; return switchTab('records');
      case 'open-year': ui.year = +el.dataset.y; ui.recTab = 'report'; return switchTab('records');
      case 'rec-tab': ui.recTab = el.dataset.k; renderRecords(); return window.scrollTo(0, 0);
      case 'week-prev': ui.weekOff++; return renderRecords();
      case 'week-next': ui.weekOff = Math.max(0, ui.weekOff - 1); return renderRecords();
      case 'month-prev': ui.monthOff++; return renderRecords();
      case 'month-next': ui.monthOff = Math.max(0, ui.monthOff - 1); return renderRecords();
      case 'year-prev': ui.year = (ui.year || new Date().getFullYear()) - 1; return renderRecords();
      case 'year-next': ui.year = Math.min(new Date().getFullYear(), (ui.year || new Date().getFullYear()) + 1); return renderRecords();
      case 'cal-prev': { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() - 1); ui.calMonth = d.getTime(); return renderRecords(); }
      case 'cal-next': { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() + 1); ui.calMonth = d.getTime(); return renderRecords(); }
      case 'sel-day': ui.selDay = el.dataset.k; return renderRecords();
      case 'journal-all': ui.journalAll = !ui.journalAll; return renderRecords();

      case 'claim-attend': el.disabled = true; return claimAttend();
      case 'pick-pledge': return makePledge(el.dataset.p);
      case 'make-pledge': return makePledge($('pledge-input') && $('pledge-input').value);
      case 'check-pledge': el.disabled = true; return checkPledge(el.dataset.k, el.dataset.id, el.dataset.v);
      case 'del-pledge': return delPledge(el.dataset.k, el.dataset.id);
      case 'add-goal': return openGoalSheet();
      case 'edit-goal': return openGoalSheet(el.dataset.id);
      case 'edit-journal': ui.editJournal = true; return renderHome();
      case 'save-journal': return saveJournal();

      case 'copy-code':
        try { await navigator.clipboard.writeText(U.friendCode); toast('친구 코드를 복사했어요'); } catch (e) { toast(`코드: ${U.friendCode}`); }
        return;
      case 'add-friend': return addFriend();
      case 'accept': try { await db.set(`${C.req}/${el.dataset.id}`, { status: 'accepted', acceptedAt: now() }); toast('친구가 됐어요'); } catch (e) { toast('수락하지 못했어요'); } return loadFriends();
      case 'decline': case 'cancel-req': try { await db.del(`${C.req}/${el.dataset.id}`); } catch (e) { toast('처리하지 못했어요'); } return loadFriends();
      case 'remove-friend':
        return confirmSheet('친구를 삭제할까요?', `${el.dataset.n}님과 서로 기록을 볼 수 없게 돼요.`, '삭제', async () => {
          try { await db.del(`${C.req}/${el.dataset.id}`); toast('친구를 삭제했어요'); } catch (e) { toast('삭제하지 못했어요'); }
          loadFriends();
        });
      case 'rank': F.rank = el.dataset.r; return renderFriends();
      case 'refresh-friends': F.loaded = false; renderFriends(); return loadFriends();

      case 'save-nick': {
        const v = $('set-nick').value.trim().slice(0, 12);
        if (!v) return toast('닉네임을 입력해 주세요');
        $('top-name').textContent = v;
        if (U.friendCode) db.set(`${C.codes}/${U.friendCode}`, { uid: me.uid, nickname: v }).catch(() => {});
        return settingsUpdate({ nickname: v }, '닉네임을 바꿨어요', true);
      }
      case 'gender': {
        const g = el.dataset.v;
        let targets = [...U.targets];
        if (g === 'male') MALE_TARGETS.forEach((t) => { if (!targets.includes(t)) targets.push(t); });
        else targets = targets.filter((t) => !MALE_TARGETS.includes(t));
        return settingsUpdate({ gender: g, targets });
      }
      case 'add-target': {
        const v = $('set-target').value.trim();
        if (!v || U.targets.includes(v)) return;
        return settingsUpdate({ targets: [...U.targets, v] });
      }
      case 'del-target': {
        if (U.targets.length <= 1) return toast('하나는 남겨 주세요');
        return settingsUpdate({ targets: U.targets.filter((_, i) => i !== +el.dataset.i) });
      }
      case 'add-exam': {
        const name = $('exam-name').value.trim() || '시험', start = $('exam-start').value, end = $('exam-end').value;
        if (!start || !end) return toast('시험 시작일과 끝나는 날을 정해 주세요');
        if (end < start) return toast('끝나는 날이 시작일보다 빨라요');
        if (end < dateKey(now())) return toast('이미 끝난 시험이에요');
        return settingsUpdate({ exams: [...U.exams, { id: 'e' + uid6(), name, start, end }] }, `${name}을 추가했어요`);
      }
      case 'del-exam': return settingsUpdate({ exams: U.exams.filter((e) => e.id !== el.dataset.id) });
      case 'urge-min': return settingsUpdate({ urgeMinutes: +el.dataset.m });
      case 'add-act': {
        const v = $('set-act').value.trim();
        if (!v) return;
        return settingsUpdate({ activities: [...U.activities, v] });
      }
      case 'del-act': {
        if (U.activities.length <= 1) return toast('하나는 남겨 주세요');
        return settingsUpdate({ activities: U.activities.filter((_, i) => i !== +el.dataset.i) });
      }
      case 'add-quote': {
        const v = $('set-quote').value.trim();
        if (!v) return;
        return settingsUpdate({ quotes: [...U.quotes, v] }, '문구를 추가했어요');
      }
      case 'del-quote': return settingsUpdate({ quotes: U.quotes.filter((_, i) => i !== +el.dataset.i) });
      case 'theme': applyTheme(el.dataset.v === 'system' ? null : el.dataset.v); return renderSettings();
      case 'wipe': return openWipe();
      case 'logout':
        return confirmSheet('로그아웃할까요?', '기록은 계정에 그대로 남아 있어요.', '로그아웃', async () => {
          clearInterval(tickTimer); U = null; await db.signOut();
        }, false);
      default:
    }
  }

  async function onToggle(act, el) {
    if (act === 'share') {
      const share = { ...U.share, [el.dataset.k]: el.checked };
      try { await saveUser({ share }); } catch (e) {}
      savePublic(true);
    }
    if (act === 'risk-on') return settingsUpdate({ riskOn: el.checked });
  }

  function setupApp() {
    document.querySelectorAll('.tab').forEach((t) => { t.onclick = () => switchTab(t.dataset.tab); });
    document.addEventListener('click', (e) => {
      const m = e.target.closest('[data-mood]');
      if (m) {
        ui.mood = m.dataset.mood;
        document.querySelectorAll('.mood').forEach((x) => x.classList.toggle('selected', x === m));
        return;
      }
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled || el.tagName === 'INPUT') return;
      onAction(el.dataset.act, el);
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest('input[data-act]');
      if (el) onToggle(el.dataset.act, el);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.id) return;
      const map = { 'journal-input': 'save-journal', 'friend-code-input': 'add-friend', 'set-nick': 'save-nick', 'set-target': 'add-target', 'set-act': 'add-act', 'set-quote': 'add-quote', 'pledge-input': 'make-pledge' };
      if (map[e.target.id]) { e.preventDefault(); onAction(map[e.target.id], e.target); }
    });
    // 종료 버튼: 3초 동안 꾹 누르기
    document.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('[data-hold]');
      if (!h || (e.pointerType === 'mouse' && e.button !== 0)) return;
      holdStart(h);
    });
    ['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => holdEnd(true)));
    document.addEventListener('pointerout', (e) => { if (hold && e.target.closest('[data-hold]') === hold.el && !hold.el.contains(e.relatedTarget)) holdEnd(true); });
    document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-hold]')) e.preventDefault(); });
    document.addEventListener('keydown', (e) => { const h = e.target.closest && e.target.closest('[data-hold]'); if (h && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); holdStart(h); } });
    document.addEventListener('keyup', (e) => { if (hold && (e.key === 'Enter' || e.key === ' ')) holdEnd(true); });
    $('theme-btn').onclick = () => {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      applyTheme(dark ? 'light' : 'dark');
      if (ui.tab === 'settings') renderSettings();
    };
    $('reset-cancel').onclick = () => hide($('modal-reset'));
    $('modal-reset').onclick = (e) => { if (e.target.id === 'modal-reset') hide($('modal-reset')); };
    $('modal-sheet').onclick = (e) => { if (e.target.id === 'modal-sheet') closeSheet(); };
    $('reset-confirm').onclick = doEnd;
    $('urge-shuffle').onclick = () => {
      U.urge.activity = pickActivity(U.urge.activity);
      $('urge-activity').textContent = U.urge.activity;
      db.set(userPath(), { urge: U.urge }).catch(() => {});
    };
    $('urge-giveup').onclick = () => finishUrge('lose');
    $('urge-pick-close').onclick = () => { hide($('urge')); };
    $('cel-ok').onclick = nextCelebrate;
    $('urge-lose').onclick = () => finishUrge('lose');
    $('urge-win').onclick = () => finishUrge('win');
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !U) return;
      tick();
      if (ui.tab === 'friends') loadFriends();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(currentTheme()));
    const net = () => $('offline-bar').classList.toggle('hidden', navigator.onLine !== false);
    addEventListener('online', net); addEventListener('offline', net); net();
    setInterval(() => { if (U && ui.tab === 'friends' && !document.hidden) loadFriends(true).then(() => ui.tab === 'friends' && renderFriendsKeepInput()); }, 60000);
  }
  function renderFriendsKeepInput() {
    const v = $('friend-code-input') ? $('friend-code-input').value : '';
    const focused = document.activeElement && document.activeElement.id === 'friend-code-input';
    renderFriends();
    if ($('friend-code-input')) { $('friend-code-input').value = v; if (focused) $('friend-code-input').focus(); }
  }

  /* ====================== 시작 ====================== */
  const bootT0 = now();
  const LOAD_MIN = 900;   // 로딩 화면을 너무 짧게 깜빡이지 않도록
  const waitLoad = () => new Promise((r) => setTimeout(r, Math.max(0, LOAD_MIN - (now() - bootT0))));

  async function boot() {
    applyTheme(currentTheme());
    document.querySelectorAll('[data-ver]').forEach((el) => { el.textContent = `FocusFill v${APP_VERSION}`; });
    const lq = $('load-quote');
    if (lq) lq.textContent = quoteOfDay();
    try { db = useFirebase ? await FirebaseBackend() : LocalBackend(); }
    catch (e) { console.warn('Firebase를 불러오지 못해 테스트 모드로 실행해요.', e); db = LocalBackend(); }
    if (db.mode === 'local') show($('test-banner'));
    setupAuth();
    setupOnboarding();
    setupApp();

    db.onAuth(async (user) => {
      me = user;
      clearInterval(tickTimer);
      hide($('urge')); hide($('modal-reset')); closeSheet(); celQueue.length = 0; celOn = false; hide($('celebrate'));
      if (!user) {
        U = null; F.list = []; F.incoming = []; F.outgoing = []; F.loaded = false;
        setAuthMode('login');
        $('auth-pw').value = ''; $('auth-pw2').value = '';
        await waitLoad();
        go('screen-auth');
        return;
      }
      go('screen-loading');
      let data = null;
      try { data = await db.get(userPath()); } catch (e) { data = null; }
      if (!data || !data.onboarded) {
        obKeep = data ? { friendCode: data.friendCode || '', codeOk: !!data.codeOk, share: data.share } : {};
        await waitLoad();
        resetOnboarding(data && data.nickname); go('screen-onboard'); obShow(); return;
      }
      U = normalize(data);
      await loadRecords();
      await waitLoad();
      await enterApp();
    });
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
  boot();
})();
