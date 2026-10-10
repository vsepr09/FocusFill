/* FocusFill — 도파민 디톡스 기록 (ProFill과 같은 계정) */
(() => {
  'use strict';

  /* ====================== 상수 ====================== */
  const APP_VERSION = '1.2.0';
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
  const XP = { hour: 1, urgeWin: 10, journal: 5, comeback: 15, monthGoal: 50, mission: 15, pledge: 5, check: 10 };
  // 연속 배수: 오래 버틸수록 모든 보상이 커져요 (시험 기간엔 여기에 2배 더)
  const MULT_TIERS = [{ ms: 30 * DAY, x: 2, label: '30일' }, { ms: 7 * DAY, x: 1.5, label: '7일' }, { ms: 3 * DAY, x: 1.2, label: '3일' }];
  const ATTEND_REWARDS = [5, 5, 10, 10, 15, 15, 50];
  const PLANT = [
    { ms: 0, name: '씨앗' }, { ms: HOUR, name: '새싹' }, { ms: DAY, name: '어린 잎' }, { ms: 3 * DAY, name: '작은 나무' },
    { ms: 7 * DAY, name: '나무' }, { ms: 14 * DAY, name: '큰 나무' }, { ms: 30 * DAY, name: '꽃 핀 나무' },
  ];
  const PLEDGES = ['오늘은 쇼츠 안 보기', '공부할 땐 기기 멀리 두기', '자기 전 30분 화면 끄기', '충동이 오면 참기 누르기', '쉬는 시간엔 화면 대신 걷기'];
  const PLEDGE_CHECK_HOUR = 16;
  const DEFAULT_MISSIONS = [
    '저녁 먹고 20분 걷기', '자기 전 30분 기기 안 보기', '책 10쪽 읽기', '물 6잔 마시기', '팔굽혀펴기 30개 (나눠서 해도 OK)',
    '방이나 책상 10분 정리하기', '친구와 화면 없이 10분 이야기하기', '내일 할 일 3개 적기', '스트레칭 5분', '영어 단어 20개 외우기',
    '수학 문제 5개 풀기', '가족에게 먼저 연락하기', '감사한 일 3가지 적기', '눈 감고 5분 가만히 앉아 있기', '쉬는 시간 한 번은 밖에 나가기',
    '오늘 배운 것 하나 노트에 정리하기', '계단으로 다니기', '알림 전부 끄고 1시간 공부하기', '좋아하는 노래 한 곡 집중해서 듣기', '아침에 일어나서 30분 동안 기기 안 보기',
    '한 과목 오답 노트 쓰기', '친구 한 명 칭찬하기', '하루 계획표 만들고 지키기', '스쿼트 30개', '줄넘기나 달리기 10분',
    '손편지나 메모 한 장 쓰기', '오늘 하루 SNS 열지 않기', '공부 시간 1시간 더 채우기', '자기 전에 내일 준비물 챙기기', '20분 동안 한 가지 일만 하기',
    '햇빛 보며 10분 걷기', '밥 먹을 때 화면 안 보기', '모르는 것 하나 선생님께 질문하기', '책상 위 물건 3개 치우기', '일찍 자기 (평소보다 30분)',
    '플랭크 1분', '하루 동안 쇼츠 앱 홈 화면에서 빼두기', '한 시간 동안 기기를 다른 방에 두기', '오늘 잘한 일 하나 일기에 쓰기', '천천히 깊게 숨쉬기 10번',
  ];
  const TIERS = { c: { name: '일반', xp: 15, star: '★' }, r: { name: '희귀', xp: 50, star: '★★' }, l: { name: '전설', xp: 150, star: '★★★' } };
  const ACHS = [
    { id: 'urge1', cat: '참기', tier: 'c', key: 'wins', need: 1, name: '첫 승리', desc: '참기 첫 성공' },
    { id: 'urge10', cat: '참기', tier: 'c', key: 'wins', need: 10, name: '버티는 손', desc: '참기 10번 성공' },
    { id: 'urge50', cat: '참기', tier: 'r', key: 'wins', need: 50, name: '충동 사냥꾼', desc: '참기 50번 성공' },
    { id: 'urge100', cat: '참기', tier: 'l', key: 'wins', need: 100, name: '흔들리지 않는 마음', desc: '참기 100번 성공' },
    { id: 'plan1', cat: '참기', tier: 'c', key: 'planWins', need: 1, name: '계획대로', desc: '만약-그러면 계획으로 참기 성공' },
    { id: 'plan20', cat: '참기', tier: 'r', key: 'planWins', need: 20, name: '전략가', desc: '계획으로 참기 20번 성공' },
    { id: 'triple', cat: '참기', tier: 'r', key: 'maxDayWins', need: 3, name: '하루 세 번', desc: '하루에 참기 3번 성공' },
    { id: 'risk5', cat: '참기', tier: 'r', key: 'riskWins', need: 5, name: '위기의 순간', desc: '위험 시간대에 참기 5번 성공' },
    { id: 'j1', cat: '기록', tier: 'c', key: 'journals', need: 1, name: '첫 줄', desc: '첫 일기 쓰기' },
    { id: 'j7', cat: '기록', tier: 'c', key: 'jBest', need: 7, name: '일주일 일기', desc: '일기 7일 연속' },
    { id: 'j30', cat: '기록', tier: 'r', key: 'jBest', need: 30, name: '한 달 일기', desc: '일기 30일 연속' },
    { id: 'j100', cat: '기록', tier: 'l', key: 'journals', need: 100, name: '기록하는 사람', desc: '일기 100개' },
    { id: 'sit10', cat: '기록', tier: 'c', key: 'sitResets', need: 10, name: '나를 아는 중', desc: '상황까지 고른 리셋 기록 10번' },
    { id: 'cb1', cat: '회복', tier: 'c', key: 'comebacks', need: 1, name: '다시 일어서기', desc: '재도전 목표 첫 달성' },
    { id: 'cb5', cat: '회복', tier: 'r', key: 'comebacks', need: 5, name: '오뚝이', desc: '재도전 목표 5번 달성' },
    { id: 'cb15', cat: '회복', tier: 'l', key: 'comebacks', need: 15, name: '절대 포기 안 함', desc: '재도전 목표 15번 달성' },
    { id: 'rec3', cat: '회복', tier: 'r', key: 'recordBreaks', need: 3, name: '기록 경신', desc: '최장 기록을 3번 갈아치우기' },
    { id: 'goal1', cat: '목표', tier: 'c', key: 'goalsDone', need: 1, name: '목표 달성', desc: '이번 달 목표 첫 달성' },
    { id: 'goal3', cat: '목표', tier: 'r', key: 'goalsDone', need: 3, name: '목표 수집가', desc: '월 목표 3번 달성' },
    { id: 'goalrun3', cat: '목표', tier: 'l', key: 'goalRun', need: 3, name: '세 달 연속', desc: '월 목표 3달 연속 달성' },
    { id: 'mis1', cat: '미션·다짐', tier: 'c', key: 'missions', need: 1, name: '첫 미션', desc: '오늘의 미션 첫 완료' },
    { id: 'mis30', cat: '미션·다짐', tier: 'r', key: 'missions', need: 30, name: '미션 30', desc: '미션 30개 완료' },
    { id: 'mis100', cat: '미션·다짐', tier: 'l', key: 'missions', need: 100, name: '미션 마스터', desc: '미션 100개 완료' },
    { id: 'keep7', cat: '미션·다짐', tier: 'c', key: 'kept', need: 7, name: '약속 지키기', desc: '다짐 7번 지키기' },
    { id: 'keep30', cat: '미션·다짐', tier: 'r', key: 'kept', need: 30, name: '말한 대로', desc: '다짐 30번 지키기' },
    { id: 'f1', cat: '친구', tier: 'c', key: 'friends', need: 1, name: '함께라면', desc: '첫 친구 추가' },
    { id: 'f3', cat: '친구', tier: 'r', key: 'friends', need: 3, name: '디톡스 크루', desc: '친구 3명' },
    { id: 'top1', cat: '친구', tier: 'r', key: 'top1', need: 1, name: '1등', desc: '친구 순위에서 진행 시간 1등' },
    { id: 'att7', cat: '꾸준함', tier: 'c', key: 'attBest', need: 7, name: '개근', desc: '출석 7일 연속' },
    { id: 'att30', cat: '꾸준함', tier: 'r', key: 'attBest', need: 30, name: '한 달 개근', desc: '출석 30일 연속' },
    { id: 'att100', cat: '꾸준함', tier: 'l', key: 'attTotal', need: 100, name: '백 일', desc: '출석 총 100일' },
    { id: 'lv5', cat: '꾸준함', tier: 'c', key: 'level', need: 5, name: '레벨 5', desc: '레벨 5 달성' },
    { id: 'lv10', cat: '꾸준함', tier: 'r', key: 'level', need: 10, name: '레벨 10', desc: '레벨 10 달성' },
    { id: 'lv20', cat: '꾸준함', tier: 'l', key: 'level', need: 20, name: '레벨 20', desc: '레벨 20 달성' },
    { id: 'plant3', cat: '성장', tier: 'c', key: 'plant', need: 3, name: '작은 나무', desc: '나무를 작은 나무까지 키우기' },
    { id: 'plant6', cat: '성장', tier: 'l', key: 'plant', need: 6, name: '꽃이 피었다', desc: '나무에 꽃 피우기 (30일)' },
    { id: 'exam1', cat: '성장', tier: 'l', key: 'examClean', need: 1, name: '시험 기간 완주', desc: '시험 기간을 리셋 없이 버티기' },
    { id: 'saved100', cat: '성장', tier: 'r', key: 'savedH', need: 100, name: '100시간', desc: '되찾은 시간 100시간' },
  ];
  const SITUATIONS = ['심심함', '피곤함', '스트레스', '혼자 있음', '잠들기 전', '할 일 미루는 중'];
  const GOAL_TYPES = {
    resets_max: { name: '리셋', unit: '번 이하', def: 3, desc: '이번 달 리셋 횟수를 이 안으로' },
    wins_min: { name: '참기 성공', unit: '번 이상', def: 10, desc: '충동을 이만큼 이겨내기' },
    journal_min: { name: '일기 쓰기', unit: '일 이상', def: 15, desc: '한 줄 일기를 이만큼 쓰기' },
  };
  const TITLES = ['새싹', '견습 수행자', '집중 입문자', '절제 수련생', '루틴 지킴이', '도파민 사냥꾼', '몰입 장인', '절제의 달인', '마인드 마스터', '전설의 수도승'];
  const BASE_TARGETS = ['쇼츠', '게임', '웹툰', 'SNS'];
  const MALE_TARGETS = ['야동', '딸'];
  const DEFAULT_ACTIVITIES = [
    '물 한 잔 마시기', '1분 스트레칭', '문제 하나 풀기', '창밖 보며 심호흡 10번', '책상 정리하기',
    '팔굽혀펴기 10개', '내일 할 일 3개 적기', '친구한테 말 걸기', '세수하고 오기', '좋아하는 노래 한 곡 듣기',
  ];
  const QUOTES = [
    '지루함을 견디는 시간이 집중력이 자라는 시간이다.',
    '오늘 참은 1분이 내일의 1시간을 만든다.',
    '충동은 파도다. 타고 넘으면 지나간다.',
    '빠른 재미 대신 느린 성취를 고르는 연습.',
    '스크롤을 멈추면 내 시간이 다시 흐른다.',
    '완벽하지 않아도 된다. 다시 시작하면 된다.',
    '내가 내 주의력의 주인이다.',
    '작은 승리가 쌓여서 습관이 된다.',
    '심심함은 머리가 쉬는 소리다.',
    '지금 버티는 나는 어제의 나보다 강하다.',
    '도파민은 줄이고, 몰입은 늘리고.',
    '무너진 날보다 다시 일어난 날을 세자.',
    '한 번 더 참으면 한 칸 더 채워진다.',
    '좋아하는 것보다 중요한 것을 먼저.',
    '눈을 들어 지금 여기를 보자.',
    '쉬운 길이 늘 좋은 길은 아니다.',
    '오늘의 집중이 내일의 자유가 된다.',
    '참는 게 아니라 고르는 거다.',
    '하루를 채우는 건 내가 고른 것들이다.',
    '조금 느려도 꾸준한 쪽이 이긴다.',
  ];
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
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };

  /* ====================== 도우미 ====================== */
  const $ = (id) => document.getElementById(id);
  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idOf = (email) => (email || '').split('@')[0];
  const now = () => Date.now();

  function dayStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function addDays(ts, n) { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); }
  function dateKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function weekStart(ts) { const d = new Date(dayStart(ts)); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d.getTime(); }
  function weekKey(ts = now()) { return dateKey(weekStart(ts)); }
  function monthKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
  function monthRange(mk) { const [y, m] = mk.split('-').map(Number); return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]; }
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
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const children = (col) => Object.keys(s.docs)
      .filter((p) => p.startsWith(col + '/') && !p.slice(col.length + 1).includes('/'))
      .map((p) => ({ id: p.slice(col.length + 1), ...clone(s.docs[p]) }));
    return {
      mode: 'local',
      onAuth(cb) { listener = cb; cb(userOf(s.session)); },
      async signUp(email, pw) {
        if (s.accounts[email]) throw authError('auth/email-already-in-use');
        const uid = 'u' + newId();
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
      async add(col, data) { const id = newId(); s.docs[col + '/' + id] = clone(data); save(); return id; },
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
  const S = { streaks: [], urges: [], journal: {} };   // 내 기록
  const F = { list: [], incoming: [], outgoing: [], rank: 'time', loaded: false, loading: false, msg: '' };
  const ui = { tab: 'home', recTab: 'report', calMonth: null, selDay: null, weekOff: 1, monthOff: 1, year: null, editJournal: false, mood: null };
  let tickTimer = null;

  const userPath = () => `${C.users}/${me.uid}`;
  const pubPath = () => `${C.pub}/${me.uid}`;

  function normalize(u) {
    const d = {
      nickname: idOf(me.email), gender: 'none', targets: [...BASE_TARGETS], rules: [], activities: [...DEFAULT_ACTIVITIES],
      urgeMinutes: 10, startAt: now(), bestMs: 0, urgeWins: 0, urge: null, xp: 0, xpHours: 0, badges: {},
      auto: { on: false, start: '18:30', end: '07:00' }, quotes: [],
      share: { time: true, best: true, level: true, badges: true, urges: true },
      reportSeen: '', friendCode: '', codeOk: false,
      plans: [], riskOn: true, comeback: null, monthGoals: {},
      attend: {}, daily: {}, achievements: {}, missions: [], dailyMinutes: null, exam: null,
      plantFloor: 0, plantMax: 0, comebackDone: 0, recordBreaks: 0, maxFriends: 0, wasTop1: false, monthSeen: '', yearSeen: null,
    };
    const out = { ...d, ...u };
    out.auto = { ...d.auto, ...(u.auto || {}) };
    out.share = { ...d.share, ...(u.share || {}) };
    out.badges = u.badges || {};
    out.monthGoals = u.monthGoals || {};
    out.plans = u.plans || [];
    out.attend = u.attend || {};
    out.daily = u.daily || {};
    out.achievements = u.achievements || {};
    out.missions = u.missions || [];
    if (!out.trackStart) out.trackStart = Math.min(out.startAt, u.createdAt || out.startAt);
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

  // 축하 화면 (배지, 재도전 성공, 이번 달 목표)
  const celQueue = [];
  let celOn = false;
  function celebrate(o) { celQueue.push(o); if (!celOn) nextCelebrate(); }
  function nextCelebrate() {
    const o = celQueue.shift();
    if (!o) { celOn = false; hide($('celebrate')); return; }
    celOn = true;
    if (o.plant != null) { $('cel-medal').innerHTML = plantSvg(o.plant, false); $('cel-medal').className = 'cel-medal plant'; }
    else { $('cel-medal').textContent = o.medal; $('cel-medal').className = 'cel-medal' + (o.kind ? ' ' + o.kind : ''); }
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
      startAt: sh.time ? U.startAt : null,
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
  const ob = { step: 0, gender: null, targets: [], custom: [], rules: [], start: null };
  const OB_STEPS = 5;
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
  function ruleListHtml(rules, editable) {
    if (!rules.length) return `<li class="empty">${editable ? '아직 규칙이 없어요' : '설정에서 규칙을 추가할 수 있어요'}</li>`;
    return rules.map((r, i) => `<li><span class="rule-tag ${r.type === 'ban' ? 'ban' : 'limit'}">${r.type === 'ban' ? '금지' : '제한'}</span>
      <span class="rule-text">${esc(r.text)}</span>${editable ? `<button type="button" class="rule-del" data-i="${i}" aria-label="삭제">✕</button>` : ''}</li>`).join('');
  }
  function renderObRules() {
    $('ob-rules').innerHTML = ruleListHtml(ob.rules, true);
    $('ob-rules').querySelectorAll('.rule-del').forEach((b) => { b.onclick = () => { ob.rules.splice(+b.dataset.i, 1); renderObRules(); obShow(); }; });
  }
  function obShow() {
    document.querySelectorAll('.ob-step').forEach((s) => s.classList.toggle('active', +s.dataset.step === ob.step));
    $('ob-dots').innerHTML = Array.from({ length: OB_STEPS }, (_, i) => `<span class="${i <= ob.step ? 'on' : ''}"></span>`).join('');
    $('ob-back').style.visibility = ob.step === 0 ? 'hidden' : 'visible';
    $('ob-next').textContent = ob.step === OB_STEPS - 1 ? '시작하기' : (ob.step === 3 && !ob.rules.length ? '건너뛰기' : '다음');
    $('ob-error').textContent = '';
    if (ob.step === 2) renderObTargets();
    if (ob.step === 3) renderObRules();
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
    const addRule = () => {
      const v = $('ob-rule-input').value.trim();
      if (!v) return;
      ob.rules.push({ type: $('ob-rule-type').value, text: v });
      $('ob-rule-input').value = '';
      renderObRules(); obShow();
    };
    $('ob-rule-add').onclick = addRule;
    $('ob-rule-input').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } };
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

  function resetOnboarding() {
    Object.assign(ob, { step: 0, gender: null, targets: [...BASE_TARGETS], custom: [], rules: [], start: null });
    $('ob-nick').value = '';
    document.querySelectorAll('#screen-onboard .choice').forEach((x) => x.classList.remove('selected'));
    hide($('ob-start-time'));
  }

  async function finishOnboarding(startAt) {
    const ordered = obAllTargets().filter((t) => ob.targets.includes(t));
    const data = {
      nickname: $('ob-nick').value.trim().slice(0, 12), gender: ob.gender, targets: ordered, rules: ob.rules,
      activities: [...DEFAULT_ACTIVITIES], urgeMinutes: 10, startAt, trackStart: startAt, bestMs: 0, urgeWins: 0, urge: null,
      xp: 0, xpHours: 0, badges: {}, onboarded: true, createdAt: now(),
    };
    U = normalize(data);
    await db.set(userPath(), U);
    S.streaks = []; S.urges = []; S.journal = {};
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
    $('profill-link').href = PROFILL_URL;
    applyTheme(currentTheme());
    ui.calMonth = null; ui.selDay = dateKey(now()); ui.editJournal = false; ui.mood = null;
    ui.weekOff = U.trackStart < weekStart(now()) ? 1 : 0;
    ui.monthOff = U.trackStart < monthRange(monthKey(now()))[0] ? 1 : 0;
    ui.recTab = 'report'; ui.year = null;
    F.loaded = false;
    switchTab('home');
    startTick();
    if (U.urge) openUrge(true);
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
    const ms = Math.max(0, t - U.startAt);
    if (ui.tab === 'home') updateHero(ms);
    if (ui.tab === 'friends') document.querySelectorAll('[data-live]').forEach((el) => {
      el.textContent = fmtLive(t - Number(el.dataset.live));
    });
    if (U.urge) renderUrge();
    checkProgress(ms);
    if (Math.floor(t / 1000) % 30 === 0) checkAchievements();
    const dk = dateKey(t);
    if (dk !== lastDay) { lastDay = dk; checkGoals(); if (ui.tab === 'home') renderHome(); }
    const hr = new Date(t).getHours();
    if (hr !== lastHour) { lastHour = hr; if (ui.tab === 'home' && !document.activeElement.matches('input')) renderHome(); }
  }

  let progressBusy = false;
  async function checkProgress(ms) {
    if (progressBusy) return;
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
      cels.push({ medal: '↻', kind: 'alt', kicker: '재도전 목표 달성', title: `${fmtDur(cb.targetMs)} 버텼어요!`, sub: '리셋 후 다시 일어섰어요. 이 기세 그대로 가요.', xp: b });
    }
    const st = stageOf(ms);
    if (st > (U.plantMax || 0)) {
      U.plantMax = st; fields.plantMax = st;
      if (st >= 2) cels.push({ plant: st, kicker: '나무가 자랐어요', title: `${iga(PLANT[st].name)} 됐어요!`, sub: `${fmtDur(PLANT[st].ms)} 동안 잘 키웠어요.` });
    }
    if (!Object.keys(fields).length) return;
    progressBusy = true;
    if (gained) { await addXp(gained); fields.xp = U.xp; }
    cels.forEach(celebrate);
    try { await saveUser(fields); } catch (e) {}
    savePublic();
    progressBusy = false;
    if (ui.tab === 'home') { if (cels.length || fields.plantMax) renderHome(); else renderLevelCard(); }
    if (cels.length) checkAchievements();
  }

  /* ====================== 이번 달 목표 ====================== */
  function goalStatus(mk) {
    const g = U.monthGoals[mk];
    if (!g) return null;
    const [a, b] = monthRange(mk);
    let cur = 0;
    if (g.type === 'resets_max') cur = S.streaks.filter((s) => s.end >= a && s.end < b).length;
    else if (g.type === 'wins_min') cur = S.urges.filter((u) => u.result === 'win' && u.at >= a && u.at < b).length;
    else for (let d = a; d < b; d = addDays(d, 1)) if (S.journal[dateKey(d)]) cur++;
    const ended = b <= now();
    let state;
    if (g.type === 'resets_max') state = cur > g.n ? 'fail' : ended ? 'done' : 'ongoing';
    else state = cur >= g.n ? 'done' : ended ? 'fail' : 'ongoing';
    const daysLeft = Math.max(0, Math.ceil((b - now()) / DAY));
    return { g, cur, state, a, b, daysLeft };
  }
  function goalLabel(g) { const t = GOAL_TYPES[g.type]; return `${t.name} ${g.n}${t.unit}`; }

  async function checkGoals() {
    if (!U) return;
    const goals = { ...U.monthGoals };
    let changed = false;
    for (const mk of Object.keys(goals)) {
      const st = goalStatus(mk);
      if (!st || st.g.rewarded || st.state !== 'done') continue;
      goals[mk] = { ...st.g, rewarded: now() };
      changed = true;
      const got = await gain(XP.monthGoal);
      const m = Number(mk.split('-')[1]);
      celebrate({ medal: `${m}월`, kind: 'alt', kicker: '이번 달 목표 달성', title: `${goalLabel(st.g)} 달성!`, sub: `${m}월 목표를 지켜냈어요.`, xp: got });
    }
    if (changed) { try { await saveUser({ monthGoals: goals, xp: U.xp }); } catch (e) {} savePublic(); checkAchievements(); }
  }

  function openGoalSheet() {
    const mk = monthKey(now());
    const cur = U.monthGoals[mk];
    let type = cur ? cur.type : 'resets_max';
    const m = Number(mk.split('-')[1]);
    openSheet(`<h2>${m}월 목표</h2><p class="muted">한 달 동안 지킬 목표를 하나 정해요. 달성하면 +${XP.monthGoal} XP</p>
      <p class="label">무엇을</p>
      <div class="seg" id="goal-type">${Object.entries(GOAL_TYPES).map(([k, t]) => `<button type="button" class="seg-btn${k === type ? ' active' : ''}" data-k="${k}">${t.name}</button>`).join('')}</div>
      <p class="muted small" id="goal-desc" style="margin-top:8px"></p>
      <p class="label">얼마나</p>
      <div class="time-row"><input type="number" id="goal-n" min="1" max="99" inputmode="numeric" style="width:6em" /><span id="goal-unit"></span></div>
      <p class="form-err" id="goal-err"></p>
      <div class="sheet-actions">${cur ? '<button class="btn danger-ghost" data-del type="button">목표 지우기</button>' : '<button class="btn ghost" data-close type="button">취소</button>'}
        <button class="btn primary" data-ok type="button">저장</button></div>`,
    (el) => {
      const sync = (keep) => {
        el.querySelectorAll('#goal-type .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.k === type));
        $('goal-unit').textContent = GOAL_TYPES[type].unit;
        $('goal-desc').textContent = GOAL_TYPES[type].desc;
        if (!keep) $('goal-n').value = cur && cur.type === type ? cur.n : GOAL_TYPES[type].def;
      };
      sync(false);
      el.querySelectorAll('#goal-type .seg-btn').forEach((b) => { b.onclick = () => { type = b.dataset.k; sync(false); }; });
      const c = el.querySelector('[data-close]'); if (c) c.onclick = closeSheet;
      const d = el.querySelector('[data-del]');
      if (d) d.onclick = async () => { const goals = { ...U.monthGoals }; delete goals[mk]; closeSheet(); await saveUser({ monthGoals: goals }).catch(() => {}); renderHome(); };
      el.querySelector('[data-ok]').onclick = async () => {
        const n = Math.round(Number($('goal-n').value));
        if (!n || n < 1 || n > 99) { $('goal-err').textContent = '1부터 99 사이 숫자로 정해 주세요.'; return; }
        const goals = { ...U.monthGoals, [mk]: { type, n, setAt: now() } };
        closeSheet();
        try { await saveUser({ monthGoals: goals }); toast('이번 달 목표를 정했어요'); } catch (e) {}
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
  // 3시간 묶음 중 리셋이 가장 많은 시간대
  function riskiestWindow() {
    if (S.streaks.length < 3) return null;
    const c = hourCounts();
    let best = -1, from = 0;
    for (let h = 0; h < 24; h++) { const n = c[h] + c[(h + 1) % 24] + c[(h + 2) % 24]; if (n > best) { best = n; from = h; } }
    return best >= 2 ? { from, n: best, total: S.streaks.length } : null;
  }
  // 지금이 위험 시간대인지: 지금 시각을 포함한 3시간 묶음 중 가장 리셋이 많은 것
  function riskNow(ts) {
    const exam = examOn();
    if (!U.riskOn || S.streaks.length < (exam ? 2 : 3)) return null;
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
      const t = new Date(k + 'T00:00:00').getTime();
      run = prev != null && dateKey(addDays(prev, 1)) === k ? run + 1 : 1;
      best = Math.max(best, run); prev = t;
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

  /* ====================== 홈 ====================== */
  function inAutoWindow(ts) {
    if (!U.auto.on) return false;
    const [sh, sm] = U.auto.start.split(':').map(Number), [eh, em] = U.auto.end.split(':').map(Number);
    const d = new Date(ts), mins = d.getHours() * 60 + d.getMinutes();
    const a = sh * 60 + sm, b = eh * 60 + em;
    return a <= b ? mins >= a && mins < b : mins >= a || mins < b;
  }

  /* ---------- 오늘의 문장 (매일 아침 8시에 바뀜) ---------- */
  const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  function quoteDayTs() { return now() - 8 * HOUR; }
  function quoteOfDay() {
    const Q = window.FF_QUOTES && window.FF_QUOTES.length ? window.FF_QUOTES : QUOTES;
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

  /* ---------- 연속 배수 · 시험 기간 ---------- */
  function streakMult(ms) { const t = MULT_TIERS.find((x) => ms >= x.ms); return t ? t.x : 1; }
  function examInfo(t = now()) {
    const e = U.exam;
    if (!e || !e.start || !e.end) return null;
    const s = new Date(e.start + 'T00:00:00').getTime(), en = addDays(new Date(e.end + 'T00:00:00').getTime(), 1);
    if (t >= en) return { state: 'over', s, en };
    if (t >= s) return { state: 'on', s, en, left: Math.ceil((en - dayStart(t)) / DAY) - 1 };
    return { state: 'before', s, en, dday: Math.round((s - dayStart(t)) / DAY) };
  }
  const examOn = () => { const e = examInfo(); return !!(e && e.state === 'on'); };
  function mult() { return Math.round(streakMult(now() - U.startAt) * (examOn() ? 2 : 1) * 10) / 10; }
  async function gain(base) { const n = Math.round(base * mult()); await addXp(n); return n; }
  const fmtX = (x) => `×${Number.isInteger(x) ? x : x.toFixed(1)}`;

  /* ---------- 키우기 ---------- */
  function stageOf(ms) { let s = 0; PLANT.forEach((p, i) => { if (ms >= p.ms) s = i; }); return s; }
  function plantState() {
    const ms = Math.max(0, now() - U.startAt);
    const grow = stageOf(ms), floor = U.plantFloor || 0;
    const stage = Math.max(grow, floor);
    return { ms, grow, floor, stage, wilted: grow < floor };
  }
  function plantSvg(stage, wilted) {
    const leaf = wilted ? '#A8A57E' : '#5FAE55', leaf2 = wilted ? '#8F8C68' : '#3F8A45', trunk = '#8A5A3B';
    const droop = wilted ? ' transform="rotate(7 80 122)"' : '';
    const L = (x, y, rx, ry, rot, c) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${c}"/>`;
    let g = '';
    if (stage === 0) g = '<ellipse cx="80" cy="117" rx="6" ry="4" fill="#7A4E2F"/><path d="M80 113c1-4 4-6 7-6" stroke="#5FAE55" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    if (stage === 1) g = `<path d="M80 121V100" stroke="${leaf2}" stroke-width="3" stroke-linecap="round"/>${L(72, 100, 9, 4.5, -25, leaf)}${L(88, 97, 9, 4.5, 25, leaf)}`;
    if (stage === 2) g = `<path d="M80 121V80" stroke="${leaf2}" stroke-width="3.5" stroke-linecap="round"/>${L(70, 104, 11, 5, -25, leaf)}${L(90, 98, 11, 5, 25, leaf)}${L(70, 88, 11, 5, -30, leaf2)}${L(90, 82, 11, 5, 30, leaf)}${L(80, 76, 6, 9, 0, leaf)}`;
    if (stage >= 3) {
      const h = [0, 0, 0, 82, 70, 62, 60][stage];
      const crown = stage === 3 ? `<circle cx="80" cy="${h - 8}" r="22" fill="${leaf}"/>`
        : stage === 4 ? `<circle cx="64" cy="${h}" r="18" fill="${leaf2}"/><circle cx="96" cy="${h}" r="18" fill="${leaf2}"/><circle cx="80" cy="${h - 14}" r="26" fill="${leaf}"/>`
          : `<circle cx="56" cy="${h + 4}" r="20" fill="${leaf2}"/><circle cx="104" cy="${h + 4}" r="20" fill="${leaf2}"/><circle cx="80" cy="${h - 16}" r="30" fill="${leaf}"/><circle cx="66" cy="${h - 4}" r="20" fill="${leaf}"/><circle cx="96" cy="${h - 6}" r="20" fill="${leaf}"/>`;
      const flowers = stage === 6 && !wilted ? [[66, 42], [92, 36], [104, 58], [58, 64], [82, 56], [74, 28]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="5" fill="var(--accent)"/><circle cx="${x}" cy="${y}" r="1.8" fill="#FFF3E0"/>`).join('') : '';
      g = `<path d="M80 121V${h}" stroke="${trunk}" stroke-width="${stage >= 5 ? 9 : 7}" stroke-linecap="round"/><path d="M80 ${h + 22}l-12-10M80 ${h + 30}l12-9" stroke="${trunk}" stroke-width="4" stroke-linecap="round"/>${crown}${flowers}`;
    }
    return `<svg class="plant-svg${wilted ? ' wilted' : ''}" viewBox="0 0 160 160" role="img" aria-label="${PLANT[stage].name}${wilted ? ' (시듦)' : ''}">
      <ellipse cx="80" cy="152" rx="44" ry="4" fill="currentColor" opacity=".08"/>
      <g${droop}>${g}</g>
      <path d="M52 120h56l-7 32H59z" fill="#C2693A"/><rect x="48" y="114" width="64" height="10" rx="3" fill="#D47A48"/>
      <ellipse cx="80" cy="119" rx="27" ry="3.5" fill="#6B4227"/>
    </svg>`;
  }
  function plantCardHtml() {
    const p = plantState();
    const next = PLANT[p.stage + 1];
    let line, pct = 100;
    if (p.wilted) {
      const need = PLANT[p.floor].ms - p.ms;
      line = `리셋해서 시들었어요. <b>${fmtDur(need)}</b> 더 버티면 다시 살아나요.`;
      pct = (p.ms / PLANT[p.floor].ms) * 100;
    } else if (next) {
      line = `<b>${fmtDur(next.ms - p.ms)}</b> 더 버티면 ${iga(next.name)} 돼요.`;
      pct = ((p.ms - PLANT[p.stage].ms) / (next.ms - PLANT[p.stage].ms)) * 100;
    } else line = '다 자랐어요. 이 나무를 계속 지켜주세요.';
    return `<section class="card plant-card${p.wilted ? ' wilted' : ''}">
      <div class="sec-head"><h2>나의 나무</h2><span class="plant-name">${PLANT[p.stage].name}${p.wilted ? ' · 시듦' : ''}</span></div>
      <div class="plant-body">${plantSvg(p.stage, p.wilted)}
        <div class="plant-info"><p class="small">${line}</p>
          <div class="bar thin"><div class="fill" id="plant-bar" style="width:${Math.min(100, pct).toFixed(1)}%"></div></div>
          <div class="plant-steps">${PLANT.map((x, i) => `<i class="${i <= p.stage ? 'on' : ''}" title="${x.name}"></i>`).join('')}</div></div></div>
    </section>`;
  }

  /* ---------- 되찾은 시간 ---------- */
  function savedMs(from, to) {
    if (!U.dailyMinutes) return 0;
    const per = U.dailyMinutes * MIN;
    from = Math.max(from, U.trackStart); to = Math.min(to, now());
    let total = 0;
    for (let d = dayStart(from); d < to; d = addDays(d, 1)) {
      const d1 = addDays(d, 1);
      if (S.streaks.some((s) => s.end >= d && s.end < d1)) continue;
      const a = Math.max(d, from), b = Math.min(d1, to);
      if (b > a) total += per * ((b - a) / DAY);
    }
    return total;
  }
  function savedLine(ms) {
    const h = ms / HOUR;
    if (h < 2) return '조금씩 쌓이는 중이에요';
    if (h < 60) return `영화 약 ${Math.floor(h / 2)}편을 볼 수 있는 시간`;
    return `책 약 ${Math.floor(h / 5)}권을 읽을 수 있는 시간`;
  }
  function savedCardHtml() {
    if (!U.dailyMinutes) {
      return `<section class="card"><div class="sec-head"><h2>되찾은 시간</h2></div>
        <p class="muted small" style="margin-bottom:10px">하루에 쇼츠·게임·SNS에 쓰던 시간이 대략 얼마였나요? 디톡스로 되찾은 시간을 계산해 드릴게요.</p>
        <div class="chips" style="margin-bottom:10px">${[60, 120, 180, 240].map((m) => `<button type="button" class="chip" data-act="set-minutes" data-m="${m}">${m / 60}시간</button>`).join('')}</div>
        <div class="inline-add"><input id="minutes-input" type="number" min="10" max="900" inputmode="numeric" placeholder="직접 입력 (분)" /><button class="btn" data-act="set-minutes" type="button">저장</button></div>
      </section>`;
    }
    const ms = savedMs(U.trackStart, now());
    return `<section class="card saved-card"><div class="sec-head"><h2>되찾은 시간</h2><button class="link" data-act="goto-settings" type="button">수정</button></div>
      <div class="saved-num"><b class="num">${Math.floor(ms / HOUR)}</b><span>시간 ${Math.floor((ms % HOUR) / MIN)}분</span></div>
      <p class="small" style="margin-top:6px">${savedLine(ms)}</p>
      <p class="hint" style="margin-top:6px">하루 ${fmtDur(U.dailyMinutes * MIN)} 기준 · 리셋한 날은 빼고 계산해요</p></section>`;
  }

  /* ---------- 출석 ---------- */
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
    renderHome(); checkAchievements();
  }

  /* ---------- 하루 기록 (미션, 다짐) ---------- */
  const dailyOf = (k) => (U.daily && U.daily[k]) || {};
  async function setDaily(k, patch, extra = {}) {
    const daily = { ...(U.daily || {}) };
    daily[k] = { ...(daily[k] || {}), ...patch };
    try { await saveUser({ daily, ...extra }); } catch (e) {}
  }
  function missionPool() { return [...DEFAULT_MISSIONS, ...(U.missions || [])]; }
  function todayMission() {
    const k = dateKey(now());
    const d = dailyOf(k);
    if (d.mission) return d.mission;
    const pool = missionPool();
    const n = Math.floor(dayStart(now()) / DAY);
    return { text: pool[((n * 7) % pool.length + pool.length) % pool.length], done: false, rerolled: false };
  }
  function missionCardHtml() {
    const m = todayMission();
    return `<section class="card mission-card${m.done ? ' done' : ''}">
      <div class="sec-head"><h2>오늘의 미션</h2>${!m.done && !m.rerolled ? '<button class="link" data-act="reroll-mission" type="button">다른 미션</button>' : ''}</div>
      <p class="mission-text">${esc(m.text)}</p>
      ${m.done ? `<p class="ok-line">완료했어요 · +${m.xp || 0} XP</p>` : `<button class="btn primary" data-act="done-mission" type="button">완료했어요 +${Math.round(XP.mission * mult())} XP</button>`}
    </section>`;
  }
  async function doneMission() {
    const k = dateKey(now());
    const m = todayMission();
    if (m.done) return;
    const got = await gain(XP.mission);
    await setDaily(k, { mission: { ...m, done: true, xp: got, doneAt: now() } }, { xp: U.xp });
    savePublic();
    toast(`미션 완료! (+${got} XP)`);
    renderHome(); checkAchievements();
  }
  async function rerollMission() {
    const k = dateKey(now());
    const m = todayMission();
    const pool = missionPool().filter((t) => t !== m.text);
    const text = pool[Math.floor(Math.random() * pool.length)] || m.text;
    await setDaily(k, { mission: { text, done: false, rerolled: true } });
    renderHome();
  }

  function pledgeCardHtml() {
    const k = dateKey(now()), yk = dateKey(addDays(dayStart(now()), -1));
    const d = dailyOf(k), y = dailyOf(yk);
    const hr = new Date().getHours();
    const x = mult();
    let body;
    if (y.pledge && !y.check && hr < 12) {
      body = `<p class="muted small">어제 다짐</p><p class="pledge-text">${esc(y.pledge)}</p>
        <p style="margin:10px 0 8px;font-weight:650">어제 다짐, 지켰나요?</p>
        <div class="pledge-acts"><button class="btn primary" data-act="check-pledge" data-k="${yk}" data-v="yes" type="button">지켰어요 +${Math.round(XP.check * x)} XP</button>
        <button class="btn ghost" data-act="check-pledge" data-k="${yk}" data-v="no" type="button">못 지켰어요</button></div>`;
    } else if (!d.pledge) {
      body = `<p class="muted small" style="margin-bottom:10px">오늘 하루 지킬 것 하나를 정해요. 저녁에 지켰는지 체크해요.</p>
        <div class="chips" style="margin-bottom:10px">${PLEDGES.map((p) => `<button type="button" class="chip" data-act="pick-pledge" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        <div class="inline-add"><input id="pledge-input" maxlength="40" placeholder="직접 쓰기" /><button class="btn primary" data-act="make-pledge" type="button">다짐하기 +${Math.round(XP.pledge * x)}</button></div>`;
    } else if (!d.check) {
      body = `<p class="pledge-text">${esc(d.pledge)}</p>
        ${hr >= PLEDGE_CHECK_HOUR ? `<p style="margin:10px 0 8px;font-weight:650">오늘 다짐, 지켰나요?</p>
        <div class="pledge-acts"><button class="btn primary" data-act="check-pledge" data-k="${k}" data-v="yes" type="button">지켰어요 +${Math.round(XP.check * x)} XP</button>
        <button class="btn ghost" data-act="check-pledge" data-k="${k}" data-v="no" type="button">못 지켰어요</button></div>`
          : `<p class="hint">오후 ${PLEDGE_CHECK_HOUR - 12}시부터 체크할 수 있어요. 저녁에 못 하면 내일 아침에 해도 돼요.</p>`}`;
    } else {
      body = `<p class="pledge-text">${esc(d.pledge)}</p><p class="${d.check === 'yes' ? 'ok-line' : 'muted small'}" style="margin-top:8px">${d.check === 'yes' ? `지켰어요 · +${d.checkXp || 0} XP` : '오늘은 못 지켰어요. 내일 다시!'}</p>`;
    }
    return `<section class="card pledge-card"><div class="sec-head"><h2>오늘의 다짐</h2></div>${body}</section>`;
  }
  async function makePledge(text) {
    text = (text || '').trim();
    if (!text) { toast('다짐을 골라주세요'); return; }
    const k = dateKey(now());
    if (dailyOf(k).pledge) return;
    const got = await gain(XP.pledge);
    await setDaily(k, { pledge: text, pledgeAt: now() }, { xp: U.xp });
    savePublic();
    toast(`다짐했어요 (+${got} XP)`);
    renderHome();
  }
  async function checkPledge(k, v) {
    const d = dailyOf(k);
    if (!d.pledge || d.check) return;
    let got = 0;
    if (v === 'yes') got = await gain(XP.check);
    await setDaily(k, { check: v, checkXp: got, checkAt: now() }, { xp: U.xp });
    savePublic();
    toast(v === 'yes' ? `다짐을 지켰어요! (+${got} XP)` : '괜찮아요. 오늘 다시 해봐요');
    renderHome(); checkAchievements();
  }

  /* ---------- 홈 ---------- */
  function renderHome() {
    const today = dateKey(now());
    const j = S.journal[today];
    const showReport = U.reportSeen !== weekKey() && U.trackStart < weekStart(now());
    const ms0 = monthRange(monthKey(now()))[0];
    const showMonth = U.monthSeen !== monthKey(now()) && U.trackStart < ms0;
    const yr = yearBannerYear();
    const cbOn = U.comeback && U.comeback.startAt === U.startAt;
    const risk = riskNow(now());
    const jStreak = journalStreak();
    const gs = goalStatus(monthKey(now()));
    const ex = examInfo();
    const exLabel = ex && ex.state !== 'over' ? esc(U.exam.name || '시험') : '';
    const mq = myQuoteOfDay();
    $('page-home').innerHTML = `
      <section class="hero">
        <div class="hero-top"><span class="live-dot"></span><span id="h-label">디톡스 진행 중</span>
          <span class="record-chip hidden" id="h-record">신기록</span>
          <span class="mult-chip hidden" id="h-mult"></span>
          ${ex && ex.state === 'on' ? `<span class="exam-chip on">${exLabel} · 보상 2배</span>` : ''}
          ${ex && ex.state === 'before' ? `<span class="exam-chip">${exLabel} D-${ex.dday}</span>` : ''}
          <span class="auto-chip hidden" id="h-auto">자동 디톡스 시간</span></div>
        <div class="big"><span class="days"><b id="h-days">0</b><span>일</span></span><span class="clock" id="h-clock">00:00:00</span></div>
        <div class="hero-meta"><span>최장 기록 <b id="h-best">-</b></span><span>시작 <b>${md(U.startAt)} ${hm(U.startAt)}</b></span><span id="h-mult-next"></span></div>
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
          <button class="btn danger-ghost hold-btn" data-hold="reset" type="button" aria-label="리셋 (3초 동안 누르기)"><span class="hold-fill"></span><span class="hold-label">리셋<small>3초 꾹</small></span></button>
        </div>
        <p class="urge-note">${U.urgeWins ? `지금까지 충동을 <b>${U.urgeWins}번</b> 이겨냈어요` : '충동이 오면 참기 버튼을 눌러보세요'}</p>
      </section>
      ${attendCardHtml()}
      ${risk ? `<div class="risk-banner"><div class="rb-text"><b>지금은 평소에 자주 무너지는 시간이에요</b>
        <span>${hourRange(risk.from)} · 지금까지 리셋 ${risk.total}번 중 ${risk.n}번이 이때였어요</span></div>
        <button class="btn small primary" data-act="urge" type="button">미리 참기</button></div>` : ''}
      ${yr ? `<button class="report-banner" data-act="open-year" data-y="${yr}" type="button"><span>${yr}년 결산이 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${showMonth ? `<button class="report-banner" data-act="open-month" type="button"><span>지난달 리포트가 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${showReport ? `<button class="report-banner" data-act="open-report" type="button"><span>지난주 리포트가 나왔어요</span>${ICON.arrow}</button>` : ''}
      <div class="grid-2">${missionCardHtml()}${pledgeCardHtml()}</div>
      <div class="grid-2">${plantCardHtml()}${savedCardHtml()}</div>
      <div class="grid-2">${goalCardHtml(gs)}<section class="card" id="level-card"></section></div>
      <div class="grid-2">
        <section class="card">
          <div class="sec-head"><h2>오늘의 규칙</h2><button class="link" data-act="goto-settings" type="button">편집</button></div>
          <ul class="rule-list">${ruleListHtml(U.rules, false)}</ul>
        </section>
        <section class="card">
          <div class="sec-head"><h2>한 줄 일기 ${jStreak ? `<span class="streak-chip">${jStreak}일 연속</span>` : ''}</h2>${j && !ui.editJournal ? '<button class="link" data-act="edit-journal" type="button">고치기</button>' : `<span class="muted small">${md(now())}</span>`}</div>
          ${j && !ui.editJournal ? `<div class="journal-view"><span class="m">${esc(j.mood || '📝')}</span><p>${esc(j.text)}</p></div>` : `
            <div class="moods">${MOODS.map((m) => `<button type="button" class="mood${(ui.mood || (j && j.mood)) === m ? ' selected' : ''}" data-mood="${m}">${m}</button>`).join('')}</div>
            <div class="inline-add"><input id="journal-input" maxlength="80" placeholder="오늘 남는 시간에 뭘 했나요?" value="${esc(j ? j.text : '')}" />
            <button class="btn primary" data-act="save-journal" type="button">저장</button></div>
            ${j ? '' : `<p class="hint">${jStreak ? `오늘 쓰면 ${jStreak + 1}일 연속 · ` : ''}처음 쓰면 +${Math.round(XP.journal * mult())} XP</p>`}`}
        </section>
      </div>
      <section class="card quote-card"><p class="quote-kicker">오늘의 문장 · 매일 아침 8시에 바뀌어요</p>
        <div class="quote">${esc(quoteOfDay())}</div>
        ${mq ? `<p class="my-quote">내 문구 · ${esc(mq)}</p>` : ''}</section>`;
    renderLevelCard();
    updateHero(Math.max(0, now() - U.startAt));
  }

  function goalCardHtml(gs) {
    const m = new Date().getMonth() + 1;
    if (!gs) {
      return `<section class="card"><div class="sec-head"><h2>이번 달 목표</h2></div>
        <p class="muted" style="margin-bottom:12px">${m}월에 지킬 목표를 하나 정해보세요. 달성하면 +${XP.monthGoal} XP (배수 적용)</p>
        <button class="btn primary" data-act="edit-goal" type="button">목표 정하기</button></section>`;
    }
    const { g, cur, state, daysLeft } = gs;
    const max = g.type === 'resets_max';
    const pct = Math.min(100, (cur / g.n) * 100);
    let line;
    if (max) line = state === 'fail' ? `목표보다 ${cur - g.n}번 더 리셋했어요. 다음 달엔 꼭!` : `리셋 ${cur}번 · 앞으로 ${g.n - cur}번까지 괜찮아요`;
    else line = state === 'done' ? '달성했어요!' : `${cur}${GOAL_TYPES[g.type].unit.slice(0, 1)} / ${g.n}${GOAL_TYPES[g.type].unit.slice(0, 1)} · ${daysLeft}일 남음`;
    const cls = state === 'fail' ? ' fail' : state === 'done' ? ' done' : '';
    return `<section class="card goal${cls}"><div class="sec-head"><h2>이번 달 목표</h2><button class="link" data-act="edit-goal" type="button">바꾸기</button></div>
      <div class="goal-main"><b>${goalLabel(g)}</b><span class="goal-state">${state === 'done' ? '달성' : state === 'fail' ? '실패' : '진행 중'}</span></div>
      <div class="bar thin${max ? ' max' : ''}"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>
      <p class="muted small" style="margin-top:8px">${line}</p></section>`;
  }

  function renderLevelCard() {
    const el = $('level-card');
    if (!el) return;
    const lv = levelOf(U.xp), cur = xpForLevel(lv), next = xpForLevel(lv + 1);
    const pct = ((U.xp - cur) / (next - cur)) * 100;
    const a = U.attend || {};
    const attOk = a.last === dateKey(now());
    el.innerHTML = `<div class="sec-head"><h2>레벨</h2><span class="muted small">업적 ${Object.keys(U.achievements || {}).length}/${ACHS.length} · 배지 ${Object.keys(U.badges).length}/${MILESTONES.length}</span></div>
      <div class="level-row"><span class="lv">Lv.${lv}</span><span class="title">${titleOf(lv)}</span></div>
      <div class="bar thin"><div class="fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="level-sub"><span>${U.xp} XP</span><span>다음 레벨까지 ${next - U.xp} XP</span></div>
      ${attOk ? `<p class="att-done">출석 ${a.streak}일 연속 · 오늘 출석 완료</p>` : ''}`;
  }

  function updateHero(ms) {
    const dEl = $('h-days');
    if (!dEl) return;
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
    dEl.textContent = d;
    $('h-clock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const best = U.bestMs || 0;
    $('h-best').textContent = best || ms > MIN ? fmtDur(Math.max(best, ms)) : '첫 기록 쌓는 중';
    $('h-record').classList.toggle('hidden', !(best > 0 && ms > best));
    $('h-auto').classList.toggle('hidden', !inAutoWindow(now()));
    const x = mult();
    $('h-mult').textContent = `보상 ${fmtX(x)}`;
    $('h-mult').classList.toggle('hidden', x <= 1);
    const nextTier = [...MULT_TIERS].reverse().find((t) => t.ms > ms);
    $('h-mult-next').innerHTML = nextTier ? `${nextTier.label}째부터 보상 <b>${fmtX(nextTier.x)}</b>` : '보상 배수 <b>최대</b>';
    const next = MILESTONES.find((y) => y.ms > ms);
    if (next) {
      const i = MILESTONES.indexOf(next);
      const from = i > 0 ? MILESTONES[i - 1].ms : 0;
      const pct = ((ms - from) / (next.ms - from)) * 100;
      $('h-bar').style.width = pct.toFixed(2) + '%';
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

  /* ---------- 리셋 길게 누르기 ---------- */
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
    if (cancelled && now() - hold.t0 < 450) toast('리셋은 3초 동안 꾹 눌러주세요');
    hold = null;
  }
  function holdDone(el) {
    if (!hold) return;
    hold = null;
    el.classList.remove('holding');
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    openResetGate();
  }
  function openResetGate() {
    const x = mult();
    openSheet(`<h2>정말 리셋할까요?</h2>
      <p class="muted">충동 때문이라면 ${U.urgeMinutes || 10}분만 참아보는 건 어때요? 이기면 +${Math.round(XP.urgeWin * x)} XP${x > 1 ? `, 지금 보상 ${fmtX(x)}도 지킬 수 있어요` : ''}.</p>
      <div class="sheet-actions"><button class="btn danger-ghost" data-go-reset type="button">이미 무너졌어요</button>
      <button class="btn primary" data-go-urge type="button">참기 해볼게요</button></div>`,
    (el) => {
      el.querySelector('[data-go-reset]').onclick = () => { closeSheet(); openReset(); };
      el.querySelector('[data-go-urge]').onclick = () => { closeSheet(); openUrge(false); };
    });
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

  /* ====================== 리셋 ====================== */
  let resetReason = null;
  let resetSits = [];
  function openReset() {
    resetReason = null; resetSits = [];
    $('reset-sub').textContent = `지금까지 ${fmtDur(now() - U.startAt)} 버텼어요. 리셋하면 타이머가 0부터 다시 시작해요. 경험치와 배지는 그대로 남아요.`;
    const box = $('reset-reasons');
    box.innerHTML = [...U.targets, '기타'].map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    box.querySelectorAll('.chip').forEach((c) => {
      c.onclick = () => {
        resetReason = c.dataset.t;
        box.querySelectorAll('.chip').forEach((x) => x.classList.toggle('selected', x === c));
        $('reset-error').textContent = '';
      };
    });
    const sb = $('reset-situations');
    sb.innerHTML = SITUATIONS.map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    sb.querySelectorAll('.chip').forEach((c) => {
      c.onclick = () => {
        const t = c.dataset.t;
        resetSits = resetSits.includes(t) ? resetSits.filter((x) => x !== t) : [...resetSits, t];
        c.classList.toggle('selected', resetSits.includes(t));
      };
    });
    $('reset-memo').value = '';
    $('reset-error').textContent = '';
    show($('modal-reset'));
  }

  async function doReset() {
    if (!resetReason) { $('reset-error').textContent = '이유를 하나 골라주세요.'; return; }
    const t = now();
    const dur = t - U.startAt;
    const prev = { startAt: U.startAt, bestMs: U.bestMs || 0, xpHours: U.xpHours || 0, comeback: U.comeback || null, plantFloor: U.plantFloor || 0, recordBreaks: U.recordBreaks || 0 };
    const plantFloor = Math.max((U.plantMax || 0) > 0 ? 1 : 0, Math.max(stageOf(dur), U.plantFloor || 0) - 1);
    const recordBreaks = (U.recordBreaks || 0) + (prev.bestMs > 0 && dur > prev.bestMs ? 1 : 0);
    const streak = { start: U.startAt, end: t, durationMs: dur, reason: resetReason, situations: resetSits, memo: $('reset-memo').value.trim() };
    const comeback = { startAt: t, prevMs: dur, targetMs: Math.max(HOUR, Math.round(dur / 2 / MIN) * MIN) };
    $('reset-confirm').disabled = true;
    try {
      const id = await db.add(`${userPath()}/streaks`, streak);
      S.streaks.push({ id, ...streak });
      await saveUser({ startAt: t, bestMs: Math.max(prev.bestMs, dur), xpHours: 0, comeback, plantFloor, recordBreaks });
      savePublic(true);
      hide($('modal-reset'));
      if (ui.tab === 'home') renderHome(); else if (ui.tab === 'records') renderRecords();
      toast(`리셋했어요. 재도전 목표: ${fmtDur(comeback.targetMs)} 버티기`, () => undoReset(id, prev), 10000);
      checkAchievements();
    } catch (e) { $('reset-error').textContent = '저장하지 못했어요. 다시 시도해 주세요.'; }
    $('reset-confirm').disabled = false;
  }

  async function undoReset(id, prev) {
    try {
      await db.del(`${userPath()}/streaks/${id}`);
      S.streaks = S.streaks.filter((s) => s.id !== id);
      await saveUser(prev);
      savePublic(true);
      if (ui.tab === 'home') renderHome(); else if (ui.tab === 'records') renderRecords();
      toast('되돌렸어요');
    } catch (e) { toast('되돌리지 못했어요'); }
  }

  /* ====================== 참기 ====================== */
  function pickActivity(except) {
    const list = (U.activities.length ? U.activities : DEFAULT_ACTIVITIES).filter((a) => a !== except);
    return list[Math.floor(Math.random() * list.length)] || except;
  }
  const planFor = (target) => U.plans.find((p) => p.target === target);
  function openUrge(resume) {
    if (resume) { showUrgeMain(); return; }
    const box = $('urge-targets');
    box.innerHTML = [...U.targets.map((t) => `<button type="button" class="chip" data-t="${esc(t)}">${esc(t)}${planFor(t) ? ' <span class="plan-mark">계획</span>' : ''}</button>`),
      '<button type="button" class="chip" data-t="">잘 모르겠어요</button>'].join('');
    box.querySelectorAll('.chip').forEach((c) => { c.onclick = () => startUrge(c.dataset.t); });
    show($('urge-pick')); hide($('urge-main'));
    show($('urge'));
  }
  function startUrge(target) {
    const mins = U.urgeMinutes || 10;
    const t = now();
    const plan = target ? planFor(target) : null;
    U.urge = { startedAt: t, endsAt: t + mins * MIN, minutes: mins, target: target || '', activity: plan ? plan.action : pickActivity(), fromPlan: !!plan };
    db.set(userPath(), { urge: U.urge }).catch(() => {});
    showUrgeMain();
  }
  function showUrgeMain() {
    hide($('urge-pick')); show($('urge-main'));
    $('urge-activity').textContent = U.urge.activity;
    const plan = U.urge.target ? planFor(U.urge.target) : null;
    $('urge-plan').textContent = plan && U.urge.fromPlan ? `내 계획: ${iga(plan.target)} 당기면 → ${plan.action}` : '';
    $('urge-plan').classList.toggle('hidden', !(plan && U.urge.fromPlan));
    $('urge-label').textContent = plan && U.urge.fromPlan ? '계획대로 해볼까요?' : '그동안 이거 해볼까요?';
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
    const rec = { at: u.startedAt, minutes: u.minutes, activity: u.activity, target: u.target || '', fromPlan: !!u.fromPlan, result };
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
    else { openReset(); if (u.target && U.targets.includes(u.target)) { const c = $('reset-reasons').querySelector(`[data-t="${CSS.escape(u.target)}"]`); if (c) c.click(); } }
    checkGoals(); checkAchievements();
  }

  /* ====================== 기록: 계산 ====================== */
  function intervals() {
    return [...S.streaks.map((s) => ({ start: s.start, end: s.end })), { start: U.startAt, end: now() }];
  }
  function overlap(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
  function bucketOf(ts) { const h = new Date(ts).getHours(); return BUCKETS.findIndex((b) => h >= b.from && h < b.to); }
  function topOf(counts) {
    let best = null, n = 0;
    Object.keys(counts).forEach((k) => { if (counts[k] > n) { best = k; n = counts[k]; } });
    return best;
  }

  function weekReport(ws) {
    const we = addDays(ws, 7);
    const resets = S.streaks.filter((s) => s.end >= ws && s.end < we);
    const tries = S.urges.filter((u) => u.at >= ws && u.at < we);
    const wins = tries.filter((u) => u.result === 'win').length;
    const longest = Math.max(0, ...intervals().map((iv) => overlap(iv.start, iv.end, ws, Math.min(we, now()))));
    const reasons = {}; resets.forEach((r) => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
    const buckets = {}; resets.forEach((r) => { const b = BUCKETS[bucketOf(r.end)].label; buckets[b] = (buckets[b] || 0) + 1; });
    const sits = {}; resets.forEach((r) => (r.situations || []).forEach((x) => { sits[x] = (sits[x] || 0) + 1; }));
    let jdays = 0;
    for (let d = ws; d < we; d = addDays(d, 1)) if (S.journal[dateKey(d)]) jdays++;
    return { resets: resets.length, tries: tries.length, wins, longest, topReason: topOf(reasons), weakBucket: topOf(buckets), topSit: topOf(sits), jdays };
  }

  function dayInfo(key) {
    const d0 = new Date(key + 'T00:00:00').getTime(), d1 = addDays(d0, 1);
    const resets = S.streaks.filter((s) => s.end >= d0 && s.end < d1);
    const urges = S.urges.filter((u) => u.at >= d0 && u.at < d1);
    const wins = urges.filter((u) => u.result === 'win').length;
    let status;
    if (d0 > now()) status = 'future';
    else if (d1 <= U.trackStart) status = 'before';
    else if (resets.length) status = 'reset';
    else status = wins >= 3 ? 'ok3' : wins >= 1 ? 'ok2' : 'ok1';
    return { d0, d1, resets, urges, wins, status, autoKept: autoKept(d0) };
  }

  // 그날 시작한 자동 디톡스 시간대를 리셋 없이 지켰는지 (끝난 시간대만)
  function autoKept(d0) {
    if (!U.auto.on) return null;
    const [sh, sm] = U.auto.start.split(':').map(Number), [eh, em] = U.auto.end.split(':').map(Number);
    const a = d0 + (sh * 60 + sm) * MIN;
    let b = d0 + (eh * 60 + em) * MIN;
    if (b <= a) b = addDays(b, 1);
    if (b > now() || a < U.trackStart) return null;
    return !S.streaks.some((s) => s.end >= a && s.end < b);
  }

  /* ====================== 업적 ====================== */
  function nextMonthKey(mk) { const [y, m] = mk.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`; }
  function achStats() {
    const wins = S.urges.filter((u) => u.result === 'win');
    const byDay = {};
    wins.forEach((u) => { const k = dateKey(u.at); byDay[k] = (byDay[k] || 0) + 1; });
    const rw = riskiestWindow();
    const inRisk = (ts) => { if (!rw) return false; const h = new Date(ts).getHours(); return [rw.from, (rw.from + 1) % 24, (rw.from + 2) % 24].includes(h); };
    const daily = Object.values(U.daily || {});
    let goalsDone = 0, run = 0, bestRun = 0, prev = null;
    Object.keys(U.monthGoals).sort().forEach((mk) => {
      const st = goalStatus(mk);
      if (st && st.state === 'done') { goalsDone++; run = prev && nextMonthKey(prev) === mk ? run + 1 : 1; bestRun = Math.max(bestRun, run); prev = mk; }
      else { run = 0; prev = null; }
    });
    return {
      wins: wins.length, planWins: wins.filter((u) => u.fromPlan).length, maxDayWins: Math.max(0, ...Object.values(byDay)),
      riskWins: wins.filter((u) => inRisk(u.at)).length,
      journals: Object.keys(S.journal).length, jBest: journalBest(),
      sitResets: S.streaks.filter((s) => s.situations && s.situations.length).length,
      comebacks: U.comebackDone || 0, recordBreaks: U.recordBreaks || 0,
      goalsDone, goalRun: bestRun,
      missions: daily.filter((d) => d.mission && d.mission.done).length,
      kept: daily.filter((d) => d.check === 'yes').length,
      friends: U.maxFriends || 0, top1: U.wasTop1 ? 1 : 0,
      attBest: (U.attend && U.attend.best) || 0, attTotal: (U.attend && U.attend.total) || 0,
      level: levelOf(U.xp), plant: U.plantMax || 0,
      examClean: U.examClean || 0, savedH: Math.floor(savedMs(U.trackStart, now()) / HOUR),
    };
  }

  // 시험 기간이 끝났으면 리셋 없이 지켰는지 한 번만 확인
  async function checkExamEnd() {
    const e = examInfo();
    if (!e || e.state !== 'over' || U.exam.evaluated) return;
    const clean = e.s >= U.trackStart && !S.streaks.some((s) => s.end >= e.s && s.end < e.en);
    const exam = { ...U.exam, evaluated: true, clean };
    const fields = { exam };
    if (clean) {
      fields.examClean = (U.examClean || 0) + 1;
      celebrate({ medal: 'A+', kind: 'alt', kicker: '시험 기간 완주', title: `${U.exam.name || '시험 기간'}을 리셋 없이 버텼어요!`, sub: '가장 힘든 때를 이겨냈어요.' });
    }
    try { await saveUser(fields); } catch (e2) {}
  }

  let achBusy = false;
  async function checkAchievements() {
    if (!U || achBusy) return;
    achBusy = true;
    await checkExamEnd();
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

  /* ====================== 월간 리포트 · 1년 결산 ====================== */
  function rangeReport(a, b) {
    const end = Math.min(b, now());
    const resets = S.streaks.filter((s) => s.end >= a && s.end < b);
    const tries = S.urges.filter((u) => u.at >= a && u.at < b);
    const wins = tries.filter((u) => u.result === 'win').length;
    const longest = Math.max(0, ...intervals().map((iv) => overlap(iv.start, iv.end, a, end)));
    const detox = intervals().reduce((s, iv) => s + overlap(iv.start, iv.end, Math.max(a, U.trackStart), end), 0);
    const reasons = {}, sits = {}, buckets = {};
    resets.forEach((r) => {
      reasons[r.reason] = (reasons[r.reason] || 0) + 1;
      (r.situations || []).forEach((x) => { sits[x] = (sits[x] || 0) + 1; });
      const bl = BUCKETS[bucketOf(r.end)].label; buckets[bl] = (buckets[bl] || 0) + 1;
    });
    let jdays = 0, missions = 0, att = 0, pledged = 0, kept = 0, okDays = 0, days = 0;
    for (let d = dayStart(Math.max(a, U.trackStart)); d < end; d = addDays(d, 1)) {
      const k = dateKey(d), dd = dailyOf(k);
      days++;
      if (S.journal[k]) jdays++;
      if (dd.mission && dd.mission.done) missions++;
      if (dd.att) att++;
      if (dd.pledge) pledged++;
      if (dd.check === 'yes') kept++;
      const d1 = addDays(d, 1);
      if (!S.streaks.some((s) => s.end >= d && s.end < d1)) okDays++;
    }
    const ach = Object.values(U.achievements || {}).filter((t) => t >= a && t < b).length;
    return { resets: resets.length, tries: tries.length, wins, longest, detox, saved: savedMs(a, end), topReason: topOf(reasons), topSit: topOf(sits), weakBucket: topOf(buckets), jdays, missions, att, pledged, kept, okDays, days, ach };
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
    const gs = goalStatus(mk);
    const ts = new Date(U.trackStart);
    const canPrev = a > new Date(ts.getFullYear(), ts.getMonth(), 1).getTime();
    const diff = r.resets - p.resets;
    const label = ui.monthOff === 0 ? `${m}월 (진행 중)` : `${base.getFullYear()}년 ${m}월`;
    const notes = [];
    if (gs) notes.push(`${m}월 목표 <b>${goalLabel(gs.g)}</b> · ${gs.state === 'done' ? '달성' : gs.state === 'fail' ? '실패' : '진행 중'}`);
    if (r.okDays && r.days) notes.push(`${r.days}일 중 <b>${r.okDays}일</b>을 리셋 없이 지켰어요`);
    if (r.topReason) notes.push(`가장 많이 무너진 이유는 <b>${esc(r.topReason)}</b>`);
    if (r.topSit) notes.push(`무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b>`);
    if (r.pledged) notes.push(`다짐 ${r.pledged}번 중 <b>${r.kept}번</b> 지켰어요`);
    if (r.ach) notes.push(`이번 달에 업적 <b>${r.ach}개</b>를 새로 달성했어요`);
    return `<section class="card">
      <div class="sec-head"><h2>월간 리포트</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="month-prev" type="button" aria-label="이전 달" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <span class="label">${label}</span>
          <button class="icon-btn small" data-act="month-next" type="button" aria-label="다음 달" ${ui.monthOff > 0 ? '' : 'disabled'}>${ICON.right}</button></div></div>
      <div class="tiles">
        <div class="tile"><div class="k">리셋</div><div class="v">${r.resets}<small>번</small></div>
          <div class="d ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff === 0 ? '지난달과 같아요' : `지난달보다 ${Math.abs(diff)}번 ${diff > 0 ? '많아요' : '적어요'}`}</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div><div class="d">이 달 안에서</div></div>
        <div class="tile"><div class="k">되찾은 시간</div><div class="v">${U.dailyMinutes ? `${Math.floor(r.saved / HOUR)}<small>시간</small>` : '-'}</div><div class="d">${U.dailyMinutes ? savedLine(r.saved) : '홈에서 설정해요'}</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${r.wins}<small>/ ${r.tries}</small></div><div class="d">시도 대비 성공</div></div>
        <div class="tile"><div class="k">미션 완료</div><div class="v">${r.missions}<small>개</small></div><div class="d">출석 ${r.att}일</div></div>
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
      months.push({ m: m + 1, ok: rr.days ? rr.okDays / rr.days : 0, resets: rr.resets });
    }
    const bestMonth = months.length ? months.reduce((p, c) => (c.ok > p.ok ? c : p)) : null;
    const goalsDone = Object.keys(U.monthGoals).filter((mk) => mk.startsWith(y + '-')).filter((mk) => { const s = goalStatus(mk); return s && s.state === 'done'; }).length;
    const canPrev = new Date(U.trackStart).getFullYear() < y;
    return `<section class="card year-card">
      <div class="sec-head"><h2>${y}년 결산${ongoing ? ' <span class="muted small">(진행 중)</span>' : ''}</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="year-prev" type="button" aria-label="이전 해" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <button class="icon-btn small" data-act="year-next" type="button" aria-label="다음 해" ${y < new Date().getFullYear() ? '' : 'disabled'}>${ICON.right}</button></div></div>
      <div class="year-hero"><span class="muted small">올해 디톡스한 시간</span><b class="num">${Math.floor(r.detox / DAY)}<small>일</small> ${Math.floor((r.detox % DAY) / HOUR)}<small>시간</small></b></div>
      <div class="tiles">
        <div class="tile"><div class="k">되찾은 시간</div><div class="v">${U.dailyMinutes ? `${Math.floor(r.saved / HOUR)}<small>시간</small>` : '-'}</div><div class="d">${U.dailyMinutes ? savedLine(r.saved) : '홈에서 설정해요'}</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div><div class="d">올해 안에서</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${r.wins}<small>번</small></div><div class="d">시도 ${r.tries}번</div></div>
        <div class="tile"><div class="k">리셋 없이 지킨 날</div><div class="v">${r.okDays}<small>일</small></div><div class="d">${r.days}일 중</div></div>
        <div class="tile"><div class="k">새로 달성한 업적</div><div class="v">${r.ach}<small>개</small></div><div class="d">월 목표 달성 ${goalsDone}번</div></div>
        <div class="tile"><div class="k">일기·미션</div><div class="v">${r.jdays}<small>일 · </small>${r.missions}<small>개</small></div><div class="d">일기 쓴 날 · 완료한 미션</div></div>
      </div>
      <ul class="report-notes">
        ${bestMonth ? `<li>가장 잘 버틴 달은 <b>${bestMonth.m}월</b> (리셋 ${bestMonth.resets}번)</li>` : ''}
        ${r.topReason ? `<li>올해 가장 큰 적은 <b>${esc(r.topReason)}</b>였어요</li>` : ''}
        ${r.topSit ? `<li>무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b></li>` : ''}
        <li>${ongoing ? '남은 날도 지금처럼!' : '한 해 동안 수고 많았어요. 내년에도 함께 가요.'}</li>
      </ul>
    </section>`;
  }

  /* ====================== 기록: 화면 ====================== */
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

  function reportCard() {
    const ws = addDays(weekStart(now()), -7 * ui.weekOff);
    const r = weekReport(ws), p = weekReport(addDays(ws, -7));
    const label = ui.weekOff === 0 ? '이번 주 (진행 중)' : ui.weekOff === 1 ? '지난주' : `${ui.weekOff}주 전`;
    const canPrev = ws > weekStart(U.trackStart);
    const diff = r.resets - p.resets;
    const notes = [];
    if (r.topReason) notes.push(`가장 많이 무너진 이유는 <b>${esc(r.topReason)}</b>`);
    if (r.weakBucket) notes.push(`가장 약했던 시간대는 <b>${r.weakBucket}</b>`);
    if (r.topSit) notes.push(`무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b>`);
    if (!r.resets && ws + 7 * DAY <= now()) notes.push('한 번도 리셋하지 않은 완벽한 한 주였어요');
    if (r.tries) notes.push(`참기 ${r.tries}번 중 <b>${r.wins}번</b> 이겨냈어요`);
    return `<section class="card">
      <div class="sec-head"><h2>주간 리포트</h2>
        <div class="week-nav">
          <button class="icon-btn small" data-act="week-prev" type="button" aria-label="이전 주" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <span class="label">${label} · ${mdShort(ws)}–${mdShort(addDays(ws, 6))}</span>
          <button class="icon-btn small" data-act="week-next" type="button" aria-label="다음 주" ${ui.weekOff > 0 ? '' : 'disabled'}>${ICON.right}</button>
        </div></div>
      <div class="tiles">
        <div class="tile"><div class="k">리셋</div><div class="v">${r.resets}<small>번</small></div>
          <div class="d ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff === 0 ? '전 주와 같아요' : `전 주보다 ${Math.abs(diff)}번 ${diff > 0 ? '많아요' : '적어요'}`}</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${r.wins}<small>/ ${r.tries}</small></div><div class="d">시도 대비 성공</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div><div class="d">이번 주 안에서</div></div>
        <div class="tile"><div class="k">일기 쓴 날</div><div class="v">${r.jdays}<small>일</small></div><div class="d">7일 중</div></div>
        <div class="tile"><div class="k">약한 시간대</div><div class="v" style="font-family:var(--font);font-size:1.15rem;padding-top:6px">${r.weakBucket || '-'}</div><div class="d">리셋이 가장 많았던</div></div>
        <div class="tile"><div class="k">많던 이유</div><div class="v" style="font-family:var(--font);font-size:1.15rem;padding-top:6px">${esc(r.topReason || '-')}</div><div class="d">리셋 이유 1위</div></div>
      </div>
      ${notes.length ? `<ul class="report-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
    </section>`;
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
      const dot = info.autoKept ? '<i class="dot" title="자동 디톡스 시간 지킴"></i>' : '';
      const clickable = info.status !== 'future';
      cells += clickable
        ? `<button type="button" class="${cls}" data-act="sel-day" data-k="${key}" aria-label="${month + 1}월 ${d}일">${d}${dot}</button>`
        : `<div class="${cls}">${d}</div>`;
    }
    const ts = new Date(U.trackStart);
    const prevOk = new Date(year, month, 1).getTime() > new Date(ts.getFullYear(), ts.getMonth(), 1).getTime();
    const nextOk = new Date(year, month + 1, 1).getTime() <= now();
    return `<section class="card">
      <div class="cal-head"><h2>${year}년 ${month + 1}월</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="cal-prev" type="button" aria-label="이전 달" ${prevOk ? '' : 'disabled'}>${ICON.left}</button>
        <button class="icon-btn small" data-act="cal-next" type="button" aria-label="다음 달" ${nextOk ? '' : 'disabled'}>${ICON.right}</button></div></div>
      ${(() => { const gs = goalStatus(`${year}-${pad(month + 1)}`); return gs ? `<p class="muted small cal-goal">${month + 1}월 목표 · <b>${goalLabel(gs.g)}</b> · ${gs.state === 'done' ? '달성' : gs.state === 'fail' ? '실패' : '진행 중'}</p>` : ''; })()}
      <div class="cal">${cells}</div>
      <div class="legend">
        <span><i style="background:var(--heat-1)"></i>성공</span>
        <span><i style="background:var(--heat-2)"></i>참기 1–2번</span>
        <span><i style="background:var(--heat-3)"></i>참기 3번 이상</span>
        <span><i style="background:var(--danger-soft);border:1px solid var(--danger)"></i>리셋</span>
        ${U.auto.on ? '<span>● 자동 디톡스 시간 지킴</span>' : ''}
      </div>
      ${dayDetail(ui.selDay)}
    </section>`;
  }

  function dayDetail(key) {
    if (!key) return '';
    const info = dayInfo(key);
    if (info.status === 'future') return '';
    const d = new Date(key + 'T00:00:00');
    const j = S.journal[key];
    const evs = [
      ...info.resets.map((r) => ({ t: r.end, html: `<span class="tag r">리셋</span><span>${esc(r.reason)} · ${fmtDur(r.durationMs)} 버팀${r.situations && r.situations.length ? ` · ${r.situations.map(esc).join(', ')}` : ''}${r.memo ? ` · ${esc(r.memo)}` : ''}</span>` })),
      ...info.urges.map((u) => ({ t: u.at, html: `<span class="tag ${u.result === 'win' ? 'w' : 'l'}">${u.result === 'win' ? '참기 성공' : '참기 실패'}</span><span>${u.target ? `${esc(u.target)} · ` : ''}${esc(u.activity)}</span>` })),
    ].sort((a, b) => a.t - b.t);
    const status = info.status === 'before' ? '기록 시작 전' : info.status === 'reset' ? `리셋 ${info.resets.length}번` : '리셋 없이 지킨 날';
    return `<div class="day-detail">
      <h3>${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]}) · <span class="muted">${status}</span></h3>
      ${evs.length ? evs.map((e) => `<div class="ev"><span class="t">${hm(e.t)}</span>${e.html}</div>`).join('') : '<p class="empty">이날은 리셋·참기 기록이 없어요.</p>'}
      ${j ? `<div class="ev"><span class="t">일기</span><span>${esc(j.mood || '')} ${esc(j.text)}</span></div>` : ''}
      ${info.autoKept === true ? `<p class="muted small">자동 디톡스 시간(${U.auto.start}–${U.auto.end})을 지켰어요.</p>` : info.autoKept === false ? `<p class="muted small">자동 디톡스 시간(${U.auto.start}–${U.auto.end}) 중에 리셋이 있었어요.</p>` : ''}
    </div>`;
  }

  function statsCard() {
    const t = now();
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
    let autoLine = '';
    if (U.auto.on) {
      let kept = 0, total = 0;
      for (let d = dayStart(U.trackStart); d <= t; d = addDays(d, 1)) { const k = autoKept(d); if (k !== null) { total++; if (k) kept++; } }
      autoLine = `<div class="tile"><div class="k">자동 디톡스 시간 지킴</div><div class="v">${kept}<small>/ ${total}일</small></div><div class="d">${U.auto.start}–${U.auto.end}</div></div>`;
    }
    const bar = (name, n, max) => `<div class="hbar"><span class="name">${esc(name)}</span><span class="track"><i style="width:${(n / max) * 100}%"></i></span><span class="n">${n}</span></div>`;
    return `<section class="card">
      <h2 style="margin-bottom:12px">통계</h2>
      <div class="tiles">
        <div class="tile"><div class="k">총 디톡스 시간</div><div class="v">${fmtDur(t - U.trackStart)}</div><div class="d">${md(U.trackStart)}부터</div></div>
        <div class="tile"><div class="k">최장 기록</div><div class="v">${fmtDur(Math.max(U.bestMs || 0, t - U.startAt))}</div><div class="d">현재 기록 포함</div></div>
        <div class="tile"><div class="k">평균 기록</div><div class="v">${avg == null ? '-' : fmtDur(avg)}</div><div class="d">리셋 ${done.length}번 기준</div></div>
        <div class="tile"><div class="k">참기 성공</div><div class="v">${wins}<small>번</small></div><div class="d">성공률 ${tries ? Math.round((wins / tries) * 100) : 0}%</div></div>
        <div class="tile"><div class="k">레벨</div><div class="v">Lv.${levelOf(U.xp)}</div><div class="d">${U.xp} XP</div></div>
        <div class="tile"><div class="k">위험 시간대</div><div class="v">${rw ? hourRange(rw.from) : '-'}</div><div class="d">${rw ? `리셋 ${rw.total}번 중 ${rw.n}번` : '리셋 3번부터 보여줘요'}</div></div>
        <div class="tile"><div class="k">일기 연속</div><div class="v">${journalStreak()}<small>일</small></div><div class="d">최고 ${journalBest()}일</div></div>
        ${autoLine}
      </div>
      <div class="grid-2" style="margin-top:18px">
        <div><h3 style="margin-bottom:10px">리셋 이유</h3>
          ${rList.length ? `<div class="hbars">${rList.map(([k, n]) => bar(k, n, maxR)).join('')}</div>` : '<p class="empty">아직 리셋한 적이 없어요.</p>'}</div>
        <div><h3 style="margin-bottom:10px">리셋한 시간대</h3>
          ${done.length ? `<div class="hbars">${BUCKETS.map((b, i) => bar(b.label, bCounts[i], maxB)).join('')}</div>` : '<p class="empty">기록이 쌓이면 보여드릴게요.</p>'}</div>
        <div><h3 style="margin-bottom:10px">무너질 때 상황</h3>
          ${sList.length ? `<div class="hbars">${sList.map(([k, n]) => bar(k, n, maxS)).join('')}</div>` : '<p class="empty">리셋할 때 상황을 고르면 여기에 모여요.</p>'}</div>
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
        const d = new Date(k + 'T00:00:00'), j = S.journal[k];
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
      <p class="hint">한 번에 이어서 버틴 시간으로 받아요. 리셋해도 받은 배지는 사라지지 않아요.</p>
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
    const mine = { uid: me.uid, isMe: true, ...publicData(), startAt: U.startAt, bestMs: U.bestMs, level: levelOf(U.xp), badges: Object.keys(U.badges).length, weekWins: weekWins() };
    const people = [mine, ...F.list].sort((a, b) => rankValue(b, F.rank) - rankValue(a, F.rank));
    if (F.rank === 'time' && F.list.length && people[0].isMe && !U.wasTop1) { saveUser({ wasTop1: true }).then(checkAchievements).catch(() => {}); }
    const valueHtml = (p) => {
      if (F.rank === 'time') return p.startAt == null ? '<span class="val hidden-val">비공개</span>' : `<span class="val" data-live="${p.startAt}">${fmtLive(now() - p.startAt)}</span>`;
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
        <p class="hint">친구에게는 닉네임과 내가 공개한 항목만 보여요. 리셋 이유, 메모, 일기는 절대 보이지 않아요.</p>
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
        <p class="muted small" style="margin-top:-6px">리셋할 때 고르는 이유 목록이에요.</p>
        <div class="chips">${U.targets.map((t, i) => `<span class="chip">${esc(t)}<button class="x" data-act="del-target" data-i="${i}" type="button" aria-label="${esc(t)} 삭제">×</button></span>`).join('')}</div>
        <div class="inline-add"><input id="set-target" maxlength="10" placeholder="새 대상" /><button class="btn" data-act="add-target" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>나만의 규칙</h2>
        <ul class="rule-list">${U.rules.length ? U.rules.map((r, i) => `<li><span class="rule-tag ${r.type === 'ban' ? 'ban' : 'limit'}">${r.type === 'ban' ? '금지' : '제한'}</span>
          <span class="rule-text">${esc(r.text)}</span><span class="row-acts">
          <button class="icon-btn small" data-act="rule-up" data-i="${i}" type="button" aria-label="위로" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
          <button class="icon-btn small" data-act="rule-down" data-i="${i}" type="button" aria-label="아래로" ${i === U.rules.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
          <button class="icon-btn small" data-act="rule-del" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></span></li>`).join('') : '<li class="empty">아직 규칙이 없어요</li>'}</ul>
        <div class="inline-add"><select id="set-rule-type"><option value="ban">금지</option><option value="limit">제한</option></select>
          <input id="set-rule" maxlength="30" placeholder="예: 게임은 주말 1시간" /><button class="btn" data-act="add-rule" type="button">추가</button></div>
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
        <h2>만약-그러면 계획</h2>
        <p class="muted small" style="margin-top:-6px">참기를 누르고 당기는 걸 고르면, 정해둔 행동이 먼저 나와요.</p>
        ${U.plans.length ? `<ul class="plain-list">${U.plans.map((p, i) => `<li><span><b>${esc(iga(p.target))}</b> 당기면 → ${esc(p.action)}</span><button class="icon-btn small" data-act="del-plan" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></li>`).join('')}</ul>` : ''}
        <div class="inline-add"><select id="set-plan-target">${U.targets.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
          <input id="set-plan" maxlength="30" placeholder="그러면 할 행동 (예: 문제 하나 풀기)" /><button class="btn" data-act="add-plan" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>위험 시간대 알림</h2>
        <div class="set-row"><div><div class="lbl">홈에 경고 띄우기</div><div class="desc">${(() => { const rw = riskiestWindow(); return rw ? `지금까지 가장 위험한 시간대는 ${hourRange(rw.from)}예요.` : '리셋 기록이 3번 쌓이면 자주 무너지는 시간을 찾아서 알려줘요.'; })()}</div></div>
          <label class="switch"><input type="checkbox" data-act="risk-on" ${U.riskOn ? 'checked' : ''} /><span></span></label></div>
      </section>

      <section class="card set-sec">
        <h2>자동 디톡스 시간대</h2>
        <div class="set-row"><div><div class="lbl">사용하기</div><div class="desc">이 시간대는 홈에 표시되고, 달력·통계에 지켰는지 따로 기록돼요.</div></div>
          <label class="switch"><input type="checkbox" data-act="auto-on" ${U.auto.on ? 'checked' : ''} /><span></span></label></div>
        <div class="time-row"><input type="time" id="auto-start" value="${U.auto.start}" ${U.auto.on ? '' : 'disabled'} /><span>부터</span>
          <input type="time" id="auto-end" value="${U.auto.end}" ${U.auto.on ? '' : 'disabled'} /><span>까지</span>
          <button class="btn small" data-act="auto-save" type="button" ${U.auto.on ? '' : 'disabled'}>저장</button></div>
      </section>

      <section class="card set-sec">
        <h2>되찾은 시간</h2>
        <p class="muted small" style="margin-top:-6px">디톡스 전에 하루에 쇼츠·게임·SNS에 쓰던 시간이에요. 리셋 없는 날마다 이만큼 되찾은 걸로 계산해요.</p>
        <div class="time-row"><input type="number" id="set-minutes" min="10" max="900" inputmode="numeric" style="width:7em" value="${U.dailyMinutes || ''}" placeholder="분" /><span>분</span>
          <button class="btn small" data-act="save-minutes" type="button">저장</button></div>
      </section>

      <section class="card set-sec">
        <h2>시험 기간 모드</h2>
        <p class="muted small" style="margin-top:-6px">시험 기간엔 모든 보상이 2배가 되고, 위험 시간대 경고가 더 민감해져요. 홈에 D-day도 보여요.</p>
        <input id="exam-name" maxlength="20" placeholder="이름 (예: 2학기 기말고사)" value="${esc((U.exam && U.exam.name) || '')}" />
        <div class="time-row"><input type="date" id="exam-start" value="${(U.exam && U.exam.start) || ''}" /><span>부터</span>
          <input type="date" id="exam-end" value="${(U.exam && U.exam.end) || ''}" /><span>까지</span></div>
        <div class="danger-zone"><button class="btn primary" data-act="save-exam" type="button">저장</button>${U.exam ? '<button class="btn ghost" data-act="clear-exam" type="button">지우기</button>' : ''}</div>
      </section>

      <section class="card set-sec">
        <h2>오늘의 미션</h2>
        <p class="muted small" style="margin-top:-6px">기본 미션 ${DEFAULT_MISSIONS.length}개에 내가 추가한 미션이 섞여서 매일 하나씩 나와요.</p>
        ${U.missions.length ? `<ul class="plain-list">${U.missions.map((m, i) => `<li><span>${esc(m)}</span><button class="icon-btn small" data-act="del-mission" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></li>`).join('')}</ul>` : ''}
        <div class="inline-add"><input id="set-mission" maxlength="40" placeholder="내 미션 추가" /><button class="btn" data-act="add-mission" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>동기 문구</h2>
        <p class="muted small" style="margin-top:-6px">기본 문장 365개가 매일 아침 8시에 바뀌어요. 내가 추가한 문구는 그 아래에 하루씩 번갈아 보여요.</p>
        ${U.quotes.length ? `<ul class="plain-list">${U.quotes.map((q, i) => `<li><span>${esc(q)}</span><button class="icon-btn small" data-act="del-quote" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></li>`).join('')}</ul>` : ''}
        <div class="inline-add"><input id="set-quote" maxlength="60" placeholder="나만의 문구 추가" /><button class="btn" data-act="add-quote" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>친구 공개 범위</h2>
        <p class="muted small" style="margin-top:-6px">닉네임은 항상 보여요. 리셋 이유, 메모, 일기, 규칙, 성별은 절대 공개되지 않아요.</p>
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
        <div class="danger-zone"><button class="btn" data-act="logout" type="button">로그아웃</button></div>
      </section>
      <p class="app-ver">FocusFill v${APP_VERSION}</p>`;
  }

  async function settingsUpdate(fields, toastMsg, alsoPublic) {
    try { await saveUser(fields); if (toastMsg) toast(toastMsg); } catch (e) {}
    if (alsoPublic) savePublic(true);
    renderSettings();
  }

  /* ====================== 클릭 처리 ====================== */
  async function onAction(act, el) {
    switch (act) {
      case 'urge': return openUrge(false);
      case 'reset': return openReset();
      case 'open-report': ui.weekOff = 1; ui.recTab = 'report'; return switchTab('records');
      case 'open-month': ui.monthOff = 1; ui.recTab = 'report'; return switchTab('records');
      case 'open-year': ui.year = +el.dataset.y; ui.recTab = 'report'; return switchTab('records');
      case 'rec-tab': ui.recTab = el.dataset.k; renderRecords(); return window.scrollTo(0, 0);
      case 'month-prev': ui.monthOff++; return renderRecords();
      case 'month-next': ui.monthOff = Math.max(0, ui.monthOff - 1); return renderRecords();
      case 'year-prev': ui.year = (ui.year || new Date().getFullYear()) - 1; return renderRecords();
      case 'year-next': ui.year = Math.min(new Date().getFullYear(), (ui.year || new Date().getFullYear()) + 1); return renderRecords();
      case 'claim-attend': el.disabled = true; return claimAttend();
      case 'done-mission': el.disabled = true; return doneMission();
      case 'reroll-mission': return rerollMission();
      case 'pick-pledge': return makePledge(el.dataset.p);
      case 'make-pledge': return makePledge($('pledge-input') && $('pledge-input').value);
      case 'check-pledge': return checkPledge(el.dataset.k, el.dataset.v);
      case 'set-minutes': {
        const v = el.dataset.m ? +el.dataset.m : Math.round(Number($('minutes-input').value));
        if (!v || v < 10 || v > 900) return toast('10분에서 900분 사이로 적어주세요');
        try { await saveUser({ dailyMinutes: v }); } catch (e) {}
        renderHome(); return checkAchievements();
      }
      case 'goto-settings': return switchTab('settings');
      case 'edit-journal': ui.editJournal = true; return renderHome();
      case 'save-journal': return saveJournal();
      case 'week-prev': ui.weekOff++; return renderRecords();
      case 'week-next': ui.weekOff = Math.max(0, ui.weekOff - 1); return renderRecords();
      case 'cal-prev': { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() - 1); ui.calMonth = d.getTime(); return renderRecords(); }
      case 'cal-next': { const d = new Date(ui.calMonth); d.setMonth(d.getMonth() + 1); ui.calMonth = d.getTime(); return renderRecords(); }
      case 'sel-day': ui.selDay = el.dataset.k; return renderRecords();

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
      case 'add-rule': {
        const v = $('set-rule').value.trim();
        if (!v) return;
        return settingsUpdate({ rules: [...U.rules, { type: $('set-rule-type').value, text: v }] });
      }
      case 'rule-up': case 'rule-down': {
        const i = +el.dataset.i, j = act === 'rule-up' ? i - 1 : i + 1;
        const rules = [...U.rules];
        [rules[i], rules[j]] = [rules[j], rules[i]];
        return settingsUpdate({ rules });
      }
      case 'rule-del': return settingsUpdate({ rules: U.rules.filter((_, i) => i !== +el.dataset.i) });
      case 'urge-min': return settingsUpdate({ urgeMinutes: +el.dataset.m });
      case 'add-plan': {
        const target = $('set-plan-target').value, action = $('set-plan').value.trim();
        if (!target || !action) return;
        const plans = [...U.plans.filter((p) => p.target !== target), { target, action }];
        return settingsUpdate({ plans }, `${target} 계획을 저장했어요`);
      }
      case 'del-plan': return settingsUpdate({ plans: U.plans.filter((_, i) => i !== +el.dataset.i) });
      case 'edit-goal': return openGoalSheet();
      case 'save-minutes': {
        const v = Math.round(Number($('set-minutes').value));
        if (!v || v < 10 || v > 900) return toast('10분에서 900분 사이로 적어주세요');
        return settingsUpdate({ dailyMinutes: v }, '저장했어요');
      }
      case 'save-exam': {
        const name = $('exam-name').value.trim(), start = $('exam-start').value, end = $('exam-end').value;
        if (!start || !end) return toast('시작일과 끝나는 날을 정해 주세요');
        if (end < start) return toast('끝나는 날이 시작일보다 빨라요');
        if (end < dateKey(now())) return toast('이미 지난 기간이에요');
        return settingsUpdate({ exam: { name: name || '시험 기간', start, end } }, '시험 기간을 저장했어요');
      }
      case 'clear-exam': return settingsUpdate({ exam: null }, '시험 기간을 지웠어요');
      case 'add-mission': {
        const v = $('set-mission').value.trim();
        if (!v || U.missions.includes(v)) return;
        return settingsUpdate({ missions: [...U.missions, v] }, '미션을 추가했어요');
      }
      case 'del-mission': return settingsUpdate({ missions: U.missions.filter((_, i) => i !== +el.dataset.i) });
      case 'journal-all': ui.journalAll = !ui.journalAll; return renderRecords();
      case 'add-act': {
        const v = $('set-act').value.trim();
        if (!v) return;
        return settingsUpdate({ activities: [...U.activities, v] });
      }
      case 'del-act': {
        if (U.activities.length <= 1) return toast('하나는 남겨 주세요');
        return settingsUpdate({ activities: U.activities.filter((_, i) => i !== +el.dataset.i) });
      }
      case 'auto-save': {
        const s = $('auto-start').value, e = $('auto-end').value;
        if (!s || !e || s === e) return toast('시작과 끝 시간을 다르게 정해 주세요');
        return settingsUpdate({ auto: { ...U.auto, start: s, end: e } }, '자동 디톡스 시간을 저장했어요');
      }
      case 'add-quote': {
        const v = $('set-quote').value.trim();
        if (!v) return;
        return settingsUpdate({ quotes: [...U.quotes, v] }, '문구를 추가했어요');
      }
      case 'del-quote': return settingsUpdate({ quotes: U.quotes.filter((_, i) => i !== +el.dataset.i) });
      case 'theme': applyTheme(el.dataset.v === 'system' ? null : el.dataset.v); if (el.dataset.v === 'system') { try { localStorage.removeItem('focusfill_theme'); } catch (e) {} } return renderSettings();
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
    if (act === 'auto-on') return settingsUpdate({ auto: { ...U.auto, on: el.checked } });
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
      const map = { 'journal-input': 'save-journal', 'friend-code-input': 'add-friend', 'set-nick': 'save-nick', 'set-target': 'add-target', 'set-rule': 'add-rule', 'set-act': 'add-act', 'set-quote': 'add-quote', 'set-plan': 'add-plan', 'pledge-input': 'make-pledge', 'minutes-input': 'set-minutes', 'set-mission': 'add-mission', 'set-minutes': 'save-minutes' };
      if (map[e.target.id]) { e.preventDefault(); onAction(map[e.target.id], e.target); }
    });
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
    $('reset-confirm').onclick = doReset;
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
  async function boot() {
    applyTheme(currentTheme());
    document.querySelectorAll('[data-ver]').forEach((el) => { el.textContent = `FocusFill v${APP_VERSION}`; });
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
        go('screen-auth');
        return;
      }
      go('screen-loading');
      let data = null;
      try { data = await db.get(userPath()); } catch (e) { data = null; }
      if (!data || !data.onboarded) { resetOnboarding(); go('screen-onboard'); obShow(); return; }
      U = normalize(data);
      await loadRecords();
      await enterApp();
    });
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
  boot();
})();
