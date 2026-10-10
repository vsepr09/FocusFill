/* FocusFill — 1단계: 계정, 온보딩, 진행 시간 타이머, 리셋(+이유/되돌리기), 참기 */
(() => {
  'use strict';

  // ---------- 상수 ----------
  const EMAIL_DOMAIN = 'iasa-protein.app'; // ProFill과 같은 규칙: 아이디@도메인 (메일은 보내지 않음)
  const ID_RE = /^[a-z0-9_]{3,20}$/;
  const idOf = (email) => (email || '').split('@')[0];
  const COL_USERS = 'focusfill_users';   // ProFill 데이터(users, public)와 겹치지 않게 따로 저장
  const COL_PUBLIC = 'focusfill_public';
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const MILESTONES = [
    { ms: HOUR, label: '1시간' }, { ms: DAY, label: '1일' }, { ms: 3 * DAY, label: '3일' },
    { ms: 7 * DAY, label: '7일' }, { ms: 14 * DAY, label: '14일' }, { ms: 30 * DAY, label: '30일' },
    { ms: 50 * DAY, label: '50일' }, { ms: 100 * DAY, label: '100일' },
  ];
  const BASE_TARGETS = ['쇼츠', '게임', '웹툰', 'SNS'];
  const MALE_TARGETS = ['야동', '딸'];
  const DEFAULT_ACTIVITIES = [
    '물 한 잔 마시기', '1분 스트레칭', '문제 하나 풀기', '창밖 보며 심호흡 10번',
    '책상 정리하기', '팔굽혀펴기 10개', '내일 할 일 3개 적기', '친구한테 말 걸기',
    '세수하고 오기', '좋아하는 노래 한 곡 듣기',
  ];

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  // ---------- 저장소: Firebase 또는 로컬 테스트 모드 ----------
  const cfg = window.FIREBASE_CONFIG || {};
  const useFirebase = !!(cfg.apiKey && !String(cfg.apiKey).startsWith('YOUR'));

  function authError(code) { const e = new Error(code); e.code = code; return e; }

  function LocalBackend() {
    const KEY = 'focusfill_local_v1';
    let s;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    if (!s) s = { accounts: {}, session: null, docs: {} };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
    let listener = () => {};
    const userOf = (uid) => {
      const email = Object.keys(s.accounts).find((k) => s.accounts[k].uid === uid);
      return uid ? { uid, email } : null;
    };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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
    const v = '10.12.2', base = `https://www.gstatic.com/firebasejs/${v}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-auth-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');
    firebase.initializeApp(cfg);
    const auth = firebase.auth(), fs = firebase.firestore();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
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
    };
  }

  const ERR = {
    'auth/email-already-in-use': '이미 있는 아이디예요. ProFill 계정이면 로그인으로 들어오세요.',
    'auth/invalid-email': '아이디 또는 비밀번호가 맞지 않아요.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
    'auth/invalid-credential': '아이디 또는 비밀번호가 맞지 않아요.',
    'auth/invalid-login-credentials': '아이디 또는 비밀번호가 맞지 않아요.',
    'auth/wrong-password': '아이디 또는 비밀번호가 맞지 않아요.',
    'auth/user-not-found': '아이디 또는 비밀번호가 맞지 않아요.',
    'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 해주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
    'auth/popup-closed-by-user': '로그인 창이 닫혔어요.',
  };
  const errMsg = (e) => ERR[e && e.code] || `처리하지 못했어요 (${(e && e.code) || '알 수 없음'}).`;

  // ---------- 상태 ----------
  let db = null;       // 저장소
  let me = null;       // { uid, email }
  let U = null;        // users/{uid} 문서 (비공개)
  let tickTimer = null;

  const userPath = () => `${COL_USERS}/${me.uid}`;
  const publicPath = () => `${COL_PUBLIC}/${me.uid}`;

  // ---------- 화면 전환 ----------
  const SCREENS = ['screen-loading', 'screen-auth', 'screen-onboard', 'screen-app'];
  function go(id) { SCREENS.forEach((s) => (s === id ? show($(s)) : hide($(s)))); }

  // ---------- 토스트 ----------
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

  // ---------- 로그인 / 가입 ----------
  let authMode = 'login';
  function setupAuth() {
    document.querySelectorAll('#auth-seg .seg-btn').forEach((b) => {
      b.onclick = () => {
        authMode = b.dataset.mode;
        document.querySelectorAll('#auth-seg .seg-btn').forEach((x) => x.classList.toggle('active', x === b));
        const signup = authMode === 'signup';
        $('auth-pw2').classList.toggle('hidden', !signup);
        $('auth-pw2').required = signup;
        $('auth-submit').textContent = signup ? '가입하기' : '로그인';
        $('auth-pw').autocomplete = signup ? 'new-password' : 'current-password';
        $('auth-hint').textContent = signup ? '비밀번호는 찾을 수 없으니 꼭 기억해 주세요. ProFill 계정이 있다면 가입 말고 로그인하세요.' : 'ProFill 아이디와 비밀번호로 바로 로그인할 수 있어요.';
        hide($('auth-error'));
      };
    });

    $('auth-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const id = $('auth-id').value.trim().toLowerCase();
      const pw = $('auth-pw').value;
      const err = $('auth-error');
      hide(err);
      if (!ID_RE.test(id)) { err.textContent = '아이디는 영어 소문자, 숫자, _ 로 3–20자예요.'; show(err); return; }
      const email = `${id}@${EMAIL_DOMAIN}`;
      if (authMode === 'signup' && pw !== $('auth-pw2').value) {
        err.textContent = '비밀번호 확인이 일치하지 않아요.'; show(err); return;
      }
      if (pw.length < 6) { err.textContent = ERR['auth/weak-password']; show(err); return; }
      const btn = $('auth-submit'); btn.disabled = true; btn.textContent = '잠시만요';
      try {
        if (authMode === 'signup') await db.signUp(email, pw); else await db.signIn(email, pw);
      } catch (e) { err.textContent = errMsg(e); show(err); }
      btn.disabled = false; btn.textContent = authMode === 'signup' ? '가입하기' : '로그인';
    };
  }

  // ---------- 온보딩 ----------
  const ob = { step: 0, gender: null, targets: [], custom: [], rules: [], start: null };
  const OB_STEPS = 5;

  function obAllTargets() {
    const list = [...BASE_TARGETS];
    if (ob.gender === 'male') list.push(...MALE_TARGETS);
    ob.custom.forEach((t) => { if (!list.includes(t)) list.push(t); });
    return list;
  }

  function renderObTargets() {
    const box = $('ob-targets'); box.innerHTML = '';
    obAllTargets().forEach((t) => {
      const c = document.createElement('button');
      c.className = 'chip' + (ob.targets.includes(t) ? ' selected' : '');
      c.textContent = t;
      c.onclick = () => {
        ob.targets = ob.targets.includes(t) ? ob.targets.filter((x) => x !== t) : [...ob.targets, t];
        renderObTargets();
      };
      box.appendChild(c);
    });
  }

  function renderRules(listEl, rules, removable) {
    listEl.innerHTML = '';
    if (!rules.length) {
      const li = document.createElement('li'); li.className = 'empty';
      li.textContent = removable ? '아직 규칙이 없어요' : '설정에서 규칙을 추가할 수 있어요';
      listEl.appendChild(li); return;
    }
    rules.forEach((r, i) => {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'rule-tag ' + r.type; tag.textContent = r.type === 'ban' ? '금지' : '제한';
      const tx = document.createElement('span'); tx.className = 'rule-text'; tx.textContent = r.text;
      li.append(tag, tx);
      if (removable) {
        const del = document.createElement('button'); del.className = 'rule-del'; del.textContent = '✕';
        del.setAttribute('aria-label', '삭제');
        del.onclick = () => { rules.splice(i, 1); renderRules(listEl, rules, true); };
        li.appendChild(del);
      }
      listEl.appendChild(li);
    });
  }

  function obShow() {
    document.querySelectorAll('.ob-step').forEach((s) => s.classList.toggle('active', +s.dataset.step === ob.step));
    $('ob-dots').innerHTML = Array.from({ length: OB_STEPS }, (_, i) => `<span class="${i <= ob.step ? 'on' : ''}"></span>`).join('');
    $('ob-back').style.visibility = ob.step === 0 ? 'hidden' : 'visible';
    $('ob-next').textContent = ob.step === OB_STEPS - 1 ? '시작하기' : (ob.step === 3 && !ob.rules.length ? '건너뛰기' : '다음');
    hide($('ob-error'));
    if (ob.step === 2) renderObTargets();
    if (ob.step === 3) renderRules($('ob-rules'), ob.rules, true);
  }

  function obError(msg) { $('ob-error').textContent = msg; show($('ob-error')); }

  function setupOnboarding() {
    document.querySelectorAll('#ob-gender .choice').forEach((b) => {
      b.onclick = () => {
        const prev = ob.gender;
        ob.gender = b.dataset.v;
        document.querySelectorAll('#ob-gender .choice').forEach((x) => x.classList.toggle('selected', x === b));
        // 남자 → 야동, 딸 자동 선택 / 남자가 아니게 바뀌면 빼기
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
      renderRules($('ob-rules'), ob.rules, true);
      obShow();
    };
    $('ob-rule-add').onclick = addRule;
    $('ob-rule-input').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } };

    document.querySelectorAll('#ob-start .choice').forEach((b) => {
      b.onclick = () => {
        ob.start = b.dataset.v;
        document.querySelectorAll('#ob-start .choice').forEach((x) => x.classList.toggle('selected', x === b));
        const inp = $('ob-start-time');
        if (ob.start === 'past') {
          show(inp);
          const d = new Date(Date.now() - DAY);
          inp.max = toLocalInput(new Date());
          if (!inp.value) inp.value = toLocalInput(d);
        } else hide(inp);
      };
    });

    $('ob-back').onclick = () => { if (ob.step > 0) { ob.step--; obShow(); } };
    $('ob-next').onclick = async () => {
      if (ob.step === 0 && !$('ob-nick').value.trim()) return obError('닉네임을 입력해 주세요.');
      if (ob.step === 1 && !ob.gender) return obError('하나를 골라주세요.');
      if (ob.step === 2 && !ob.targets.length) return obError('하나 이상 골라주세요.');
      if (ob.step < OB_STEPS - 1) { ob.step++; return obShow(); }
      // 마지막 단계
      if (!ob.start) return obError('시작 방법을 골라주세요.');
      let startAt = Date.now();
      if (ob.start === 'past') {
        const t = new Date($('ob-start-time').value).getTime();
        if (!t || t > Date.now()) return obError('지금보다 이전 시각을 입력해 주세요.');
        startAt = t;
      }
      $('ob-next').disabled = true;
      try { await finishOnboarding(startAt); } catch (e) { obError('저장하지 못했어요. 다시 시도해 주세요.'); }
      $('ob-next').disabled = false;
    };
  }

  function toLocalInput(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function makeFriendCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }

  async function finishOnboarding(startAt) {
    const nickname = $('ob-nick').value.trim() || idOf(me.email);
    const friendCode = makeFriendCode();
    const ordered = obAllTargets().filter((t) => ob.targets.includes(t));
    U = {
      nickname, gender: ob.gender, targets: ordered, rules: ob.rules,
      activities: DEFAULT_ACTIVITIES, urgeMinutes: 10,
      startAt, bestMs: 0, urgeWins: 0, urge: null,
      friendCode, onboarded: true, createdAt: Date.now(),
    };
    await db.set(userPath(), U);
    await db.set(publicPath(), { nickname, startAt, bestMs: 0, friendCode });
    enterApp();
  }

  // ---------- 메인 ----------
  function enterApp() {
    go('screen-app');
    $('greet').textContent = `${U.nickname}님, 오늘도 채워봐요`;
    $('my-code').textContent = U.friendCode || '-';
    $('acc-email').textContent = '아이디 ' + idOf(me.email);
    $('acc-mode').textContent = db.mode === 'local' ? '테스트 모드 (이 기기에만 저장)' : '클라우드 저장 중';
    renderRules($('home-rules'), U.rules || [], false);
    renderUrgeCount();
    startTick();
    if (U.urge) openUrge(true);
  }

  function startTick() {
    clearInterval(tickTimer);
    renderTimer();
    tickTimer = setInterval(renderTimer, 1000);
  }

  function fmtDuration(ms) {
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN);
    if (d) return `${d}일 ${h}시간`;
    if (h) return `${h}시간 ${m}분`;
    return `${m}분`;
  }

  function renderTimer() {
    if (!U) return;
    const now = Date.now();
    const ms = Math.max(0, now - U.startAt);
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
    $('t-d').textContent = d;
    $('t-clock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    const best = U.bestMs || 0;
    const isRecord = ms > best && best > 0;
    $('timer-label').textContent = isRecord ? '신기록 갱신 중' : '디톡스 진행 중';
    $('best-line').textContent = best > 0 ? `최장 기록 ${fmtDuration(Math.max(best, ms))}` : '첫 기록을 쌓는 중이에요';

    const next = MILESTONES.find((x) => x.ms > ms);
    if (next) {
      const prevIdx = MILESTONES.indexOf(next) - 1;
      const from = prevIdx >= 0 ? MILESTONES[prevIdx].ms : 0;
      const pct = ((ms - from) / (next.ms - from)) * 100;
      $('badge-bar').style.width = pct.toFixed(1) + '%';
      $('badge-line').textContent = `다음 배지 ${next.label}까지 ${Math.floor(pct)}%`;
    } else {
      $('badge-bar').style.width = '100%';
      $('badge-line').textContent = '모든 배지를 모았어요';
    }

    if (U.urge) renderUrge();
  }

  function renderUrgeCount() {
    const n = U.urgeWins || 0;
    $('urge-count').textContent = n ? `지금까지 충동을 ${n}번 이겨냈어요` : '충동이 오면 참기 버튼을 눌러보세요';
  }

  async function saveCore() {
    await db.set(userPath(), { startAt: U.startAt, bestMs: U.bestMs });
    await db.set(publicPath(), { startAt: U.startAt, bestMs: U.bestMs });
  }

  // ---------- 리셋 ----------
  let resetReason = null;
  function openReset() {
    resetReason = null;
    const ms = Date.now() - U.startAt;
    $('reset-sub').textContent = `지금까지 ${fmtDuration(ms)} 버텼어요. 리셋하면 타이머가 0부터 다시 시작해요.`;
    const box = $('reset-reasons'); box.innerHTML = '';
    [...(U.targets || []), '기타'].forEach((t) => {
      const c = document.createElement('button');
      c.className = 'chip'; c.textContent = t;
      c.onclick = () => {
        resetReason = t;
        box.querySelectorAll('.chip').forEach((x) => x.classList.toggle('selected', x === c));
        hide($('reset-error'));
      };
      box.appendChild(c);
    });
    $('reset-memo').value = '';
    hide($('reset-error'));
    show($('modal-reset'));
  }

  async function doReset() {
    if (!resetReason) { $('reset-error').textContent = '이유를 하나 골라주세요.'; show($('reset-error')); return; }
    const now = Date.now();
    const dur = now - U.startAt;
    const prev = { startAt: U.startAt, bestMs: U.bestMs || 0 };
    $('reset-confirm').disabled = true;
    try {
      const id = await db.add(`${userPath()}/streaks`, {
        start: U.startAt, end: now, durationMs: dur, reason: resetReason, memo: $('reset-memo').value.trim(),
      });
      U.startAt = now;
      U.bestMs = Math.max(prev.bestMs, dur);
      await saveCore();
      hide($('modal-reset'));
      renderTimer();
      toast('리셋했어요. 다시 시작!', () => undoReset(id, prev), 10000);
    } catch (e) {
      $('reset-error').textContent = '저장하지 못했어요. 다시 시도해 주세요.'; show($('reset-error'));
    }
    $('reset-confirm').disabled = false;
  }

  async function undoReset(id, prev) {
    try {
      await db.del(`${userPath()}/streaks/${id}`);
      U.startAt = prev.startAt; U.bestMs = prev.bestMs;
      await saveCore();
      renderTimer();
      toast('되돌렸어요');
    } catch (e) { toast('되돌리지 못했어요'); }
  }

  // ---------- 참기 ----------
  function pickActivity(except) {
    const list = (U.activities && U.activities.length ? U.activities : DEFAULT_ACTIVITIES).filter((a) => a !== except);
    return list[Math.floor(Math.random() * list.length)] || except;
  }

  async function openUrge(resume) {
    if (!resume) {
      const mins = U.urgeMinutes || 10;
      const now = Date.now();
      U.urge = { startedAt: now, endsAt: now + mins * MIN, minutes: mins, activity: pickActivity() };
      db.set(userPath(), { urge: U.urge }).catch(() => {});
    }
    $('urge-activity').textContent = U.urge.activity;
    show($('urge'));
    renderUrge();
  }

  function renderUrge() {
    const u = U.urge; if (!u) return;
    const left = Math.max(0, u.endsAt - Date.now());
    const total = u.endsAt - u.startedAt;
    const secs = Math.ceil(left / 1000);
    $('urge-clock').textContent = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
    $('urge-ring').style.width = (((total - left) / total) * 100).toFixed(1) + '%';
    const done = left === 0;
    $('urge-title').textContent = done ? '버텼어요! 지금 기분은 어때요?' : '충동은 몇 분이면 지나가요';
    $('urge-running').classList.toggle('hidden', done);
    $('urge-done').classList.toggle('hidden', !done);
  }

  async function finishUrge(result) {
    const u = U.urge; if (!u) return;
    U.urge = null;
    hide($('urge'));
    if (result === 'win') U.urgeWins = (U.urgeWins || 0) + 1;
    renderUrgeCount();
    try {
      await db.add(`${userPath()}/urges`, { at: u.startedAt, minutes: u.minutes, activity: u.activity, result });
      await db.set(userPath(), { urge: null, urgeWins: U.urgeWins || 0 });
    } catch (e) {}
    if (result === 'win') toast('충동을 이겨냈어요!');
    else openReset();
  }

  // ---------- 탭 ----------
  function setupTabs() {
    document.querySelectorAll('.tab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
        ['home', 'records', 'friends', 'settings'].forEach((name) =>
          $('tab-' + name).classList.toggle('hidden', name !== t.dataset.tab));
        window.scrollTo(0, 0);
      };
    });
  }

  function setupApp() {
    setupTabs();
    $('btn-reset').onclick = openReset;
    $('reset-cancel').onclick = () => hide($('modal-reset'));
    $('modal-reset').onclick = (e) => { if (e.target.id === 'modal-reset') hide($('modal-reset')); };
    $('reset-confirm').onclick = doReset;
    $('btn-urge').onclick = () => openUrge(false);
    $('urge-shuffle').onclick = () => {
      U.urge.activity = pickActivity(U.urge.activity);
      $('urge-activity').textContent = U.urge.activity;
      db.set(userPath(), { urge: U.urge }).catch(() => {});
    };
    $('urge-giveup').onclick = () => finishUrge('lose');
    $('urge-lose').onclick = () => finishUrge('lose');
    $('urge-win').onclick = () => finishUrge('win');
    $('btn-logout').onclick = async () => { clearInterval(tickTimer); await db.signOut(); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) renderTimer(); });
  }

  // ---------- 시작 ----------
  async function boot() {
    try {
      db = useFirebase ? await FirebaseBackend() : LocalBackend();
    } catch (e) {
      console.warn('Firebase를 불러오지 못해 테스트 모드로 실행해요.', e);
      db = LocalBackend();
    }
    if (db.mode === 'local') show($('test-banner'));
    setupAuth();
    setupOnboarding();
    setupApp();

    db.onAuth(async (user) => {
      me = user;
      clearInterval(tickTimer);
      if (!user) {
        U = null;
        document.querySelector('#auth-seg [data-mode=login]').click();
        $('auth-pw').value = ''; $('auth-pw2').value = '';
        go('screen-auth'); return;
      }
      go('screen-loading');
      try { U = await db.get(userPath()); } catch (e) { U = null; }
      if (!U || !U.onboarded) {
        Object.assign(ob, { step: 0, gender: null, targets: [...BASE_TARGETS], custom: [], rules: [], start: null });
        $('ob-nick').value = '';
        document.querySelectorAll('#screen-onboard .choice').forEach((x) => x.classList.remove('selected'));
        hide($('ob-start-time'));
        go('screen-onboard');
        obShow();
      } else enterApp();
    });
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  boot();
})();
