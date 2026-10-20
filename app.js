/* FocusFill — 도파민 디톡스 기록 (ProFill과 같은 계정) */
(() => {
  'use strict';

  /* ====================== 상수 ====================== */
  const APP_VERSION = '1.7.9';
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
    { id: 'm10', ms: 10 * MIN, label: '10분', short: '10M', bonus: 1 },
    { id: 'm30', ms: 30 * MIN, label: '30분', short: '30M', bonus: 1 },
    { id: 'h1', ms: HOUR, label: '1시간', short: '1H', bonus: 3 },
    { id: 'h2', ms: 2 * HOUR, label: '2시간', short: '2H', bonus: 3 },
    { id: 'h3', ms: 3 * HOUR, label: '3시간', short: '3H', bonus: 4 },
    { id: 'h4', ms: 4 * HOUR, label: '4시간', short: '4H', bonus: 5 },
    { id: 'h6', ms: 6 * HOUR, label: '6시간', short: '6H', bonus: 5 },
    { id: 'h8', ms: 8 * HOUR, label: '8시간', short: '8H', bonus: 6 },
    { id: 'h12', ms: 12 * HOUR, label: '12시간', short: '12H', bonus: 8 },
    { id: 'h18', ms: 18 * HOUR, label: '18시간', short: '18H', bonus: 9 },
    { id: 'd1', ms: DAY, label: '1일', short: '1D', bonus: 10 },
    { id: 'h36', ms: 36 * HOUR, label: '1일 반', short: '36H', bonus: 13 },
    { id: 'd2', ms: 2 * DAY, label: '2일', short: '2D', bonus: 15 },
    { id: 'd3', ms: 3 * DAY, label: '3일', short: '3D', bonus: 20 },
    { id: 'd4', ms: 4 * DAY, label: '4일', short: '4D', bonus: 25 },
    { id: 'd5', ms: 5 * DAY, label: '5일', short: '5D', bonus: 30 },
    { id: 'd6', ms: 6 * DAY, label: '6일', short: '6D', bonus: 35 },
    { id: 'd7', ms: 7 * DAY, label: '7일', short: '7D', bonus: 40 },
    { id: 'd8', ms: 8 * DAY, label: '8일', short: '8D', bonus: 43 },
    { id: 'd9', ms: 9 * DAY, label: '9일', short: '9D', bonus: 45 },
    { id: 'd10', ms: 10 * DAY, label: '10일', short: '10D', bonus: 50 },
    { id: 'd12', ms: 12 * DAY, label: '12일', short: '12D', bonus: 55 },
    { id: 'd14', ms: 14 * DAY, label: '14일', short: '14D', bonus: 60 },
    { id: 'd17', ms: 17 * DAY, label: '17일', short: '17D', bonus: 70 },
    { id: 'd21', ms: 21 * DAY, label: '21일', short: '21D', bonus: 80 },
    { id: 'd25', ms: 25 * DAY, label: '25일', short: '25D', bonus: 90 },
    { id: 'd30', ms: 30 * DAY, label: '30일', short: '30D', bonus: 100 },
    { id: 'd45', ms: 45 * DAY, label: '45일', short: '45D', bonus: 125 },
    { id: 'd50', ms: 50 * DAY, label: '50일', short: '50D', bonus: 150 },
    { id: 'd60', ms: 60 * DAY, label: '60일', short: '60D', bonus: 175 },
    { id: 'd75', ms: 75 * DAY, label: '75일', short: '75D', bonus: 200 },
    { id: 'd100', ms: 100 * DAY, label: '100일', short: '100D', bonus: 250 },
    { id: 'd120', ms: 120 * DAY, label: '120일', short: '120D', bonus: 275 },
    { id: 'd150', ms: 150 * DAY, label: '150일', short: '150D', bonus: 350 },
    { id: 'd180', ms: 180 * DAY, label: '180일', short: '180D', bonus: 400 },
    { id: 'd200', ms: 200 * DAY, label: '200일', short: '200D', bonus: 450 },
    { id: 'd250', ms: 250 * DAY, label: '250일', short: '250D', bonus: 550 },
    { id: 'd300', ms: 300 * DAY, label: '300일', short: '300D', bonus: 650 },
    { id: 'd365', ms: 365 * DAY, label: '1년', short: '1Y', bonus: 750 },
  ];
  // v1.6.0 밸런스: 버틴 시간이 가장 큰 보상. 배수(연속·시험)는 디톡스 보상(버틴 시간·배지·고요한 날·참기·재도전)에만 붙어요
  const XP = { hour: 2, urgeWin: 10, journal: 5, comeback: 15, monthGoal: 50, pledge: 2, check: 5, honest: 5, calm: 20,
    focus: 2, endReview: 5, lessonReview: 2, experiment: 10, letter: 10, examReview: 15, weekReview: 10, monthReview: 20 };
  // v1.7.0 집중 타이머: 25분마다 2 XP, 하루 최대 12 XP (시험 기간엔 ×1.5)
  const FOCUS_UNIT = 25, FOCUS_DAY_MAX = 12, FOCUS_MIN_REC = 10;
  const DEFAULT_SUBJECTS = ['국어', '수학', '영어', '과학', '사회'];
  const LESSON_RV = [1, 7, 30, 90];   // 교훈 다시 보기 간격 (일)
  const WHY_MAX = 3, LETTER_OPEN_MAX = 5;
  const EXAM_X = 1.5;          // 시험 기간 디톡스 보상 배수
  const STAR_XP = 5000;        // Lv.100 이후 별 하나에 필요한 경험치
  // 참기 성공 경험치: 하루 첫 번째 10, 두 번째 5, 세 번째 3, 그 뒤로는 없음
  const URGE_XP = [10, 5, 3];
  // 보상 배수 단계: 종료해도 한 단계만 내려가요
  const TIER_X = [1, 1.2, 1.5, 2];
  const TIER_MS = [0, 3 * DAY, 7 * DAY, 30 * DAY];
  const ATTEND_REWARDS = [5, 5, 10, 10, 15, 15, 50];
  const PLEDGE_XP_MAX = 3;   // 다짐 개수는 제한 없어요 (경험치는 하루 3개까지)
  const GOAL_MAX = 5;
  const EXAM_LEAD_DAYS = 14;   // 시험 시작 2주 전부터 시험 기간
  const TIERS = { c: { name: '일반', xp: 10, star: '★' }, r: { name: '희귀', xp: 30, star: '★★' }, l: { name: '전설', xp: 80, star: '★★★' }, m: { name: '신화', xp: 200, star: '✦' } };
  const ACHS = [
    { id: 'e_try1', cat: '시작', tier: 'c', key: 'tries', need: 1, name: '첫 참기', desc: '참기 버튼 처음 눌러 보기' },
    { id: 'e_pl1', cat: '시작', tier: 'c', key: 'pledgesMade', need: 1, name: '첫 다짐', desc: '다짐 처음 적기' },
    { id: 'e_keep1', cat: '시작', tier: 'c', key: 'kept', need: 1, name: '약속 하나', desc: '다짐 처음 지키기' },
    { id: 'e_att1', cat: '시작', tier: 'c', key: 'attTotal', need: 1, name: '첫 출석', desc: '출석 보상 처음 받기' },
    { id: 'e_goalset', cat: '시작', tier: 'c', key: 'goalsSet', need: 1, name: '목표를 세우다', desc: '이번 달 목표 처음 정하기' },
    { id: 'e_quote1', cat: '시작', tier: 'c', key: 'quotesN', need: 1, name: '나의 문장', desc: '동기 문구 처음 추가하기' },
    { id: 'e_exam', cat: '시작', tier: 'c', key: 'examsSet', need: 1, name: '시험 대비', desc: '시험 기간 처음 등록하기' },
    { id: 'e_report', cat: '시작', tier: 'c', key: 'reportSeen', need: 1, name: '돌아보기', desc: '주간 리포트 처음 보기' },
    { id: 'lv2', cat: '시작', tier: 'c', key: 'level', need: 2, name: '레벨 2', desc: '레벨 2 달성' },
    { id: 'bc1', cat: '시작', tier: 'c', key: 'badgeCount', need: 1, name: '첫 배지', desc: '배지 처음 받기' },
    { id: 'ach3', cat: '시작', tier: 'c', key: 'achCount', need: 3, name: '업적 세 개', desc: '업적 3개 달성' },
    { id: 'e_try5', cat: '하루하루', tier: 'c', key: 'tries', need: 5, name: '다섯 번의 멈춤', desc: '참기 버튼 5번 누르기' },
    { id: 'urge3', cat: '하루하루', tier: 'c', key: 'wins', need: 3, name: '세 번의 승리', desc: '참기 3번 성공' },
    { id: 'urge5', cat: '하루하루', tier: 'c', key: 'wins', need: 5, name: '다섯 번의 승리', desc: '참기 5번 성공' },
    { id: 'e_pl10', cat: '하루하루', tier: 'c', key: 'pledgesMade', need: 10, name: '다짐 열 개', desc: '다짐 10개 적기' },
    { id: 'e_pl3day', cat: '하루하루', tier: 'c', key: 'maxDayPledges', need: 3, name: '야무진 하루', desc: '하루에 다짐 3개 적기' },
    { id: 'keep5', cat: '하루하루', tier: 'c', key: 'kept', need: 5, name: '약속 다섯', desc: '다짐 5번 지키기' },
    { id: 'keep10', cat: '하루하루', tier: 'c', key: 'kept', need: 10, name: '약속 열', desc: '다짐 10번 지키기' },
    { id: 'att3t', cat: '하루하루', tier: 'c', key: 'attTotal', need: 3, name: '세 번째 출석', desc: '출석 총 3일' },
    { id: 'att7t', cat: '하루하루', tier: 'c', key: 'attTotal', need: 7, name: '일곱 번째 출석', desc: '출석 총 7일' },
    { id: 'att2', cat: '하루하루', tier: 'c', key: 'attBest', need: 2, name: '이틀 연속', desc: '출석 2일 연속' },
    { id: 'j3n', cat: '하루하루', tier: 'c', key: 'journals', need: 3, name: '세 줄', desc: '한 줄 3개' },
    { id: 'j7n', cat: '하루하루', tier: 'c', key: 'journals', need: 7, name: '일곱 줄', desc: '한 줄 7개' },
    { id: 'j2', cat: '하루하루', tier: 'c', key: 'jBest', need: 2, name: '이틀 한 줄', desc: '한 줄 2일 연속' },
    { id: 'e_mood3', cat: '하루하루', tier: 'c', key: 'scores', need: 3, name: '여러 하루', desc: '서로 다른 별점 3가지 매겨 보기' },
    { id: 'e_mood5', cat: '하루하루', tier: 'c', key: 'scores', need: 6, name: '다채로운 하루', desc: '서로 다른 별점 6가지 매겨 보기' },
    { id: 'calm2', cat: '하루하루', tier: 'c', key: 'calmDays', need: 2, name: '고요한 이틀', desc: '고요한 날 총 2일' },
    { id: 'calmrun2', cat: '하루하루', tier: 'c', key: 'calmRun', need: 2, name: '이틀 연속 고요', desc: '고요한 날 2일 연속' },
    { id: 'ok1', cat: '하루하루', tier: 'c', key: 'okDays', need: 1, name: '지킨 하루', desc: '종료 없이 지킨 날 1일' },
    { id: 'ok3', cat: '하루하루', tier: 'c', key: 'okDays', need: 3, name: '지킨 사흘', desc: '종료 없이 지킨 날 총 3일' },
    { id: 'ok14', cat: '하루하루', tier: 'c', key: 'okDays', need: 14, name: '지킨 2주', desc: '종료 없이 지킨 날 총 14일' },
    { id: 'tot3', cat: '하루하루', tier: 'c', key: 'detoxDays', need: 3, name: '사흘 분량', desc: '디톡스 시간 총 3일' },
    { id: 'tot14', cat: '하루하루', tier: 'c', key: 'detoxDays', need: 14, name: '2주 분량', desc: '디톡스 시간 총 14일' },
    { id: 'bc5', cat: '하루하루', tier: 'c', key: 'badgeCount', need: 5, name: '배지 다섯', desc: '배지 5개 모으기' },
    { id: 'bc10', cat: '하루하루', tier: 'c', key: 'badgeCount', need: 10, name: '배지 열', desc: '배지 10개 모으기' },
    { id: 'ls3', cat: '하루하루', tier: 'c', key: 'lessons', need: 3, name: '교훈 셋', desc: '교훈 3개 적기' },
    { id: 'ach5', cat: '하루하루', tier: 'c', key: 'achCount', need: 5, name: '업적 다섯', desc: '업적 5개 달성' },
    { id: 'e_goalset3', cat: '하루하루', tier: 'c', key: 'goalsSet', need: 3, name: '계획하는 사람', desc: '이번 달 목표 3개 정하기' },
    { id: 'cb2', cat: '하루하루', tier: 'c', key: 'comebacks', need: 2, name: '두 번의 재기', desc: '재도전 목표 2번 달성' },
    { id: 'urge1', cat: '참기', tier: 'c', key: 'wins', need: 1, name: '첫 승리', desc: '참기 첫 성공' },
    { id: 'urge10', cat: '참기', tier: 'c', key: 'wins', need: 10, name: '버티는 손', desc: '참기 10번 성공' },
    { id: 'urge30', cat: '참기', tier: 'r', key: 'wins', need: 30, name: '단단한 손', desc: '참기 30번 성공' },
    { id: 'urge50', cat: '참기', tier: 'r', key: 'wins', need: 50, name: '충동 사냥꾼', desc: '참기 50번 성공' },
    { id: 'urge100', cat: '참기', tier: 'l', key: 'wins', need: 100, name: '백전백승', desc: '참기 100번 성공' },
    { id: 'urge300', cat: '참기', tier: 'm', key: 'wins', need: 300, name: '충동의 지배자', desc: '참기 300번 성공' },
    { id: 'risk1', cat: '참기', tier: 'c', key: 'riskWins', need: 1, name: '위기 탈출', desc: '위험 시간대에 참기 성공' },
    { id: 'risk5', cat: '참기', tier: 'r', key: 'riskWins', need: 5, name: '위기의 순간', desc: '위험 시간대에 참기 5번 성공' },
    { id: 'risk20', cat: '참기', tier: 'l', key: 'riskWins', need: 20, name: '위기 전문가', desc: '위험 시간대에 참기 20번 성공' },
    { id: 'calm1', cat: '고요', tier: 'c', key: 'calmDays', need: 1, name: '고요한 하루', desc: '종료도 충동도 없는 하루' },
    { id: 'calm3', cat: '고요', tier: 'c', key: 'calmDays', need: 3, name: '잔잔한 물결', desc: '고요한 날 총 3일' },
    { id: 'calmrun3', cat: '고요', tier: 'c', key: 'calmRun', need: 3, name: '고요한 사흘', desc: '고요한 날 3일 연속' },
    { id: 'calm10', cat: '고요', tier: 'r', key: 'calmDays', need: 10, name: '고요한 열흘', desc: '고요한 날 총 10일' },
    { id: 'calm7', cat: '고요', tier: 'r', key: 'calmRun', need: 7, name: '고요한 일주일', desc: '고요한 날 7일 연속' },
    { id: 'calmrun14', cat: '고요', tier: 'r', key: 'calmRun', need: 14, name: '고요한 2주', desc: '고요한 날 14일 연속' },
    { id: 'calm30', cat: '고요', tier: 'l', key: 'calmDays', need: 30, name: '고요한 한 달', desc: '고요한 날 총 30일' },
    { id: 'calmrun30', cat: '고요', tier: 'l', key: 'calmRun', need: 30, name: '흔들림 없는 한 달', desc: '고요한 날 30일 연속' },
    { id: 'calm60', cat: '고요', tier: 'l', key: 'calmDays', need: 60, name: '깊은 고요', desc: '고요한 날 총 60일' },
    { id: 'calm100', cat: '고요', tier: 'm', key: 'calmDays', need: 100, name: '고요의 경지', desc: '고요한 날 총 100일' },
    { id: 'calm200', cat: '고요', tier: 'm', key: 'calmDays', need: 200, name: '잔잔한 바다', desc: '고요한 날 총 200일' },
    { id: 'calm365', cat: '고요', tier: 'm', key: 'calmDays', need: 300, name: '고요한 300일', desc: '고요한 날 총 300일' },
    { id: 'halve', cat: '고요', tier: 'r', key: 'halved', need: 1, name: '충동 반으로', desc: '최근 7일 충동이 4주 전의 절반 이하' },
    { id: 'tot1', cat: '누적', tier: 'c', key: 'detoxDays', need: 1, name: '첫 하루', desc: '디톡스 시간 총 1일' },
    { id: 'tot7', cat: '누적', tier: 'c', key: 'detoxDays', need: 7, name: '첫 일주일', desc: '디톡스 시간 총 7일' },
    { id: 'tot30', cat: '누적', tier: 'r', key: 'detoxDays', need: 30, name: '한 달 분량', desc: '디톡스 시간 총 30일' },
    { id: 'tot100', cat: '누적', tier: 'l', key: 'detoxDays', need: 100, name: '백 일 분량', desc: '디톡스 시간 총 100일' },
    { id: 'tot365', cat: '누적', tier: 'm', key: 'detoxDays', need: 300, name: '300일 분량', desc: '디톡스 시간 총 300일' },
    { id: 'tot1000', cat: '누적', tier: 'm', key: 'detoxDays', need: 200, name: '200일 분량', desc: '디톡스 시간 총 200일' },
    { id: 'ok7', cat: '누적', tier: 'c', key: 'okDays', need: 7, name: '지킨 날 7일', desc: '종료 없이 지킨 날 총 7일' },
    { id: 'ok30', cat: '누적', tier: 'r', key: 'okDays', need: 30, name: '지킨 날 30일', desc: '종료 없이 지킨 날 총 30일' },
    { id: 'ok100', cat: '누적', tier: 'l', key: 'okDays', need: 100, name: '지킨 날 100일', desc: '종료 없이 지킨 날 총 100일' },
    { id: 'ok365', cat: '누적', tier: 'm', key: 'okDays', need: 300, name: '지킨 날 300일', desc: '종료 없이 지킨 날 총 300일' },
    { id: 'pw1', cat: '누적', tier: 'r', key: 'perfectWeeks', need: 1, name: '완벽한 한 주', desc: '월~일 한 주를 종료 없이 지키기' },
    { id: 'pw4', cat: '누적', tier: 'l', key: 'perfectWeeks', need: 4, name: '완벽한 네 주', desc: '완벽한 한 주 4번' },
    { id: 'pw12', cat: '누적', tier: 'l', key: 'perfectWeeks', need: 12, name: '완벽한 한 분기', desc: '완벽한 한 주 12번' },
    { id: 'pw52', cat: '누적', tier: 'm', key: 'perfectWeeks', need: 40, name: '완벽한 40주', desc: '완벽한 한 주 40번' },
    { id: 'bc3', cat: '배지', tier: 'c', key: 'badgeCount', need: 3, name: '배지 수집 시작', desc: '배지 3개 모으기' },
    { id: 'bc8', cat: '배지', tier: 'r', key: 'badgeCount', need: 8, name: '배지 수집가', desc: '배지 8개 모으기' },
    { id: 'bc13', cat: '배지', tier: 'r', key: 'badgeCount', need: 13, name: '배지 진열장', desc: '배지 13개 모으기' },
    { id: 'bc18', cat: '배지', tier: 'l', key: 'badgeCount', need: 18, name: '배지 박물관', desc: '배지 18개 모으기' },
    { id: 'bc24', cat: '배지', tier: 'l', key: 'badgeCount', need: 24, name: '배지 전당', desc: '배지 24개 모으기' },
    { id: 'bcall', cat: '배지', tier: 'm', key: 'badgeCount', need: 0, name: '모든 배지', desc: '배지 전부 모으기' },
    { id: 'j1', cat: '기록', tier: 'c', key: 'journals', need: 1, name: '첫 줄', desc: '오늘 한 줄 처음 쓰기' },
    { id: 'j3', cat: '기록', tier: 'c', key: 'jBest', need: 3, name: '사흘 한 줄', desc: '한 줄 3일 연속' },
    { id: 'j7', cat: '기록', tier: 'c', key: 'jBest', need: 7, name: '일주일 한 줄', desc: '한 줄 7일 연속' },
    { id: 'j30n', cat: '기록', tier: 'r', key: 'journals', need: 30, name: '서른 줄', desc: '한 줄 30개' },
    { id: 'j14', cat: '기록', tier: 'r', key: 'jBest', need: 14, name: '2주 한 줄', desc: '한 줄 14일 연속' },
    { id: 'j30', cat: '기록', tier: 'r', key: 'jBest', need: 30, name: '한 달 한 줄', desc: '한 줄 30일 연속' },
    { id: 'j60', cat: '기록', tier: 'l', key: 'jBest', need: 60, name: '두 달 한 줄', desc: '한 줄 60일 연속' },
    { id: 'j100', cat: '기록', tier: 'l', key: 'journals', need: 100, name: '기록하는 사람', desc: '한 줄 100개' },
    { id: 'j100run', cat: '기록', tier: 'l', key: 'jBest', need: 100, name: '백 일 한 줄', desc: '한 줄 100일 연속' },
    { id: 'j365', cat: '기록', tier: 'm', key: 'journals', need: 300, name: '300일의 기록', desc: '한 줄 300개' },
    { id: 'sit10', cat: '기록', tier: 'c', key: 'sitResets', need: 10, name: '나를 아는 중', desc: '상황까지 고른 종료 기록 10번' },
    { id: 'ls1', cat: '기록', tier: 'c', key: 'lessons', need: 1, name: '첫 교훈', desc: '교훈 1개 적기' },
    { id: 'ls10', cat: '기록', tier: 'r', key: 'lessons', need: 10, name: '교훈 노트', desc: '교훈 10개 적기' },
    { id: 'ls50', cat: '기록', tier: 'l', key: 'lessons', need: 50, name: '교훈 사전', desc: '교훈 50개 적기' },
    { id: 'cb1', cat: '회복', tier: 'c', key: 'comebacks', need: 1, name: '다시 일어서기', desc: '재도전 목표 첫 달성' },
    { id: 'cb3', cat: '회복', tier: 'c', key: 'comebacks', need: 3, name: '세 번의 재기', desc: '재도전 목표 3번 달성' },
    { id: 'cb5', cat: '회복', tier: 'r', key: 'comebacks', need: 5, name: '오뚝이', desc: '재도전 목표 5번 달성' },
    { id: 'cb10', cat: '회복', tier: 'r', key: 'comebacks', need: 10, name: '꺾이지 않는 마음', desc: '재도전 목표 10번 달성' },
    { id: 'cb15', cat: '회복', tier: 'l', key: 'comebacks', need: 15, name: '절대 포기 안 함', desc: '재도전 목표 15번 달성' },
    { id: 'cb30', cat: '회복', tier: 'm', key: 'comebacks', need: 20, name: '불사조', desc: '재도전 목표 20번 달성' },
    { id: 'rec1', cat: '회복', tier: 'c', key: 'recordBreaks', need: 1, name: '첫 신기록', desc: '최장 기록 처음 갈아치우기' },
    { id: 'rec3', cat: '회복', tier: 'r', key: 'recordBreaks', need: 3, name: '기록 경신', desc: '최장 기록을 3번 갈아치우기' },
    { id: 'rec5', cat: '회복', tier: 'l', key: 'recordBreaks', need: 5, name: '기록 제조기', desc: '최장 기록을 5번 갈아치우기' },
    { id: 'rec10', cat: '회복', tier: 'm', key: 'recordBreaks', need: 10, name: '한계 돌파', desc: '최장 기록을 10번 갈아치우기' },
    { id: 'goal1', cat: '목표', tier: 'c', key: 'goalsDone', need: 1, name: '목표 달성', desc: '이번 달 목표 첫 달성' },
    { id: 'goal3', cat: '목표', tier: 'r', key: 'goalsDone', need: 3, name: '목표 수집가', desc: '월 목표 3개 달성' },
    { id: 'goal5', cat: '목표', tier: 'r', key: 'goalsDone', need: 5, name: '목표 사냥꾼', desc: '월 목표 5개 달성' },
    { id: 'goal10', cat: '목표', tier: 'l', key: 'goalsDone', need: 10, name: '목표 장인', desc: '월 목표 10개 달성' },
    { id: 'goal20', cat: '목표', tier: 'l', key: 'goalsDone', need: 20, name: '목표의 달인', desc: '월 목표 20개 달성' },
    { id: 'goal50', cat: '목표', tier: 'm', key: 'goalsDone', need: 40, name: '목표의 전설', desc: '월 목표 40개 달성' },
    { id: 'goalAll', cat: '목표', tier: 'r', key: 'goalAllMonths', need: 1, name: '올클리어', desc: '한 달 목표 3개 이상을 모두 달성' },
    { id: 'goalAll3', cat: '목표', tier: 'l', key: 'goalAllMonths', need: 3, name: '세 번의 올클리어', desc: '올클리어 3번' },
    { id: 'goalAll12', cat: '목표', tier: 'm', key: 'goalAllMonths', need: 10, name: '올클리어 10번', desc: '올클리어 10번' },
    { id: 'goalrun3', cat: '목표', tier: 'l', key: 'goalRun', need: 3, name: '세 달 연속', desc: '3달 연속으로 월 목표 달성' },
    { id: 'goalrun6', cat: '목표', tier: 'l', key: 'goalRun', need: 6, name: '반년 연속', desc: '6달 연속으로 월 목표 달성' },
    { id: 'goalrun12', cat: '목표', tier: 'm', key: 'goalRun', need: 10, name: '열 달 연속', desc: '10달 연속으로 월 목표 달성' },
    { id: 'keep3', cat: '다짐', tier: 'c', key: 'kept', need: 3, name: '첫 약속들', desc: '다짐 3번 지키기' },
    { id: 'keep7', cat: '다짐', tier: 'c', key: 'kept', need: 7, name: '약속 지키기', desc: '다짐 7번 지키기' },
    { id: 'keep30', cat: '다짐', tier: 'r', key: 'kept', need: 30, name: '말한 대로', desc: '다짐 30번 지키기' },
    { id: 'keep50', cat: '다짐', tier: 'r', key: 'kept', need: 50, name: '약속 쉰 번', desc: '다짐 50번 지키기' },
    { id: 'keep100', cat: '다짐', tier: 'l', key: 'kept', need: 100, name: '약속의 사람', desc: '다짐 100번 지키기' },
    { id: 'keep200', cat: '다짐', tier: 'l', key: 'kept', need: 200, name: '믿음직한 사람', desc: '다짐 200번 지키기' },
    { id: 'keep500', cat: '다짐', tier: 'm', key: 'kept', need: 500, name: '약속의 전설', desc: '다짐 500번 지키기' },
    { id: 'keepDay3', cat: '다짐', tier: 'r', key: 'allKeptDays', need: 1, name: '완벽한 하루', desc: '하루 다짐 3개 이상을 모두 지키기' },
    { id: 'keepDay10', cat: '다짐', tier: 'l', key: 'allKeptDays', need: 10, name: '완벽한 열흘', desc: '완벽한 하루 10번' },
    { id: 'keepDay30', cat: '다짐', tier: 'm', key: 'allKeptDays', need: 30, name: '완벽한 한 달', desc: '완벽한 하루 30번' },
    { id: 'f1', cat: '친구', tier: 'c', key: 'friends', need: 1, name: '함께라면', desc: '첫 친구 추가' },
    { id: 'f3', cat: '친구', tier: 'r', key: 'friends', need: 3, name: '디톡스 크루', desc: '친구 3명' },
    { id: 'f5', cat: '친구', tier: 'l', key: 'friends', need: 5, name: '디톡스 동아리', desc: '친구 5명' },
    { id: 'f10', cat: '친구', tier: 'l', key: 'friends', need: 10, name: '디톡스 리그', desc: '친구 10명' },
    { id: 'top1', cat: '친구', tier: 'r', key: 'top1', need: 1, name: '1등', desc: '이번 주 지킨 날 친구 순위 1등' },
    { id: 'att3', cat: '꾸준함', tier: 'c', key: 'attBest', need: 3, name: '사흘 출석', desc: '출석 3일 연속' },
    { id: 'att7', cat: '꾸준함', tier: 'c', key: 'attBest', need: 7, name: '개근', desc: '출석 7일 연속' },
    { id: 'att14', cat: '꾸준함', tier: 'r', key: 'attBest', need: 14, name: '2주 개근', desc: '출석 14일 연속' },
    { id: 'att30', cat: '꾸준함', tier: 'r', key: 'attBest', need: 30, name: '한 달 개근', desc: '출석 30일 연속' },
    { id: 'att100run', cat: '꾸준함', tier: 'l', key: 'attBest', need: 100, name: '백 일 개근', desc: '출석 100일 연속' },
    { id: 'att365run', cat: '꾸준함', tier: 'm', key: 'attBest', need: 300, name: '300일 개근', desc: '출석 300일 연속' },
    { id: 'att30t', cat: '꾸준함', tier: 'c', key: 'attTotal', need: 30, name: '출석 30일', desc: '출석 총 30일' },
    { id: 'att100', cat: '꾸준함', tier: 'l', key: 'attTotal', need: 100, name: '백 일', desc: '출석 총 100일' },
    { id: 'att200', cat: '꾸준함', tier: 'l', key: 'attTotal', need: 200, name: '이백 일', desc: '출석 총 200일' },
    { id: 'att365', cat: '꾸준함', tier: 'm', key: 'attTotal', need: 300, name: '출석 300일', desc: '출석 총 300일' },
    { id: 'lv3', cat: '레벨', tier: 'c', key: 'level', need: 3, name: '레벨 3', desc: '레벨 3 달성' },
    { id: 'lv4', cat: '레벨', tier: 'c', key: 'level', need: 4, name: '레벨 4', desc: '레벨 4 달성' },
    { id: 'lv5', cat: '레벨', tier: 'c', key: 'level', need: 5, name: '레벨 5', desc: '레벨 5 달성' },
    { id: 'lv7', cat: '레벨', tier: 'c', key: 'level', need: 7, name: '레벨 7', desc: '레벨 7 달성' },
    { id: 'lv10', cat: '레벨', tier: 'c', key: 'level', need: 10, name: '레벨 10', desc: '레벨 10 달성' },
    { id: 'lv15', cat: '레벨', tier: 'c', key: 'level', need: 15, name: '레벨 15', desc: '레벨 15 달성' },
    { id: 'lv20', cat: '레벨', tier: 'c', key: 'level', need: 20, name: '레벨 20', desc: '레벨 20 달성' },
    { id: 'lv25', cat: '레벨', tier: 'r', key: 'level', need: 25, name: '레벨 25', desc: '레벨 25 달성' },
    { id: 'lv30', cat: '레벨', tier: 'r', key: 'level', need: 30, name: '레벨 30', desc: '레벨 30 달성' },
    { id: 'lv40', cat: '레벨', tier: 'r', key: 'level', need: 40, name: '레벨 40', desc: '레벨 40 달성' },
    { id: 'lv50', cat: '레벨', tier: 'l', key: 'level', need: 50, name: '레벨 50', desc: '레벨 50 달성' },
    { id: 'lv60', cat: '레벨', tier: 'l', key: 'level', need: 60, name: '레벨 60', desc: '레벨 60 달성' },
    { id: 'lv70', cat: '레벨', tier: 'l', key: 'level', need: 70, name: '레벨 70', desc: '레벨 70 달성' },
    { id: 'lv75', cat: '레벨', tier: 'l', key: 'level', need: 75, name: '레벨 75', desc: '레벨 75 달성' },
    { id: 'lv80', cat: '레벨', tier: 'l', key: 'level', need: 80, name: '레벨 80', desc: '레벨 80 달성' },
    { id: 'lv90', cat: '레벨', tier: 'l', key: 'level', need: 90, name: '레벨 90', desc: '레벨 90 달성' },
    { id: 'lv100', cat: '레벨', tier: 'm', key: 'level', need: 100, name: '만렙', desc: '레벨 100 달성' },
    { id: 'star1', cat: '레벨', tier: 'l', key: 'stars', need: 1, name: '첫 번째 별', desc: '만렙 이후 ★ 1개 모으기' },
    { id: 'star3', cat: '레벨', tier: 'm', key: 'stars', need: 3, name: '별 세 개', desc: '만렙 이후 ★ 3개 모으기' },
    { id: 'star5', cat: '레벨', tier: 'm', key: 'stars', need: 4, name: '별자리', desc: '만렙 이후 ★ 4개 모으기' },
    { id: 'star10', cat: '레벨', tier: 'm', key: 'stars', need: 5, name: '은하수', desc: '만렙 이후 ★ 5개 모으기' },
    { id: 'exam1', cat: '시험', tier: 'l', key: 'examClean', need: 1, name: '시험 기간 완주', desc: '시험 기간을 종료 없이 버티기' },
    { id: 'exam3', cat: '시험', tier: 'l', key: 'examClean', need: 2, name: '시험의 달인', desc: '시험 기간 2번을 종료 없이 버티기' },
    { id: 'exam6', cat: '시험', tier: 'm', key: 'examClean', need: 3, name: '시험 정복자', desc: '시험 기간 3번을 종료 없이 버티기' },
    { id: 'fc1', cat: '집중', tier: 'c', key: 'focusDone', need: 1, name: '첫 집중', desc: '집중 타이머 처음 끝까지 하기' },
    { id: 'fc10', cat: '집중', tier: 'c', key: 'focusDone', need: 10, name: '집중 열 번', desc: '집중 10번 끝까지 하기' },
    { id: 'fh10', cat: '집중', tier: 'c', key: 'studyH', need: 10, name: '공부 10시간', desc: '집중 시간 총 10시간' },
    { id: 'fh50', cat: '집중', tier: 'r', key: 'studyH', need: 50, name: '공부 50시간', desc: '집중 시간 총 50시간' },
    { id: 'fh100', cat: '집중', tier: 'l', key: 'studyH', need: 100, name: '공부 100시간', desc: '집중 시간 총 100시간' },
    { id: 'fh300', cat: '집중', tier: 'm', key: 'studyH', need: 300, name: '공부 300시간', desc: '집중 시간 총 300시간' },
    { id: 'fday4', cat: '집중', tier: 'r', key: 'focusDayMax', need: 4, name: '네 세트', desc: '하루에 25분 이상 집중 4번' },
    { id: 'frun7', cat: '집중', tier: 'r', key: 'focusRun', need: 7, name: '일주일 공부', desc: '7일 연속 집중 끝까지 하기' },
    { id: 'frun30', cat: '집중', tier: 'l', key: 'focusRun', need: 30, name: '한 달 공부', desc: '30일 연속 집중 끝까지 하기' },
    { id: 'fexam10', cat: '집중', tier: 'r', key: 'examStudyH', need: 10, name: '시험 기간 10시간', desc: '한 시험 기간에 집중 10시간' },
    { id: 'gwhy', cat: '성장', tier: 'c', key: 'whys', need: 1, name: '나의 이유', desc: '내가 시작한 이유 적기' },
    { id: 'grv1', cat: '성장', tier: 'c', key: 'endReviews', need: 1, name: '다시 보기', desc: '무너진 날 처음 돌아보기' },
    { id: 'grv10', cat: '성장', tier: 'r', key: 'endReviews', need: 10, name: '넘어진 자리에서', desc: '무너진 날 10번 돌아보기' },
    { id: 'gwr1', cat: '성장', tier: 'c', key: 'weekReviews', need: 1, name: '첫 주간 회고', desc: '주간 회고 처음 쓰기' },
    { id: 'gwrr4', cat: '성장', tier: 'r', key: 'weekRun', need: 4, name: '한 달 내내 회고', desc: '주간 회고 4주 연속' },
    { id: 'gwr12', cat: '성장', tier: 'r', key: 'weekReviews', need: 12, name: '회고 열두 번', desc: '주간 회고 12번' },
    { id: 'gwr40', cat: '성장', tier: 'l', key: 'weekReviews', need: 40, name: '돌아보는 사람', desc: '주간 회고 40번' },
    { id: 'gone10', cat: '성장', tier: 'r', key: 'oneKept', need: 10, name: '한 가지씩', desc: '이번 주 한 가지 10번 지키기' },
    { id: 'gmr1', cat: '성장', tier: 'c', key: 'monthReviews', need: 1, name: '첫 월간 회고', desc: '월간 회고 처음 쓰기' },
    { id: 'gmr6', cat: '성장', tier: 'l', key: 'monthReviews', need: 6, name: '반년의 회고', desc: '월간 회고 6번' },
    { id: 'gex1', cat: '성장', tier: 'r', key: 'examReviews', need: 1, name: '시험 돌아보기', desc: '시험 회고 처음 쓰기' },
    { id: 'gxp1', cat: '성장', tier: 'c', key: 'exps', need: 1, name: '첫 실험', desc: '실험 하나 끝내기' },
    { id: 'gxp5', cat: '성장', tier: 'r', key: 'exps', need: 5, name: '실험가', desc: '실험 5개 끝내기' },
    { id: 'gfit3', cat: '성장', tier: 'l', key: 'fits', need: 3, name: '나만의 방법', desc: '나에게 맞는 방법 3개 찾기' },
    { id: 'glr10', cat: '성장', tier: 'c', key: 'lessonRv', need: 10, name: '되새기기', desc: '교훈 다시 보기 10번' },
    { id: 'glearn5', cat: '성장', tier: 'r', key: 'learned', need: 5, name: '몸에 밴 교훈', desc: '익힌 교훈 5개' },
    { id: 'glearn20', cat: '성장', tier: 'l', key: 'learned', need: 20, name: '교훈이 습관으로', desc: '익힌 교훈 20개' },
    { id: 'glt1', cat: '성장', tier: 'c', key: 'lettersWritten', need: 1, name: '미래로 보낸 편지', desc: '미래의 나에게 편지 쓰기' },
    { id: 'glo1', cat: '성장', tier: 'r', key: 'lettersOpened', need: 1, name: '과거에서 온 편지', desc: '편지 처음 받기' },
    { id: 'glo5', cat: '성장', tier: 'l', key: 'lettersOpened', need: 5, name: '시간을 건넌 편지', desc: '편지 5통 받기' },
    { id: 'gq30', cat: '성장', tier: 'r', key: 'qAnswered', need: 30, name: '질문 수집가', desc: '서로 다른 질문 30개에 답하기' },
    { id: 'ach10', cat: '업적', tier: 'r', key: 'achCount', need: 10, name: '업적 열 개', desc: '업적 10개 달성' },
    { id: 'ach30', cat: '업적', tier: 'l', key: 'achCount', need: 30, name: '업적 사냥꾼', desc: '업적 30개 달성' },
    { id: 'ach60', cat: '업적', tier: 'l', key: 'achCount', need: 60, name: '업적 수집가', desc: '업적 60개 달성' },
    { id: 'ach100', cat: '업적', tier: 'm', key: 'achCount', need: 100, name: '업적의 전설', desc: '업적 100개 달성' },
  ];
  ACHS.forEach((a) => { if (a.id === 'bcall') a.need = MILESTONES.length; });
  const SITUATIONS = ['심심함', '피곤함', '스트레스', '혼자 있음', '잠들기 전', '할 일 미루는 중'];
  const GOAL_TYPES = {
    // min: 한 달 전체 기준 최소값 (늦게 정하면 남은 날만큼 줄어요), cap: 종료 횟수의 최대 허용값
    resets_max: { name: '종료 횟수', short: '종료', unit: '번 이하', def: 3, cap: 10, max: true },
    okdays_min: { name: '지킨 날', short: '종료 없이 지킨 날', unit: '일 이상', def: 20, min: 10 },
    streak_min: { name: '연속 버티기', short: '한 번에 버티기', unit: '일 이상', def: 7, min: 3 },
    calm_min: { name: '고요한 날', short: '고요한 날', unit: '일 이상', def: 10, min: 5 },
    wins_min: { name: '참기 성공', short: '참기 성공', unit: '번 이상', def: 10, min: 5, hidden: true },
    pledge_min: { name: '다짐 지키기', short: '다짐 지키기', unit: '번 이상', def: 20, min: 10 },
    attend_min: { name: '출석', short: '출석', unit: '일 이상', def: 25, min: 15 },
    journal_min: { name: '오늘 한 줄', short: '한 줄 쓰기', unit: '일 이상', def: 15, min: 10 },
  };
  // 3레벨마다 칭호가 바뀌어요 (Lv.1~100, 칭호 34개)
  const MAX_LEVEL = 100;
  const TITLES = ['새싹', '견습 수행자', '집중 입문자', '절제 수련생', '루틴 지킴이', '도파민 사냥꾼', '몰입 장인',
    '절제의 달인', '마인드 마스터', '고요한 현자', '시간의 주인', '집중의 대가', '전설의 수도승', '깨달은 자',
    '흔들리지 않는 자', '습관 설계자', '의지의 기사', '몰입의 수호자', '고요의 기사', '절제의 영웅',
    '시간 연금술사', '집중의 장군', '마음의 등대', '불굴의 수행자', '몰입의 군주', '고요한 산',
    '도파민 정복자', '의지의 화신', '시간의 현자', '절제의 황제', '몰입의 대현자', '고요의 수호신',
    '초월한 자', '포커스필 마스터'];
  const BASE_TARGETS = ['쇼츠', '게임', '웹툰', 'SNS'];
  const MALE_TARGETS = ['야동', '딸'];
  const DEFAULT_ACTIVITIES = [
    '물 한 잔 마시기', '1분 스트레칭', '문제 하나 풀기', '창밖 보며 심호흡 10번', '책상 정리하기',
    '팔굽혀펴기 10개', '내일 할 일 3개 적기', '친구한테 말 걸기', '세수하고 오기', '좋아하는 노래 한 곡 듣기',
  ];
  const FALLBACK_QUOTE = ['천 리 길도 발밑에서 시작된다.', '노자'];
  const MOOD_SCORE = { '😀': 5, '🙂': 4, '😐': 3, '😕': 2, '😣': 1 };   // 예전 기분 → 별점
  const BUCKETS = [
    { label: '새벽', from: 0, to: 6 }, { label: '오전', from: 6, to: 12 },
    { label: '오후', from: 12, to: 18 }, { label: '저녁·밤', from: 18, to: 24 },
  ];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  // 오늘 한 줄 질문: 다섯 갈래 × 18개, 매일 바뀌어요
  const QUESTIONS = [
    ["오늘 고마웠던 사람은 누구인가요?", "오늘 작지만 좋았던 순간은?", "오늘 나를 웃게 한 건?", "오늘 당연하지 않게 느껴진 건?", "오늘 먹은 것 중 가장 맛있었던 건?", "오늘 들은 말 중 기분 좋았던 말은?", "오늘 도움받은 일이 있었나요?", "지금 내 곁에 있어서 다행인 건?", "오늘 날씨나 풍경에서 좋았던 건?", "오늘 내 몸이 잘해 준 일은?", "오늘 배운 것 중 고마운 건?", "요즘 고마운데 말 못 한 사람은?", "오늘 편안했던 시간은 언제였나요?", "오늘 나에게 힘이 된 물건은?", "오늘 친구와 나눈 즐거운 이야기는?", "오늘 가장 따뜻했던 장면은?", "오늘 무사히 지나가서 다행인 일은?", "오늘 하루에 고맙다고 한마디 한다면?"],
    ["오늘 나를 칭찬한다면?", "오늘 미루지 않고 해낸 일은?", "오늘 참아 낸 순간이 있었나요?", "오늘 어제보다 나아진 점은?", "오늘 끝까지 해낸 일은?", "오늘 가장 집중했던 때는?", "오늘 나와의 약속을 지켰나요?", "오늘 용기를 낸 순간은?", "오늘 누군가에게 도움이 된 일은?", "오늘 새로 시도해 본 것은?", "오늘 가장 뿌듯했던 순간은?", "오늘 잘 쉰 순간은?", "오늘 포기하지 않은 것은?", "오늘 시간을 가장 잘 쓴 때는?", "오늘 나다웠던 순간은?", "오늘 실수했지만 잘 넘긴 일은?", "오늘 공부 중 가장 잘된 것은?", "오늘 지킨 작은 습관은?"],
    ["오늘 폰 대신 한 일은?", "심심할 때 무엇을 했나요?", "오늘 남는 시간에 뭘 했나요?", "충동이 왔을 때 어떻게 넘겼나요?", "오늘 화면 없이 보낸 시간은?", "오늘 몸을 움직인 시간은?", "오늘 얼굴 보고 나눈 대화는?", "오늘 손으로 해 본 일은?", "오늘 읽은 것 중 기억나는 건?", "오늘 가장 오래 몰입한 일은?", "쉬는 시간에 무엇을 했나요?", "잠들기 전 무엇을 했나요?", "오늘 밖에서 본 것 중 기억나는 건?", "오늘 새로 알게 된 것은?", "오늘 정리하거나 치운 것은?", "오늘 들은 소리 중 좋았던 건?", "영상 대신 해 보니 괜찮았던 건?", "오늘 가장 조용했던 시간은?"],
    ["내일 꼭 하고 싶은 한 가지는?", "내일의 나에게 한마디 한다면?", "내일 조심해야 할 순간은?", "내일 아침 가장 먼저 할 일은?", "내일은 무엇을 덜 하고 싶나요?", "내일 기대되는 일은?", "내일 누구에게 말을 걸어 볼까요?", "내일 공부할 것 중 가장 중요한 건?", "내일 위험한 시간에 무엇을 할까요?", "내일 몇 시에 자고 싶나요?", "내일을 위해 준비해 둘 것은?", "내일 하루를 한 단어로 정한다면?", "내일 미루지 않을 일 하나는?", "내일은 어떤 마음으로 시작할까요?", "내일 해 볼 작은 변화는?", "내일 나에게 줄 작은 보상은?", "내일 피하고 싶은 상황은?", "내일 밤 어떤 기분이면 좋겠나요?"],
    ["요즘 가장 많이 하는 생각은?", "요즘 나를 힘들게 하는 건?", "요즘 가장 바라는 건?", "요즘 나에게 가장 중요한 사람은?", "요즘 꾸준히 하고 있는 건?", "요즘 고치고 싶은 습관은?", "요즘 나를 가장 신나게 하는 건?", "요즘 내가 달라진 점은?", "요즘 가장 궁금한 건?", "요즘 마음이 편해지는 곳은?", "요즘 나에게 필요한 말은?", "요즘 가장 아끼는 시간은?", "요즘 배우고 싶은 건?", "요즘 나를 지치게 하는 건?", "1년 뒤의 나는 어떤 모습이면 좋겠나요?", "요즘 나를 버티게 하는 건?", "요즘 가장 자주 듣는 노래는?", "디톡스를 하며 느낀 변화는?"],
  ];
  const ICON = {
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
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
  function eul(word) {
    const c = String(word).trim().slice(-1).charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return word + ((c - 0xAC00) % 28 ? '을' : '를');
    return word + '을(를)';
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
  // 레벨이 오를수록 필요한 경험치가 더 가파르게 늘어요
  // Lv.100 = 23,000 XP (가볍게 써도 300일 안에 도달하도록 맞춘 곡선)
  const xpForLevel = (lv) => Math.round(36.97 * Math.pow(Math.max(0, lv - 1), 1.4));
  const starsOf = (xp) => Math.max(0, Math.floor(((xp || 0) - xpForLevel(MAX_LEVEL)) / STAR_XP));
  function levelOf(xp) { let lv = 1; while (lv < MAX_LEVEL && xpForLevel(lv + 1) <= xp) lv++; return lv; }
  const titleOf = (lv) => TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 3))];

  /* ====================== 저장소 ====================== */
  const cfg = window.FIREBASE_CONFIG || {};
  const useFirebase = !!(cfg.apiKey && !String(cfg.apiKey).startsWith('YOUR'));
  function authError(code) { const e = new Error(code); e.code = code; return e; }

  // Firestore의 set(merge)처럼 안쪽 객체까지 합쳐요 (배열은 통째로 바뀌어요)
  const isPlain = (o) => o && typeof o === 'object' && !Array.isArray(o);
  function deepMerge(a, b) {
    const out = isPlain(a) ? { ...a } : {};
    Object.keys(b || {}).forEach((k) => { out[k] = isPlain(b[k]) && isPlain(out[k]) ? deepMerge(out[k], b[k]) : b[k]; });
    return out;
  }
  const jclone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

  /* ---------- 동기화 규칙 (v1.7.8) ----------
     내 문서(focusfill_users/{uid})는 '칸' 단위로 저장해요. 칸마다 마지막으로 저장한 시각(_t)을 남겨 두고,
     내가 보고 있던 값이 그사이 다른 기기에서 바뀌었으면 그 저장은 버려요 → 오래된 화면·늦게 보낸 저장이 새 기록을 지우지 않아요.
     경험치는 '지금 값'이 아니라 '얼마나 더할지'로 보내서, 어떤 순서로 저장돼도 줄어들지 않아요.
     저장마다 이름표(_ops)를 남겨서 같은 저장이 두 번 들어가지 않아요. */
  const UNIT_DEPTH = { daily: 3, badges: 2, achievements: 2, monthGoals: 2, weekReviews: 2, monthReviews: 2, examReviews: 2 };
  const SYS_KEYS = ['_t', '_w', '_ops', '_ep', 'xp'];
  const DEL = { __del: true };
  const isUserDocPath = (p) => /^focusfill_users\/[^/]+$/.test(p);
  const isNumber = (v) => typeof v === 'number' && isFinite(v);
  function unitsOf(data) {
    const out = [];
    const walk = (path, v, depth) => {
      if (depth > 1 && isPlain(v)) { Object.keys(v).forEach((k) => walk([...path, k], v[k], depth - 1)); return; }
      out.push({ path, key: path.join('|'), v });
    };
    Object.keys(data || {}).forEach((k) => { if (!SYS_KEYS.includes(k)) walk([k], data[k], UNIT_DEPTH[k] || 1); });
    return out;
  }
  function getIn(o, path) { let x = o; for (const k of path) { if (!isPlain(x)) return undefined; x = x[k]; } return x; }
  function setIn(o, path, v) {
    let x = o;
    for (let i = 0; i < path.length - 1; i++) { if (!isPlain(x[path[i]])) x[path[i]] = {}; x = x[path[i]]; }
    const last = path[path.length - 1];
    if (v === DEL) delete x[last]; else x[last] = jclone(v);
  }
  // 목록처럼 여러 항목이 모인 칸은, 두 기기가 같은 칸을 바꿨으면 버리지 않고 '내가 바꾼 부분'만 서버 값에 합쳐요
  const MERGE_RULES = [
    [/^daily\|[^|]+\|pledges$/, 'ids'], [/^daily\|[^|]+\|pledgeXpCount$/, 'count'], [/^monthGoals\|[^|]+$/, 'ids'],
    [/^(experiments|letters|exams)$/, 'ids'], [/^(whys|quotes|activities|targets|subjects)$/, 'strs'], [/^lessons$/, 'lessons'],
  ];
  const mergeKind = (key) => (MERGE_RULES.find(([re]) => re.test(key)) || [])[1];
  // base: 내가 바꾸기 전 값, mine: 내가 바꾼 값, theirs: 지금 서버 값
  function merge3(kind, base, mine, theirs) {
    if (kind === 'count') return Math.max(0, (isNumber(theirs) ? theirs : 0) + (isNumber(mine) ? mine : 0) - (isNumber(base) ? base : 0));
    const B = Array.isArray(base) ? base : [], M = Array.isArray(mine) ? mine : [], T = Array.isArray(theirs) ? theirs : [];
    if (kind === 'strs') {
      const del = B.filter((x) => !M.includes(x)), add = M.filter((x) => !B.includes(x));
      const out = T.filter((x) => !del.includes(x));
      add.forEach((x) => { if (!out.includes(x)) out.push(x); });
      return out;
    }
    const idOf_ = (x) => (x && typeof x === 'object' ? x.id : undefined);
    const bm = new Map(B.filter(idOf_).map((x) => [x.id, x])), mm = new Map(M.filter(idOf_).map((x) => [x.id, x]));
    const out = [];
    T.forEach((t) => {
      const id = idOf_(t);
      if (id === undefined) { out.push(t); return; }
      if (bm.has(id) && !mm.has(id)) return;   // 내가 지운 것
      const m = mm.get(id), b = bm.get(id);
      if (m && b && stableStr(m) !== stableStr(b)) {   // 내가 바꾼 것
        out.push(kind === 'lessons' ? { ...t, ...m, name: m.name !== b.name ? m.name : t.name, items: merge3('ids', b.items, m.items, t.items) } : m);
      } else out.push(t);
    });
    M.forEach((m) => { const id = idOf_(m); if (id !== undefined && !bm.has(id) && !T.some((t) => idOf_(t) === id)) out.push(m); });
    return out;
  }
  let lastOpAt = 0;
  function newOp(k, path, data, uid, view, meta) {
    const at = Math.max(Date.now(), lastOpAt + 1);
    lastOpAt = at;
    const op = { id: 'o' + at.toString(36) + Math.random().toString(36).slice(2, 7), k, path, data: data == null ? null : jclone(data), at, u: uid };
    if (isUserDocPath(path) && k !== 'del') {
      op.ep = (view && view._ep) || '';
      if (k === 'put') op.nep = 'e' + at.toString(36) + Math.random().toString(36).slice(2, 6);
      else {
        op.bw = (view && view._w) || 0;
        const T = (view && view._t) || {};
        op.base = {}; op.bv = {};
        unitsOf(op.data).forEach((u) => {
          if (T[u.key] !== undefined) op.base[u.key] = T[u.key];
          if (mergeKind(u.key)) { const bv = getIn(view, u.path); op.bv[u.key] = bv === undefined ? null : jclone(bv); }
        });
        const m = meta || {};
        if (m.xpAdd) op.xpAdd = m.xpAdd;
        if (m.xpMin) op.xpMin = m.xpMin;
        if (Array.isArray(m.guard)) op.guard = m.guard;
      }
    }
    return op;
  }
  // 서버 문서(srv)에 저장(op)을 어떻게 넣을지 정해요. 서버·기기 모두 이 규칙 하나를 써요
  function planUserOp(srv, op) {
    const legacy = !op.id;   // v1.7.7 이전 앱이 남긴 저장: 비어 있는 칸만 채워요
    if (op.k === 'put') {
      if (srv && srv._ops && srv._ops[op.id]) return { skip: 'dup' };
      if (legacy && srv) return { skip: 'legacy' };
      const doc = jclone(op.data) || {};
      ['_t', '_w', '_ops', '_ep'].forEach((k) => { delete doc[k]; });
      Object.assign(doc, { _ep: op.nep || '', _t: {}, _w: op.at, _ops: op.id ? { [op.id]: op.at } : {} });
      return { put: doc, doc };
    }
    if (!srv) return { skip: 'nodoc' };
    if (!legacy && srv._ops && srv._ops[op.id]) return { skip: 'dup' };
    if (!legacy && (srv._ep || '') !== (op.ep || '')) return { skip: 'epoch' };
    const T = srv._t || {};
    const ok = [], bad = [];
    let soft = false;   // 합쳐서 넣은 칸이 있는지
    unitsOf(op.data).forEach((u) => {
      let conflict;
      if (legacy) conflict = getIn(srv, u.path) !== undefined;
      else {
        const s = T[u.key], b = (op.base || {})[u.key];
        conflict = s !== undefined || b !== undefined ? s !== b : (srv._w || 0) !== (op.bw || 0);
      }
      if (!conflict) { ok.push(u); return; }
      if (legacy) { bad.push(u); return; }
      const sv = getIn(srv, u.path);
      if (stableStr(sv) === stableStr(u.v)) { soft = true; return; }   // 이미 같은 값 → 할 일 없음 (같은 보상을 두 기기가 받은 경우도)
      const kind = mergeKind(u.key);
      if (kind && op.bv && Object.prototype.hasOwnProperty.call(op.bv, u.key)) { ok.push({ ...u, v: merge3(kind, op.bv[u.key], u.v, sv), merged: true }); soft = true; return; }
      bad.push(u);
    });
    const guard = op.guard || ['*'];
    if (!legacy && bad.some((u) => guard.some((g) => g === '*' || u.key === g || u.key.startsWith(g + '|')))) return { skip: 'conflict' };
    const upd = [];
    // 합친 칸은 시각을 조금 다르게 남겨요 → 이 기기의 다음 저장도 '합쳐진 값'을 기준으로 다시 합쳐져요
    ok.forEach((u) => { upd.push([u.path, u.v]); if (!legacy) upd.push([['_t', u.key], u.merged ? op.at + 0.5 : op.at]); });
    const x0 = isNumber(srv.xp) ? srv.xp : 0;
    let x = x0;
    // 경험치는 내가 본 그대로 저장될 때만 더해요 (다른 기기와 겹친 보상을 두 번 받지 않게)
    if (!legacy && op.xpAdd && !soft && !bad.length) x = Math.max(0, x + op.xpAdd);
    if (!legacy && op.xpMin && x < op.xpMin) x = op.xpMin;
    if (x !== x0) upd.push([['xp'], x]);
    if (!upd.length) return { skip: bad.length ? 'conflict' : 'empty' };
    if (!legacy) {
      upd.push([['_w'], op.at], [['_ops', op.id], op.at]);
      const o1 = op.at - 16 * DAY, d1 = op.at - 40 * DAY, now_ = new Set(ok.map((u) => u.key));
      Object.keys(srv._ops || {}).forEach((id) => { if (!(srv._ops[id] > o1)) upd.push([['_ops', id], DEL]); });
      Object.keys(T).forEach((key) => { const mm = /^daily\|(\d{4}-\d{2}-\d{2})\|/.exec(key); if (mm && !now_.has(key) && new Date(mm[1] + 'T00:00:00').getTime() < d1) upd.push([['_t', key], DEL]); });
    }
    const doc = jclone(srv);
    upd.forEach(([p, v]) => setIn(doc, p, v));
    return { upd, doc, partial: bad.length > 0 || soft };
  }
  // 아직 서버에 안 올라간 저장을 화면용으로 미리 겹쳐요 (성공한다고 보고)
  function applyOpLocal(v, op) {
    if (op.k === 'del') return null;
    if (isUserDocPath(op.path)) {
      if (!op.id) return v;   // 예전 앱이 남긴 저장은 서버에서 확인된 뒤에 보여요
      if (v && v._ops && v._ops[op.id]) return v;   // 이미 서버에 들어간 저장
      if (op.k === 'put') return planUserOp(null, op).doc;
      if (!v) return v;
      const d = jclone(v);
      unitsOf(op.data).forEach((u) => { setIn(d, u.path, u.v); setIn(d, ['_t', u.key], op.at); });
      if (op.xpAdd) d.xp = Math.max(0, (d.xp || 0) + op.xpAdd);
      if (op.xpMin && (d.xp || 0) < op.xpMin) d.xp = op.xpMin;
      d._w = op.at;
      return d;
    }
    if (op.k === 'put') return jclone(op.data);
    return deepMerge(v || {}, op.data);
  }
  function stableStr(o) {
    if (Array.isArray(o)) return '[' + o.map(stableStr).join(',') + ']';
    if (isPlain(o)) return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stableStr(o[k])).join(',') + '}';
    return JSON.stringify(o === undefined ? null : o);
  }

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
      async set(path, data, meta) {
        if (isUserDocPath(path)) {
          const r = planUserOp(s.docs[path] || null, newOp('set', path, data, s.session, s.docs[path], meta));
          if (r.doc) { s.docs[path] = r.doc; save(); }
          return;
        }
        s.docs[path] = deepMerge(s.docs[path], clone(data)); save();
      },
      async put(path, data) {
        s.docs[path] = isUserDocPath(path) ? planUserOp(null, newOp('put', path, data, s.session, s.docs[path], null)).doc : clone(data);
        save();
      },
      async add(col, data) { const id = uid6(); s.docs[col + '/' + id] = clone(data); save(); return id; },
      async del(path) { delete s.docs[path]; save(); },
      // 다른 탭에서 바뀐 내용 받기 (테스트 모드)
      watch(path, cb) {
        const h = (e) => {
          if (e.key !== KEY || !e.newValue) return;
          try { s = JSON.parse(e.newValue); } catch (er) { return; }
          cb(s.docs[path] ? clone(s.docs[path]) : null);
        };
        addEventListener('storage', h);
        return () => removeEventListener('storage', h);
      },
      watchList(col, cb) {
        const h = (e) => {
          if (e.key !== KEY || !e.newValue) return;
          try { s = JSON.parse(e.newValue); } catch (er) { return; }
          cb(children(col));
        };
        addEventListener('storage', h);
        return () => removeEventListener('storage', h);
      },
      async list(col) { return children(col); },
      async query(col, field, value) { return children(col).filter((d) => d[field] === value); },
    };
  }

  // 정해진 시간 안에 끝나지 않으면 실패로 처리 (로딩 화면에서 영원히 멈추지 않도록)
  function withTimeout(promise, ms, label) {
    let t;
    return Promise.race([
      promise,
      new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${label} (${Math.round(ms / 1000)}초 초과)`)), ms); }),
    ]).finally(() => clearTimeout(t));
  }
  function loadScript(src) {
    return withTimeout(new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = src; el.onload = res; el.onerror = () => rej(new Error('load ' + src));
      document.head.appendChild(el);
    }), 20000, '서버 파일 불러오기');
  }
  // 아이패드·아이폰(모든 브라우저가 Safari 엔진) + 맥 Safari
  const UA = navigator.userAgent;
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  const IS_WEBKIT = IS_IOS || (/AppleWebKit/.test(UA) && !/Chrome|Chromium|Edg|Android/.test(UA));

  // IndexedDB 점검: Firebase 로그인은 IndexedDB를 쓰는데, Safari(아이패드)에서 IndexedDB가 응답하지 않으면
  // 로그인 확인이 끝나지 않아 로딩 화면에서 멈춰요. 먼저 깨워 보고(Safari 14 문제), 그래도 응답이 없으면
  // Firebase가 IndexedDB 대신 localStorage를 쓰게 해서 절대 멈추지 않게 해요.
  let idbBroken = false;
  function idbWorks(ms) {
    return new Promise((res) => {
      let fin = false;
      const done = (v) => { if (!fin) { fin = true; res(v); } };
      setTimeout(() => done(false), ms);
      try {
        const r = indexedDB.open('focusfill-ping');
        r.onsuccess = () => { try { r.result.close(); } catch (e) {} done(true); };
        r.onerror = () => done(true);       // 오류라도 응답은 했어요
        r.onblocked = () => done(true);
      } catch (e) { done(true); }
    });
  }
  async function idbReady() {
    try {
      if (!window.indexedDB) return;
      if (IS_WEBKIT && typeof indexedDB.databases === 'function') {
        let id = null;
        const wake = new Promise((res) => {
          const t = () => { try { indexedDB.databases().then(res, res); } catch (e) { res(); } };
          id = setInterval(t, 100); t();
        });
        await withTimeout(wake, 1500, 'IndexedDB').catch(() => {});
        clearInterval(id);
      }
      if (await idbWorks(4000)) return;
      idbBroken = true;
      try { Object.defineProperty(window, 'indexedDB', { configurable: true, get: () => undefined }); } catch (e) {}
    } catch (e) {}
  }

  // 기기 저장소: 서버에서 마지막으로 받은 기록(그대로)과 아직 서버에 못 올린 저장(보낼 목록)을 localStorage에 둬요.
  // 화면에는 '받은 기록 + 보낼 목록'을 겹쳐서 보여줘요 → 오프라인·느린 연결에서도 내가 마지막으로 한 그대로 열려요.
  function LocalCache() {
    const KEY = 'focusfill_cache_v1', OUT = 'focusfill_outbox_v1';
    const fresh = () => ({ docs: {}, cols: {} });
    let c = null, out = null;
    try { c = JSON.parse(localStorage.getItem(KEY)); } catch (e) { c = null; }
    if (!c || typeof c.docs !== 'object' || typeof c.cols !== 'object') c = fresh();
    try { out = JSON.parse(localStorage.getItem(OUT)); } catch (e) { out = null; }
    if (!Array.isArray(out)) out = [];
    out = out.filter((op) => op && typeof op.path === 'string' && ['set', 'put', 'del'].includes(op.k));
    let timer = null;
    const flush = () => {
      clearTimeout(timer); timer = null;
      try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { try { localStorage.removeItem(KEY); } catch (er) {} }
    };
    const later = () => { if (!timer) timer = setTimeout(flush, 400); };
    addEventListener('pagehide', () => { if (timer) flush(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) flush(); });
    const saveOut = () => { try { localStorage.setItem(OUT, JSON.stringify(out)); } catch (e) {} };
    const isChild = (p, col) => p.length > col.length + 1 && p.startsWith(col + '/') && p.indexOf('/', col.length + 1) < 0;
    return {
      getDoc(path) { return Object.prototype.hasOwnProperty.call(c.docs, path) ? jclone(c.docs[path]) : undefined; },
      putDoc(path, data) { c.docs[path] = jclone(data); later(); },
      delDoc(path) { c.docs[path] = null; later(); },
      list(col) {
        if (!c.cols[col]) return undefined;
        return Object.keys(c.docs).filter((p) => isChild(p, col) && c.docs[p]).map((p) => ({ id: p.slice(col.length + 1), ...jclone(c.docs[p]) }));
      },
      setList(col, items) {
        Object.keys(c.docs).forEach((p) => { if (isChild(p, col)) delete c.docs[p]; });
        items.forEach((x) => { const { id, ...rest } = x; c.docs[col + '/' + id] = jclone(rest); });
        c.cols[col] = 1; later();
      },
      ops: () => out,
      push(op) { out.push(op); saveOut(); },
      done(op) { const k = out.indexOf(op); if (k >= 0) { out.splice(k, 1); saveOut(); } },
      touch: saveOut,
      clearDocs() { c = fresh(); try { localStorage.removeItem(KEY); } catch (e) {} },
    };
  }

  async function FirebaseBackend() {
    const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
    await loadScript(base + 'firebase-app-compat.js');
    await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
    await idbReady();
    firebase.initializeApp(cfg);
    const auth = firebase.auth(), fs = firebase.firestore();
    // 학교·공용 와이파이처럼 실시간 연결이 막힌 곳에서도 되도록 자동으로 다른 연결 방식을 써요
    try { fs.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
    // v1.7.8: Firestore 자체 오프라인 저장(IndexedDB)은 쓰지 않아요. 그 저장소는 앱을 다시 열 때 예전에 못 보낸 저장을
    // 그대로 다시 보내서, 다른 기기에서 더 새로 바뀐 기록(경험치·레벨 등)을 덮어쓸 수 있었어요.
    // 오프라인 기록은 아래 LocalCache가 맡고, 보낼 때마다 서버의 최신 기록과 맞춰 봐요.
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    const FV = firebase.firestore.FieldValue, FP = firebase.firestore.FieldPath;
    const store = LocalCache();
    let curUid = '';
    const READ_MS = 6000;
    let slowAt = 0;   // 서버가 방금 응답하지 않았으면 잠시 동안은 기기 저장소를 바로 써요 (로딩이 길어지지 않게)
    const slowNow = () => Date.now() - slowAt < 30000;
    let fromStore = false;   // 이번에 연 기록 중 기기 저장소에서 온 게 있는지 (서버와 다시 연결되면 새로 받아요)
    const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const offline = () => navigator.onLine === false;
    const mine = () => store.ops().filter((op) => op.u === curUid);
    // 읽기: 서버에서 받고, 인터넷이 없거나 오래 걸리면 기기에 저장해 둔 기록으로.
    // 아직 서버에 못 올린 저장(보낼 목록)을 읽은 결과 위에 겹쳐요 → 화면은 항상 내가 마지막으로 한 그대로
    function overlayDoc(path, v) {
      mine().forEach((op) => { if (op.path === path) v = applyOpLocal(v, op); });
      return v;
    }
    function overlayList(col, list) {
      const map = new Map(list.map((x) => [x.id, x]));
      mine().forEach((op) => {
        if (!op.path.startsWith(col + '/')) return;
        const id = op.path.slice(col.length + 1);
        if (!id || id.indexOf('/') >= 0) return;
        const cur = map.has(id) ? (({ id: _i, ...rest }) => rest)(map.get(id)) : null;
        const nv = applyOpLocal(cur, op);
        if (nv) map.set(id, { ...nv, id }); else if (op.k === 'del') map.delete(id);
      });
      return [...map.values()];
    }
    const view = (path) => { const c = store.getDoc(path); return overlayDoc(path, c === undefined ? null : c); };
    async function readDoc(path, label, fresh) {
      return overlayDoc(path, await readDocRaw(path, label, fresh));
    }
    async function readList(col, label) {
      return overlayList(col, await readListRaw(col, label));
    }
    async function readDocRaw(path, label, fresh) {
      const cached = store.getDoc(path);
      if (fresh) {
        // 서버에서 직접 받은 진짜 문서
        const d = await withTimeout(fs.doc(path).get({ source: 'server' }), READ_MS, label);
        const v = d.exists ? d.data() : null;
        store.putDoc(path, v);
        return v;
      }
      if (offline() && cached !== undefined) { fromStore = true; return cached; }
      if (slowNow() && cached !== undefined) { fromStore = true; return cached; }
      try {
        // 기기에 받아 둔 기록이 있으면 오래 기다리지 않아요 (서버 기록은 연결되면 바로 다시 받아요)
        const d = await withTimeout(fs.doc(path).get({ source: 'server' }), cached !== undefined ? 3500 : READ_MS, label);
        const v = d.exists ? d.data() : null;
        store.putDoc(path, v);
        return v;
      } catch (e) { slowAt = Date.now(); if (cached !== undefined) { fromStore = true; return cached; } throw e; }
    }
    async function readListRaw(col, label) {
      const cached = store.list(col);
      if (offline() && cached !== undefined) { fromStore = true; return cached; }
      if (slowNow() && cached !== undefined) { fromStore = true; return cached; }
      try {
        const list = docs(await withTimeout(fs.collection(col).get({ source: 'server' }), cached !== undefined ? 3500 : READ_MS, label));
        store.setList(col, list);
        return list;
      } catch (e) { slowAt = Date.now(); if (cached !== undefined) { fromStore = true; return cached; } throw e; }
    }

    // ---------- 보내기 ----------
    // 보낼 목록을 하나씩, 순서대로 보내요. 앞의 저장이 확실히 끝나야 다음 저장을 보내요.
    const waiters = new Map();   // 저장 이름표 → 화면에서 기다리는 약속
    const watchers = {};
    const ownW = new Set();      // 이 기기가 서버에 넣은 저장의 시각
    let pumping = false, retryT = null, wait = 0;
    // 서버에서 저장이 버려지거나 합쳐졌으면 화면을 서버 기록으로 맞춰요
    function notify(path) { const cb = watchers[path]; if (cb) setTimeout(() => { const v = view(path); if (v) cb(v); }, 0); }
    async function exec(op) {
      const ref = fs.doc(op.path);
      if (isUserDocPath(op.path) && op.k !== 'del') {
        const r = await fs.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          const srv = s.exists ? s.data() : null;
          const plan = planUserOp(srv, op);
          if (plan.put) tx.set(ref, plan.put);
          else if (plan.upd) {
            const args = [];
            plan.upd.forEach(([p, v]) => { args.push(new FP(...p), v === DEL ? FV.delete() : v); });
            tx.update(ref, ...args);
          }
          return { plan, srv };
        });
        if (r.plan.doc) { store.putDoc(op.path, r.plan.doc); ownW.add(r.plan.doc._w); }
        else if (r.srv) store.putDoc(op.path, r.srv);
        if (r.plan.skip === 'conflict' || r.plan.skip === 'epoch' || r.plan.partial) notify(op.path);
        return;
      }
      // 한 줄·친구용 공개 정보: 더 나중에 저장된 게 서버에 있으면 덮어쓰지 않아요
      if (op.k !== 'del' && op.data && isNumber(op.data.updatedAt)) {
        const r = await fs.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          const srv = s.exists ? s.data() : null;
          if (srv && isNumber(srv.updatedAt) && srv.updatedAt > op.data.updatedAt) return { srv, skip: true };
          if (op.k === 'put') tx.set(ref, op.data); else tx.set(ref, op.data, { merge: true });
          return { srv, skip: false };
        });
        store.putDoc(op.path, r.skip ? r.srv : (op.k === 'put' || !r.srv ? op.data : deepMerge(r.srv, op.data)));
        return;
      }
      if (op.k === 'del') { await ref.delete(); store.delDoc(op.path); return; }
      if (op.k === 'put') { await ref.set(op.data); store.putDoc(op.path, op.data); return; }
      await ref.set(op.data, { merge: true });
      const c = store.getDoc(op.path);
      if (c) store.putDoc(op.path, deepMerge(c, op.data));
    }
    function finish(op, err) {
      store.done(op);
      const w = waiters.get(op.id);
      if (w) { waiters.delete(op.id); if (err) w.rej(err); else w.res(); }
    }
    function later() {
      clearTimeout(retryT);
      wait = Math.min(60000, wait ? wait * 2 : 2000);
      retryT = setTimeout(() => { retryT = null; pump(); }, wait);
    }
    const NET_ERR = ['unavailable', 'deadline-exceeded', 'aborted', 'resource-exhausted', 'cancelled', 'unknown', 'internal', 'unauthenticated'];
    const HARD_ERR = ['permission-denied', 'invalid-argument', 'not-found', 'out-of-range', 'unimplemented', 'data-loss'];
    async function pump() {
      if (pumping || !curUid) return;
      pumping = true;
      clearTimeout(retryT); retryT = null;
      try {
        for (;;) {
          const list = mine();
          const op = list[0];
          if (!op) { wait = 0; break; }
          if (!op.at || Date.now() - op.at > 14 * DAY) { finish(op); continue; }   // 2주 넘게 못 보낸 저장은 버려요
          // 한 줄·공개 정보처럼 통째로 바뀌는 기록: 뒤에 같은 걸 또 저장했으면 마지막 것만 보내요
          if (op.k !== 'del' && op.data && isNumber(op.data.updatedAt) && list.some((o) => o !== op && o.path === op.path && o.at > op.at)) { finish(op); continue; }
          if (offline()) { later(); break; }
          try {
            await withTimeout(exec(op), 15000, '저장');
            finish(op); wait = 0;
          } catch (e) {
            const code = e && e.code;
            const hard = HARD_ERR.includes(code);
            const slow = !code && e && /초 초과/.test(e.message || '');
            // 인터넷 문제가 아닌 오류가 계속되면(문서 모양이 이상한 경우 등) 몇 번 뒤 그 저장만 버려요 → 뒤의 저장이 막히지 않게
            if (!hard && !slow && !NET_ERR.includes(code)) { op.tries = (op.tries || 0) + 1; store.touch(); }
            if (hard || (op.tries || 0) >= 6) { console.warn('저장 실패', e); finish(op, e); continue; }
            later(); break;
          }
        }
      } finally { pumping = false; }
    }
    function kick(force) { if (force) { clearTimeout(retryT); retryT = null; } if (!pumping && !retryT) pump(); }
    addEventListener('online', () => kick(true));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(true); });
    setInterval(() => { if (mine().length) kick(); }, 30000);
    function write(k, path, data, meta) {
      const uid = curUid || (auth.currentUser ? auth.currentUser.uid : '');
      const op = newOp(k, path, data, uid, isUserDocPath(path) ? view(path) : null, meta);
      store.push(op);
      const pr = new Promise((res, rej) => waiters.set(op.id, { res, rej }));
      pr.catch(() => {});
      kick();
      return offline() ? Promise.resolve() : Promise.race([pr, new Promise((r) => setTimeout(r, 6000))]);
    }
    return {
      mode: 'firebase',
      onAuth(cb) { auth.onAuthStateChanged((u) => { curUid = u ? u.uid : ''; cb(u ? { uid: u.uid, email: u.email } : null); }); },
      signUp: (e, p) => auth.createUserWithEmailAndPassword(e, p),
      signIn: (e, p) => auth.signInWithEmailAndPassword(e, p),
      signOut: () => { store.clearDocs(); return auth.signOut(); },
      // 지난번에 서버에 못 올린 저장을 보내기 시작해요 (로그인한 사람 것만, 2주 이내)
      replay(uid) {
        store.ops().slice().forEach((op) => { if (!op.u || (op.u === uid && (!op.at || Date.now() - op.at > 14 * DAY))) store.done(op); });
        kick(true);
      },
      pending: () => mine().length,
      stale: () => { const v = fromStore; fromStore = false; return v; },
      get: (path, opt) => (opt && opt.raw ? readDocRaw(path, '기록 읽기', true) : readDoc(path, '기록 읽기', opt && opt.fresh)),
      set: (path, data, meta) => write('set', path, data, meta),
      put: (path, data) => write('put', path, data),
      async add(col, data) { const id = fs.collection(col).doc().id; await write('put', `${col}/${id}`, data); return id; },
      del: (path) => write('del', path, null),
      // 다른 기기에서 바뀐 내용 받기 (방금 내가 저장한 그대로면 건너뜀)
      watch(path, cb) {
        watchers[path] = cb;
        const un = fs.doc(path).onSnapshot((snap) => {
          if (snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
          slowAt = 0;   // 서버가 다시 응답해요
          const v = snap.exists ? snap.data() : null;
          const old = store.getDoc(path);
          store.putDoc(path, v);
          kick();
          if (v && ownW.has(v._w) && old && stableStr(old) === stableStr(v)) return;
          cb(overlayDoc(path, v));
        }, () => {});
        return () => { if (watchers[path] === cb) delete watchers[path]; un(); };
      },
      // 기록 목록(종료·참기·한 줄·집중)도 실시간으로 받아요. 내 저장이 서버에 확인되는 순간에도 한 번 더 받아요
      watchList(col, cb) {
        return fs.collection(col).onSnapshot({ includeMetadataChanges: true }, (snap) => {
          if (snap.metadata.hasPendingWrites || snap.metadata.fromCache) return;
          slowAt = 0;
          const list = docs(snap);
          store.setList(col, list);
          cb(overlayList(col, list));
        }, () => {});
      },
      list: (col) => readList(col, '기록 목록 읽기'),
      async query(col, field, value) { if (offline()) throw new Error('offline'); return docs(await withTimeout(fs.collection(col).where(field, '==', value).get(), 15000, '친구 정보 읽기')); },
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
  const S = { streaks: [], urges: [], journal: {}, focus: [] };   // 내 기록 (streaks = 끝난 디톡스 구간, focus = 집중 세션)
  const F = { list: [], incoming: [], outgoing: [], rank: 'ok', loaded: false, loading: false, msg: '' };
  const ui = { tab: 'home', recTab: 'report', editLessonCat: null, calMonth: null, selDay: null, weekOff: 1, monthOff: 1, year: null, editJournal: false, score: null, jDay: 't', journalAll: false, focusSub: '', growAll: {} };
  let tickTimer = null;

  const userPath = () => `${C.users}/${me.uid}`;
  const pubPath = () => `${C.pub}/${me.uid}`;
  const isActive = () => U && U.startAt != null;   // 디톡스 진행 중인지 (종료 후 시작 전이면 false)
  const curMs = () => (isActive() ? Math.max(0, now() - U.startAt) : 0);
  // 보상에 쓰는 시간: 앱을 쓰기 시작한 뒤부터만
  const rewMs = () => (isActive() ? Math.max(0, now() - Math.max(U.startAt, U.rewardFrom || 0)) : 0);

  function normalize(u) {
    const d = {
      nickname: idOf(me.email), gender: 'none', targets: [...BASE_TARGETS], activities: [...DEFAULT_ACTIVITIES],
      urgeMinutes: 10, startAt: null, endedAt: null, lastDur: 0, bestMs: 0, urgeWins: 0, urge: null, xp: 0, xpHours: 0, badges: {},
      quotes: [], share: { ok: true, calm: true, time: true, best: true, level: true, badges: true },
      multFloor: 0, honestDay: '', comebackDay: '',
      reportSeen: '', monthSeen: '', yearSeen: null, friendCode: '', codeOk: false,
      riskOn: true, comeback: null, monthGoals: {}, exams: [],
      attend: {}, daily: {}, achievements: {},
      comebackDone: 0, recordBreaks: 0, maxFriends: 0, wasTop1: false,
      // v1.7.0
      whys: [], whyAsked: false, subjects: [...DEFAULT_SUBJECTS], focus: null,
      weekReviews: {}, monthReviews: {}, examReviews: {}, experiments: [], letters: [],
      lessonBase: 0, lessonSeenDay: '', lessonRvCount: 0, lastBackupAt: 0,
    };
    const out = { ...d, ...u };
    out.share = { ...d.share, ...(u.share || {}) };
    out.badges = u.badges || {};
    out.attend = u.attend || {};
    out.daily = u.daily || {};
    out.achievements = u.achievements || {};
    out.weekReviews = u.weekReviews || {};
    out.monthReviews = u.monthReviews || {};
    out.examReviews = u.examReviews && typeof u.examReviews === 'object' ? u.examReviews : {};
    ['whys', 'experiments', 'letters', 'subjects'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = [...d[k]]; });
    out.lessons = Array.isArray(u.lessons) ? u.lessons : [{ id: 'c1', name: '공부', items: [] }, { id: 'c2', name: '인생', items: [] }];
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
    // 이 시각 이전의 시간은 기록으로만 남고 경험치·배지·배수에는 들어가지 않아요
    if (!out.rewardFrom) out.rewardFrom = u.createdAt || out.trackStart;
    return out;
  }

  /* ====================== 화면 전환 / 공통 UI ====================== */
  const SCREENS = ['screen-loading', 'screen-auth', 'screen-onboard', 'screen-app'];
  function go(id) { SCREENS.forEach((s) => (s === id ? show($(s)) : hide($(s)))); }

  let toastTimer = null, toastBusyUntil = 0;
  // 버튼이 있는 알림(되돌리기 등)이 떠 있는 동안에는 다른 알림이 덮지 않도록 기다려요
  function softToast(text) {
    const wait = toastBusyUntil - now();
    if (wait > 0) setTimeout(() => softToast(text), wait + 50); else toast(text);
  }
  function toast(text, action, ms = 2600, label = '되돌리기') {
    toastBusyUntil = action ? now() + ms : 0;
    $('toast-text').textContent = text;
    const btn = $('toast-btn');
    btn.textContent = label;
    if (action) { show(btn); btn.onclick = () => { hideToast(); action(); }; } else hide(btn);
    show($('toast'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms);
  }
  function hideToast() { hide($('toast')); clearTimeout(toastTimer); toastBusyUntil = 0; }

  let sheetAt = 0;
  function openSheet(html, bind) {
    sheetAt = now();
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
  // 화면 쪽 내 문서(U)에도 서버와 똑같은 규칙으로 합쳐요 (맵은 칸끼리 합치고, 나머지는 통째로 바꿔요)
  function mergeLocal(target, fields) {
    Object.keys(fields).forEach((k) => {
      const d = UNIT_DEPTH[k] || 1, v = fields[k];
      if (d > 1 && isPlain(v)) {
        const cur = isPlain(target[k]) ? { ...target[k] } : {};
        Object.keys(v).forEach((kk) => { cur[kk] = d > 2 && isPlain(v[kk]) ? { ...(isPlain(cur[kk]) ? cur[kk] : {}), ...v[kk] } : v[kk]; });
        target[k] = cur;
      } else target[k] = v;
    });
  }
  // 경험치는 '얼마나 더했는지'만 보내요. xp 칸이 들어 있는 저장에 그동안 얻은 경험치를 실어 보내요.
  // meta.guard: 이 칸들이 그사이 다른 기기에서 바뀌었으면 저장 전체를 버려요 (기본: 모든 칸)
  async function saveUser(fields, meta) {
    const data = { ...fields };
    const m = { ...(meta || {}) };
    if ('xp' in data) { delete data.xp; const n = takeXp(); if (n) m.xpAdd = n; }
    mergeLocal(U, data);
    try { await db.set(userPath(), data, m); }
    catch (e) { toast(navigator.onLine === false ? '인터넷이 끊겨 있어요. 연결되면 다시 저장해요.' : '저장하지 못했어요. 다시 시도해 주세요.'); throw e; }
  }

  function weekWins() {
    const ws = weekStart(now());
    return S.urges.filter((u) => u.result === 'win' && u.at >= ws).length;
  }
  function weekOk() {
    let n = 0;
    const today = dayStart(now());
    for (let d = Math.max(weekStart(now()), dayStart(U.trackStart)); d <= today; d = addDays(d, 1)) if (okDay(d)) n++;
    return n;
  }
  function publicData() {
    const sh = U.share;
    return {
      nickname: U.nickname,
      weekOk: sh.ok ? weekOk() : null,
      startAt: sh.time && isActive() ? U.startAt : null,
      paused: sh.time ? !isActive() : null,
      bestMs: sh.best ? Math.max(U.bestMs || 0, curMs()) : null,
      level: sh.level ? levelOf(U.xp) : null,
      stars: sh.level ? starsOf(U.xp) : null,
      badges: sh.badges ? Object.keys(U.badges).length : null,
      weekCalm: sh.calm ? weekCalm() : null,
      weekKey: weekKey(),
      updatedAt: now(),
    };
  }
  let pubTimer = null;
  function savePublic(immediate) {
    clearTimeout(pubTimer);
    const run = () => { if (!U || !me) return; return db.set(pubPath(), publicData()).catch(() => {}); };
    if (immediate) return run();
    pubTimer = setTimeout(run, 800);
  }

  let pendingXp = 0;   // 얻었지만 아직 저장에 싣지 않은 경험치
  const takeXp = () => { const n = pendingXp; pendingXp = 0; return n; };
  async function addXp(n) {
    const before = levelOf(U.xp);
    U.xp = Math.max(0, (U.xp || 0) + n);
    pendingXp += n;
    const after = levelOf(U.xp);
    if (after > before) setTimeout(() => softToast(`레벨 업! Lv.${after} ${titleOf(after)}`), 400);
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
    if (idbBroken && !signup) $('auth-hint').textContent = '이 기기의 브라우저 저장소가 응답하지 않아서 다시 로그인이 필요해요. 기록은 계정에 그대로 있어요.';
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
    // 안전장치: 이미 설정을 마친 계정이면 절대 덮어쓰지 않아요 (기록이 지워지지 않게)
    let ex = null;
    try { ex = await db.get(userPath(), { fresh: true }); } catch (e) { try { ex = await db.get(userPath()); } catch (er) { ex = null; } }
    if (ex && ex.onboarded) { toast('이미 설정을 마친 계정이에요. 기록을 불러올게요', null, 3000); setTimeout(() => location.reload(), 1200); return; }
    const ordered = obAllTargets().filter((t) => ob.targets.includes(t));
    const data = {
      ...obKeep,
      nickname: $('ob-nick').value.trim().slice(0, 12), gender: ob.gender, targets: ordered,
      activities: [...DEFAULT_ACTIVITIES], urgeMinutes: 10, startAt, trackStart: startAt, rewardFrom: now(), endedAt: null, lastDur: 0, multFloor: 0,
      bestMs: 0, urgeWins: 0, urge: null, xp: 0, xpHours: 0, badges: {}, onboarded: true, createdAt: now(), balanceSeen: '1.6.0',
    };
    U = normalize(data);
    pendingXp = 0;
    await db.put(userPath(), U);
    S.streaks = []; S.urges = []; S.journal = {}; S.focus = [];
    obKeep = {};
    await enterApp();
    openGuide(true);
  }

  /* ====================== 레벨 되찾기 (v1.7.8) ====================== */
  // 예전 버전의 동기화 문제로 경험치가 줄어든 경우: 이미 받은 레벨 업적만큼은 되돌려요 (서버에서 '이 값보다 작으면'만 올려요)
  function repairLevel() {
    const a = U.achievements || {};
    let lv = 1, st = 0;
    ACHS.forEach((x) => { if (!a[x.id]) return; if (x.key === 'level') lv = Math.max(lv, x.need); if (x.key === 'stars') st = Math.max(st, x.need); });
    const floor = st ? xpForLevel(MAX_LEVEL) + st * STAR_XP : xpForLevel(lv);
    if ((U.xp || 0) >= floor) return;
    U.xp = floor + pendingXp;
    db.set(userPath(), {}, { xpMin: floor }).catch(() => {});
    setTimeout(() => { if (U) toast(`레벨을 되찾았어요 · Lv.${levelOf(U.xp)}`, null, 4000); }, 1500);
  }

  /* ====================== 친구 코드 ====================== */
  function makeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }
  // 친구 코드는 서버에서 정말 내 것으로 저장된 걸 확인한 뒤에만 확정해요 (오프라인일 때 남의 코드와 겹치지 않게)
  async function ensureCode() {
    if (U.codeOk && U.friendCode) return;
    if (navigator.onLine === false) return;
    let code = U.friendCode || makeCode(), found = false;
    for (let i = 0; i < 6; i++) {
      let ex = null;
      try { ex = await db.get(`${C.codes}/${code}`, { fresh: true, raw: true }); } catch (e) { return; }
      if (!ex || ex.uid === me.uid) { found = true; break; }
      code = makeCode();
    }
    if (!found) return;
    try { await db.set(`${C.codes}/${code}`, { uid: me.uid, nickname: U.nickname }); } catch (e) { return; }
    let chk = null;
    try { chk = await db.get(`${C.codes}/${code}`, { fresh: true, raw: true }); } catch (e) { chk = null; }
    const ok = !!(chk && chk.uid === me.uid);
    if (ok || U.friendCode !== code) await saveUser(ok ? { friendCode: code, codeOk: true } : { friendCode: code });
  }

  /* ====================== 앱 진입 ====================== */
  async function loadRecords(strict) {
    const safe = (pr) => (strict ? pr : pr.catch(() => null));
    const [streaks, urges, journal, focus] = await Promise.all([
      safe(db.list(`${userPath()}/streaks`)),
      safe(db.list(`${userPath()}/urges`)),
      safe(db.list(`${userPath()}/journal`)),
      safe(db.list(`${userPath()}/focus`)),
    ]);
    // 다른 기기 동기화 중 읽기에 실패하면 지금 기록을 그대로 둬요 (빈 기록으로 덮지 않도록)
    if (!streaks || !urges || !journal || !focus) return;
    setRecords('streaks', streaks); setRecords('urges', urges); setRecords('journal', journal); setRecords('focus', focus);
  }
  const REC_COLS = ['streaks', 'urges', 'journal', 'focus'];
  function setRecords(col, list) {
    list = (list || []).filter((x) => x && typeof x === 'object');
    if (col === 'focus') S.focus = list.filter((f) => f.start && f.end).sort((a, b) => a.start - b.start);
    if (col === 'streaks') S.streaks = list.sort((a, b) => a.end - b.end);
    if (col === 'urges') S.urges = list.sort((a, b) => a.at - b.at);
    if (col === 'journal') { const j = {}; list.forEach((x) => { j[x.id] = x; }); S.journal = j; }
  }

  /* ---------- 다른 기기에서 바뀐 내용 반영 ---------- */
  // 내 문서와 기록 목록을 모두 실시간으로 지켜봐요 → 다른 기기에서 바꾸면 바로 이 화면에도 보여요
  let unwatch = [];
  let syncTimer = null;
  let firstSnap = true;
  function stopWatch() { unwatch.forEach((f) => { try { f(); } catch (e) {} }); unwatch = []; firstSnap = true; clearTimeout(syncTimer); }
  function startWatch() {
    stopWatch();
    if (!db.watch) return;
    unwatch.push(db.watch(userPath(), onRemote));
    if (db.watchList) REC_COLS.forEach((c) => unwatch.push(db.watchList(`${userPath()}/${c}`, (list) => onRecords(c, list))));
  }
  function onRecords(col, list) {
    if (!U || !me) return;
    setRecords(col, list);
    remoteRefresh(false);
  }
  // 다른 기기에서 바뀐 내용으로 화면 다시 그리기 (글을 쓰는 중이면 다 쓰고 나서)
  let viewStale = false;
  function remoteRefresh(reloadRecs) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      if (!U) return;
      if (reloadRecs) await loadRecords();
      refreshUi();
    }, 150);
  }
  function refreshUi() {
    if (!U) return;
    if (!U.urge && !$('urge').classList.contains('hidden') && !$('urge-main').classList.contains('hidden')) hide($('urge'));
    if (!U.focus && !$('fo-run').classList.contains('hidden')) focusUi(false);
    renderFocus();
    $('top-name').textContent = U.nickname;
    if (typingNow() || lsDrag || hold) { viewStale = true; return; }
    viewStale = false;
    if (ui.tab === 'home') renderHome();
    if (ui.tab === 'records') renderRecords();
    if (ui.tab === 'settings') renderSettings();
    if (ui.tab === 'friends') renderFriends();
  }
  function onRemote(data) {
    if (!U || !me) return;
    if (firstSnap && db.mode === 'firebase') { firstSnap = false; if (!(db.stale && db.stale()) && JSON.stringify(data && data.startAt) === JSON.stringify(U.startAt) && data && data.xp === U.xp) return; }
    firstSnap = false;
    if (!data || data.onboarded === false) { location.reload(); return; }
    if (!data.onboarded) return;   // 일부만 온 문서는 무시해요
    U = normalize(data);
    U.xp = Math.max(0, (U.xp || 0) + pendingXp);   // 아직 저장에 싣지 않은 경험치는 그대로
    remoteRefresh(!db.watchList);
  }

  async function enterApp() {
    go('screen-app');
    $('top-name').textContent = U.nickname;
    applyTheme(currentTheme());
    ui.calMonth = null; ui.selDay = dateKey(now()); ui.editJournal = false; ui.score = null; ui.jDay = 't'; ui.journalAll = false; ui.growAll = {};
    ui.weekOff = U.trackStart < weekStart(now()) ? 1 : 0;
    ui.monthOff = U.trackStart < monthRange(monthKey(now()))[0] ? 1 : 0;
    ui.recTab = 'report'; ui.year = null;
    F.loaded = false;
    repairLevel();
    migrateExamReviews();
    switchTab('home');
    startTick();
    if (U.urge && isActive()) openUrge(true);
    if (U.focus && (U.focus.pausedAt || focusLeft() > 0)) focusUi(true);
    // v1.7.0: 예전 교훈은 업데이트한 날부터 다시 보기 일정이 시작돼요
    if (!U.lessonBase) saveUser({ lessonBase: now() }).catch(() => {});
    ensureCode().then(() => savePublic(true)).catch(() => savePublic(true));
    setTimeout(() => { checkCalm(); checkGoals(); checkAchievements(); }, 600);
    // v1.6.0 밸런스 패치 안내 (한 번만)
    if (U.balanceSeen !== '1.6.0') {
      setTimeout(() => { if (U) toast(`레벨 곡선이 바뀌었어요 · 지금 Lv.${levelOf(U.xp)} ${titleOf(levelOf(U.xp))}`, null, 5000); }, 1200);
      saveUser({ balanceSeen: '1.6.0' }).catch(() => {});
    }
    loadFriends(true);
    startWatch();
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
    if (U.focus) { renderFocus(); if (focusDue(U.focus)) completeFocus(); }
    if (isActive()) checkProgress();
    if (Math.floor(t / 1000) % 30 === 0) checkAchievements();
    const dk = dateKey(t);
    if (dk !== lastDay) { lastDay = dk; checkCalm(); checkGoals(); homeRefresh(); }
    const hr = new Date(t).getHours();
    if (hr !== lastHour) { lastHour = hr; homeRefresh(); }
  }
  // 글을 쓰는 중이면 지우지 않고, 입력칸에서 나올 때 홈을 새로 그려요 (자정·정각·다짐 체크 시각)
  let homeStale = false;
  const typingNow = () => !!(document.activeElement && document.activeElement.matches('input, textarea'));
  function homeRefresh() {
    if (ui.tab !== 'home') return;
    if (typingNow()) { homeStale = true; return; }
    homeStale = false; renderHome();
  }
  document.addEventListener('focusout', () => {
    if (homeStale) setTimeout(() => { if (homeStale && U && !typingNow()) homeRefresh(); }, 0);
    if (viewStale) setTimeout(() => { if (viewStale && U && !typingNow()) refreshUi(); }, 0);
  });

  /* ====================== 연속 배수 · 시험 기간 ====================== */
  function tierOf(ms) { let t = 0; TIER_MS.forEach((m, i) => { if (ms >= m) t = i; }); return t; }
  function curTier() { return Math.max(isActive() ? tierOf(rewMs()) : 0, U.multFloor || 0); }
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
  function mult() { return Math.round(TIER_X[curTier()] * (examOn() ? EXAM_X : 1) * 10) / 10; }
  async function gain(base) { const n = Math.round(base * mult()); await addXp(n); return n; }   // 디톡스 보상 (배수 적용)
  async function gainFixed(base) { await addXp(base); return base; }                              // 생활 보상 (배수 없음)
  const fmtX = (x) => `×${Number.isInteger(x) ? x : x.toFixed(1)}`;

  /* ====================== 진행 상황 (경험치·배지·재도전) ====================== */
  let progressBusy = false;
  async function checkProgress() {
    if (progressBusy || !isActive()) return;
    const ms = rewMs();
    const x = mult();
    const hours = Math.floor(ms / HOUR);
    let gained = 0;
    const fields = {};
    const cels = [];
    if (hours > (U.xpHours || 0)) { gained += Math.round((hours - (U.xpHours || 0)) * XP.hour * x); fields.xpHours = hours; }
    MILESTONES.forEach((m) => {
      if (ms >= m.ms && !U.badges[m.id]) {
        fields.badges = { ...(fields.badges || {}), [m.id]: now() };
        const b = Math.round(m.bonus * x); gained += b;
        cels.push({ medal: m.short, kicker: '배지 획득', title: `${m.label} 버티기 성공!`, sub: `${m.label} 동안 한 번도 무너지지 않았어요.`, xp: b });
      }
    });
    const cb = U.comeback;
    if (cb && cb.startAt === U.startAt && curMs() >= cb.targetMs) {
      fields.comeback = null;
      const today = dateKey(now());
      if (U.comebackDay !== today) {
        const b = Math.round(XP.comeback * x); gained += b;
        fields.comebackDone = (U.comebackDone || 0) + 1;
        fields.comebackDay = today;
        cels.push({ medal: '↻', kind: 'alt', kicker: '재도전 목표 달성', title: `${fmtDur(cb.targetMs)} 버텼어요!`, sub: '종료 후 다시 일어섰어요. 이 기세 그대로 가요.', xp: b });
      }
    }
    if (!Object.keys(fields).length) return;
    progressBusy = true;
    try {
      if (gained) { await addXp(gained); fields.xp = U.xp; }
      cels.forEach(celebrate);
      const p = saveUser(fields);   // 화면(U)에는 바로 들어가요
      progressBusy = false;
      await p;
    } catch (e) {} finally { progressBusy = false; }
    savePublic();
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

  /* ====================== 고요한 날 ====================== */
  // 종료도, 참기(충동)도 없이 하루 내내 디톡스한 날. 오늘은 지금까지 기준
  const urgesIn = (a, b) => S.urges.filter((u) => u.at >= a && u.at < b);
  function calmDay(d0) {
    const d1 = addDays(d0, 1), end = Math.min(d1, now());
    if (end <= d0 || d1 <= U.trackStart) return false;
    if (endsIn(d0, d1).length || urgesIn(d0, d1).length) return false;
    const from = Math.max(d0, U.trackStart);
    return detoxIn(from, end) >= (end - from) - MIN;
  }
  const calmDone = (d0) => addDays(d0, 1) <= now() && calmDay(d0);
  function calmIn(a, b) {
    let n = 0;
    for (let d = dayStart(Math.max(a, U.trackStart)); d < Math.min(b, now()); d = addDays(d, 1)) if (calmDone(d)) n++;
    return n;
  }
  function weekCalm() {
    let n = 0;
    for (let d = Math.max(weekStart(now()), dayStart(U.trackStart)); d <= dayStart(now()); d = addDays(d, 1)) if (calmDay(d)) n++;
    return n;
  }
  // 고요한 날이었으면 다음에 앱을 열 때 보너스 (며칠 못 열었어도 최근 7일 안이면 받아요)
  let calmBusy = false;
  async function checkCalm() {
    if (!U || calmBusy) return;
    const t0 = dayStart(now()), days = [];
    for (let i = 1; i <= 7; i++) {
      const d = addDays(t0, -i);
      if (d < dayStart(U.rewardFrom || 0)) break;
      const k = dateKey(d);
      if (!dailyOf(k).calmXp && calmDone(d)) days.push(k);
    }
    if (!days.length) return;
    calmBusy = true;
    try {
      let total = 0;
      const patch = {};
      for (const k of days) { const got = await gain(XP.calm); total += got; patch[k] = { calmXp: got }; }
      await saveUser({ daily: patch, xp: U.xp }).catch(() => {});
      savePublic();
      const yk = dateKey(addDays(t0, -1));
      celebrate(days.length === 1 && days[0] === yk
        ? { medal: '☾', kind: 'calm', kicker: '고요한 날', title: '어제는 고요한 하루였어요', sub: '종료도 충동도 없었어요.', xp: total }
        : { medal: '☾', kind: 'calm', kicker: '고요한 날', title: `고요한 날 ${days.length}일`, sub: '종료도 충동도 없던 날들의 보너스예요.', xp: total });
    } finally { calmBusy = false; }
    if (ui.tab === 'home') renderLevelCard();
    checkGoals(); checkAchievements();
  }

  /* ====================== 하루 기록 (출석·다짐) ====================== */
  const dailyOf = (k) => (U.daily && U.daily[k]) || {};
  function pledgesOf(k) {
    const d = dailyOf(k);
    if (Array.isArray(d.pledges)) return d.pledges;
    if (d.pledge) return [{ id: 'p0', text: d.pledge, check: d.check || null, xp: d.checkXp || 0 }];
    return [];
  }
  async function setDaily(k, patch, extra = {}, meta) {
    try { await saveDaily(k, patch, extra, meta); } catch (e) {}
  }
  // 하루 기록(daily)은 통째로 보내지 않고 그날의 바뀐 칸만 보내요.
  // 오래된 화면(다른 기기, 늦게 열린 앱)이 저장해도 다른 날·다른 칸의 기록을 덮어쓰지 않아요.
  async function saveDaily(k, patch, extra = {}, meta) {
    return saveUser({ ...extra, daily: { [k]: patch } }, meta);
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
      if (type === 'calm_min' && calmDone(d)) cur++;
    }
    return cur;
  }
  // 목표는 정한 날부터 세요 (예전 목표는 그 달 1일부터)
  function goalStart(mk, setAt) { const [a] = monthRange(mk); return setAt ? Math.max(a, dayStart(setAt)) : a; }
  function goalFrac(mk, setAt) { const [a, b] = monthRange(mk); return (b - goalStart(mk, setAt)) / (b - a); }
  function goalLimit(type, mk, setAt) {
    const t = GOAL_TYPES[type];
    if (t.max) return t.cap;
    return Math.max(1, Math.ceil(t.min * goalFrac(mk, setAt)));
  }
  function goalXp(g, mk) {
    const t = GOAL_TYPES[g.type] || GOAL_TYPES.wins_min;
    const f = goalFrac(mk, g.setAt);
    const ratio = t.max ? (t.def + 1) / (g.n + 1) : g.n / Math.max(1, t.def * f);
    return Math.round(XP.monthGoal * Math.min(2, Math.max(0.6, ratio)));
  }
  function goalStatusOf(mk, g) {
    const [, b] = monthRange(mk);
    const cur = goalValue(g.type, goalStart(mk, g.setAt), b);
    const ended = b <= now();
    const t = GOAL_TYPES[g.type] || GOAL_TYPES.wins_min;
    let state;
    if (t.max) state = cur > g.n ? 'fail' : ended ? 'done' : 'ongoing';
    else state = cur >= g.n ? 'done' : ended ? 'fail' : 'ongoing';
    return { g, cur, state, daysLeft: Math.max(0, Math.ceil((b - now()) / DAY)) };
  }
  const liveGoals = (mk) => (U.monthGoals[mk] || []).filter((g) => !g.deleted);
  const goalsOf = (mk) => liveGoals(mk).map((g) => goalStatusOf(mk, g));
  function goalLabel(g) { const t = GOAL_TYPES[g.type] || GOAL_TYPES.wins_min; return `${t.short} ${g.n}${t.unit}`; }
  const stateText = (s) => (s === 'done' ? '달성' : s === 'fail' ? '실패' : '진행 중');

  let goalsBusy = false, goalsAgain = false;
  async function checkGoals() {
    if (!U) return;
    if (goalsBusy) { goalsAgain = true; return; }
    goalsBusy = true;
    try { await checkGoalsRun(); } finally { goalsBusy = false; }
    if (goalsAgain) { goalsAgain = false; checkGoals(); }
  }
  async function checkGoalsRun() {
    const all = {};
    let changed = false;
    for (const mk of Object.keys(U.monthGoals)) {
      const list = U.monthGoals[mk].map((g) => ({ ...g }));
      let ch = false;
      for (const g of list) {
        const st = goalStatusOf(mk, g);
        if (g.deleted || g.rewarded || st.state !== 'done') continue;
        g.rewarded = now(); changed = true; ch = true;
        const got = await gainFixed(goalXp(g, mk));
        const m = Number(mk.split('-')[1]);
        celebrate({ medal: `${m}월`, kind: 'alt', kicker: '이번 달 목표 달성', title: `${goalLabel(g)} 달성!`, sub: `${m}월 목표를 지켜냈어요.`, xp: got });
      }
      if (ch) all[mk] = list;
    }
    if (changed) { try { await saveUser({ monthGoals: all, xp: U.xp }); } catch (e) {} savePublic(); checkAchievements(); if (ui.tab === 'home') renderHome(); }
  }

  function openGoalSheet(id) {
    const mk = monthKey(now());
    const list = U.monthGoals[mk] || [];
    const cur = id ? list.find((g) => g.id === id) : null;
    if (cur && cur.rewarded) return toast('이미 달성한 목표예요');
    if (!cur && liveGoals(mk).length >= GOAL_MAX) return toast(`목표는 ${GOAL_MAX}개까지예요`);
    // 지운 목표도 다시 만들 수 있어요. 다만 처음 정했던 날부터 세요 (지웠다 다시 만들어서 기간을 줄이지 못하게)
    const used = list.filter((g) => !g.deleted && (!cur || g.id !== cur.id)).map((g) => g.type);
    const tombOf = (k) => list.filter((g) => g.deleted && g.type === k).sort((a, b) => (a.setAt || 0) - (b.setAt || 0))[0];
    const setAtFor = (k) => { const c = [cur && cur.setAt, (tombOf(k) || {}).setAt].filter(Boolean); return c.length ? Math.min(...c) : now(); };
    const pickable = Object.keys(GOAL_TYPES).filter((k) => !GOAL_TYPES[k].hidden);
    if (!cur && pickable.every((k) => used.includes(k))) return toast('이번 달에 만들 수 있는 목표를 다 썼어요');
    let type = cur ? cur.type : Object.keys(GOAL_TYPES).find((k) => !used.includes(k) && !GOAL_TYPES[k].hidden) || 'calm_min';
    const m = Number(mk.split('-')[1]);
    openSheet(`<h2>${m}월 목표 ${cur ? '바꾸기' : '추가'}</h2>
      <p class="label">무엇을</p>
      <div class="chips" id="goal-type">${Object.entries(GOAL_TYPES).filter(([k, t]) => !t.hidden || (cur && cur.type === k)).map(([k, t]) => `<button type="button" class="chip${used.includes(k) ? ' used' : ''}" data-k="${k}" ${used.includes(k) ? 'disabled' : ''}>${t.name}</button>`).join('')}</div>
      <p class="label">얼마나</p>
      <div class="time-row"><input type="number" id="goal-n" min="1" max="99" inputmode="numeric" style="width:6em" /><span id="goal-unit"></span></div>
      <p class="goal-xp" id="goal-xp"></p>
      <p class="form-err" id="goal-err"></p>
      <div class="sheet-actions">${cur ? '<button class="btn danger-ghost" data-del type="button">목표 지우기</button>' : '<button class="btn ghost" data-close type="button">취소</button>'}
        <button class="btn primary" data-ok type="button">저장</button></div>`,
    (el) => {
      const showXp = () => {
        const n = Math.round(Number($('goal-n').value));
        $('goal-xp').textContent = n ? `달성하면 +${goalXp({ type, n, setAt: setAtFor(type) }, mk)} XP` : '';
      };
      const sync = () => {
        el.querySelectorAll('#goal-type .chip').forEach((b) => b.classList.toggle('selected', b.dataset.k === type));
        const setAt = setAtFor(type);
        const t = GOAL_TYPES[type], lim = goalLimit(type, mk, setAt);
        $('goal-unit').textContent = `${t.unit} · ${t.max ? '최대' : '최소'} ${lim}`;
        const def = t.max ? Math.min(t.def, lim) : Math.max(lim, Math.round(t.def * goalFrac(mk, setAt)));
        $('goal-n').value = cur && cur.type === type ? cur.n : def;
        $('goal-err').textContent = '';
        showXp();
      };
      sync();
      $('goal-n').oninput = showXp;
      el.querySelectorAll('#goal-type .chip').forEach((b) => { b.onclick = () => { if (b.disabled) return; type = b.dataset.k; sync(); }; });
      const c = el.querySelector('[data-close]'); if (c) c.onclick = closeSheet;
      const d = el.querySelector('[data-del]');
      if (d) d.onclick = async () => {
        const goals = { [mk]: list.map((g) => (g.id === cur.id ? { ...g, deleted: now() } : g)) };
        closeSheet(); await saveUser({ monthGoals: goals }).catch(() => {}); renderHome();
      };
      el.querySelector('[data-ok]').onclick = async () => {
        const n = Math.round(Number($('goal-n').value));
        const setAt = setAtFor(type);
        const t = GOAL_TYPES[type], lim = goalLimit(type, mk, setAt);
        if (!n || n < 1 || n > 99) { $('goal-err').textContent = '1부터 99 사이 숫자로 정해 주세요.'; return; }
        if (t.max && n > lim) { $('goal-err').textContent = `${lim}번 이하로 정해 주세요.`; return; }
        if (!t.max && n < lim) { $('goal-err').textContent = `${lim} 이상으로 정해 주세요.`; return; }
        const g = { id: cur ? cur.id : 'g' + uid6(), type, n, setAt };
        // 같은 종류의 지운 목표는 새 목표로 대신해요
        const kept = list.filter((x) => !(x.deleted && x.type === type));
        const next = cur ? kept.map((x) => (x.id === cur.id ? g : x)) : [...kept, g];
        closeSheet();
        try { await saveUser({ monthGoals: { [mk]: next } }); toast(cur ? '목표를 바꿨어요' : '목표를 추가했어요'); } catch (e) {}
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

  /* ====================== 오늘의 문장 (자정에 바뀜) ====================== */
  const CUM_DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  function quoteDayTs() { return now(); }
  function quoteOfDay() {
    const Q = window.FF_QUOTES && window.FF_QUOTES.length ? window.FF_QUOTES : [FALLBACK_QUOTE];
    const d = new Date(quoteDayTs());
    let day = d.getDate();
    if (d.getMonth() === 1 && day === 29) day = 28;
    const q = Q[(CUM_DAYS[d.getMonth()] + day - 1) % Q.length];
    // [문장, 말한 사람] (예전 형식인 문자열도 받아요)
    return Array.isArray(q) ? { text: q[0], by: q[1] || '' } : { text: String(q), by: '' };
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
    const x = 1;
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
    const got = await gainFixed(n.base);
    const attend = { last: today, streak: n.streak, total: (a.total || 0) + 1, best: Math.max(a.best || 0, n.streak) };
    try { await saveDaily(today, { att: 1 }, { attend, xp: U.xp }); } catch (e) {}
    savePublic();
    if (n.pos === 6) celebrate({ medal: '7', kind: 'alt', kicker: '7일 연속 출석', title: '일주일 내내 왔어요!', sub: '내일부터 다시 1일째 보상이 시작돼요.', xp: got });
    else toast(`출석 ${n.streak}일째 (+${got} XP)`);
    renderHome(); checkGoals(); checkAchievements();
  }

  /* ====================== 오늘의 다짐 (여러 개) ====================== */
  const pledgeXpLeft = (k) => PLEDGE_XP_MAX - pledgesOf(k).filter((p) => p.check === 'yes' && p.xp > 0).length;
  // 다짐은 시간 제한 없이 언제든 체크해요. 오늘 다짐은 체크 전이면 지울 수도 있어요
  function pledgeRow(k, p, canDelete) {
    const x = 1;
    const xpOk = pledgeXpLeft(k) > 0;
    const state = p.check === 'yes' ? `<span class="pl-state yes">${ICON.check}지켰어요${p.xp ? ` +${p.xp}` : ''}</span>`
      : p.check === 'no' ? '<span class="pl-state no">못 지켰어요</span>'
        : `<span class="pl-acts"><button class="btn small primary" data-act="check-pledge" data-k="${k}" data-id="${esc(p.id)}" data-v="yes" type="button">지켰어요${xpOk ? ` +${Math.round(XP.check * x)}` : ''}</button>
            <button class="btn small ghost" data-act="check-pledge" data-k="${k}" data-id="${esc(p.id)}" data-v="no" type="button">못 지켰어요</button>${canDelete ? `
            <button class="icon-btn small" data-act="del-pledge" data-k="${k}" data-id="${esc(p.id)}" type="button" aria-label="다짐 지우기">${ICON.x}</button>` : ''}</span>`;
    return `<li class="pl${p.check ? ' ' + p.check : ''}"><span class="pl-text">${esc(p.text)}</span>${state}</li>`;
  }
  function pledgeCardHtml() {
    const k = dateKey(now());
    const list = pledgesOf(k);
    const kept = list.filter((p) => p.check === 'yes').length;
    // 지난 다짐: 체크하지 않은 건 체크하거나 지울 때까지 계속 보여요 (최근 7일)
    const past = [];
    for (let i = 1; i <= 7; i++) {
      const d0 = addDays(dayStart(now()), -i), pk = dateKey(d0);
      if (addDays(d0, 1) <= U.trackStart) break;
      const l = pledgesOf(pk).filter((p) => !p.check);
      if (l.length) past.push({ pk, d0, i, l });
    }
    return `<section class="card pledge-card">
      <div class="sec-head"><h2>오늘의 다짐</h2>${list.length ? `<span class="muted small">${kept}/${list.length} 지킴</span>` : ''}</div>
      ${pledgeStrip()}
      ${past.map((x) => `<p class="pl-sub">${x.i === 1 ? '어제 다짐' : `${md(x.d0)} 다짐`}</p><ul class="pl-list">${x.l.map((p) => pledgeRow(x.pk, p, true)).join('')}</ul>`).join('')}
      ${list.length ? `<ul class="pl-list">${list.map((p) => pledgeRow(k, p, true)).join('')}</ul>` : ''}
      <div class="pl-add">
        <div class="inline-add"><input id="pledge-input" maxlength="40" placeholder="오늘의 다짐" /><button class="btn primary" data-act="make-pledge" type="button">추가</button></div></div>
    </section>`;
  }
  // 다짐 카드 위: 이번 주 한 가지 · 진행 중인 실험
  function pledgeStrip() {
    const one = thisWeekOne(), x = activeExp();
    const rows = [];
    if (one) rows.push(`<div class="strip"><span class="strip-k">이번 주 한 가지</span><span class="strip-v">${esc(one)}</span></div>`);
    if (x && now() < x.end) rows.push(`<div class="strip exp"><span class="strip-k">실험 중 · ${expDayN(x)}/${x.days}일</span><span class="strip-v">${esc(x.text)}</span></div>`);
    return rows.length ? `<div class="strips">${rows.join('')}</div>` : '';
  }
  async function makePledge(text) {
    text = (text || '').trim();
    if (!text) { toast('다짐을 적어주세요'); return; }
    const k = dateKey(now());
    const list = pledgesOf(k);
    if (list.some((p) => p.text === text)) return toast('이미 있는 다짐이에요');
    const cnt = dailyOf(k).pledgeXpCount || 0;
    let got = 0;
    if (cnt < PLEDGE_XP_MAX) got = await gainFixed(XP.pledge);
    await setDaily(k, { pledges: [...list, { id: 'p' + uid6(), text, check: null, xp: 0, at: now() }], pledge: null, pledgeXpCount: cnt + (got ? 1 : 0) }, { xp: U.xp });
    savePublic();
    toast(got ? `다짐했어요 (+${got} XP)` : '다짐했어요');
    if ($('pledge-input')) $('pledge-input').value = '';
    renderHome();
  }
  async function checkPledge(k, id, v) {
    const list = pledgesOf(k).map((p) => ({ ...p }));
    const p = list.find((x) => x.id === id);
    if (!p || p.check) return;
    let got = 0;
    if (v === 'yes' && pledgeXpLeft(k) > 0) got = await gainFixed(XP.check);
    p.check = v; p.xp = got; p.checkAt = now();
    await setDaily(k, { pledges: list, pledge: null }, { xp: U.xp });
    savePublic();
    toast(v === 'yes' ? (got ? `다짐을 지켰어요! (+${got} XP)` : '다짐을 지켰어요!') : '괜찮아요. 다음엔 꼭!');
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
      const line = `${cur}${unit1} / ${g.n}${unit1}`;
      return `<button type="button" class="goal-row ${state}" data-act="edit-goal" data-id="${esc(g.id)}">
        <span class="goal-top"><b>${goalLabel(g)}</b><span class="goal-state">${stateText(state)}</span></span>
        <span class="bar thin"><span class="fill" style="width:${pct.toFixed(1)}%"></span></span>
        <span class="goal-line">${line}</span></button>`;
    }).join('');
    return `<section class="card goals-card">
      <div class="sec-head"><h2>이번 달 목표</h2><span class="muted small">${list.length ? `${done}/${list.length}` : `${m}월`}</span></div>
      ${thisMonthChange() ? `<div class="strips"><div class="strip"><span class="strip-k">이번 달 다짐</span><span class="strip-v">${esc(thisMonthChange())}</span></div></div>` : ''}
      ${list.length ? `<div class="goal-list">${rows}</div>` : ''}
      ${list.length < GOAL_MAX && liveGoals(mk).filter((g) => !(GOAL_TYPES[g.type] || {}).hidden).length < Object.keys(GOAL_TYPES).filter((k) => !GOAL_TYPES[k].hidden).length ? `<button class="btn ${list.length ? 'ghost' : 'primary'} small add-goal" data-act="add-goal" type="button">${ICON.plus}목표 추가</button>` : ''}
    </section>`;
  }

  function sideHtml() {
    const a = activeExam();
    const exam = a ? `<div class="exam-box" title="${esc(a.e.name)}"><span class="ex-d num">${examLabel(a.e, a.st)}</span></div>` : '';
    return `<div class="hero-side">${exam}<div class="lv-widget" id="lv-widget"></div></div>`;
  }

  function renderHome() {
    // 다시 그려도 저장 안 한 입력 내용은 남겨요
    const keep = {};
    ['pledge-input', 'journal-input', 'er-before', 'er-next', 'ex-good', 'ex-note', 'why-home'].forEach((id) => { const el = $(id); if (el && el.value) keep[id] = el.value; });
    renderHomeInner();
    Object.keys(keep).forEach((id) => { const el = $(id); if (el && (!el.value || id === 'er-before')) el.value = keep[id]; });
    renderFocus();
  }
  function renderHomeInner() {
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
    const tq = quoteOfDay();
    const hero = active ? `
      <section class="hero">
        <div class="hero-main">
          <div class="hero-left">
            <div class="hero-top"><span class="live-dot"></span><span>디톡스 진행 중</span><span class="record-chip hidden" id="h-record">신기록</span></div>
            <div class="big"><span class="days"><b id="h-days">0</b><span>일</span></span><span class="clock" id="h-clock">00:00:00</span></div>
            <div class="hero-meta"><span>최장 기록 <b id="h-best">-</b></span><span>시작 <b>${md(U.startAt)} ${hm(U.startAt)}</b></span><span>디톡스 보상 <b class="acc" id="h-mult">×1</b></span></div>
          </div>
          ${sideHtml()}
        </div>
        <div class="badge-progress">
          <div class="bar"><div class="fill" id="h-bar"></div></div>
          <div class="bar-labels"><span id="h-bar-l"></span><span id="h-bar-r"></span></div>
        </div>
        ${cbOn ? `<div class="comeback">
          <div class="cb-head"><span class="cb-tag">재도전</span><b>${fmtDur(U.comeback.targetMs)} 버티기</b></div>
          <div class="bar thin"><div class="fill" id="cb-bar"></div></div>
          <div class="bar-labels"><span id="cb-l"></span><span id="cb-r"></span></div></div>` : ''}
        <div class="hero-actions">
          <button class="btn primary" data-act="urge" type="button">참기</button>
          <button class="btn danger-ghost hold-btn" data-hold="end" type="button" aria-label="종료 (3초 동안 누르기)"><span class="hold-fill"></span><span class="hold-label">종료<small>3초 꾹</small></span></button>
        </div>
      </section>` : `
      <section class="hero paused">
        <div class="hero-main">
          <div class="hero-left">
            <div class="hero-top"><span class="live-dot off"></span><span>디톡스 쉬는 중</span></div>
            <div class="big"><span class="clock muted-clock" id="p-clock">00:00:00</span></div>
            <div class="hero-meta"><span>종료 <b>${md(U.endedAt || now())} ${hm(U.endedAt || now())}</b></span>${U.lastDur ? `<span>지난 기록 <b>${fmtDur(U.lastDur)}</b></span>` : ''}<span>디톡스 보상 <b class="acc">${fmtX(mult())}</b></span></div>
          </div>
          ${sideHtml()}
        </div>
        <div class="hero-actions single"><button class="btn primary start-btn" data-act="start" type="button">${ICON.play}시작하기</button></div>
      </section>`;
    const gb = !risk ? gobiNow() : null;
    const en = examNote();
    const wr = weekReviewDue(), mr = monthReviewDue(), lts = lettersDue();
    $('page-home').innerHTML = `${hero}
      ${en ? `<p class="exam-note"><span>지난 ${esc(en.name)} 때의 나</span>“${esc(en.note)}”</p>` : ''}
      ${mq ? `<section class="mine-quote"><p class="mn-text">${esc(mq)}</p></section>` : ''}
      <section class="today-quote">
        <div class="tq-body"><p class="tq-text">${esc(tq.text)}</p>${tq.by ? `<p class="tq-by" dir="ltr"><span class="tq-dash">— </span><bdi>${esc(tq.by)}</bdi></p>` : ''}</div></section>
      ${attendCardHtml()}
      ${risk ? `<div class="risk-banner"><div class="rb-text"><b>지금은 자주 무너지는 시간이에요</b>
        <span>${hourRange(risk.from)}</span></div>
        <button class="btn small primary" data-act="urge" type="button">미리 참기</button></div>` : ''}
      ${gb ? `<div class="risk-banner"><div class="rb-text"><b>지금은 고비 구간이에요</b>
        <span>${gb.label} 버텼을 때 가장 많이 끝났어요</span></div>
        <button class="btn small primary" data-act="urge" type="button">미리 참기</button></div>` : ''}
      ${lts.length ? `<button class="report-banner letter-banner" data-act="letter-open" data-id="${esc(lts[0].id)}" type="button"><span>과거의 내가 보낸 편지가 도착했어요</span>${ICON.arrow}</button>` : ''}
      ${yr ? `<button class="report-banner" data-act="open-year" data-y="${yr}" type="button"><span>${yr}년 결산이 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${showMonth ? `<button class="report-banner" data-act="open-month" type="button"><span>지난달 리포트가 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${mr ? `<button class="report-banner" data-act="month-review" data-k="${mr}" type="button"><span>${mkLabel(mr)} 회고를 써 볼까요?</span>${ICON.arrow}</button>` : ''}
      ${showReport ? `<button class="report-banner" data-act="open-report" type="button"><span>지난주 리포트가 나왔어요</span>${ICON.arrow}</button>` : ''}
      ${wr ? `<button class="report-banner" data-act="week-review" data-k="${wr}" type="button"><span>${wr === weekKey() ? '이번 주' : '지난주'} 회고를 써 볼까요?</span>${ICON.arrow}</button>` : ''}
      ${whyAskHtml()}
      ${endReviewCardHtml()}
      ${examReviewCardHtml()}
      ${expResultCardHtml()}
      ${focusCardHtml()}
      <div class="grid-2">${pledgeCardHtml()}${goalsCardHtml()}</div>
      ${journalCardHtml()}`;
    renderLevelCard();
    updateHero();
  }

  // 레벨 칸 모습: 칭호(3레벨)마다 색과 장식이 바뀌어요
  const LV_STAGES = [
    ['#B8B2AB', '#8A837C'], ['#86EFAC', '#22C55E'], ['#4ADE80', '#15803D'], ['#5EEAD4', '#0D9488'], ['#7DD3FC', '#0284C7'],
    ['#93C5FD', '#2563EB'], ['#A5B4FC', '#4F46E5'], ['#C4B5FD', '#7C3AED'], ['#D8B4FE', '#9333EA'], ['#F0ABFC', '#C026D3'],
    ['#F9A8D4', '#DB2777'], ['#FDA4AF', '#E11D48'], ['#FDBA74', '#EA580C'], ['#FCD34D', '#D97706'], ['#FDE68A', '#CA8A04'],
    ['#34D399', '#0D9488'], ['#22D3EE', '#2563EB'], ['#60A5FA', '#7C3AED'], ['#A78BFA', '#DB2777'], ['#F472B6', '#F97316'],
    ['#FB923C', '#FACC15'], ['#F87171', '#F59E0B'], ['#2DD4BF', '#A3E635'], ['#818CF8', '#22D3EE'], ['#FB7185', '#9333EA'],
    ['#FDE68A', '#F59E0B'], ['#38BDF8', '#1D4ED8'], ['#F0ABFC', '#7C3AED'], ['#FB7185', '#BE123C'], ['#6EE7B7', '#047857'],
    ['#FDBA74', '#DB2777'], ['#67E8F9', '#A855F7'], ['#A5B4FC', '#EC4899'], ['#FDE68A', '#F97316'],
  ];
  function lvStageClasses(st) {
    const f = [`lvs-${st}`];
    if (st >= 1) f.push('lv-f-grad');      // 링 그라데이션
    if (st >= 4) f.push('lv-f-glow');      // 링이 빛나요
    if (st >= 7) f.push('lv-f-tint');      // 카드에 색이 물들어요
    if (st >= 9) f.push('lv-f-num');       // 숫자에 색이 들어가요
    if (st >= 12) f.push('lv-f-border');   // 테두리 색
    if (st >= 15) f.push('lv-f-orbit');    // 링 둘레를 도는 궤도
    if (st >= 18) f.push('lv-f-shine');    // 빛이 스쳐 지나가요
    if (st >= 21) f.push('lv-f-spark');    // 반짝이
    if (st >= 26) f.push('lv-f-double');   // 이중 링
    if (st >= 30) f.push('lv-f-crown');    // 왕관
    if (st >= 33) f.push('lv-f-max');      // 마지막 칭호: 무지개 테두리
    return f.join(' ');
  }

  // 경험치가 아주 커지면 '만' 단위로 짧게
  const fmtXp = (n) => (n >= 1e5 ? `${(n / 1e4).toFixed(1).replace(/\.0$/, '')}만` : n.toLocaleString());

  // 홈 맨 위 오른쪽 레벨
  function renderLevelCard() {
    const el = $('lv-widget');
    if (!el) return;
    const lv = levelOf(U.xp), cur = xpForLevel(lv), next = xpForLevel(lv + 1), isMax = lv >= MAX_LEVEL;
    const stars = isMax ? starsOf(U.xp) : 0;
    const starIn = isMax ? (U.xp - xpForLevel(MAX_LEVEL)) - stars * STAR_XP : 0;   // 다음 별까지 모은 경험치
    const pct = isMax ? starIn / STAR_XP : Math.max(0, Math.min(1, (U.xp - cur) / (next - cur)));
    const C2 = 2 * Math.PI * 40;
    const st = Math.min(LV_STAGES.length - 1, Math.floor((lv - 1) / 3));
    const [ca, cb] = LV_STAGES[st];
    el.className = 'lv-widget ' + lvStageClasses(st);
    el.style.setProperty('--lv-a', ca); el.style.setProperty('--lv-b', cb);
    const sparks = st >= 21 ? '<i class="lv-spark s1"></i><i class="lv-spark s2"></i><i class="lv-spark s3"></i><i class="lv-spark s4"></i>' : '';
    const crown = st >= 30 ? `<span class="lv-crown" aria-hidden="true"><svg viewBox="0 0 24 16"><path d="M2 14 4 4l5 5 3-7 3 7 5-5 2 10z"/></svg></span>` : '';
    const pips = st >= 9 ? `<span class="lv-pips" aria-hidden="true">${'<i></i>'.repeat(Math.min(5, Math.floor((st - 9) / 5) + 1))}</span>` : '';
    el.innerHTML = `<div class="lv-ring">${crown}<span class="lv-orbit"></span>${sparks}<svg viewBox="0 0 96 96" aria-hidden="true">
        <defs><linearGradient id="lvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ca}"/><stop offset="1" stop-color="${cb}"/></linearGradient></defs>
        <circle class="lv-track" cx="48" cy="48" r="40"/>
        ${st >= 26 ? '<circle class="lv-track2" cx="48" cy="48" r="46"/>' : ''}
        <circle class="lv-arc" cx="48" cy="48" r="40" stroke-dasharray="${C2.toFixed(1)}" stroke-dashoffset="${(C2 * (1 - pct)).toFixed(1)}"/></svg>
        <span class="lv-num"><small>LEVEL</small>${lv}</span></div>
      <div class="lv-info">${pips || stars ? `<span class="lv-kicker">${pips}${stars ? `<span class="lv-stars">★ ${stars}</span>` : ''}</span>` : ''}<b>${titleOf(lv)}</b>
        <span class="lv-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></span>
        <span class="lv-xp num">${isMax ? `${fmtXp(starIn)} <small>/ ${fmtXp(STAR_XP)} XP</small>` : `${fmtXp(U.xp)} <small>/ ${fmtXp(next)} XP</small>`}</span></div>`;
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
    const bigEl = dEl.closest('.big'); if (bigEl) bigEl.dataset.dig = String(d).length;   // 자릿수가 늘면 글자를 조금 줄여 한 줄 유지
    $('h-clock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const best = U.bestMs || 0;
    $('h-best').textContent = best || ms > MIN ? fmtDur(Math.max(best, ms)) : '첫 기록 쌓는 중';
    $('h-record').classList.toggle('hidden', !(best > 0 && ms > best));
    const x = mult();
    $('h-mult').textContent = fmtX(x);
    const rm = rewMs();
    const next = MILESTONES.find((y) => y.ms > rm);
    if (next) {
      const i = MILESTONES.indexOf(next);
      const from = i > 0 ? MILESTONES[i - 1].ms : 0;
      $('h-bar').style.width = (((rm - from) / (next.ms - from)) * 100).toFixed(2) + '%';
      $('h-bar-l').innerHTML = `다음 배지 <b>${next.label}</b>`;
      $('h-bar-r').textContent = `${fmtDur(next.ms - rm)} 남음`;
    } else {
      $('h-bar').style.width = '100%';
      $('h-bar-l').innerHTML = '<b>모든 배지 달성</b>';
      $('h-bar-r').textContent = '';
    }
    if ($('cb-bar') && U.comeback) {
      const c = U.comeback;
      $('cb-bar').style.width = Math.min(100, (ms / c.targetMs) * 100).toFixed(2) + '%';
      $('cb-l').textContent = `${Math.floor(Math.min(100, (ms / c.targetMs) * 100))}%`;
      $('cb-r').textContent = `${fmtDur(c.targetMs - ms)} 남음`;
    }
  }

  let journalBusy = false;
  async function saveJournal() {
    const inp = $('journal-input');
    if (!inp || journalBusy) return;
    const text = (inp.value || '').trim();
    const yk = yesterdayOpen();
    if (ui.jDay === 'y' && !yk) { ui.jDay = 't'; toast('어제 한 줄은 정오까지 쓸 수 있어요'); renderHome(); return; }
    const key = ui.jDay === 'y' ? yk : dateKey(now());
    const prev = S.journal[key];
    const score = ui.score;
    if (score == null) { toast('별점을 매겨 주세요'); return; }
    if (!text) { toast('한 줄이라도 적어주세요'); return; }
    const entry = { text, score, q: (prev && prev.q) || questionFor(key), updatedAt: now() };
    journalBusy = true;
    try {
      // 화면에 먼저 넣어요 (두 번 눌러도 경험치는 한 번만)
      S.journal[key] = { ...(prev || {}), id: key, ...entry };
      ui.editJournal = false; ui.score = null; ui.jDay = 't';
      inp.value = '';
      const pr = db.set(`${userPath()}/journal/${key}`, entry);
      const js = journalStreak();
      // 그날 한 줄 경험치를 이미 받았으면(다른 기기 포함) 다시 주지 않아요
      if (!prev && !dailyOf(key).jXp) {
        const got = await gainFixed(XP.journal);
        await saveDaily(key, { jXp: got }, { xp: U.xp });
        savePublic();
        toast(js > 1 ? `${js}일 연속! (+${got} XP)` : `저장했어요 (+${got} XP)`);
      } else toast(prev ? '고쳤어요' : '저장했어요');
      await pr;
      checkGoals(); checkAchievements();
    } catch (e) { toast('저장하지 못했어요'); }
    finally { journalBusy = false; }
    renderHome();
  }

  /* ====================== 종료 · 시작하기 ====================== */
  const HOLD_MS = 3000;
  let hold = null;
  function holdStart(el) {
    if (hold) return;
    el.classList.add('holding');
    hold = { el, t0: now(), timer: setTimeout(() => holdDone(el), HOLD_MS) };
    showWhyPop(true);
  }
  function holdEnd(cancelled) {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold.el.classList.remove('holding');
    if (cancelled && now() - hold.t0 < 450) toast('종료는 3초 동안 꾹 눌러주세요');
    hold = null;
    showWhyPop(false);
    if (viewStale) setTimeout(refreshUi, 0);
  }
  function holdDone(el) {
    if (!hold) return;
    hold = null;
    el.classList.remove('holding');
    showWhyPop(false);
    try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    openEndGate();
  }
  function openEndGate() {
    const w = randWhy();
    openSheet(`<h2>정말 종료할까요?</h2>
      ${w ? `<p class="gate-why"><span>내가 시작한 이유</span>${esc(w)}</p>` : ''}
      <p class="muted">${U.urgeMinutes || 10}분만 참아볼까요?</p>
      <div class="sheet-actions"><button class="btn danger-ghost" data-go-end type="button">이미 무너졌어요</button>
      <button class="btn primary" data-go-urge type="button">참기 해볼게요</button></div>`,
    (el) => {
      el.querySelector('[data-go-end]').onclick = () => { closeSheet(); openEnd(); };
      el.querySelector('[data-go-urge]').onclick = () => { closeSheet(); openUrge(false); };
    });
  }

  let endReason = null, resetAt = 0;
  let endSits = [];
  function openEnd() {
    if (!isActive()) return;
    endReason = null; endSits = [];
    $('reset-sub').textContent = `${fmtDur(curMs())} 버텼어요`;
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
    resetAt = now();
    show($('modal-reset'));
  }

  async function doEnd() {
    if (!endReason) { $('reset-error').textContent = '이유를 하나 골라주세요.'; return; }
    if (!isActive()) { hide($('modal-reset')); return; }
    const t = now();
    const dur = t - U.startAt;
    const prev = { startAt: U.startAt, bestMs: U.bestMs || 0, xpHours: U.xpHours || 0, comeback: U.comeback || null, recordBreaks: U.recordBreaks || 0, endedAt: U.endedAt || null, lastDur: U.lastDur || 0, multFloor: U.multFloor || 0, honestDay: U.honestDay || '' };
    const multFloor = Math.max(0, curTier() - 1);
    const today = dateKey(t);
    const honest = dur >= HOUR && U.honestDay !== today ? XP.honest : 0;
    const streak = { start: U.startAt, end: t, durationMs: dur, reason: endReason, situations: endSits, memo: $('reset-memo').value.trim() };
    const recordBreaks = (U.recordBreaks || 0) + (prev.bestMs > 0 && dur > prev.bestMs ? 1 : 0);
    $('reset-confirm').disabled = true;
    try {
      const id = await db.add(`${userPath()}/streaks`, streak);
      S.streaks.push({ id, ...streak });
      if (honest) await addXp(honest);
      // 종료는 '시작 시각'이 그대로일 때만 (다른 기기에서 이미 종료·재시작했으면 덮어쓰지 않아요)
      await saveUser({ startAt: null, endedAt: t, lastDur: dur, bestMs: Math.max(prev.bestMs, dur), xpHours: 0, comeback: null, urge: null, recordBreaks, multFloor, xp: U.xp, ...(honest ? { honestDay: today } : {}) }, { guard: ['startAt', 'honestDay'] });
      savePublic(true);
      hide($('modal-reset'));
      if (ui.tab === 'home') renderHome(); else if (ui.tab === 'records') renderRecords();
      toast(honest ? `솔직하게 기록했어요 +${honest} XP · 보상 ${fmtX(TIER_X[multFloor])} 유지` : `종료했어요 · 보상 ${fmtX(TIER_X[multFloor])} 유지`, () => undoEnd(id, prev, honest), 10000);
      checkAchievements();
    } catch (e) { $('reset-error').textContent = '저장하지 못했어요. 다시 시도해 주세요.'; }
    $('reset-confirm').disabled = false;
  }

  async function undoEnd(id, prev, honest) {
    if (isActive()) return toast('이미 다시 시작했어요');
    try {
      await db.del(`${userPath()}/streaks/${id}`);
      S.streaks = S.streaks.filter((s) => s.id !== id);
      if (honest) await addXp(-honest);
      await saveUser({ ...prev, xp: U.xp }, { guard: ['startAt'] });
      savePublic(true);
      if (ui.tab === 'home') renderHome(); else if (ui.tab === 'records') renderRecords();
      toast('되돌렸어요');
    } catch (e) { toast('되돌리지 못했어요'); }
  }

  async function startAgain() {
    if (isActive()) return;
    const t = now();
    const comeback = U.lastDur >= DAY ? { startAt: t, prevMs: U.lastDur, targetMs: Math.round(U.lastDur / 2 / MIN) * MIN } : null;
    try { await saveUser({ startAt: t, endedAt: null, xpHours: 0, comeback }); } catch (e) { renderHome(); return; }
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
    const w = randWhy(), uw = $('urge-why');
    if (uw) { uw.innerHTML = w ? `<span>내가 시작한 이유</span>${esc(w)}` : ''; uw.classList.toggle('hidden', !w); }
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
    const d0 = dayStart(u.startedAt);
    const before = S.urges.filter((x) => x.result === 'win' && x.at >= d0 && x.at < addDays(d0, 1)).length;
    try {
      const id = await db.add(`${userPath()}/urges`, rec);
      S.urges.push({ id, ...rec });
    } catch (e) {}
    const fields = { urge: null };
    let got = 0;
    if (result === 'win') {
      fields.urgeWins = (U.urgeWins || 0) + 1;
      const base = URGE_XP[before] || 0;
      if (base) { got = await gain(base); fields.xp = U.xp; }
    }
    try { await saveUser(fields); } catch (e) {}
    savePublic();
    if (ui.tab === 'home') renderHome();
    if (result === 'win') toast(got ? `충동을 이겨냈어요! (+${got} XP)` : '충동을 이겨냈어요!');
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
    let kept = 0, allKeptDays = 0, pledgesMade = 0, maxDayPledges = 0;
    Object.keys(U.daily || {}).forEach((k) => {
      const ps = pledgesOf(k);
      pledgesMade += Math.max(ps.length, dailyOf(k).pledgeXpCount || 0); maxDayPledges = Math.max(maxDayPledges, ps.length);
      const y = ps.filter((p) => p.check === 'yes').length;
      kept += y;
      if (ps.length >= 3 && y === ps.length) allKeptDays++;
    });
    const goalsSet = Object.values(U.monthGoals || {}).reduce((n, l) => n + l.length, 0);
    let goalsDone = 0, goalAllMonths = 0, run = 0, bestRun = 0, prev = null;
    Object.keys(U.monthGoals).sort().forEach((mk) => {
      const list = goalsOf(mk);
      const d = list.filter((s) => s.state === 'done').length;
      goalsDone += d;
      if (list.length >= 3 && d === list.length) goalAllMonths++;
      if (d) { run = prev && nextMonthKey(prev) === mk ? run + 1 : 1; bestRun = Math.max(bestRun, run); prev = mk; } else { run = 0; prev = null; }
    });
    let calmDays = 0, calmRun = 0, cr = 0;
    for (let d = dayStart(Math.max(U.trackStart, U.rewardFrom || 0)); addDays(d, 1) <= now(); d = addDays(d, 1)) {
      if (calmDay(d)) { calmDays++; cr++; calmRun = Math.max(calmRun, cr); } else cr = 0;
    }
    // 보상 시작 이후의 누적 기록
    const rf = Math.max(U.trackStart, U.rewardFrom || 0);
    let okDays = 0;
    for (let d = dayStart(rf); addDays(d, 1) <= now(); d = addDays(d, 1)) if (okDay(d)) okDays++;
    let perfectWeeks = 0;
    for (let w = addDays(weekStart(rf), weekStart(rf) < rf ? 7 : 0); addDays(w, 7) <= now(); w = addDays(w, 7)) {
      if (!endsIn(w, addDays(w, 7)).length && detoxIn(w, addDays(w, 7)) >= 7 * DAY - MIN) perfectWeeks++;
    }
    const lessons = (U.lessons || []).reduce((n, c) => n + ((c.items || []).length), 0);
    const today = dayStart(now());
    const recent = urgesIn(addDays(today, -7), today).length, past = urgesIn(addDays(today, -28), addDays(today, -21)).length;
    const halved = past >= 2 && addDays(today, -28) >= dayStart(U.trackStart) && recent * 2 <= past ? 1 : 0;
    return {
      calmDays, calmRun, halved,
      wins: wins.length, maxDayWins: Math.max(0, ...Object.values(byDay)), riskWins: wins.filter((u) => inRisk(u.at)).length,
      journals: Object.keys(S.journal).length, jBest: journalBest(),
      sitResets: S.streaks.filter((s) => s.situations && s.situations.length).length,
      comebacks: U.comebackDone || 0, recordBreaks: U.recordBreaks || 0,
      goalsDone, goalAllMonths, goalRun: bestRun, kept, allKeptDays,
      friends: U.maxFriends || 0, top1: U.wasTop1 ? 1 : 0,
      attBest: (U.attend && U.attend.best) || 0, attTotal: (U.attend && U.attend.total) || 0,
      detoxDays: Math.floor(detoxIn(rf, now()) / DAY), okDays, perfectWeeks, lessons,
      tries: S.urges.length, pledgesMade, maxDayPledges, goalsSet, scores: new Set(Object.values(S.journal).map(jScore).filter((v) => v != null)).size,
      qAnswered: new Set(Object.values(S.journal).map((j) => j.q).filter(Boolean)).size,
      ...focusStats(), ...growthStats(),
      quotesN: (U.quotes || []).length, examsSet: (U.exams || []).length, reportSeen: U.reportSeen ? 1 : 0,
      badgeCount: Object.keys(U.badges || {}).length, achCount: Object.keys(U.achievements || {}).length,
      stars: starsOf(U.xp), level: levelOf(U.xp), examClean: U.exams.filter((e) => e.clean).length + (U.examCleanOld || 0),
    };
  }

  function growthStats() {
    const wk = Object.keys(U.weekReviews).sort();
    let run = 0, best = 0, prev = null;
    wk.forEach((k) => { run = prev && dateKey(addDays(keyTs(prev), 7)) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; });
    const items = (U.lessons || []).flatMap((c) => c.items || []);
    return {
      whys: (U.whys || []).length,
      endReviews: Object.values(U.daily || {}).filter((d) => d.review && !d.review.skip).length,
      weekReviews: wk.length, weekRun: best,
      oneKept: Object.values(U.weekReviews).filter((r) => r.prevKept === 'yes').length,
      monthReviews: Object.keys(U.monthReviews).length,
      examReviews: U.exams.filter((e) => { const r = exRvOf(e); return r && !r.skip; }).length,
      exps: (U.experiments || []).filter((x) => x.doneAt && x.days >= EXP_XP_MIN).length,
      fits: fitsList().filter((x) => x.days >= EXP_XP_MIN).length,
      lessonRv: U.lessonRvCount || 0,
      learned: items.filter((i) => i.learned).length,
      lettersWritten: (U.letters || []).length,
      lettersOpened: (U.letters || []).filter((l) => l.openedAt).length,
    };
  }

  // 끝난 시험 기간을 종료 없이 지켰는지 한 번씩 확인
  async function checkExams() {
    let changed = false;
    const exams = U.exams.map((e) => {
      const st = examStatus(e);
      if (st.state !== 'over' || e.evaluated) return e;
      changed = true;
      const clean = st.ps >= Math.max(U.trackStart, U.rewardFrom || 0) && !endsIn(st.ps, st.pe).length && detoxIn(st.ps, st.pe) >= (st.pe - st.ps) - MIN;
      if (clean) celebrate({ medal: 'A+', kind: 'alt', kicker: '시험 기간 완주', title: `${eul(e.name)} 종료 없이 버텼어요!`, sub: '가장 힘든 때를 이겨냈어요.' });
      return { ...e, evaluated: true, clean };
    });
    if (changed) { try { await saveUser({ exams }); } catch (e) {} }
  }

  let achBusy = false, achAgain = false;
  async function checkAchievements() {
    if (!U) return;
    if (achBusy) { achAgain = true; return; }
    achBusy = true;
    try { await checkAchRun(); } catch (e) {} finally { achBusy = false; }
    if (achAgain && U) { achAgain = false; checkAchievements(); }
  }
  async function checkAchRun() {
    await checkExams();
    if (!U) return;
    const st = achStats();
    const have = U.achievements || {}, got = {};
    const fresh = ACHS.filter((a) => !have[a.id] && st[a.key] >= a.need);
    if (fresh.length) {
      let xp = 0;
      fresh.forEach((a) => { got[a.id] = now(); xp += TIERS[a.tier].xp; });
      await addXp(xp);
      try { await saveUser({ achievements: got, xp: U.xp }); } catch (e) {}
      savePublic();
      if (fresh.length > 3) {
        const top = fresh.reduce((b, a) => ('crlm'.indexOf(a.tier) > 'crlm'.indexOf(b.tier) ? a : b));
        celebrate({ medal: TIERS[top.tier].star, kind: 'tier-' + top.tier, kicker: '업적 달성', title: `업적 ${fresh.length}개를 한꺼번에 달성했어요!`, sub: fresh.slice(0, 4).map((a) => a.name).join(' · ') + (fresh.length > 4 ? ` 외 ${fresh.length - 4}개` : ''), xp });
      } else fresh.forEach((a) => celebrate({ medal: TIERS[a.tier].star, kind: 'tier-' + a.tier, kicker: `${TIERS[a.tier].name} 업적 달성`, title: a.name, sub: a.desc, xp: TIERS[a.tier].xp }));
      if (ui.tab === 'home') renderLevelCard();
      if (ui.tab === 'records' && ui.recTab === 'achieve') renderRecords();
    }
  }

  function achCard() {
    const st = achStats();
    const got = U.achievements || {};
    const cats = [...new Set(ACHS.map((a) => a.cat))];
    const done = ACHS.filter((a) => got[a.id]).length;
    return `<section class="card">
      <div class="sec-head"><h2>업적</h2><span class="muted small">${done}/${ACHS.length} 달성</span></div>
      <div class="bar thin" style="margin-bottom:6px"><div class="fill" style="width:${((done / ACHS.length) * 100).toFixed(1)}%"></div></div>
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
    let jdays = 0, att = 0, pledged = 0, kept = 0, okDays = 0, days = 0, calm = 0;
    for (let d = dayStart(Math.max(a, U.trackStart)); d < end; d = addDays(d, 1)) {
      const k = dateKey(d);
      days++;
      if (S.journal[k]) jdays++;
      if (dailyOf(k).att) att++;
      const ps = pledgesOf(k);
      pledged += ps.length; kept += ps.filter((p) => p.check === 'yes').length;
      if (okDay(d)) okDays++;
      if (calmDone(d)) calm++;
    }
    const ach = Object.values(U.achievements || {}).filter((t) => t >= a && t < b).length;
    const study = studyIn(a, end) + (U.focus && now() >= a && now() < b ? focusRunMs() : 0);
    const score = avgScoreIn(Math.max(a, dayStart(U.trackStart)), end);
    return { study, score, calm, ends: ends.length, tries: tries.length, wins, longest: longestIn(a, end), detox: detoxIn(Math.max(a, U.trackStart), end), topReason: topOf(reasons), topSit: topOf(sits), weakBucket: topOf(buckets), jdays, att, pledged, kept, okDays, days, ach };
  }

  // 충동 추세: 줄면 좋은 쪽(초록), 늘면 빨강
  function trendHtml(curN, prevN) {
    const d = curN - prevN;
    if (!d) return '<span class="trend same">–</span>';
    return `<span class="trend ${d < 0 ? 'good' : 'bad'}">${d < 0 ? '▼' : '▲'}${Math.abs(d)}</span>`;
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
    if (p.tries && r.tries < p.tries) notes.push(`충동이 전 주보다 <b>${p.tries - r.tries}번</b> 줄었어요`);
    if (r.calm) notes.push(`고요한 날 <b>${r.calm}일</b>`);
    if (r.pledged) notes.push(`다짐 <b>${r.kept}/${r.pledged}</b> 지킴`);
    if (r.jdays) notes.push(`한 줄 <b>${r.jdays}일</b>`);
    notes.push(...scoreNotes(ws, addDays(ws, 7)));
    const wk = dateKey(ws), rv = U.weekReviews[wk];
    const canRv = !rv && weekEligible(wk) && now() >= addDays(ws, 6);
    return `<section class="card">
      <div class="sec-head"><h2>주간 리포트</h2>
        <div class="week-nav">
          <button class="icon-btn small" data-act="week-prev" type="button" aria-label="이전 주" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <span class="label">${label} · ${mdShort(ws)}–${mdShort(addDays(ws, 6))}</span>
          <button class="icon-btn small" data-act="week-next" type="button" aria-label="다음 주" ${ui.weekOff > 0 ? '' : 'disabled'}>${ICON.right}</button>
        </div></div>
      <div class="tiles">
        <div class="tile"><div class="k">종료</div><div class="v">${r.ends}<small>번</small></div>
          </div>
        <div class="tile"><div class="k">디톡스한 시간</div><div class="v">${fmtDur(r.detox)}</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div></div>
        <div class="tile"><div class="k">충동</div><div class="v">${r.tries}<small>번</small>${trendHtml(r.tries, p.tries)}</div></div>
        <div class="tile"><div class="k">공부 시간</div><div class="v">${fmtDur(r.study)}</div></div>
        <div class="tile"><div class="k">평균 별점</div><div class="v">${r.score ? `★${fmtScore(r.score.avg)}` : '-'}</div></div>
      </div>
      ${scoreBars(ws, 7)}
      ${notes.length ? `<ul class="report-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
      ${rv ? `<div class="rv-box"><div class="rv-box-h"><b>회고</b><button class="link" data-act="week-review" data-k="${wk}" type="button">고치기</button></div>
        ${rv.prevKept ? `<p><span class="rv-k">지난주 한 가지</span>${KEPT_TXT[rv.prevKept]}</p>` : ''}
        <p><span class="rv-k">잘한 것</span>${esc(rv.good)}</p><p><span class="rv-k">다음 주 한 가지</span>${esc(rv.next)}</p></div>`
        : canRv ? `<button class="btn primary wide rv-btn" data-act="week-review" data-k="${wk}" type="button">이 주 회고 쓰기</button>` : ''}
    </section>`;
  }

  function monthCard() {
    const base = new Date(); base.setDate(1); base.setHours(0, 0, 0, 0);
    base.setMonth(base.getMonth() - ui.monthOff);
    const mk = monthKey(base.getTime());
    const [a, b] = monthRange(mk);
    const pmk = prevMonthKey(mk);
    const [pa, pb] = monthRange(pmk);
    const r = rangeReport(a, b);
    const m = base.getMonth() + 1;
    const gl = goalsOf(mk);
    const ts = new Date(U.trackStart);
    const canPrev = a > new Date(ts.getFullYear(), ts.getMonth(), 1).getTime();
    const label = ui.monthOff === 0 ? `${m}월 (진행 중)` : `${base.getFullYear()}년 ${m}월`;
    // 지난달의 나와 비교 (진행 중인 달은 지난달 같은 기간과)
    let cmp = '';
    if (U.trackStart < pb) {
      const ongoing = b > now();
      const pEnd = ongoing ? Math.min(pb, pa + (now() - a)) : pb;
      const t = cmpHtml(periodRows(pa, pEnd, a, b, true), [ongoing ? `지난달 같은 기간` : `${mkLabel(pmk)}`, ongoing ? '이번 달' : `${m}월`]);
      if (t.total) cmp = `<div class="me-cmp"><div class="me-cmp-h"><h3>지난달의 나</h3><span class="muted small">${t.total}개 중 <b>${t.better}개</b>가 나아졌어요</span></div>${t.html}</div>`;
    }
    const notes = [];
    if (gl.length) notes.push(`${m}월 목표 <b>${gl.filter((s) => s.state === 'done').length}/${gl.length}</b> 달성`);
    if (r.days) notes.push(`${r.days}일 중 <b>${r.okDays}일</b>을 종료 없이 지켰어요`);
    if (r.calm) notes.push(`고요한 날 <b>${r.calm}일</b>`);
    if (r.pledged) notes.push(`다짐 <b>${r.kept}/${r.pledged}</b> 지킴`);
    if (r.topReason) notes.push(`가장 많이 무너진 이유는 <b>${esc(r.topReason)}</b>`);
    if (r.topSit) notes.push(`무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b>`);
    notes.push(...scoreNotes(a, b));
    if (r.ach) notes.push(`업적 <b>${r.ach}개</b> 달성`);
    const rv = U.monthReviews[mk];
    const canRv = !rv && b <= now() && U.trackStart < b - 3 * DAY;
    const nDays = Math.round((b - a) / DAY);
    return `<section class="card">
      <div class="sec-head"><h2>월간 리포트</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="month-prev" type="button" aria-label="이전 달" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <span class="label">${label}</span>
          <button class="icon-btn small" data-act="month-next" type="button" aria-label="다음 달" ${ui.monthOff > 0 ? '' : 'disabled'}>${ICON.right}</button></div></div>
      ${cmp}
      <div class="tiles">
        <div class="tile"><div class="k">종료</div><div class="v">${r.ends}<small>번</small></div></div>
        <div class="tile"><div class="k">디톡스한 시간</div><div class="v">${fmtDur(r.detox)}</div></div>
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div></div>
        <div class="tile"><div class="k">충동</div><div class="v">${r.tries}<small>번</small></div></div>
        <div class="tile"><div class="k">공부 시간</div><div class="v">${fmtDur(r.study)}</div></div>
        <div class="tile"><div class="k">평균 별점</div><div class="v">${r.score ? `★${fmtScore(r.score.avg)}` : '-'}</div></div>
      </div>
      ${scoreBars(a, nDays)}
      ${notes.length ? `<ul class="report-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
      ${rv ? `<div class="rv-box"><div class="rv-box-h"><b>회고</b><button class="link" data-act="month-review" data-k="${mk}" type="button">고치기</button></div>
        <p><span class="rv-k">가장 잘한 것</span>${esc(rv.best)}</p><p><span class="rv-k">아쉬운 것</span>${esc(rv.regret)}</p><p><span class="rv-k">다음 달에 바꿀 것</span>${esc(rv.change)}</p></div>`
        : canRv ? `<button class="btn primary wide rv-btn" data-act="month-review" data-k="${mk}" type="button">${m}월 회고 쓰기</button>` : ''}
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
      months.push({ m: m + 1, ok: rr.days ? rr.okDays / rr.days : 0, ends: rr.ends, sc: rr.score });
    }
    const bestMonth = months.length ? months.reduce((p, c) => (c.ok > p.ok ? c : p)) : null;
    const scored = months.filter((x) => x.sc && x.sc.n >= 3);
    const bestScore = scored.length ? scored.reduce((p, c) => (c.sc.avg > p.sc.avg ? c : p)) : null;
    const changes = Object.keys(U.monthReviews).map((mk) => ({ mk: nextMonthKey(mk), t: U.monthReviews[mk].change })).filter((x) => x.t && x.mk.startsWith(y + '-')).sort((a, b) => a.mk.localeCompare(b.mk));
    const goalsDone = Object.keys(U.monthGoals).filter((mk) => mk.startsWith(y + '-')).reduce((s, mk) => s + goalsOf(mk).filter((x) => x.state === 'done').length, 0);
    const canPrev = new Date(U.trackStart).getFullYear() < y;
    return `<section class="card year-card">
      <div class="sec-head"><h2>${y}년 결산${ongoing ? ' <span class="muted small">(진행 중)</span>' : ''}</h2>
        <div class="week-nav"><button class="icon-btn small" data-act="year-prev" type="button" aria-label="이전 해" ${canPrev ? '' : 'disabled'}>${ICON.left}</button>
          <button class="icon-btn small" data-act="year-next" type="button" aria-label="다음 해" ${y < new Date().getFullYear() ? '' : 'disabled'}>${ICON.right}</button></div></div>
      <div class="year-hero"><span class="muted small">디톡스한 시간</span><b class="num">${Math.floor(r.detox / DAY)}<small>일</small> ${Math.floor((r.detox % DAY) / HOUR)}<small>시간</small></b></div>
      <div class="tiles">
        <div class="tile"><div class="k">가장 길게 버틴 시간</div><div class="v">${fmtDur(r.longest)}</div></div>
        <div class="tile"><div class="k">종료 없이 지킨 날</div><div class="v">${r.okDays}<small>일</small></div></div>
        <div class="tile calm"><div class="k">고요한 날</div><div class="v">${r.calm}<small>일</small></div></div>
        <div class="tile"><div class="k">공부 시간</div><div class="v">${fmtDur(r.study)}</div></div>
        <div class="tile"><div class="k">평균 별점</div><div class="v">${r.score ? `★${fmtScore(r.score.avg)}` : '-'}</div></div>
        <div class="tile"><div class="k">한 줄 쓴 날</div><div class="v">${r.jdays}<small>일</small></div></div>
      </div>
      <ul class="report-notes">
        ${bestMonth ? `<li>가장 잘 버틴 달은 <b>${bestMonth.m}월</b> (종료 ${bestMonth.ends}번)</li>` : ''}
        ${bestScore ? `<li>별점이 가장 높았던 달은 <b>${bestScore.m}월</b> (★${fmtScore(bestScore.sc.avg)})</li>` : ''}
        ${r.kept ? `<li>다짐 <b>${r.kept}개</b>를 지켰어요</li>` : ''}
        ${r.ach ? `<li>업적 <b>${r.ach}개</b>를 새로 달성했어요</li>` : ''}
        ${r.topReason ? `<li>올해 가장 큰 적은 <b>${esc(r.topReason)}</b>였어요</li>` : ''}
        ${r.topSit ? `<li>무너질 때 가장 많았던 상황은 <b>${esc(r.topSit)}</b></li>` : ''}
        <li>${ongoing ? '남은 날도 지금처럼!' : '한 해 동안 수고 많았어요. 내년에도 함께 가요.'}</li>
      </ul>
      ${changes.length ? `<h3 class="yr-tl-h">한 해 동안 바꾸려 한 것</h3><ol class="yr-tl">${changes.map((x) => `<li><span class="num">${Number(x.mk.split('-')[1])}월</span>${esc(x.t)}</li>`).join('')}</ol>` : ''}
    </section>`;
  }

  /* ====================== 기록 화면 ====================== */
  function renderRecords() {
    const el = $('page-records');
    const tabs = [['report', '리포트'], ['calendar', '달력'], ['stats', '통계'], ['achieve', '업적'], ['lessons', '교훈'], ['growth', '성장']];
    const body = ui.recTab === 'growth' ? growthHtml() : ui.recTab === 'lessons' ? lessonsHtml()
      : ui.recTab === 'calendar' ? calendarCard() + journalCard()
      : ui.recTab === 'stats' ? statsCard() + patternCard() + badgesCard()
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

  /* ====================== 교훈 ====================== */
  const LESSON_CAT_MAX = 12, LESSON_MAX = 100;
  function lessonsHtml() {
    const cats = U.lessons;
    return `${cats.map((c) => `
      <section class="card lesson-card" data-cat="${esc(c.id)}">
        <div class="sec-head">${ui.editLessonCat === c.id
          ? `<div class="inline-add ls-rename"><input id="ls-rename-${esc(c.id)}" maxlength="20" value="${esc(c.name)}" /><button class="btn small primary" data-act="ls-rename-save" data-cat="${esc(c.id)}" type="button">저장</button></div>`
          : `<h2>${esc(c.name)} <span class="ls-count">${c.items.length}</span></h2>
            <div class="row-acts"><button class="icon-btn small" data-act="ls-rename" data-cat="${esc(c.id)}" type="button" aria-label="이름 바꾸기">${ICON.edit}</button>
            <button class="icon-btn small" data-act="ls-del-cat" data-cat="${esc(c.id)}" type="button" aria-label="종류 지우기">${ICON.x}</button></div>`}</div>
        ${c.items.length ? `<ol class="ls-list" data-cat="${esc(c.id)}">${c.items.map((it, i) => `
          <li class="ls-item${it.learned ? ' learned' : ''}" data-id="${esc(it.id)}"><span class="ls-num">${i + 1}</span>
            <button class="ls-text" data-act="ls-edit" data-cat="${esc(c.id)}" data-id="${esc(it.id)}" type="button">${esc(it.text)}${it.learned ? `<span class="ls-learned">${ICON.check}익힘</span>` : ''}</button>
            <span class="ls-handle" aria-label="끌어서 순서 바꾸기" role="button" tabindex="-1">${ICON.grip}</span></li>`).join('')}</ol>` : ''}
        ${c.items.length < LESSON_MAX ? `<div class="inline-add"><input id="ls-new-${esc(c.id)}" data-cat="${esc(c.id)}" class="ls-new" maxlength="80" placeholder="새 교훈" /><button class="btn" data-act="ls-add" data-cat="${esc(c.id)}" type="button">추가</button></div>` : ''}
      </section>`).join('')}
      ${cats.length < LESSON_CAT_MAX ? `<section class="card"><div class="inline-add"><input id="ls-new-cat" maxlength="20" placeholder="새 종류 (예: 운동 교훈)" /><button class="btn primary" data-act="ls-add-cat" type="button">${ICON.plus}종류 추가</button></div></section>` : ''}`;
  }
  async function saveLessons(lessons, msg) {
    try { await saveUser({ lessons }); if (msg) toast(msg); } catch (e) {}
    if (ui.tab === 'records' && ui.recTab === 'lessons') renderRecords();
  }
  const cloneLessons = () => U.lessons.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) }));
  function lessonAdd(catId) {
    const inp = $('ls-new-' + catId);
    const v = inp && inp.value.trim();
    if (!v) return;
    const ls = cloneLessons();
    const c = ls.find((x) => x.id === catId);
    if (!c) return;
    c.items.push({ id: 'i' + uid6(), text: v, at: now(), rv: 0 });
    saveLessons(ls).then(() => { const n = $('ls-new-' + catId); if (n) n.focus(); });
  }
  function lessonAddCat() {
    const v = $('ls-new-cat').value.trim();
    if (!v) return;
    if (U.lessons.some((c) => c.name === v)) return toast('이미 있는 종류예요');
    saveLessons([...cloneLessons(), { id: 'c' + uid6(), name: v, items: [] }]);
  }
  function lessonEdit(catId, id) {
    const c = U.lessons.find((x) => x.id === catId), it = c && c.items.find((x) => x.id === id);
    if (!it) return;
    openSheet(`<h2>${esc(c.name)}</h2>
      <textarea id="ls-edit-input" maxlength="80" rows="3">${esc(it.text)}</textarea>
      ${it.learned ? '<button class="link" data-unlearn type="button" style="margin-top:8px">익힘 풀고 다시 보기</button>' : ''}
      <div class="sheet-actions"><button class="btn danger-ghost" data-del type="button">지우기</button><button class="btn primary" data-ok type="button">저장</button></div>`,
    (el) => {
      const ul = el.querySelector('[data-unlearn]');
      if (ul) ul.onclick = () => {
        closeSheet();
        const ls = cloneLessons(); const cc = ls.find((x) => x.id === catId);
        cc.items = cc.items.map((x) => (x.id === id ? { ...x, learned: null, rv: 0, at: now() } : x));
        saveLessons(ls, '다시 보기로 돌렸어요');
      };
      el.querySelector('[data-del]').onclick = () => {
        closeSheet();
        const ls = cloneLessons(); const cc = ls.find((x) => x.id === catId);
        cc.items = cc.items.filter((x) => x.id !== id);
        saveLessons(ls);
      };
      el.querySelector('[data-ok]').onclick = () => {
        const v = $('ls-edit-input').value.trim();
        if (!v) return;
        closeSheet();
        const ls = cloneLessons(); const cc = ls.find((x) => x.id === catId);
        cc.items = cc.items.map((x) => (x.id === id ? { ...x, text: v } : x));
        saveLessons(ls);
      };
    });
  }
  // 손잡이(⋮⋮)를 끌어서 순서 바꾸기 — 마우스·터치 모두
  let lsDrag = null;
  function lsDragStart(e, handle) {
    const li = handle.closest('.ls-item'), list = li && li.parentElement;
    if (!li) return;
    e.preventDefault();
    lsDrag = { li, list, pid: e.pointerId, moved: false };
    li.classList.add('dragging');
    list.classList.add('sorting');
  }
  function lsDragMove(e) {
    if (!lsDrag || e.pointerId !== lsDrag.pid) return;
    e.preventDefault();
    const { li, list } = lsDrag;
    const items = [...list.children].filter((x) => x !== li);
    let before = null;
    for (const it of items) { const r = it.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = it; break; } }
    if (before !== li.nextElementSibling || (!before && list.lastElementChild !== li)) {
      list.insertBefore(li, before);
      lsDrag.moved = true;
      [...list.children].forEach((x, i) => { x.querySelector('.ls-num').textContent = i + 1; });
    }
  }
  function lsDragEnd(e) {
    if (!lsDrag || (e && e.pointerId !== lsDrag.pid)) return;
    const { li, list, moved } = lsDrag;
    lsDrag = null;
    li.classList.remove('dragging'); list.classList.remove('sorting');
    if (!moved) return;
    const order = [...list.children].map((x) => x.dataset.id);
    const ls = cloneLessons(); const c = ls.find((x) => x.id === list.dataset.cat);
    c.items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    saveLessons(ls);
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
    else status = calmDay(d0) ? 'calm' : 'urged';
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
      const dots = info.urges.length ? `<span class="u-dots">${'<i></i>'.repeat(Math.min(3, info.urges.length))}</span>` : '';
      cells += info.status !== 'future'
        ? `<button type="button" class="${cls}" data-act="sel-day" data-k="${key}" aria-label="${month + 1}월 ${d}일">${d}${dots}</button>`
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
        <span><i style="background:var(--calm)"></i>고요한 날</span>
        <span><i style="background:var(--calm-soft)"></i>지킨 날</span>
        <span><i class="lg-dot"></i>충동</span>
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
      ...S.focus.filter((f) => f.start >= info.d0 && f.start < info.d1).map((f) => ({ t: f.start, html: `<span class="tag f">집중</span><span>${f.subject ? `${esc(f.subject)} · ` : ''}${fmtDur(f.ms)}${f.done ? '' : ' (중간에 멈춤)'}</span>` })),
    ].sort((a, b) => a.t - b.t);
    const rv = dailyOf(key).review;
    const status = info.status === 'before' ? '기록 시작 전' : info.status === 'reset' ? `종료 ${info.ends.length}번` : info.status === 'off' ? '쉰 날' : info.status === 'calm' ? '고요한 날' : info.urges.length ? '참기로 버틴 날' : '지킨 날';
    return `<div class="day-detail">
      <h3>${dd.getMonth() + 1}월 ${dd.getDate()}일 (${DOW[dd.getDay()]}) · <span class="muted">${status}</span></h3>
      ${evs.length ? evs.map((e) => `<div class="ev"><span class="t">${hm(e.t)}</span>${e.html}</div>`).join('') : '<p class="empty">이날은 종료·참기·집중 기록이 없어요.</p>'}
      ${ps.length ? `<div class="ev"><span class="t">다짐</span><span>${ps.map((p) => `${p.check === 'yes' ? '✓' : p.check === 'no' ? '✗' : '·'} ${esc(p.text)}`).join(' &nbsp; ')}</span></div>` : ''}
      ${rv && !rv.skip ? `<div class="ev"><span class="t">돌아보기</span><span>${rv.before ? `${esc(rv.before)} → ` : ''}${esc(rv.next)}</span></div>` : ''}
      ${j ? `<div class="ev"><span class="t">한 줄</span><span class="ev-j">${jScore(j) != null ? starsHtml(jScore(j), 's-sm') : ''}${j.q ? `<small class="muted">${esc(j.q)}</small>` : ''}${esc(j.text)}</span></div>` : ''}
    </div>`;
  }

  function statsCard() {
    const done = S.streaks;
    const avg = done.length ? done.reduce((a, s) => a + s.durationMs, 0) / done.length : null;
    const today0 = dayStart(now());
    const u7 = urgesIn(addDays(today0, -6), now()).length, u14 = urgesIn(addDays(today0, -13), addDays(today0, -6)).length;
    const rw = riskiestWindow();
    const sc = avgScoreIn(dayStart(U.trackStart), now());
    return `<section class="card">
      <h2 style="margin-bottom:12px">통계</h2>
      <div class="tiles">
        <div class="tile"><div class="k">총 디톡스 시간</div><div class="v">${fmtDur(detoxIn(U.trackStart, now()))}</div></div>
        <div class="tile"><div class="k">최장 기록</div><div class="v">${fmtDur(Math.max(U.bestMs || 0, curMs()))}</div></div>
        <div class="tile"><div class="k">평균 기록</div><div class="v">${avg == null ? '-' : fmtDur(avg)}</div></div>
        <div class="tile calm"><div class="k">고요한 날</div><div class="v">${calmIn(U.trackStart, now())}<small>일</small></div></div>
        <div class="tile"><div class="k">최근 7일 충동</div><div class="v">${u7}<small>번</small>${trendHtml(u7, u14)}</div></div>
        <div class="tile"><div class="k">위험 시간대</div><div class="v">${rw ? hourRange(rw.from) : '-'}</div></div>
        <div class="tile"><div class="k">누적 공부 시간</div><div class="v">${fmtDur(studyIn(0, now() + DAY) + focusRunMs())}</div></div>
        <div class="tile"><div class="k">평균 별점</div><div class="v">${sc ? `★${fmtScore(sc.avg)}` : '-'}</div></div>
        <div class="tile"><div class="k">한 줄 연속</div><div class="v">${journalStreak()}<small>일</small></div></div>
      </div>
    </section>`;
  }

  function journalCard() {
    const keys = Object.keys(S.journal).sort().reverse();
    const shown = ui.journalAll ? keys : keys.slice(0, 7);
    const st = journalStreak();
    return `<section class="card">
      <div class="sec-head"><h2>한 줄 모아보기</h2><span class="muted small">${keys.length}일</span></div>
      ${keys.length ? `<div class="journal-list">${shown.map((k) => {
        const d = new Date(keyTs(k)), j = S.journal[k], v = jScore(j);
        return `<div class="jl"><span class="jd">${d.getMonth() + 1}.${d.getDate()} <small>${DOW[d.getDay()]}</small></span><span class="jm">${v != null ? `${starsHtml(v, 's-sm')}` : ''}</span><span class="jt">${j.q ? `<small class="muted jq">${esc(j.q)}</small>` : ''}${esc(j.text)}</span></div>`;
      }).join('')}</div>
      ${keys.length > 7 ? `<button class="link" data-act="journal-all" type="button" style="margin-top:8px">${ui.journalAll ? '접기' : `전체 ${keys.length}개 보기`}</button>` : ''}` : '<p class="empty">홈에서 오늘 한 줄을 쓰면 여기에 모여요.</p>'}
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
    if (mode === 'ok') return p.weekOk == null ? -1 : (p.weekKey === weekKey() ? p.weekOk : 0);
    if (mode === 'time') return p.startAt == null ? -1 : now() - p.startAt;
    if (mode === 'level') return p.level == null ? -1 : p.level * 1e6 + (p.stars || 0) * 1e3 + (p.badges || 0);
    if (mode === 'calm') return p.weekCalm == null ? -1 : (p.weekKey === weekKey() ? p.weekCalm : 0);
    return 0;
  }

  function renderFriends() {
    const mine = { uid: me.uid, isMe: true, ...publicData(), weekOk: weekOk(), startAt: isActive() ? U.startAt : null, paused: !isActive(), bestMs: Math.max(U.bestMs || 0, curMs()), level: levelOf(U.xp), stars: starsOf(U.xp), badges: Object.keys(U.badges).length, weekCalm: weekCalm() };
    const people = [mine, ...F.list].sort((a, b) => rankValue(b, F.rank) - rankValue(a, F.rank));
    if (F.rank === 'ok' && F.list.length && people[0].isMe && rankValue(people[0], 'ok') > 0 && rankValue(people[1], 'ok') < rankValue(people[0], 'ok') && !U.wasTop1) { saveUser({ wasTop1: true }).then(checkAchievements).catch(() => {}); }
    const valueHtml = (p) => {
      if (F.rank === 'ok') return p.weekOk == null ? '<span class="val hidden-val">비공개</span>' : `<span class="val">${p.weekKey === weekKey() ? p.weekOk : 0}일</span>`;
      if (F.rank === 'time') {
        if (p.startAt != null) return `<span class="val" data-live="${p.startAt}">${fmtLive(now() - p.startAt)}</span>`;
        return `<span class="val hidden-val">${p.paused ? '쉬는 중' : '비공개'}</span>`;
      }
      if (F.rank === 'level') return p.level == null ? '<span class="val hidden-val">비공개</span>' : `<span class="val">Lv.${p.level}${p.stars ? ` ★${p.stars}` : ''}</span>`;
      return p.weekCalm == null ? '<span class="val hidden-val">비공개</span>' : `<span class="val">${p.weekKey === weekKey() ? p.weekCalm : 0}일</span>`;
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
        <div class="code-row" style="margin-top:10px"><span class="friend-code">${esc(U.friendCode || '······')}</span>
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
          <button class="seg-btn${F.rank === 'ok' ? ' active' : ''}" data-act="rank" data-r="ok" type="button">지킨 날</button>
          <button class="seg-btn${F.rank === 'time' ? ' active' : ''}" data-act="rank" data-r="time" type="button">진행 시간</button>
          <button class="seg-btn${F.rank === 'level' ? ' active' : ''}" data-act="rank" data-r="level" type="button">레벨</button>
          <button class="seg-btn${F.rank === 'calm' ? ' active' : ''}" data-act="rank" data-r="calm" type="button">고요한 날</button>
        </div>
        <div class="rank-list">${people.map((p, i) => `
          <div class="rank${p.isMe ? ' me' : ''}${i === 0 && people.length > 1 ? ' top1' : ''}">
            <span class="pos">${i + 1}</span>
            <div class="info"><div class="nm">${esc(p.nickname)}${p.isMe ? ' <span class="muted small">(나)</span>' : ''}</div><div class="sub">${subHtml(p)}</div></div>
            ${valueHtml(p)}
            ${p.isMe ? '' : `<button class="icon-btn small" data-act="remove-friend" data-id="${esc(p.reqId)}" data-n="${esc(p.nickname)}" type="button" aria-label="친구 삭제">${ICON.x}</button>`}
          </div>`).join('')}</div>
        ${!F.list.length && F.loaded ? '<p class="hint">아직 친구가 없어요</p>' : ''}
        ${!F.loaded ? '<p class="hint">불러오는 중…</p>' : ''}
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
      const tag = st.state === 'on' ? `<span class="ex-tag on">${examLabel(e, st)}</span>`
        : st.state === 'before' ? `<span class="ex-tag">D-${st.dday}</span>`
          : `<span class="ex-tag done">${e.evaluated ? (e.clean ? '완주' : '끝남') : '끝남'}</span>`;
      return `<li><span><b>${esc(e.name)}</b><br><small class="muted">${mdShort(keyTs(e.start))}–${mdShort(keyTs(e.end))}</small></span>${tag}
        <button class="icon-btn small" data-act="del-exam" data-id="${esc(e.id)}" type="button" aria-label="삭제">${ICON.x}</button></li>`;
    }).join('')}</ul>`;
  }

  function renderSettings() {
    const th = currentTheme();
    const sw = (key, label, desc) => `<div class="set-row"><div><div class="lbl">${label}</div>${desc ? `<div class="desc">${desc}</div>` : ''}</div>
      <label class="switch"><input type="checkbox" data-act="share" data-k="${key}" ${U.share[key] ? 'checked' : ''} /><span></span></label></div>`;
    $('page-settings').innerHTML = `
      <section class="card set-sec">
        <div class="set-row"><h2>사용법</h2><button class="btn small" data-act="guide" type="button">보기</button></div>
      </section>

      <section class="card set-sec">
        <h2>프로필</h2>
        <div class="set-row"><div><div class="lbl">아이디</div></div><b>${esc(idOf(me.email))}</b></div>
        <div class="inline-add"><input id="set-nick" maxlength="12" value="${esc(U.nickname)}" placeholder="닉네임" /><button class="btn" data-act="save-nick" type="button">닉네임 저장</button></div>
        <div><div class="lbl" style="margin-bottom:8px;font-weight:650">성별 </div>
          <div class="seg">${[['male', '남자'], ['female', '여자'], ['none', '선택 안 함']].map(([v, l]) =>
            `<button class="seg-btn${U.gender === v ? ' active' : ''}" data-act="gender" data-v="${v}" type="button">${l}</button>`).join('')}</div></div>
      </section>

      <section class="card set-sec">
        <h2>디톡스 대상</h2>
        <div class="chips">${U.targets.map((t, i) => `<span class="chip">${esc(t)}<button class="x" data-act="del-target" data-i="${i}" type="button" aria-label="${esc(t)} 삭제">×</button></span>`).join('')}</div>
        <div class="inline-add"><input id="set-target" maxlength="10" placeholder="새 대상" /><button class="btn" data-act="add-target" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>시험 기간</h2>
        ${examListHtml()}
        <input id="exam-name" maxlength="20" placeholder="이름 (예: 2학기 기말고사)" />
        <div class="time-row"><input type="date" id="exam-start" /><span>부터</span>
          <input type="date" id="exam-end" /><span>까지</span></div>
        <div><button class="btn primary" data-act="add-exam" type="button">${ICON.plus}시험 추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>집중 과목</h2>
        <div class="chips">${U.subjects.map((t, i) => `<span class="chip">${esc(t)}<button class="x" data-act="del-subject" data-i="${i}" type="button" aria-label="${esc(t)} 삭제">×</button></span>`).join('')}</div>
        <div class="inline-add"><input id="set-subject" maxlength="10" placeholder="새 과목" /><button class="btn" data-act="add-subject" type="button">추가</button></div>
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
        <div class="set-row"><div><div class="lbl">홈에 경고 띄우기</div></div>
          <label class="switch"><input type="checkbox" data-act="risk-on" ${U.riskOn ? 'checked' : ''} /><span></span></label></div>
      </section>

      <section class="card set-sec">
        <h2>동기 문구</h2>
        ${U.quotes.length ? `<ul class="plain-list">${U.quotes.map((q, i) => `<li><span>${esc(q)}</span><button class="icon-btn small" data-act="del-quote" data-i="${i}" type="button" aria-label="삭제">${ICON.x}</button></li>`).join('')}</ul>` : ''}
        <div class="inline-add"><input id="set-quote" maxlength="60" placeholder="나만의 문구 추가" /><button class="btn" data-act="add-quote" type="button">추가</button></div>
      </section>

      <section class="card set-sec">
        <h2>친구 공개 범위</h2>
        ${sw('ok', '이번 주 지킨 날')}${sw('time', '현재 진행 시간')}${sw('best', '최장 기록')}${sw('level', '레벨')}${sw('badges', '배지 수')}${sw('calm', '이번 주 고요한 날')}
      </section>

      <section class="card set-sec">
        <h2>화면</h2>
        <div class="seg">${[['system', '기기 설정'], ['light', '라이트'], ['dark', '다크']].map(([v, l]) =>
          `<button class="seg-btn${th === v ? ' active' : ''}" data-act="theme" data-v="${v}" type="button">${l}</button>`).join('')}</div>
      </section>

      <section class="card set-sec">
        <h2>ProFill 연결</h2>
        <a class="btn primary" href="${PROFILL_URL}">ProFill 열기 ${ICON.arrow}</a>
      </section>

      <section class="card set-sec">
        <h2>기록 백업</h2>
        <div class="set-row"><div><div class="lbl">마지막 백업</div></div><span class="muted">${U.lastBackupAt ? (dayStart(now()) - dayStart(U.lastBackupAt) >= DAY ? `${Math.round((dayStart(now()) - dayStart(U.lastBackupAt)) / DAY)}일 전` : '오늘') : '아직 없음'}</span></div>
        <div class="danger-zone"><button class="btn primary" data-act="backup-export" type="button">내보내기</button>
          <button class="btn" data-act="backup-import" type="button">가져오기</button></div>
      </section>

      <section class="card set-sec">
        <h2>계정</h2>
        <div class="danger-zone"><button class="btn" data-act="logout" type="button">로그아웃</button>
          <button class="btn danger-ghost" data-act="wipe-detox" type="button">디톡스 기록 지우기</button>
          <button class="btn danger-ghost" data-act="wipe" type="button">계정 전체 초기화</button></div>
      </section>
      <p class="app-ver">FocusFill v${APP_VERSION}</p>`;
  }

  async function settingsUpdate(fields, toastMsg, alsoPublic) {
    try { await saveUser(fields); if (toastMsg) toast(toastMsg); } catch (e) {}
    if (alsoPublic) savePublic(true);
    renderSettings();
  }

  /* ---------- 사용법 ---------- */
  const GUIDE = [
    ['⏱', '디톡스 타이머', '시작하면 시간이 흘러요. 오래 버틸수록 배지와 보상이 커져요.'],
    ['✋', '참기', '충동이 오면 누르고 10분만 버텨요. 비상 버튼이에요.'],
    ['☾', '고요한 날', '종료도 충동도 없는 날. 다음 날 보너스를 받아요.'],
    ['■', '종료', '무너졌다면 솔직하게 3초 꾹. 보상은 한 단계만 내려가요.'],
    ['✓', '다짐 · 목표', '오늘의 다짐과 이번 달 목표를 정하고 지켜요.'],
    ['◷', '집중', '25분·50분 공부 타이머. 끝까지 하면 경험치를 받아요.'],
    ['✎', '오늘 한 줄', '하루에 별점을 매기고 질문에 한 줄로 답해요.'],
    ['↺', '회고 · 성장', '주간·월간 회고, 실험, 미래의 나에게 편지. 기록 › 성장에 모여요.'],
    ['★', '보상', '버틴 시간이 가장 큰 보상이에요. 오래 버티면 디톡스 보상이 커지고, 시험 기간엔 1.5배.'],
    ['☺', '친구', '친구 코드로 추가하고 이번 주 지킨 날을 비교해요.'],
  ];
  function openGuide(first) {
    openSheet(`<h2>${first ? 'FocusFill 시작하기' : '사용법'}</h2>
      <ul class="guide">${GUIDE.map(([i, t, d]) => `<li><span class="g-ic">${i}</span><div><b>${t}</b><p>${d}</p></div></li>`).join('')}</ul>
      <div class="sheet-actions"><button class="btn primary" data-ok type="button">${first ? '시작할게요' : '확인'}</button></div>`,
    (el) => { el.querySelector('[data-ok]').onclick = closeSheet; });
  }

  /* ---------- 디톡스 기록만 지우기 (설정은 그대로) ---------- */
  function openWipeDetox() {
    openSheet(`<h2>디톡스 기록을 지울까요?</h2>
      <p class="muted">타이머, 종료·참기·집중 기록, 한 줄, 다짐, 목표, 회고, 실험, 출석, 경험치, 배지, 업적이 지워지고 지금부터 다시 시작해요. 설정, 교훈, 시작한 이유, 아직 안 열린 편지는 그대로 남아요. <b>되돌릴 수 없어요.</b></p>
      <p class="label">확인을 위해 <b>삭제</b>라고 적어주세요</p>
      <input id="wipe-input" placeholder="삭제" autocomplete="off" />
      <p class="form-err" id="wipe-err"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button>
        <button class="btn danger" data-ok type="button">기록 지우기</button></div>`,
    (el) => {
      el.querySelector('[data-close]').onclick = closeSheet;
      el.querySelector('[data-ok]').onclick = async () => {
        if ($('wipe-input').value.trim() !== '삭제') { $('wipe-err').textContent = '삭제라고 정확히 적어주세요.'; return; }
        const b = el.querySelector('[data-ok]'); b.disabled = true; b.textContent = '지우는 중…';
        try { await wipeDetox(); closeSheet(); }
        catch (e) { $('wipe-err').textContent = '지우지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.'; b.disabled = false; b.textContent = '기록 지우기'; }
      };
    });
  }
  async function wipeDetox() {
    const base = userPath();
    for (const col of ['streaks', 'urges', 'journal', 'focus']) {
      const docs = await db.list(`${base}/${col}`);
      await Promise.all(docs.map((d) => db.del(`${base}/${col}/${d.id}`)));
    }
    const t = now();
    const keepKeys = ['nickname', 'gender', 'targets', 'activities', 'urgeMinutes', 'quotes', 'share', 'riskOn', 'friendCode', 'codeOk', 'lessons', 'createdAt', 'whys', 'whyAsked', 'subjects', 'lessonBase', 'lastBackupAt', 'examReviews'];
    const data = { onboarded: true, startAt: t, trackStart: t, rewardFrom: t, endedAt: null, lastDur: 0, bestMs: 0, xp: 0, xpHours: 0, badges: {}, urgeWins: 0, urge: null, multFloor: 0, balanceSeen: '1.6.0', focus: null };
    keepKeys.forEach((k) => { if (U[k] !== undefined) data[k] = U[k]; });
    // 아직 안 열린 편지는 남겨요
    data.letters = (U.letters || []).filter((l) => !l.openedAt);
    data.exams = U.exams.map((e) => { const x = { ...e }; delete x.evaluated; delete x.clean; return x; });
    pendingXp = 0;
    await db.put(base, data);
    hide($('urge')); hide($('modal-reset'));
    celQueue.length = 0; celOn = false; hide($('celebrate'));
    U = normalize(data);
    S.streaks = []; S.urges = []; S.journal = {}; S.focus = [];
    focusUi(false);
    savePublic(true);
    ui.weekOff = 0; ui.monthOff = 0; ui.year = null; ui.calMonth = null;
    switchTab('home');
    toast('디톡스 기록을 지웠어요. 지금부터 다시 시작해요');
  }

  /* ---------- 계정 전체 초기화 ---------- */
  function openWipe() {
    openSheet(`<h2>계정을 처음 상태로 되돌릴까요?</h2>
      <p class="muted">모든 기록과 설정, 교훈이 지워지고 처음 설정부터 다시 시작해요. 아이디와 친구는 그대로 남아요. <b>되돌릴 수 없어요.</b></p>
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
    for (const col of ['streaks', 'urges', 'journal', 'focus']) {
      const docs = await db.list(`${base}/${col}`);
      await Promise.all(docs.map((d) => db.del(`${base}/${col}/${d.id}`)));
    }
    const keep = { nickname: U.nickname, friendCode: U.friendCode || '', codeOk: !!U.codeOk, onboarded: false };
    pendingXp = 0;
    await db.put(base, keep);
    await db.set(pubPath(), { nickname: U.nickname, startAt: null, paused: true, bestMs: null, level: null, badges: null, weekOk: null, weekCalm: null, weekKey: weekKey(), updatedAt: now() }).catch(() => {});
    stopWatch();
    clearInterval(tickTimer);
    hide($('urge')); hide($('modal-reset'));
    celQueue.length = 0; celOn = false; hide($('celebrate'));
    U = null; S.streaks = []; S.urges = []; S.journal = {}; S.focus = [];
    focusUi(false);
    obKeep = { friendCode: keep.friendCode, codeOk: keep.codeOk };
    resetOnboarding(keep.nickname);
    go('screen-onboard'); obShow();
    toast('기록을 모두 지웠어요. 처음부터 시작해요');
  }

  /* ====================== v1.7.0 공통 계산 ====================== */
  // 별점: 0~5, 0.5 단위 (예전 기분 이모지는 별점으로 바꿔서 읽어요)
  function jScore(j) {
    if (!j) return null;
    if (typeof j.score === 'number') return j.score;
    return j.mood && MOOD_SCORE[j.mood] != null ? MOOD_SCORE[j.mood] : null;
  }
  const scoreOf = (k) => jScore(S.journal[k]);
  function avgScoreIn(a, b, pred) {
    let n = 0, sum = 0;
    for (let d = dayStart(a); d < b; d = addDays(d, 1)) {
      const v = scoreOf(dateKey(d));
      if (v == null || (pred && !pred(d))) continue;
      n++; sum += v;
    }
    return n ? { avg: sum / n, n } : null;
  }
  const fmtScore = (v) => (v == null ? '-' : (Math.round(v * 10) / 10).toFixed(1));
  const fmtStar = (v) => (v % 1 ? v.toFixed(1) : String(v));
  const STAR_PATH = 'M12 2.4l2.9 6.1 6.7.8-5 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-5-4.6 6.7-.8z';
  function starsHtml(v, cls = '') {
    let h = '';
    for (let i = 0; i < 5; i++) {
      const f = Math.max(0, Math.min(1, (v || 0) - i));
      h += `<span class="st"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg><span class="st-f" style="width:${f * 100}%"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg></span></span>`;
    }
    return `<span class="stars ${cls}" role="img" aria-label="별점 ${v == null ? '없음' : fmtStar(v)}">${h}</span>`;
  }
  function starFromX(el, x) {
    const st = el.querySelectorAll('.st');
    if (st.length < 5) return 0;
    const r0 = st[0].getBoundingClientRect(), r4 = st[4].getBoundingClientRect();
    if (x < r0.left + 1) return 0;
    const w = (r4.right - r0.left) / 5;
    return Math.max(0.5, Math.min(5, Math.ceil(((x - r0.left) / w) * 2) / 2));
  }
  function setScore(v) {
    ui.score = v;
    const el = $('star-in');
    if (!el) return;
    const old = el.querySelector('.stars');
    if (old) old.outerHTML = starsHtml(v, 's-lg');
    el.setAttribute('aria-valuenow', v == null ? 0 : v);
    el.setAttribute('aria-valuetext', v == null ? '별점 없음' : `${fmtStar(v)}점`);
    const t = $('st-val'); if (t) t.textContent = v == null ? '' : fmtStar(v);
  }

  // 오늘 한 줄 질문 (갈래와 순서를 날마다 바꿔요)
  const Q_BASE = keyTs('2020-01-06');
  function questionFor(k) {
    const n = Math.round((keyTs(k) - Q_BASE) / DAY);
    const alt = dailyOf(k).qAlt ? 1 : 0;
    const cat = (((n + alt * 2) % 5) + 5) % 5;
    const idx = (((Math.floor(n / 5) + alt * 7) % 18) + 18) % 18;
    return QUESTIONS[cat][idx];
  }

  /* ---------- 집중 타이머 ---------- */
  function studyIn(a, b) {
    let t = 0;
    S.focus.forEach((f) => {
      const w = f.end - f.start;
      if (w <= 0) return;
      const o = overlap(f.start, f.end, a, b);
      if (o > 0) t += (f.ms || 0) * Math.min(1, o / w);
    });
    return t;
  }
  function focusElapsed(f = U && U.focus, t = now()) {
    if (!f) return 0;
    return Math.max(0, (f.pausedAt || t) - f.startAt - (f.pausedMs || 0));
  }
  const focusLeft = (f = U && U.focus) => (f ? Math.max(0, f.mins * MIN - focusElapsed(f)) : 0);
  const focusRunMs = () => (U && U.focus ? Math.min(U.focus.mins * MIN, focusElapsed()) : 0);
  const studyToday = () => studyIn(dayStart(now()), now()) + focusRunMs();
  const examOnAt = (ts) => U.exams.some((e) => examStatus(e, ts).state === 'on');

  let audioCtx = null;
  function unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }
  function chime() {
    try { navigator.vibrate && navigator.vibrate([60, 80, 60]); } catch (e) {}
    try {
      if (!audioCtx) return;
      const t0 = audioCtx.currentTime;
      [[660, 0], [880, 0.18], [1320, 0.36]].forEach(([fq, d]) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = fq;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.5);
        o.connect(g); g.connect(audioCtx.destination); o.start(t0 + d); o.stop(t0 + d + 0.55);
      });
    } catch (e) {}
  }

  const BASE_TITLE = 'FocusFill';
  // 이 창의 이름표: 다른 기기에서 시작한 집중은 그 기기가 먼저 끝내도록 잠깐 기다려요 (경험치 두 번 받지 않게)
  // 기기 이름표는 이 브라우저에 저장해 둬요 (앱을 다시 열어도 같은 기기로 알아봐서 바로 완료돼요)
  const DEV_ID = (() => {
    try { let d = localStorage.getItem('focusfill_dev'); if (!d) { d = uid6(); localStorage.setItem('focusfill_dev', d); } return d; } catch (e) { return uid6(); }
  })();
  const focusDue = (f) => !f.pausedAt && focusLeft(f) <= 0 && (f.dev === DEV_ID || !f.dev || now() - (f.startAt + f.mins * MIN + (f.pausedMs || 0)) > 20000);
  function renderFocus() {
    const f = U && U.focus;
    if (!f) { if (document.title !== BASE_TITLE) document.title = BASE_TITLE; return; }
    const left = focusLeft(f), secs = Math.ceil(left / 1000);
    const txt = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
    const pct = ((f.mins * MIN - left) / (f.mins * MIN)) * 100;
    ['fo-clock', 'fc-clock'].forEach((id) => { const el = $(id); if (el) el.textContent = txt; });
    ['fo-bar', 'fc-bar'].forEach((id) => { const el = $(id); if (el) el.style.width = pct.toFixed(1) + '%'; });
    const pb = $('fo-pause'); if (pb) pb.textContent = f.pausedAt ? '계속' : '일시정지';
    const o = $('focus'); if (o) o.classList.toggle('paused', !!f.pausedAt);
    const td = document.querySelector('.fc-today'); if (td) td.textContent = fmtDur(studyToday());
    document.title = `${f.pausedAt ? '⏸' : '⏱'} ${txt} · FocusFill`;
  }
  function focusUi(open) {
    const o = $('focus');
    if (!o) return;
    if (!open || !U || !U.focus) { hide(o); renderFocus(); return; }
    show($('fo-run')); hide($('fo-done'));
    $('fo-sub').textContent = `${U.focus.subject ? U.focus.subject + ' · ' : ''}${U.focus.mins}분 집중`;
    show(o); renderFocus();
  }
  async function startFocus(mins) {
    if (!U) return;
    if (U.focus) return focusUi(true);
    mins = Math.round(mins);
    if (!(mins >= 5 && mins <= 180)) return toast('5분에서 180분 사이로 정해 주세요');
    unlockAudio();
    const f = { id: 'f' + uid6(), dev: DEV_ID, startAt: now(), mins, pausedMs: 0, pausedAt: null, subject: U.subjects.includes(ui.focusSub) ? ui.focusSub : '' };
    U.focus = f;
    focusUi(true);
    if (ui.tab === 'home') renderHome();
    try { await saveUser({ focus: f }); } catch (e) {}
  }
  async function toggleFocusPause() {
    const f = U && U.focus;
    if (!f) return;
    const nf = { ...f };
    if (f.pausedAt) { nf.pausedMs = (f.pausedMs || 0) + Math.max(0, now() - f.pausedAt); nf.pausedAt = null; unlockAudio(); }
    else nf.pausedAt = now();
    U.focus = nf;
    renderFocus();
    if (ui.tab === 'home') renderHome();
    try { await saveUser({ focus: nf }); } catch (e) {}
  }
  function stopFocus() {
    const f = U && U.focus;
    if (!f) return;
    const el = focusElapsed(f);
    const enough = el >= FOCUS_MIN_REC * MIN;
    openSheet(`<h2>집중을 그만둘까요?</h2>
      <p class="muted">${enough ? `지금까지 ${fmtDur(el)}은 공부 시간으로 기록돼요. 경험치는 끝까지 했을 때만 받아요.` : `${FOCUS_MIN_REC}분이 안 돼서 기록되지 않아요.`}</p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">계속하기</button><button class="btn danger" data-ok type="button">그만두기</button></div>`,
    (b) => {
      b.querySelector('[data-close]').onclick = closeSheet;
      b.querySelector('[data-ok]').onclick = () => { closeSheet(); endFocusEarly(enough); };
    });
  }
  async function endFocusEarly(record) {
    const f = U && U.focus;
    if (!f) return;
    const el = focusElapsed(f);
    U.focus = null;
    focusUi(false);
    if (record) {
      const rec = { start: f.startAt, end: now(), ms: el, mins: f.mins, subject: f.subject || '', done: false, xp: 0 };
      try { await db.put(`${userPath()}/focus/${f.id}`, rec); if (!S.focus.some((x) => x.id === f.id)) S.focus.push({ id: f.id, ...rec }); } catch (e) {}
    }
    try { await saveUser({ focus: null }); } catch (e) {}
    toast(record ? `${fmtDur(el)} 기록했어요` : '집중을 그만뒀어요');
    if (ui.tab === 'home') renderHome();
    checkAchievements();
  }
  let focusBusy = false;
  // 시간이 다 되면: 화면과 보상을 먼저 바로 보여주고, 저장은 뒤에서 해요 (서버 응답을 기다리지 않아요)
  async function completeFocus() {
    const f = U && U.focus;
    if (!f || focusBusy) return;
    focusBusy = true;
    try {
      const end = f.startAt + f.mins * MIN + (f.pausedMs || 0);
      const k = dateKey(end);
      const late = now() - end > 2 * MIN;   // 앱을 닫아 둔 사이에 끝난 경우 (소리는 내지 않아요)
      const rec = { start: f.startAt, end, ms: f.mins * MIN, mins: f.mins, subject: f.subject || '', done: true, xp: 0 };
      const fresh = !S.focus.some((x) => x.id === f.id);
      let got = 0, used = 0, base = 0;
      if (fresh) {
        used = dailyOf(k).focusXpBase || 0;
        base = Math.max(0, Math.min(Math.floor(f.mins / FOCUS_UNIT) * XP.focus, FOCUS_DAY_MAX - used));
        got = Math.round(base * (examOnAt(end) ? EXAM_X : 1));
        rec.xp = got;
        S.focus.push({ id: f.id, ...rec });
        S.focus.sort((a, b) => a.start - b.start);
        if (got) addXp(got);
      }
      U.focus = null;
      // 1) 화면 먼저
      if (!late) chime();
      const o = $('focus');
      if (o) {
        hide($('fo-run')); show($('fo-done'));
        $('fo-done-sub').textContent = `${rec.subject ? rec.subject + ' · ' : ''}${rec.mins}분 동안 집중했어요.`;
        $('fo-done-xp').textContent = got ? `+${got} XP` : '';
        show(o);
      }
      renderFocus();
      if (ui.tab === 'home') renderHome(); else renderLevelCard();
      // 2) 저장은 뒤에서
      const saves = fresh
        ? [db.put(`${userPath()}/focus/${f.id}`, rec), saveDaily(k, { focusXpBase: used + base }, { focus: null, xp: U.xp })]
        : [saveUser({ focus: null })];
      Promise.all(saves).catch(() => {}).then(() => { savePublic(); checkAchievements(); });
    } catch (e) {} finally { focusBusy = false; }
  }
  function openFocusCustom() {
    let last = 40;
    try { last = +localStorage.getItem('focusfill_focus_min') || 40; } catch (e) {}
    openSheet(`<h2>집중 시간</h2>
      <div class="time-row"><input type="number" id="fc-min" min="5" max="180" value="${last}" inputmode="numeric" style="width:6em" /><span>분</span></div>
      <p class="muted small" style="margin-top:10px">${FOCUS_UNIT}분마다 +${XP.focus} XP · 하루 최대 ${FOCUS_DAY_MAX} XP</p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button><button class="btn primary" data-ok type="button">시작</button></div>`,
    (b) => {
      b.querySelector('[data-close]').onclick = closeSheet;
      b.querySelector('[data-ok]').onclick = () => {
        const m = Math.round(+$('fc-min').value);
        if (!(m >= 5 && m <= 180)) return toast('5분에서 180분 사이로 정해 주세요');
        try { localStorage.setItem('focusfill_focus_min', String(m)); } catch (e) {}
        closeSheet(); startFocus(m);
      };
    });
  }
  function focusCardHtml() {
    const f = U.focus;
    const today = studyToday();
    const head = `<div class="sec-head"><h2>집중</h2><span class="muted small">오늘 <b class="fc-today">${fmtDur(today)}</b></span></div>`;
    if (f) {
      return `<section class="card focus-card running${f.pausedAt ? ' paused' : ''}">${head}
        <div class="fc-run"><div class="fc-left">${f.subject ? `<span class="fc-sub">${esc(f.subject)}</span>` : ''}<span class="fc-clock num" id="fc-clock">00:00</span>${f.pausedAt ? '<span class="fc-paused">일시정지</span>' : ''}</div>
          <div class="fc-acts"><button class="btn small" data-act="focus-pause" type="button">${f.pausedAt ? '계속' : '일시정지'}</button><button class="btn small primary" data-act="focus-open" type="button">크게 보기</button></div></div>
        <div class="bar thin"><div class="fill" id="fc-bar"></div></div></section>`;
    }
    const subs = U.subjects || [];
    return `<section class="card focus-card">${head}
      ${subs.length ? `<div class="chips fc-subs">${subs.map((x) => `<button type="button" class="chip${ui.focusSub === x ? ' selected' : ''}" data-act="focus-sub" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
      <div class="fc-start"><button class="btn primary" data-act="focus-start" data-m="25" type="button">25분</button><button class="btn primary" data-act="focus-start" data-m="50" type="button">50분</button><button class="btn" data-act="focus-custom" type="button">직접</button></div>
    </section>`;
  }
  // 공부 기록 (업적용)
  function focusStats() {
    const done = S.focus.filter((f) => f.done);
    const byDay = {};
    done.filter((f) => f.mins >= FOCUS_UNIT).forEach((f) => { const k = dateKey(f.start); byDay[k] = (byDay[k] || 0) + 1; });
    const days = new Set(done.map((f) => dateKey(f.start)));
    let run = 0, best = 0, prev = null;
    [...days].sort().forEach((k) => { run = prev && dateKey(addDays(keyTs(prev), 1)) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; });
    const examH = Math.max(0, ...U.exams.map((e) => { const st = examStatus(e); return studyIn(st.ps, st.pe); }));
    return { focusDone: done.length, studyH: Math.floor(studyIn(0, now() + DAY) / HOUR), focusDayMax: Math.max(0, ...Object.values(byDay)), focusRun: best, examStudyH: Math.floor(examH / HOUR) };
  }

  /* ---------- 비교 표 (지난달 · 실험 · 시험) ---------- */
  function cmpHtml(rows, labels) {
    let better = 0, total = 0;
    const body = rows.filter(Boolean).map((r) => {
      let cls = 'same', mark = '–';
      if (r.p != null && r.c != null) {
        total++;
        const d = r.c - r.p;
        if (Math.abs(d) > (r.eps || 1e-9)) {
          const good = r.up ? d > 0 : d < 0;
          if (good) better++;
          cls = good ? 'good' : 'bad'; mark = d > 0 ? '▲' : '▼';
        }
      }
      const show = (v, s) => (s != null ? s : v == null ? '-' : r.f(v));
      return `<div class="cmp-r"><span class="cn">${r.name}</span><span class="cp">${show(r.p, r.ps)}</span><span class="cc">${show(r.c, r.cs)}</span><span class="trend ${cls}">${mark}</span></div>`;
    }).join('');
    return { html: `<div class="cmp"><div class="cmp-r cmp-h"><span></span><span>${labels[0]}</span><span>${labels[1]}</span><span></span></div>${body}</div>`, better, total };
  }
  const fmtN = (u) => (v) => `${Math.round(v * 10) / 10}${u}`;
  const fmtPct = (v) => `${Math.round(v * 100)}%`;
  const fmtSc = (v) => `★${fmtScore(v)}`;
  // 두 기간 비교: 종료 · 충동 · 공부 · 별점 (+옵션)
  function periodRows(pa, pb, ca, cb, extra) {
    const P = rangeReport(pa, pb), Cr = rangeReport(ca, cb);
    const rows = [];
    if (extra) {
      rows.push({ name: '디톡스 시간', p: P.detox, c: Cr.detox, f: fmtDur, up: true, eps: MIN });
      rows.push({ name: '최장 기록', p: P.longest, c: Cr.longest, f: fmtDur, up: true, eps: MIN });
    }
    rows.push({ name: '종료', p: P.ends, c: Cr.ends, f: fmtN('번'), up: false });
    if (extra) rows.push({ name: '참기 성공률', p: P.tries ? P.wins / P.tries : null, c: Cr.tries ? Cr.wins / Cr.tries : null, f: fmtPct, up: true, eps: 0.005 });
    else rows.push({ name: '충동', p: P.tries, c: Cr.tries, f: fmtN('번'), up: false });
    rows.push({ name: '공부 시간', p: P.study, c: Cr.study, f: fmtDur, up: true, eps: MIN });
    rows.push({ name: '평균 별점', p: P.score ? P.score.avg : null, c: Cr.score ? Cr.score.avg : null, f: fmtSc, up: true, eps: 0.05 });
    return rows;
  }

  /* ---------- 회고 공통 ---------- */
  function prevMonthKey(mk) { const [y, m] = mk.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; }
  // 주간 회고: 일요일엔 이번 주, 월~수엔 지난주
  function reviewWeekKey(t = now()) {
    const dow = new Date(t).getDay();
    if (dow === 0) return weekKey(t);
    if (dow >= 1 && dow <= 3) return dateKey(addDays(weekStart(t), -7));
    return null;
  }
  const weekReviewXpOk = (k, t = now()) => t >= addDays(keyTs(k), 6) && t < addDays(keyTs(k), 10);
  const weekEligible = (k) => U.trackStart < addDays(keyTs(k), 5);
  function weekReviewDue() { const k = reviewWeekKey(); return k && !U.weekReviews[k] && weekEligible(k) ? k : null; }
  // 회고를 쓸 수 있는 가장 최근 주 (성장 탭)
  function weekWritable() {
    const k = reviewWeekKey() || dateKey(addDays(weekStart(now()), -7));
    return weekEligible(k) ? k : null;
  }
  const thisWeekOne = () => { const r = U.weekReviews[dateKey(addDays(weekStart(now()), -7))]; return r && r.next ? r.next : ''; };
  function monthReviewDue() {
    if (new Date().getDate() > 7) return null;
    const pk = prevMonthKey(monthKey(now()));
    if (U.monthReviews[pk]) return null;
    return U.trackStart < monthRange(pk)[1] - 3 * DAY ? pk : null;
  }
  const monthReviewXpOk = (mk, t = now()) => { const [, b] = monthRange(mk); return t >= b && t < addDays(b, 7); };
  const thisMonthChange = () => { const r = U.monthReviews[prevMonthKey(monthKey(now()))]; return r && r.change ? r.change : ''; };
  const wkLabel = (k) => `${mdShort(keyTs(k))}–${mdShort(addDays(keyTs(k), 6))}`;
  const mkLabel = (mk) => `${Number(mk.split('-')[1])}월`;
  const KEPT_TXT = { yes: '지켰어요', half: '반쯤', no: '못 지켰어요' };

  function openWeekReview(k) {
    if (!k) return;
    const ws = keyTs(k), r = rangeReport(ws, addDays(ws, 7));
    const cur = U.weekReviews[k] || {};
    const prev = U.weekReviews[dateKey(addDays(ws, -7))];
    const xpOk = !U.weekReviews[k] && weekReviewXpOk(k);
    let kept = cur.prevKept || null;
    openSheet(`<h2>${wkLabel(k)} 회고</h2>
      <p class="muted small">종료 ${r.ends}번 · 디톡스 ${fmtDur(r.detox)} · 공부 ${fmtDur(r.study)}${r.score ? ` · 평균 ★${fmtScore(r.score.avg)}` : ''}</p>
      ${prev && prev.next ? `<p class="label">지난주 한 가지 <span class="rv-one">${esc(prev.next)}</span></p>
        <div class="chips" id="wr-kept">${Object.entries(KEPT_TXT).map(([v, t]) => `<button type="button" class="chip${kept === v ? ' selected' : ''}" data-v="${v}">${t}</button>`).join('')}</div>` : ''}
      <p class="label">이번 주 잘한 것은?</p>
      <textarea id="wr-good" maxlength="200" rows="2" placeholder="작은 것도 좋아요">${esc(cur.good || '')}</textarea>
      <p class="label">다음 주에 할 한 가지는?</p>
      <input id="wr-next" maxlength="40" placeholder="예: 자기 전 폰은 거실에" value="${esc(cur.next || '')}" />
      <p class="form-err" id="wr-err"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">닫기</button><button class="btn primary" data-ok type="button">저장${xpOk ? ` +${XP.weekReview} XP` : ''}</button></div>`,
    (b) => {
      b.querySelectorAll('#wr-kept .chip').forEach((c) => { c.onclick = () => { kept = c.dataset.v; b.querySelectorAll('#wr-kept .chip').forEach((x) => x.classList.toggle('selected', x === c)); }; });
      b.querySelector('[data-close]').onclick = closeSheet;
      b.querySelector('[data-ok]').onclick = async () => {
        const good = $('wr-good').value.trim(), next = $('wr-next').value.trim();
        if (prev && prev.next && !kept) { $('wr-err').textContent = '지난주 한 가지를 지켰는지 골라주세요.'; return; }
        if (!good || !next) { $('wr-err').textContent = '두 질문 모두 적어주세요.'; return; }
        closeSheet();
        const now0 = U.weekReviews[k] || {};   // 창을 연 사이 다른 기기에서 쓴 회고가 있으면 그걸 기준으로
        const got = !U.weekReviews[k] && weekReviewXpOk(k) ? await gainFixed(XP.weekReview) : 0;
        const rec = { ...now0, good, next, prevKept: prev && prev.next ? kept : null, at: now0.at || now(), xp: (now0.xp || 0) + got };
        try { await saveUser({ weekReviews: { [k]: rec }, xp: U.xp }); } catch (e) {}
        savePublic();
        toast(got ? `회고를 남겼어요 (+${got} XP)` : '회고를 저장했어요');
        refreshViews(); checkAchievements();
      };
    });
  }

  function openMonthReview(mk) {
    if (!mk) return;
    const [a, b] = monthRange(mk);
    const cur = U.monthReviews[mk] || {};
    const xpOk = !U.monthReviews[mk] && monthReviewXpOk(mk);
    // 그 달의 '이번 주 한 가지'와 결과
    const ones = Object.keys(U.weekReviews).sort().map((wk) => ({ wk, r: U.weekReviews[wk] }))
      .filter(({ wk, r }) => r.next && addDays(keyTs(wk), 7) >= a && addDays(keyTs(wk), 7) < b)
      .map(({ wk, r }) => { const nx = U.weekReviews[dateKey(addDays(keyTs(wk), 7))]; return { text: r.next, res: nx && nx.prevKept }; });
    openSheet(`<h2>${mkLabel(mk)} 회고</h2>
      ${ones.length ? `<p class="label">${mkLabel(mk)}의 한 가지</p><ul class="rv-ones">${ones.map((o) => `<li><span>${esc(o.text)}</span><span class="rv-res ${o.res || ''}">${o.res ? KEPT_TXT[o.res] : '-'}</span></li>`).join('')}</ul>` : ''}
      <p class="label">가장 잘한 것은?</p>
      <textarea id="mr-best" maxlength="200" rows="2">${esc(cur.best || '')}</textarea>
      <p class="label">아쉬운 것은?</p>
      <textarea id="mr-regret" maxlength="200" rows="2">${esc(cur.regret || '')}</textarea>
      <p class="label">다음 달에 바꿀 것 하나는?</p>
      <input id="mr-change" maxlength="40" placeholder="이번 달 다짐이 돼요" value="${esc(cur.change || '')}" />
      <p class="form-err" id="mr-err"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">닫기</button><button class="btn primary" data-ok type="button">저장${xpOk ? ` +${XP.monthReview} XP` : ''}</button></div>`,
    (el) => {
      el.querySelector('[data-close]').onclick = closeSheet;
      el.querySelector('[data-ok]').onclick = async () => {
        const best = $('mr-best').value.trim(), regret = $('mr-regret').value.trim(), change = $('mr-change').value.trim();
        if (!best || !regret || !change) { $('mr-err').textContent = '세 질문 모두 적어주세요.'; return; }
        closeSheet();
        const now0 = U.monthReviews[mk] || {};
        const got = !U.monthReviews[mk] && monthReviewXpOk(mk) ? await gainFixed(XP.monthReview) : 0;
        const rec = { ...now0, best, regret, change, at: now0.at || now(), xp: (now0.xp || 0) + got };
        try { await saveUser({ monthReviews: { [mk]: rec }, xp: U.xp }); } catch (e) {}
        savePublic();
        const canExp = !activeExp() && nextMonthKey(mk) === monthKey(now());
        toast(got ? `회고를 남겼어요 (+${got} XP)` : '회고를 저장했어요', canExp ? () => openExpSheet(change) : null, canExp ? 6000 : 2600, '실험으로');
        refreshViews(); checkAchievements();
      };
    });
  }
  function refreshViews() {
    if (ui.tab === 'home') renderHome();
    if (ui.tab === 'records') renderRecords();
  }

  /* ---------- 무너진 날 돌아보기 ---------- */
  function endReviewDay() {
    const t0 = dayStart(now());
    for (let i = 1; i <= 3; i++) {
      const d = addDays(t0, -i), k = dateKey(d);
      if (endsIn(d, addDays(d, 1)).length && !dailyOf(k).review) return k;
    }
    return null;
  }
  function endReviewCardHtml() {
    const k = endReviewDay();
    if (!k) return '';
    const d0 = keyTs(k), ends = endsIn(d0, addDays(d0, 1));
    const sits = [...new Set(ends.flatMap((r) => r.situations || []))];
    const memos = ends.map((r) => r.memo).filter(Boolean);
    const pre = [sits.join(', '), memos.join(' · ')].filter(Boolean).join(' · ');
    const yest = k === dateKey(addDays(dayStart(now()), -1));
    return `<section class="card review-card" data-k="${k}">
      <div class="sec-head"><h2>${yest ? '어제' : md(d0)} 돌아보기</h2><span class="muted small">종료 ${ends.length}번</span></div>
      <p class="rv-q">직전에 뭘 하고 있었나요?</p>
      <input id="er-before" maxlength="80" value="${esc(pre)}" placeholder="그때 하던 일" />
      <p class="rv-q">다음엔 어떻게 할래요?</p>
      <input id="er-next" maxlength="80" placeholder="교훈 탭에 남아요" />
      <div class="rv-acts"><button class="btn ghost small" data-act="er-skip" data-k="${k}" type="button">건너뛰기</button><button class="btn primary small" data-act="er-save" data-k="${k}" type="button">저장 +${XP.endReview} XP</button></div>
    </section>`;
  }
  function addLessonTo(ls, text) {
    let c = ls.find((x) => x.name === '디톡스 교훈');
    if (!c) {
      if (ls.length < LESSON_CAT_MAX) { c = { id: 'c' + uid6(), name: '디톡스 교훈', items: [] }; ls.push(c); } else c = ls[0];
    }
    if (c && c.items.length < LESSON_MAX) c.items.push({ id: 'i' + uid6(), text, at: now(), rv: 0 });
    return ls;
  }
  async function saveEndReview(k, skip) {
    if (dailyOf(k).review) return;
    if (skip) { await setDaily(k, { review: { skip: true, at: now() } }); return renderHome(); }
    const before = ($('er-before').value || '').trim(), next = ($('er-next').value || '').trim();
    if (!next) { toast('다음엔 어떻게 할지 적어주세요'); return; }
    const got = await gainFixed(XP.endReview);
    const lessons = addLessonTo(cloneLessons(), next);
    await setDaily(k, { review: { before, next, at: now(), xp: got } }, { xp: U.xp, lessons });
    savePublic();
    toast(`교훈에 남겼어요 (+${got} XP)`);
    renderHome(); checkAchievements();
  }

  /* ---------- 시험 회고 ---------- */
  // v1.7.7: 시험 회고는 exams 배열이 아니라 examReviews 맵에 따로 저장해요.
  // (배열은 통째로 덮어써져서, 다른 기기·오래된 화면이 exams를 저장하면 회고가 지워질 수 있었어요)
  const exSig = (e) => `${e.name}|${e.start}|${e.end}`;
  function exRvOf(e) {
    const m = U.examReviews || {};
    if (m[e.id]) return m[e.id];
    const sig = exSig(e);
    const hit = Object.values(m).find((r) => r && r.sig === sig);
    if (hit) return hit;
    if (e.review) return e.review;
    if (e.reviewSkip) return { skip: true };
    return null;
  }
  // 예전 버전에서 배열에 저장된 회고를 맵으로 옮기고, 지워진 회고는 업적 기록으로 되살려요
  function migrateExamReviews() {
    const add = {};
    U.exams.forEach((e) => {
      if ((U.examReviews || {})[e.id]) return;
      if (e.review) add[e.id] = { ...e.review, sig: exSig(e) };
      else if (e.reviewSkip) add[e.id] = { skip: true, at: 0, sig: exSig(e) };
    });
    // 첫 시험 회고 업적은 받았는데 남아 있는 회고가 하나도 없으면: 그때 회고할 수 있던 시험을 '작성함'으로 표시
    const t = (U.achievements || {}).gex1;
    const all = { ...(U.examReviews || {}), ...add };
    if (isNum(t) && !Object.values(all).some((r) => r && !r.skip) && !U.exams.some((e) => e.review)) {
      const cand = U.exams.map((e) => ({ e, st: examStatus(e) }))
        .filter(({ e, st }) => !all[e.id] && st.pe <= t && t < addDays(st.pe, 14))
        .sort((a, b) => b.st.pe - a.st.pe)[0];
      if (cand) add[cand.e.id] = { good: '', note: '', at: t, xp: 0, lost: true, sig: exSig(cand.e) };
    }
    if (Object.keys(add).length) saveUser({ examReviews: add }).catch(() => {});
  }
  function examReviewDue() {
    return U.exams.map((e) => ({ e, st: examStatus(e) }))
      .filter(({ e, st }) => st.state === 'over' && !exRvOf(e) && now() < addDays(st.pe, 14) && st.pe > U.trackStart)
      .sort((a, b) => a.st.pe - b.st.pe)[0] || null;
  }
  function examCmp(st) {
    const A = [Math.max(st.ps, U.trackStart), st.pe], B = [Math.max(addDays(st.ps, -14), U.trackStart), st.ps];
    const days = (r) => Math.max(1, Math.round((dayStart(r[1]) - dayStart(r[0])) / DAY));
    const ra = rangeReport(...A), rb = B[1] > B[0] ? rangeReport(...B) : null;
    const da = days(A), db_ = rb ? days(B) : 1;
    return cmpHtml([
      { name: '종료', p: rb ? rb.ends / db_ : null, c: ra.ends / da, ps: rb ? `${rb.ends}번 · ${db_}일` : null, cs: `${ra.ends}번 · ${da}일`, up: false, eps: 0.001, f: fmtN('') },
      { name: '하루 공부', p: rb ? rb.study / db_ : null, c: ra.study / da, f: fmtDur, up: true, eps: MIN },
      { name: '고요한 날', p: rb ? rb.calm / db_ : null, c: ra.calm / da, ps: rb ? `${rb.calm}일` : null, cs: `${ra.calm}일`, up: true, eps: 0.001, f: fmtN('') },
      { name: '평균 별점', p: rb && rb.score ? rb.score.avg : null, c: ra.score ? ra.score.avg : null, f: fmtSc, up: true, eps: 0.05 },
    ], ['평소 2주', '시험 기간']).html;
  }
  function examReviewCardHtml() {
    const x = examReviewDue();
    if (!x) return '';
    return `<section class="card review-card exam-rv" data-id="${esc(x.e.id)}">
      <div class="sec-head"><h2>${esc(x.e.name)} 회고</h2><span class="muted small">시험 기간 vs 평소</span></div>
      ${examCmp(x.st)}
      <p class="rv-q">이번 시험 기간 잘한 것은?</p>
      <input id="ex-good" maxlength="80" />
      <p class="rv-q">다음 시험 때 나에게 한마디</p>
      <input id="ex-note" maxlength="60" placeholder="다음 시험 D-7부터 홈에 보여요" />
      <div class="rv-acts"><button class="btn ghost small" data-act="ex-skip" data-id="${esc(x.e.id)}" type="button">건너뛰기</button><button class="btn primary small" data-act="ex-save" data-id="${esc(x.e.id)}" type="button">저장 +${XP.examReview} XP</button></div>
    </section>`;
  }
  async function saveExamReview(id, skip) {
    const e = U.exams.find((x) => x.id === id);
    if (!e || exRvOf(e)) return;
    if (skip) { await saveUser({ examReviews: { [id]: { skip: true, at: now(), sig: exSig(e) } } }).catch(() => {}); return renderHome(); }
    const good = ($('ex-good').value || '').trim(), note = ($('ex-note').value || '').trim();
    if (!good || !note) { toast('두 질문 모두 적어주세요'); return; }
    const got = await gainFixed(XP.examReview);
    try { await saveUser({ examReviews: { [id]: { good, note, at: now(), xp: got, sig: exSig(e) } }, xp: U.xp }); } catch (err) {}
    savePublic();
    toast(`시험 회고를 남겼어요 (+${got} XP)`);
    renderHome(); checkAchievements();
  }
  // 다음 시험 D-7부터: 지난 시험 때 남긴 한마디
  function examNote() {
    const a = activeExam();
    if (!a || a.st.dday > 7) return null;
    const past = U.exams.filter((e) => { const r = exRvOf(e); return e.id !== a.e.id && r && r.note && examStatus(e).state === 'over'; }).sort((x, y) => y.end.localeCompare(x.end))[0];
    return past ? { note: exRvOf(past).note, name: past.name } : null;
  }

  /* ---------- 교훈 다시 보기 ---------- */
  function lessonDue() {
    if (U.lessonSeenDay === dateKey(now())) return null;
    const t0 = dayStart(now());
    let best = null;
    (U.lessons || []).forEach((c) => (c.items || []).forEach((it) => {
      const rv = it.rv || 0;
      if (it.learned || rv >= LESSON_RV.length) return;
      const due = addDays(dayStart(it.at || U.lessonBase || now()), LESSON_RV[rv]);
      if (due <= t0 && (!best || due < best.due)) best = { c, it, due };
    }));
    return best;
  }
  function lessonDueHtml() {
    const x = lessonDue();
    if (!x) return '';
    return `<div class="ls-due"><span class="ls-due-k">다시 보는 교훈 · ${esc(x.c.name)}</span><p>${esc(x.it.text)}</p>
      <div class="ls-due-acts"><button class="btn small ghost" data-act="ls-rv" data-v="keep" data-cat="${esc(x.c.id)}" data-id="${esc(x.it.id)}" type="button">아직 중요해요</button>
      <button class="btn small" data-act="ls-rv" data-v="learned" data-cat="${esc(x.c.id)}" data-id="${esc(x.it.id)}" type="button">이제 몸에 뱄어요</button></div></div>`;
  }
  async function lessonReview(catId, id, v) {
    const ls = cloneLessons(), c = ls.find((x) => x.id === catId), it = c && c.items.find((x) => x.id === id);
    if (!it || U.lessonSeenDay === dateKey(now())) return;
    if (!it.at) it.at = U.lessonBase || now();
    if (v === 'learned') it.learned = now(); else it.rv = (it.rv || 0) + 1;
    const got = await gainFixed(XP.lessonReview);
    try { await saveUser({ lessons: ls, lessonSeenDay: dateKey(now()), lessonRvCount: (U.lessonRvCount || 0) + 1, xp: U.xp }); } catch (e) {}
    savePublic();
    toast(v === 'learned' ? `익힌 교훈으로 옮겼어요 (+${got} XP)` : `다음에 또 보여드릴게요 (+${got} XP)`);
    renderHome(); checkAchievements();
  }

  /* ---------- 나에게 맞는 방법 찾기 (실험) ---------- */
  const activeExp = () => (U.experiments || []).find((x) => !x.doneAt && !x.stopped) || null;
  const expPending = () => { const x = activeExp(); return x && now() >= x.end ? x : null; };
  const expDayN = (x) => Math.min(x.days, Math.floor((dayStart(now()) - x.start) / DAY) + 1);
  const EXP_MIN = 1, EXP_MAX = 90, EXP_XP_MIN = 3;   // 실험 기간: 1~90일 (3일 이상이면 경험치)
  function openExpSheet(prefill, prevDays) {
    if (expPending()) return toast('끝난 실험의 결과를 먼저 골라 주세요');
    if (activeExp()) return toast('진행 중인 실험이 끝나면 새로 시작할 수 있어요');
    const t0 = dayStart(now());
    let days = prevDays >= EXP_MIN && prevDays <= EXP_MAX ? Math.round(prevDays) : 7;
    let custom = ![3, 7, 14].includes(days);
    const endKey = (d) => dateKey(addDays(t0, d - 1));
    openSheet(`<h2>새 실험</h2>
      <p class="muted">나에게 효과가 있는지 며칠 동안 해 봐요.</p>
      <p class="label">무엇을</p>
      <input id="xp-text" maxlength="40" placeholder="예: 자기 전 폰 거실에 두기" value="${esc(prefill || '')}" />
      <p class="label">며칠 동안</p>
      <div class="seg" id="xp-days">${[3, 7, 14].map((d) => `<button class="seg-btn${!custom && d === days ? ' active' : ''}" data-d="${d}" type="button">${d}일</button>`).join('')}<button class="seg-btn${custom ? ' active' : ''}" data-d="custom" type="button">직접</button></div>
      <div class="xp-custom${custom ? '' : ' hidden'}" id="xp-custom">
        <div class="time-row"><span>오늘부터</span><input type="date" id="xp-end" min="${endKey(EXP_MIN)}" max="${endKey(EXP_MAX)}" value="${endKey(days)}" /><span>까지</span></div>
      </div>
      <p class="muted small xp-sum" id="xp-sum"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button><button class="btn primary" data-ok type="button">시작</button></div>`,
    (b) => {
      const sum = () => {
        $('xp-sum').textContent = `${md(t0)} ~ ${md(addDays(t0, days - 1))} · ${days}일${days >= EXP_XP_MIN ? ` · 끝내면 +${XP.experiment} XP` : ' · 3일 이상이면 경험치를 받아요'}`;
      };
      const fromDate = () => {
        const v = $('xp-end').value;
        if (!v) return null;
        return Math.round((keyTs(v) - t0) / DAY) + 1;
      };
      b.querySelectorAll('#xp-days .seg-btn').forEach((x) => {
        x.onclick = () => {
          b.querySelectorAll('#xp-days .seg-btn').forEach((y) => y.classList.toggle('active', y === x));
          custom = x.dataset.d === 'custom';
          $('xp-custom').classList.toggle('hidden', !custom);
          if (custom) { const d = fromDate(); if (d) days = d; } else days = +x.dataset.d;
          sum();
        };
      });
      $('xp-end').onchange = $('xp-end').oninput = () => { const d = fromDate(); if (d) { days = d; sum(); } };
      sum();
      b.querySelector('[data-close]').onclick = closeSheet;
      b.querySelector('[data-ok]').onclick = async () => {
        const text = $('xp-text').value.trim();
        if (!text) return toast('무엇을 해 볼지 적어주세요');
        if (custom) {
          const d = fromDate();
          if (!d || d < EXP_MIN || d > EXP_MAX) return toast(`끝나는 날은 오늘부터 ${EXP_MAX}일 안으로 골라 주세요`);
          days = d;
        }
        closeSheet();
        const start = dayStart(now());
        const x = { id: 'x' + uid6(), text, days, start, end: addDays(start, days), at: now() };
        try { await saveUser({ experiments: [...U.experiments, x] }); toast(`실험 시작! ${days}일 동안 해 봐요`); } catch (e) {}
        refreshViews();
      };
    });
  }
  function expCmp(x) {
    const pa = Math.max(addDays(x.start, -x.days), U.trackStart);
    const short = pa > addDays(x.start, -x.days);
    const t = cmpHtml(periodRows(pa, x.start, x.start, x.end, false), [`실험 전 ${x.days}일`, '실험 기간']);
    return t.html + (short ? '<p class="muted small cmp-note">실험 전 기록이 짧아서 비교가 정확하지 않을 수 있어요</p>' : '');
  }
  function expResultCardHtml() {
    const x = expPending();
    if (!x) return '';
    return `<section class="card review-card exp-card">
      <div class="sec-head"><h2>실험 끝</h2><span class="muted small">${x.days}일</span></div>
      <p class="exp-t">${esc(x.text)}</p>
      ${expCmp(x)}
      <p class="rv-q">효과가 있었나요?</p>
      <div class="rv-acts three"><button class="btn small" data-act="exp-rate" data-v="yes" type="button">있었어요</button><button class="btn small ghost" data-act="exp-rate" data-v="unsure" type="button">모르겠어요</button><button class="btn small ghost" data-act="exp-rate" data-v="no" type="button">없었어요</button></div>
    </section>`;
  }
  async function rateExp(v) {
    const x = expPending();
    if (!x) return;
    const got = x.days >= EXP_XP_MIN ? await gainFixed(XP.experiment) : 0;
    try { await saveUser({ experiments: U.experiments.map((e) => (e.id === x.id ? { ...e, rating: v, doneAt: now(), xp: got } : e)), xp: U.xp }); } catch (e) {}
    savePublic();
    toast((v === 'yes' ? '나에게 맞는 방법에 넣었어요' : '실험을 마쳤어요') + (got ? ` (+${got} XP)` : ''));
    refreshViews(); checkAchievements();
  }
  async function stopExp() {
    const x = activeExp();
    if (!x) return;
    confirmSheet('실험을 그만둘까요?', '그만두면 결과와 경험치는 없어요.', '그만두기', async () => {
      try { await saveUser({ experiments: U.experiments.map((e) => (e.id === x.id ? { ...e, stopped: now() } : e)) }); } catch (e) {}
      refreshViews();
    });
  }
  function fitsList() {
    const seen = new Set();
    return (U.experiments || []).filter((x) => x.rating === 'yes').reverse().filter((x) => (seen.has(x.text) ? false : seen.add(x.text)));
  }

  /* ---------- 미래의 나에게 편지 ---------- */
  const sealed = () => (U.letters || []).filter((l) => !l.openedAt);
  const lettersDue = () => sealed().filter((l) => l.openAt <= now()).sort((a, b) => a.openAt - b.openAt);
  function snapNow() { return { lv: levelOf(U.xp), best: Math.max(U.bestMs || 0, curMs()), study: studyIn(0, now() + DAY) + focusRunMs() }; }
  function openLetterWrite() {
    if (sealed().length >= LETTER_OPEN_MAX) return toast(`아직 안 열린 편지는 ${LETTER_OPEN_MAX}통까지예요`);
    const ups = U.exams.map((e) => ({ e, st: examStatus(e) })).filter((x) => x.st.pe >= addDays(dayStart(now()), 7)).sort((a, b) => a.st.pe - b.st.pe);
    let kind = '30';
    const minDate = dateKey(addDays(dayStart(now()), 7));
    openSheet(`<h2>미래의 나에게</h2>
      <textarea id="lt-text" maxlength="500" rows="6" placeholder="지금의 마음, 바라는 것, 응원 한마디"></textarea>
      <p class="label">언제 열까요?</p>
      <div class="chips" id="lt-kind">
        <button type="button" class="chip selected" data-k="30">30일 뒤</button>
        <button type="button" class="chip" data-k="100">100일 뒤</button>
        ${ups.length ? `<button type="button" class="chip" data-k="exam">시험 끝난 날</button>` : ''}
        <button type="button" class="chip" data-k="date">날짜 지정</button></div>
      ${ups.length ? `<select id="lt-exam" class="hidden" style="margin-top:10px">${ups.map((x) => `<option value="${esc(x.e.id)}">${esc(x.e.name)} (${mdShort(x.st.pe)})</option>`).join('')}</select>` : ''}
      <input type="date" id="lt-date" class="hidden" min="${minDate}" value="${minDate}" style="margin-top:10px" />
      <p class="form-err" id="lt-err"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button><button class="btn primary" data-ok type="button">봉인하기</button></div>`,
    (b) => {
      b.querySelectorAll('#lt-kind .chip').forEach((c) => {
        c.onclick = () => {
          kind = c.dataset.k;
          b.querySelectorAll('#lt-kind .chip').forEach((x) => x.classList.toggle('selected', x === c));
          if ($('lt-exam')) $('lt-exam').classList.toggle('hidden', kind !== 'exam');
          $('lt-date').classList.toggle('hidden', kind !== 'date');
        };
      });
      b.querySelector('[data-close]').onclick = closeSheet;
      b.querySelector('[data-ok]').onclick = async () => {
        const text = $('lt-text').value.trim();
        if (!text) { $('lt-err').textContent = '편지를 적어주세요.'; return; }
        const t0 = dayStart(now());
        let openAt;
        if (kind === '30') openAt = addDays(t0, 30);
        else if (kind === '100') openAt = addDays(t0, 100);
        else if (kind === 'exam') { const x = ups.find((u) => u.e.id === $('lt-exam').value); openAt = x ? x.st.pe : addDays(t0, 30); }
        else {
          const v = $('lt-date').value;
          if (!v || v < minDate) { $('lt-err').textContent = '일주일 뒤부터 고를 수 있어요.'; return; }
          openAt = keyTs(v);
        }
        closeSheet();
        const l = { id: 'l' + uid6(), text, at: now(), openAt, kind, snap: snapNow() };
        try { await saveUser({ letters: [...U.letters, l] }); toast(`${md(openAt)}에 열려요`); } catch (e) {}
        refreshViews(); checkAchievements();
      };
    });
  }
  async function openLetter(id) {
    const l = (U.letters || []).find((x) => x.id === id);
    if (!l || (!l.openedAt && l.openAt > now())) return;
    let got = 0;
    if (!l.openedAt) {
      got = await gainFixed(XP.letter);
      try { await saveUser({ letters: U.letters.map((x) => (x.id === id ? { ...x, openedAt: now(), xp: got } : x)), xp: U.xp }); } catch (e) {}
      savePublic();
    }
    const s0 = l.snap || {}, s1 = snapNow();
    const row = (n, a, b, f) => `<div class="cmp-r"><span class="cn">${n}</span><span class="cp">${a == null ? '-' : f(a)}</span><span class="cc">${f(b)}</span><span class="trend ${b > (a || 0) ? 'good' : 'same'}">${b > (a || 0) ? '▲' : '–'}</span></div>`;
    openSheet(`<p class="lt-kicker">${md(l.at)}의 내가 보낸 편지${got ? ` · +${got} XP` : ''}</p>
      <div class="letter">${esc(l.text).replace(/\n/g, '<br>')}</div>
      <div class="cmp"><div class="cmp-r cmp-h"><span></span><span>그때</span><span>지금</span><span></span></div>
        ${row('레벨', s0.lv, s1.lv, (v) => `Lv.${v}`)}${row('최장 기록', s0.best, s1.best, fmtDur)}${row('누적 공부', s0.study, s1.study, fmtDur)}</div>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">닫기</button><button class="btn primary" data-ok type="button">새 편지 쓰기</button></div>`,
    (b) => {
      b.querySelector('[data-close]').onclick = closeSheet;
      b.querySelector('[data-ok]').onclick = () => { closeSheet(); setTimeout(openLetterWrite, 50); };
    });
    if (got) { refreshViews(); checkAchievements(); }
  }

  /* ---------- 내가 시작한 이유 ---------- */
  const randWhy = () => (U && U.whys && U.whys.length ? U.whys[Math.floor(Math.random() * U.whys.length)] : '');
  async function addWhy(inputId) {
    const inp = $(inputId), v = inp && inp.value.trim();
    if (!v) return;
    if (U.whys.length >= WHY_MAX) return toast(`이유는 ${WHY_MAX}개까지예요`);
    if (U.whys.includes(v)) return toast('이미 적어 둔 이유예요');
    try { await saveUser({ whys: [...U.whys, v], whyAsked: true }); toast('이유를 적어 뒀어요. 흔들릴 때 보여드릴게요'); } catch (e) {}
    refreshViews(); checkAchievements();
  }
  function whyAskHtml() {
    if ((U.whys && U.whys.length) || U.whyAsked) return '';
    return `<section class="card why-ask">
      <div class="sec-head"><h2>왜 끊고 싶나요?</h2><button class="link" data-act="why-later" type="button">나중에</button></div>
      <p class="muted small">종료 버튼을 누를 때마다 이 말이 떠요.</p>
      <div class="inline-add"><input id="why-home" maxlength="60" placeholder="예: 공부에 집중하고 싶어서" /><button class="btn primary" data-act="why-add" data-src="why-home" type="button">저장</button></div>
    </section>`;
  }
  let whyTimer = null;
  function showWhyPop(on) {
    const el = $('why-pop');
    if (!el) return;
    clearTimeout(whyTimer);
    if (on) {
      const w = randWhy();
      if (!w) return;
      $('why-pop-text').textContent = w;
      show(el); requestAnimationFrame(() => el.classList.add('on'));
    } else { el.classList.remove('on'); whyTimer = setTimeout(() => hide(el), 250); }
  }

  /* ---------- 고비 구간 · 나의 패턴 ---------- */
  const DUR_BINS = [[0, 1, '1일 미만'], [1, 3, '1~2일'], [3, 5, '3~4일'], [5, 8, '5~7일'], [8, 15, '8~14일'], [15, 31, '15~30일'], [31, 1e6, '31일 이상']];
  function gobi() {
    if (S.streaks.length < 5) return null;
    const counts = DUR_BINS.map(() => 0);
    S.streaks.forEach((s) => { const d = s.durationMs / DAY; const i = DUR_BINS.findIndex(([lo, hi]) => d >= lo && d < hi); if (i >= 0) counts[i]++; });
    let top = 0;
    counts.forEach((n, i) => { if (n > counts[top]) top = i; });
    return { counts, top, n: counts[top] };
  }
  function gobiNow() {
    if (!U.riskOn || !isActive()) return null;
    const g = gobi();
    if (!g || g.top === 0 || g.n < 2) return null;
    const [lo, hi, label] = DUR_BINS[g.top], d = curMs() / DAY;
    return d >= lo && d < hi ? { label } : null;
  }
  const SIT_TXT = { '심심함': '심심할 때', '피곤함': '피곤할 때', '스트레스': '스트레스 받을 때', '혼자 있음': '혼자 있을 때', '잠들기 전': '잠들기 전', '할 일 미루는 중': '할 일을 미룰 때' };
  const HM_COLS = ['새벽', '이른 아침', '오전', '오후', '저녁', '밤'];
  const HM_SHORT = ['0시', '4시', '8시', '12시', '16시', '20시'];
  const WD = ['월', '화', '수', '목', '금', '토', '일'];
  function patternCard() {
    const done = S.streaks;
    if (done.length < 5) {
      return `<section class="card"><h2>나의 패턴</h2><p class="empty">종료 기록이 5개 쌓이면 보여드릴게요. (지금 ${done.length}개)</p></section>`;
    }
    const grid = Array.from({ length: 7 }, () => Array(6).fill(0));
    const wdc = Array(7).fill(0), colc = Array(6).fill(0);
    done.forEach((s) => { const d = new Date(s.end), w = (d.getDay() + 6) % 7, c = Math.floor(d.getHours() / 4); grid[w][c]++; wdc[w]++; colc[c]++; });
    const max = Math.max(1, ...grid.flat());
    const topC = colc.indexOf(Math.max(...colc));
    const sits = {}; done.forEach((s) => (s.situations || []).forEach((x) => { sits[x] = (sits[x] || 0) + 1; }));
    const topS = topOf(sits);
    // 가장 짙은 칸이 2번 이상이면 그 요일·시간대, 아니면 시간대만
    let cw = 0, cc = 0;
    grid.forEach((row, w) => row.forEach((n, c) => { if (n > grid[cw][cc]) { cw = w; cc = c; } }));
    const when = grid[cw][cc] >= 2 && grid[cw][cc] / done.length >= 0.2 ? `${WD[cw]}요일 ${HM_COLS[cc]}` : HM_COLS[topC];
    const sentence = `주로 <b>${when}</b>${topS ? `, <b>${esc(SIT_TXT[topS] || topS)}</b>` : ''} 무너져요`;
    const g = gobi();
    const reasons = {}; done.forEach((s) => { reasons[s.reason] = (reasons[s.reason] || 0) + 1; });
    const rList = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
    const sList = Object.entries(sits).sort((a, b) => b[1] - a[1]);
    const bar = (name, n, mx) => `<div class="hbar"><span class="name">${esc(name)}</span><span class="track"><i style="width:${(n / Math.max(1, mx)) * 100}%"></i></span><span class="n">${n}</span></div>`;
    const lv = (n) => (n ? Math.min(4, Math.ceil((n / max) * 4)) : 0);
    return `<section class="card pattern-card">
      <h2>나의 패턴</h2>
      <p class="pt-sum">${sentence}</p>
      <div class="hm" role="table" aria-label="요일과 시간대별 종료">
        <span></span>${HM_SHORT.map((h) => `<span class="hm-h">${h}</span>`).join('')}
        ${grid.map((row, w) => `<span class="hm-w">${WD[w]}</span>${row.map((n, c) => `<span class="hm-c l${lv(n)}" title="${WD[w]}요일 ${HM_COLS[c]} · ${n}번"><i></i></span>`).join('')}`).join('')}
      </div>
      <div class="hm-legend"><span>적음</span>${[1, 2, 3, 4].map((i) => `<span class="hm-c l${i}"><i></i></span>`).join('')}<span>많음</span></div>
      ${g ? `<h3 class="pt-h">버틴 기간별 종료</h3><p class="muted small pt-sub"><b>${DUR_BINS[g.top][2]}</b> 버텼을 때 가장 많이 끝났어요</p>
        <div class="hbars">${DUR_BINS.map((b, i) => (g.counts[i] ? bar(b[2], g.counts[i], g.n) : '')).join('')}</div>` : ''}
      <div class="grid-2" style="margin-top:18px">
        <div><h3 style="margin-bottom:10px">종료 이유</h3><div class="hbars">${rList.map(([k, n]) => bar(k, n, rList[0][1])).join('')}</div></div>
        <div><h3 style="margin-bottom:10px">무너질 때 상황</h3>${sList.length ? `<div class="hbars">${sList.map(([k, n]) => bar(k, n, sList[0][1])).join('')}</div>` : '<p class="empty">종료할 때 상황을 고르면 여기에 모여요.</p>'}</div>
      </div>
    </section>`;
  }

  /* ---------- 별점 흐름 · 별점 분석 ---------- */
  function scoreBars(a, n) {
    const cols = [];
    let any = false;
    for (let i = 0; i < n; i++) {
      const d = addDays(a, i);
      if (d > now()) break;
      const v = scoreOf(dateKey(d));
      if (v != null) any = true;
      cols.push({ d, v });
    }
    if (!any) return '';
    const total = n;
    const lab = (c, i) => (total <= 7 ? DOW[new Date(c.d).getDay()] : (i === 0 || (i + 1) % 5 === 0 ? new Date(c.d).getDate() : ''));
    const pad_ = Array.from({ length: total - cols.length }, () => '<div class="sb"><span class="sb-col"></span><span class="sb-l"></span></div>').join('');
    return `<div class="sbars-wrap"><h3>별점 흐름</h3>
      <div class="sbars${total > 7 ? ' dense' : ''}" style="grid-template-columns:repeat(${total},1fr)">${cols.map((c, i) => `<div class="sb" title="${mdShort(c.d)} ${c.v == null ? '기록 없음' : '★' + fmtStar(c.v)}"><span class="sb-col">${c.v == null ? '<i class="sb-none"></i>' : `<i class="sb-bar" style="height:${Math.max(4, (c.v / 5) * 100).toFixed(0)}%"></i>`}</span><span class="sb-l">${lab(c, i)}</span></div>`).join('')}${pad_}</div></div>`;
  }
  function scoreNotes(a, b) {
    const end = Math.min(b, now()), notes = [];
    const ok = avgScoreIn(a, end, (d) => !endsIn(d, addDays(d, 1)).length && detoxIn(d, Math.min(addDays(d, 1), now())) > 0);
    const bad = avgScoreIn(a, end, (d) => endsIn(d, addDays(d, 1)).length > 0);
    if (ok && bad) notes.push(`지킨 날 평균 <b>★${fmtScore(ok.avg)}</b>, 종료한 날 <b>★${fmtScore(bad.avg)}</b>`);
    const hi = avgScoreIn(a, end, (d) => studyIn(d, addDays(d, 1)) >= 2 * HOUR);
    const lo = avgScoreIn(a, end, (d) => studyIn(d, addDays(d, 1)) < 2 * HOUR);
    if (hi && lo && hi.n >= 2 && lo.n >= 2) {
      const df = hi.avg - lo.avg;
      if (Math.abs(df) >= 0.3) notes.push(`공부 2시간 이상인 날 별점이 <b>${fmtScore(Math.abs(df))}</b> ${df > 0 ? '더 높았어요' : '더 낮았어요'}`);
    }
    return notes;
  }

  /* ---------- 오늘 한 줄 ---------- */
  function dayTags(k) {
    const d0 = keyTs(k), d1 = addDays(d0, 1), tags = [];
    if (d1 <= U.trackStart) return tags;
    const ends = endsIn(d0, d1).length;
    if (ends) tags.push({ t: `종료 ${ends}번`, c: 'r' });
    else if (calmDone(d0)) tags.push({ t: '고요한 날', c: 'calm' });
    else if (okDay(d0)) tags.push({ t: '지킨 날', c: 'ok' });
    const st = studyIn(d0, Math.min(d1, now())) + (k === dateKey(now()) ? focusRunMs() : 0);
    if (st >= MIN) tags.push({ t: `공부 ${fmtDur(st)}`, c: 'study' });
    const ps = pledgesOf(k);
    if (ps.length) tags.push({ t: `다짐 ${ps.filter((p) => p.check === 'yes').length}/${ps.length}`, c: '' });
    return tags;
  }
  const tagsHtml = (k) => { const t = dayTags(k); return t.length ? `<span class="jtags">${t.map((x) => `<span class="jtag ${x.c}">${esc(x.t)}</span>`).join('')}</span>` : ''; };
  function pastEntry(k) {
    const d = new Date(keyTs(k));
    const y1 = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
    if (y1.getDate() === d.getDate()) { const kk = dateKey(y1.getTime()); if (S.journal[kk]) return { label: '1년 전 오늘', k: kk }; }
    const m1 = new Date(d.getFullYear(), d.getMonth() - 1, d.getDate());
    if (m1.getDate() === d.getDate()) { const kk = dateKey(m1.getTime()); if (S.journal[kk]) return { label: '한 달 전 오늘', k: kk }; }
    return null;
  }
  // 어제 한 줄: 다음 날 정오까지
  function yesterdayOpen() {
    const yk = dateKey(addDays(dayStart(now()), -1));
    return new Date().getHours() < 12 && !S.journal[yk] && addDays(keyTs(yk), 1) > U.trackStart ? yk : null;
  }
  function journalCardHtml() {
    const today = dateKey(now());
    const yk = yesterdayOpen();
    if (ui.jDay === 'y' && !yk) ui.jDay = 't';
    const k = ui.jDay === 'y' ? yk : today;
    const j = S.journal[k];
    const jStreak = journalStreak();
    const editing = !j || ui.editJournal;
    const q = (j && j.q) || questionFor(k);
    if (editing && ui.score == null && j) ui.score = jScore(j);
    const title = ui.jDay === 'y' ? '어제 한 줄' : '오늘 한 줄';
    const right = j && !ui.editJournal ? '<button class="link" data-act="edit-journal" type="button">고치기</button>'
      : `<span class="muted small">${md(keyTs(k))}</span>`;
    let body;
    if (!editing) {
      const pe = pastEntry(k), pj = pe && S.journal[pe.k];
      body = `<div class="j-view">
        <div class="j-top">${starsHtml(jScore(j), 's-md')}${jScore(j) != null ? `<b class="num j-sc">${fmtStar(jScore(j))}</b>` : ''}</div>
        ${j.q ? `<p class="j-q">${esc(j.q)}</p>` : ''}
        <p class="j-text">${esc(j.text)}</p>
        ${tagsHtml(k)}
        ${pj ? `<div class="j-past"><span class="j-past-k">${pe.label}</span>${jScore(pj) != null ? starsHtml(jScore(pj), 's-sm') : ''}<p>${esc(pj.text)}</p></div>` : ''}
      </div>`;
    } else {
      const canAlt = !j && !dailyOf(k).qAlt;
      body = `<div class="j-edit">
        <p class="j-q big">${esc(q)}${canAlt ? ' <button class="link j-alt" data-act="q-alt" data-k="' + k + '" type="button">다른 질문</button>' : ''}</p>
        <div class="star-row">${`<div class="star-in" id="star-in" role="slider" tabindex="0" aria-label="${ui.jDay === 'y' ? '어제' : '오늘'} 별점" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${ui.score == null ? 0 : ui.score}"><span class="st-zero" aria-hidden="true"></span>${starsHtml(ui.score, 's-lg')}</div>`}<b class="st-val num" id="st-val">${ui.score == null ? '' : fmtStar(ui.score)}</b></div>
        <div class="inline-add"><input id="journal-input" maxlength="80" placeholder="한 줄로 적어요" value="${esc(j ? j.text : '')}" />
        <button class="btn primary" data-act="save-journal" type="button">저장</button></div>
      </div>`;
    }
    const yLink = yk && ui.jDay !== 'y' && S.journal[today] && !ui.editJournal ? `<button class="link j-yest" data-act="j-day" data-v="y" type="button">어제 한 줄도 쓰기</button>`
      : yk && ui.jDay !== 'y' && !S.journal[today] ? `<button class="link j-yest" data-act="j-day" data-v="y" type="button">어제 한 줄 쓰기</button>`
        : ui.jDay === 'y' ? '<button class="link j-yest" data-act="j-day" data-v="t" type="button">오늘로 돌아가기</button>' : '';
    return `<section class="card journal-card">
      <div class="sec-head"><h2>${title} ${jStreak ? `<span class="streak-chip">${jStreak}일 연속</span>` : ''}</h2>${right}</div>
      ${body}${yLink}
      ${lessonDueHtml()}
    </section>`;
  }

  /* ---------- 백업 ---------- */
  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function backupData() {
    const strip = (arr) => arr.map((x) => ({ ...x }));
    return {
      app: 'FocusFill', kind: 'backup', v: 1, appVersion: APP_VERSION, exportedAt: now(), id: idOf(me.email),
      user: (() => { const u = JSON.parse(JSON.stringify(U)); ['_t', '_w', '_ops', '_ep'].forEach((k) => { delete u[k]; }); return u; })(),
      streaks: strip(S.streaks), urges: strip(S.urges), journal: Object.values(S.journal).map((j) => ({ ...j })), focus: strip(S.focus),
    };
  }
  async function exportBackup(prefix = 'focusfill-backup') {
    const name = `${prefix}-${dateKey(now())}.json`;
    download(name, JSON.stringify(backupData()));
    try { await saveUser({ lastBackupAt: now() }); } catch (e) {}
    if (ui.tab === 'settings') renderSettings();
    toast('백업 파일을 저장했어요');
  }
  // 가져온 백업 정리: 숫자·날짜·선택값은 형식이 맞을 때만 받아요 (이상한 파일이 화면을 깨뜨리지 않게)
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const DK_RE = /^\d{4}-\d{2}-\d{2}$/, MK_RE = /^\d{4}-\d{2}$/, ID_RE2 = /^[\w-]{1,64}$/;
  const str = (v, n = 500) => (typeof v === 'string' ? v.slice(0, n) : '');
  const pickObj = (o, keyRe, fn) => {
    const out = {};
    if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach((k) => { if (keyRe.test(k)) { const v = fn(o[k]); if (v != null) out[k] = v; } });
    return out;
  };
  const numOr = (v, d = null) => (isNum(v) ? v : d);
  function cleanUser(u) {
    const o = {};
    ['nickname', 'gender', 'friendCode', 'honestDay', 'comebackDay', 'reportSeen', 'monthSeen', 'balanceSeen', 'lessonSeenDay'].forEach((k) => { if (typeof u[k] === 'string') o[k] = str(u[k], 40); });
    if (!['male', 'female', 'none'].includes(o.gender)) o.gender = 'none';
    ['xp', 'xpHours', 'bestMs', 'urgeWins', 'lastDur', 'multFloor', 'trackStart', 'rewardFrom', 'createdAt', 'comebackDone', 'recordBreaks', 'maxFriends', 'lessonBase', 'lessonRvCount', 'lastBackupAt', 'urgeMinutes', 'yearSeen', 'examCleanOld'].forEach((k) => { if (isNum(u[k])) o[k] = u[k]; });
    o.multFloor = Math.max(0, Math.min(3, Math.floor(o.multFloor || 0)));
    if (![5, 10, 15].includes(o.urgeMinutes)) o.urgeMinutes = 10;
    o.startAt = numOr(u.startAt); o.endedAt = numOr(u.endedAt);
    if (u.comeback && isNum(u.comeback.startAt) && isNum(u.comeback.targetMs)) o.comeback = { startAt: u.comeback.startAt, prevMs: numOr(u.comeback.prevMs, 0), targetMs: u.comeback.targetMs };
    ['riskOn', 'codeOk', 'wasTop1', 'whyAsked'].forEach((k) => { if (typeof u[k] === 'boolean') o[k] = u[k]; });
    o.onboarded = true;
    ['targets', 'activities', 'quotes', 'whys', 'subjects'].forEach((k) => { if (Array.isArray(u[k])) o[k] = u[k].filter((x) => typeof x === 'string').map((x) => str(x, 80)).slice(0, 100); });
    if (!o.targets || !o.targets.length) o.targets = [...BASE_TARGETS];
    if (u.share && typeof u.share === 'object') { o.share = {}; Object.keys(u.share).forEach((k) => { if (/^\w{1,20}$/.test(k)) o.share[k] = !!u.share[k]; }); }
    o.badges = pickObj(u.badges, ID_RE2, (v) => numOr(v));
    o.achievements = pickObj(u.achievements, ID_RE2, (v) => numOr(v));
    if (u.attend && typeof u.attend === 'object') o.attend = { last: DK_RE.test(u.attend.last) ? u.attend.last : '', streak: numOr(u.attend.streak, 0), total: numOr(u.attend.total, 0), best: numOr(u.attend.best, 0) };
    const pl = (p) => (p && typeof p === 'object' ? { id: ID_RE2.test(p.id) ? p.id : 'p' + uid6(), text: str(p.text, 60), check: ['yes', 'no'].includes(p.check) ? p.check : null, xp: numOr(p.xp, 0), at: numOr(p.at, 0), checkAt: numOr(p.checkAt, 0) } : null);
    o.daily = pickObj(u.daily, DK_RE, (d) => {
      if (!d || typeof d !== 'object') return null;
      const x = {};
      if (Array.isArray(d.pledges)) x.pledges = d.pledges.map(pl).filter(Boolean);
      if (typeof d.pledge === 'string') { x.pledge = str(d.pledge, 60); x.check = ['yes', 'no'].includes(d.check) ? d.check : null; x.checkXp = numOr(d.checkXp, 0); }
      ['att', 'pledgeXpCount', 'calmXp', 'focusXpBase', 'qAlt', 'jXp'].forEach((k) => { if (isNum(d[k])) x[k] = d[k]; });
      if (d.review && typeof d.review === 'object') x.review = d.review.skip ? { skip: true, at: numOr(d.review.at, 0) } : { before: str(d.review.before, 80), next: str(d.review.next, 80), at: numOr(d.review.at, 0), xp: numOr(d.review.xp, 0) };
      return x;
    });
    o.monthGoals = pickObj(u.monthGoals, MK_RE, (l) => (Array.isArray(l) ? l : [l]).filter((g) => g && GOAL_TYPES[g.type] && isNum(g.n)).map((g) => ({ id: ID_RE2.test(g.id) ? g.id : 'g' + uid6(), type: g.type, n: Math.max(1, Math.min(99, Math.round(g.n))), setAt: numOr(g.setAt, 0), ...(isNum(g.deleted) ? { deleted: g.deleted } : {}), ...(isNum(g.rewarded) ? { rewarded: g.rewarded } : {}) })));
    o.exams = (Array.isArray(u.exams) ? u.exams : []).filter((e) => e && DK_RE.test(e.start) && DK_RE.test(e.end)).map((e) => {
      const x = { id: ID_RE2.test(e.id) ? e.id : 'e' + uid6(), name: str(e.name, 20) || '시험', start: e.start, end: e.end };
      if (typeof e.evaluated === 'boolean') x.evaluated = e.evaluated;
      if (typeof e.clean === 'boolean') x.clean = e.clean;
      if (e.reviewSkip) x.reviewSkip = true;
      if (e.review && typeof e.review === 'object') x.review = { good: str(e.review.good, 80), note: str(e.review.note, 60), at: numOr(e.review.at, 0), xp: numOr(e.review.xp, 0) };
      return x;
    });
    o.lessons = (Array.isArray(u.lessons) ? u.lessons : []).filter((c) => c && typeof c === 'object').slice(0, LESSON_CAT_MAX).map((c) => ({
      id: ID_RE2.test(c.id) ? c.id : 'c' + uid6(), name: str(c.name, 20) || '교훈',
      items: (Array.isArray(c.items) ? c.items : []).filter((i) => i && typeof i.text === 'string').slice(0, LESSON_MAX).map((i) => ({ id: ID_RE2.test(i.id) ? i.id : 'i' + uid6(), text: str(i.text, 80), ...(isNum(i.at) ? { at: i.at } : {}), rv: Math.max(0, Math.min(LESSON_RV.length, Math.floor(numOr(i.rv, 0)))), ...(isNum(i.learned) ? { learned: i.learned } : {}) })),
    }));
    o.examReviews = pickObj(u.examReviews, ID_RE2, (r) => (r && typeof r === 'object' ? { ...(r.skip ? { skip: true } : { good: str(r.good, 80), note: str(r.note, 60), xp: numOr(r.xp, 0) }), ...(r.lost ? { lost: true } : {}), at: numOr(r.at, 0), sig: str(r.sig, 60) } : null));
    o.weekReviews = pickObj(u.weekReviews, DK_RE, (r) => (r && typeof r === 'object' ? { good: str(r.good, 200), next: str(r.next, 40), prevKept: ['yes', 'half', 'no'].includes(r.prevKept) ? r.prevKept : null, at: numOr(r.at, 0), xp: numOr(r.xp, 0) } : null));
    o.monthReviews = pickObj(u.monthReviews, MK_RE, (r) => (r && typeof r === 'object' ? { best: str(r.best, 200), regret: str(r.regret, 200), change: str(r.change, 40), at: numOr(r.at, 0), xp: numOr(r.xp, 0) } : null));
    o.experiments = (Array.isArray(u.experiments) ? u.experiments : []).filter((x) => x && Number.isInteger(x.days) && x.days >= 1 && x.days <= 90 && isNum(x.start) && isNum(x.end)).map((x) => ({
      id: ID_RE2.test(x.id) ? x.id : 'x' + uid6(), text: str(x.text, 40), days: x.days, start: x.start, end: x.end, at: numOr(x.at, x.start),
      ...(['yes', 'unsure', 'no'].includes(x.rating) ? { rating: x.rating } : {}), ...(isNum(x.doneAt) ? { doneAt: x.doneAt } : {}), ...(isNum(x.stopped) ? { stopped: x.stopped } : {}), ...(isNum(x.xp) ? { xp: x.xp } : {}),
    }));
    o.letters = (Array.isArray(u.letters) ? u.letters : []).filter((l) => l && typeof l.text === 'string' && isNum(l.at) && isNum(l.openAt)).map((l) => ({
      id: ID_RE2.test(l.id) ? l.id : 'l' + uid6(), text: str(l.text, 500), at: l.at, openAt: l.openAt, kind: str(l.kind, 10),
      snap: { lv: numOr(l.snap && l.snap.lv, 1), best: numOr(l.snap && l.snap.best, 0), study: numOr(l.snap && l.snap.study, 0) },
      ...(isNum(l.openedAt) ? { openedAt: l.openedAt, xp: numOr(l.xp, 0) } : {}),
    }));
    return o;
  }
  function cleanBackup(d) {
    const arr = (k, fn) => (Array.isArray(d[k]) ? d[k] : []).map((x) => (x && typeof x === 'object' ? fn(x) : null)).filter(Boolean);
    const okId = (x) => (ID_RE2.test(String(x.id || '')) ? x.id : uid6());
    return {
      ...d,
      user: cleanUser(d.user),
      streaks: arr('streaks', (x) => (isNum(x.start) && isNum(x.end) ? { id: okId(x), start: x.start, end: x.end, durationMs: numOr(x.durationMs, x.end - x.start), reason: str(x.reason, 20) || '기타', situations: Array.isArray(x.situations) ? x.situations.filter((t) => typeof t === 'string').map((t) => str(t, 20)) : [], memo: str(x.memo, 60) } : null)),
      urges: arr('urges', (x) => (isNum(x.at) ? { id: okId(x), at: x.at, minutes: numOr(x.minutes, 10), activity: str(x.activity, 40), target: str(x.target, 20), result: x.result === 'win' ? 'win' : 'lose' } : null)),
      journal: arr('journal', (x) => (DK_RE.test(String(x.id)) && typeof x.text === 'string' ? { id: x.id, text: str(x.text, 80), ...(isNum(x.score) && x.score >= 0 && x.score <= 5 ? { score: Math.round(x.score * 2) / 2 } : {}), ...(MOOD_SCORE[x.mood] != null ? { mood: x.mood } : {}), q: str(x.q, 60), updatedAt: numOr(x.updatedAt, 0) } : null)),
      focus: arr('focus', (x) => (isNum(x.start) && isNum(x.end) && isNum(x.ms) ? { id: okId(x), start: x.start, end: x.end, ms: x.ms, mins: numOr(x.mins, 25), subject: str(x.subject, 10), done: !!x.done, xp: numOr(x.xp, 0) } : null)),
    };
  }
  function validBackup(d) {
    return d && d.app === 'FocusFill' && d.kind === 'backup' && d.user && typeof d.user === 'object' && d.user.onboarded
      && ['streaks', 'urges', 'journal', 'focus'].every((k) => d[k] == null || Array.isArray(d[k]));
  }
  function pickImport() {
    if (navigator.onLine === false) return toast('인터넷에 연결된 뒤 가져와 주세요');
    const inp = $('import-file');
    inp.value = '';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) return toast('파일이 너무 커요');
      const rd = new FileReader();
      rd.onload = () => {
        let d = null;
        try { d = JSON.parse(rd.result); } catch (e) { d = null; }
        if (!validBackup(d)) return toast('FocusFill 백업 파일이 아니에요', null, 3500);
        try { d = cleanBackup(d); } catch (e) { return toast('FocusFill 백업 파일이 아니에요', null, 3500); }
        previewImport(d);
      };
      rd.onerror = () => toast('파일을 읽지 못했어요');
      rd.readAsText(f);
    };
    inp.click();
  }
  function previewImport(d) {
    const u = d.user;
    const n = (k) => (d[k] || []).length;
    openSheet(`<h2>이 백업으로 바꿀까요?</h2>
      <div class="imp-box">
        <div class="cmp-r"><span class="cn">백업한 날</span><span class="cc">${md(d.exportedAt)} ${hm(d.exportedAt)}</span></div>
        <div class="cmp-r"><span class="cn">기록 시작</span><span class="cc">${u.trackStart ? md(u.trackStart) : '-'}</span></div>
        <div class="cmp-r"><span class="cn">레벨</span><span class="cc">Lv.${levelOf(u.xp || 0)}</span></div>
        <div class="cmp-r"><span class="cn">종료 · 참기</span><span class="cc">${n('streaks')} · ${n('urges')}</span></div>
        <div class="cmp-r"><span class="cn">한 줄 · 집중</span><span class="cc">${n('journal')} · ${n('focus')}</span></div>
      </div>
      <p class="muted small" style="margin-top:12px">지금 기록은 이 백업으로 바뀌어요. 바꾸기 전에 지금 기록을 파일로 먼저 저장해 둘게요. 친구와 친구 코드는 그대로예요.</p>
      <p class="form-err" id="imp-err"></p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">취소</button><button class="btn danger" data-ok type="button">바꾸기</button></div>`,
    (el) => {
      el.querySelector('[data-close]').onclick = closeSheet;
      el.querySelector('[data-ok]').onclick = async () => {
        if (navigator.onLine === false) { $('imp-err').textContent = '인터넷에 연결된 뒤 다시 해 주세요.'; return; }
        const b = el.querySelector('[data-ok]'); b.disabled = true; b.textContent = '바꾸는 중…';
        try { await doImport(d); closeSheet(); }
        catch (e) { $('imp-err').textContent = '바꾸지 못했어요. 다시 시도해 주세요.'; b.disabled = false; b.textContent = '바꾸기'; }
      };
    });
  }
  async function doImport(d) {
    download(`focusfill-before-import-${dateKey(now())}.json`, JSON.stringify(backupData()));
    const base = userPath();
    for (const col of ['streaks', 'urges', 'journal', 'focus']) {
      const docs = await db.list(`${base}/${col}`);
      await Promise.all(docs.map((x) => db.del(`${base}/${col}/${x.id}`)));
    }
    for (const col of ['streaks', 'urges', 'journal', 'focus']) {
      const list = (d[col] || []).filter((x) => x && typeof x === 'object');
      await Promise.all(list.map((x) => {
        const { id, ...rest } = x;
        const docId = col === 'journal' ? (id || '') : (id || uid6());
        if (!docId || !/^[\w-]{1,64}$/.test(String(docId))) return null;
        return db.put(`${base}/${col}/${docId}`, rest);
      }));
    }
    const user = { ...d.user, friendCode: U.friendCode || '', codeOk: !!U.codeOk, onboarded: true, urge: null, focus: null, lastBackupAt: now() };
    pendingXp = 0;
    await db.put(base, user);
    hide($('urge')); hide($('modal-reset')); focusUi(false);
    celQueue.length = 0; celOn = false; hide($('celebrate'));
    U = normalize(user);
    await loadRecords(true);
    savePublic(true);
    ui.weekOff = U.trackStart < weekStart(now()) ? 1 : 0; ui.monthOff = U.trackStart < monthRange(monthKey(now()))[0] ? 1 : 0; ui.year = null; ui.calMonth = null;
    $('top-name').textContent = U.nickname;
    switchTab('home');
    toast('백업으로 바꿨어요');
    setTimeout(() => { checkCalm(); checkGoals(); checkAchievements(); }, 600);
  }

  /* ---------- 성장 탭 ---------- */
  function growthHtml() {
    const whys = U.whys || [];
    const x = activeExp();
    const fits = fitsList();
    const pastExp = (U.experiments || []).filter((e) => e.doneAt && e.rating !== 'yes').slice(-5).reverse();
    const wk = weekWritable();
    const wkeys = Object.keys(U.weekReviews).sort().reverse();
    const pmk = prevMonthKey(monthKey(now()));
    const mWritable = !U.monthReviews[pmk] && U.trackStart < monthRange(pmk)[1] ? pmk : null;
    const mkeys = Object.keys(U.monthReviews).sort().reverse();
    const exRv = U.exams.filter((e) => { const r = exRvOf(e); return r && r.good; }).sort((a, b) => b.end.localeCompare(a.end)).map((e) => ({ name: e.name, review: exRvOf(e) }));
    const sl = sealed().sort((a, b) => a.openAt - b.openAt);
    const opened = (U.letters || []).filter((l) => l.openedAt).sort((a, b) => b.openedAt - a.openedAt);
    const more = (key, list, n) => (ui.growAll[key] ? list : list.slice(0, n));
    const moreBtn = (key, list, n) => (list.length > n ? `<button class="link" data-act="grow-more" data-k="${key}" type="button">${ui.growAll[key] ? '접기' : `전체 ${list.length}개 보기`}</button>` : '');
    return `
      <section class="card">
        <div class="sec-head"><h2>내가 시작한 이유</h2><span class="muted small">${whys.length}/${WHY_MAX}</span></div>
        ${whys.length ? `<ul class="why-list">${whys.map((w, i) => `<li><span>${esc(w)}</span><button class="icon-btn small" data-act="why-del" data-i="${i}" type="button" aria-label="지우기">${ICON.x}</button></li>`).join('')}</ul>` : '<p class="muted small" style="margin-bottom:10px">종료 버튼을 누르는 동안 이 말이 떠요.</p>'}
        ${whys.length < WHY_MAX ? `<div class="inline-add"><input id="why-grow" maxlength="60" placeholder="왜 끊고 싶나요?" /><button class="btn" data-act="why-add" data-src="why-grow" type="button">추가</button></div>` : ''}
      </section>

      <section class="card">
        <div class="sec-head"><h2>실험</h2>${!x ? `<button class="btn small primary" data-act="exp-new" type="button">${ICON.plus}새 실험</button>` : ''}</div>
        ${x ? `<div class="exp-now"><div class="exp-top"><b>${esc(x.text)}</b><span class="muted small">${now() >= x.end ? '결과를 기다려요' : `${expDayN(x)}/${x.days}일`}</span></div>
          <div class="bar thin"><div class="fill" style="width:${Math.min(100, ((now() - x.start) / (x.end - x.start)) * 100).toFixed(1)}%"></div></div>
          ${now() >= x.end ? expCmp(x) + `<div class="rv-acts three" style="margin-top:12px"><button class="btn small" data-act="exp-rate" data-v="yes" type="button">있었어요</button><button class="btn small ghost" data-act="exp-rate" data-v="unsure" type="button">모르겠어요</button><button class="btn small ghost" data-act="exp-rate" data-v="no" type="button">없었어요</button></div>`
            : '<button class="link danger" data-act="exp-stop" type="button" style="margin-top:8px">그만두기</button>'}</div>` : (fits.length || pastExp.length ? '' : '<p class="muted small">며칠 동안 해 보고, 효과가 있었는지 기록과 함께 확인해요.</p>')}
        ${fits.length ? `<h3 class="gr-h">나에게 맞는 방법</h3><ul class="fit-list">${fits.map((f) => `<li><span>${esc(f.text)}</span>${!x ? `<button class="btn small ghost" data-act="exp-again" data-id="${esc(f.id)}" type="button">다시 해 보기</button>` : ''}</li>`).join('')}</ul>` : ''}
        ${pastExp.length ? `<h3 class="gr-h">지난 실험</h3><ul class="fit-list past">${pastExp.map((f) => `<li><span>${esc(f.text)}</span><span class="muted small">${f.rating === 'no' ? '효과 없음' : '모르겠음'}</span></li>`).join('')}</ul>` : ''}
      </section>

      <section class="card">
        <div class="sec-head"><h2>주간 회고</h2>${wk && !U.weekReviews[wk] ? `<button class="btn small primary" data-act="week-review" data-k="${wk}" type="button">${wkLabel(wk)} 쓰기</button>` : ''}</div>
        ${thisWeekOne() ? `<p class="gr-one">이번 주 한 가지 <b>${esc(thisWeekOne())}</b></p>` : ''}
        ${wkeys.length ? `<div class="rv-list">${more('w', wkeys, 4).map((k) => { const r = U.weekReviews[k]; return `<button class="rv-item" data-act="week-review" data-k="${k}" type="button"><span class="rv-d">${wkLabel(k)}</span><span class="rv-b">${esc(r.good)}</span><span class="rv-n">다음 주 · ${esc(r.next)}${r.prevKept ? ` <i class="rv-res ${r.prevKept}">지난주 ${KEPT_TXT[r.prevKept]}</i>` : ''}</span></button>`; }).join('')}</div>${moreBtn('w', wkeys, 4)}` : '<p class="muted small">일요일부터 수요일까지 쓰면 경험치를 받아요.</p>'}
      </section>

      <section class="card">
        <div class="sec-head"><h2>월간 회고</h2>${mWritable ? `<button class="btn small primary" data-act="month-review" data-k="${mWritable}" type="button">${mkLabel(mWritable)} 쓰기</button>` : ''}</div>
        ${thisMonthChange() ? `<p class="gr-one">이번 달 다짐 <b>${esc(thisMonthChange())}</b></p>` : ''}
        ${mkeys.length ? `<div class="rv-list">${more('m', mkeys, 3).map((k) => { const r = U.monthReviews[k]; return `<button class="rv-item" data-act="month-review" data-k="${k}" type="button"><span class="rv-d">${k.split('-')[0]}년 ${mkLabel(k)}</span><span class="rv-b">${esc(r.best)}</span><span class="rv-n">바꿀 것 · ${esc(r.change)}</span></button>`; }).join('')}</div>${moreBtn('m', mkeys, 3)}` : '<p class="muted small">매달 1~7일에 지난달을 돌아봐요.</p>'}
      </section>

      ${exRv.length ? `<section class="card"><h2 style="margin-bottom:12px">시험 회고</h2><div class="rv-list">${exRv.map((e) => `<div class="rv-item static"><span class="rv-d">${esc(e.name)}</span><span class="rv-b">${esc(e.review.good)}</span><span class="rv-n">다음 시험의 나에게 · ${esc(e.review.note)}</span></div>`).join('')}</div></section>` : ''}

      <section class="card">
        <div class="sec-head"><h2>미래의 나에게</h2>${sl.length < LETTER_OPEN_MAX ? `<button class="btn small primary" data-act="letter-new" type="button">${ICON.plus}편지 쓰기</button>` : ''}</div>
        ${sl.length ? `<ul class="lt-list">${sl.map((l) => { const dd = Math.max(0, Math.ceil((l.openAt - now()) / DAY)); return `<li class="sealed"><span class="lt-ic">✉</span><span class="lt-info"><b>${dd ? `${dd}일 뒤 열려요` : '오늘 열려요'}</b><small>${md(l.at)}에 씀 · ${md(l.openAt)}</small></span>${l.openAt <= now() ? `<button class="btn small primary" data-act="letter-open" data-id="${esc(l.id)}" type="button">열기</button>` : `<button class="icon-btn small" data-act="letter-del" data-id="${esc(l.id)}" type="button" aria-label="지우기">${ICON.x}</button>`}</li>`; }).join('')}</ul>` : ''}
        ${opened.length ? `<h3 class="gr-h">받은 편지</h3><ul class="lt-list">${more('l', opened, 3).map((l) => `<li><span class="lt-ic open">✉</span><span class="lt-info"><b>${md(l.at)}의 나</b><small>${md(l.openedAt)}에 받음</small></span><button class="btn small ghost" data-act="letter-open" data-id="${esc(l.id)}" type="button">읽기</button></li>`).join('')}</ul>${moreBtn('l', opened, 3)}` : ''}
        ${!sl.length && !opened.length ? '<p class="muted small">정한 날까지 열 수 없어요. 그날 지금의 나와 비교해 드려요.</p>' : ''}
      </section>`;
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
      case 'make-pledge': return makePledge($('pledge-input') && $('pledge-input').value);
      case 'check-pledge': el.disabled = true; return checkPledge(el.dataset.k, el.dataset.id, el.dataset.v);
      case 'del-pledge': return delPledge(el.dataset.k, el.dataset.id);
      case 'add-goal': return openGoalSheet();
      case 'edit-goal': return openGoalSheet(el.dataset.id);
      case 'edit-journal': ui.editJournal = true; ui.score = null; return renderHome();
      case 'save-journal': return saveJournal();
      case 'j-day': if ($('journal-input')) $('journal-input').value = ''; ui.jDay = el.dataset.v; ui.editJournal = false; ui.score = null; return renderHome();
      case 'q-alt': el.disabled = true; await setDaily(el.dataset.k, { qAlt: 1 }); return renderHome();

      // v1.7.0 집중
      case 'focus-start': return startFocus(+el.dataset.m);
      case 'focus-custom': return openFocusCustom();
      case 'focus-sub':
        ui.focusSub = ui.focusSub === el.dataset.v ? '' : el.dataset.v;
        try { localStorage.setItem('focusfill_focus_sub', ui.focusSub); } catch (e) {}
        return renderHome();
      case 'focus-pause': return toggleFocusPause();
      case 'focus-open': return focusUi(true);
      // 회고 · 성장
      case 'week-review': return openWeekReview(el.dataset.k);
      case 'month-review': return openMonthReview(el.dataset.k);
      case 'er-save': el.disabled = true; return saveEndReview(el.dataset.k, false).finally(() => { el.disabled = false; });
      case 'er-skip': return saveEndReview(el.dataset.k, true);
      case 'ex-save': el.disabled = true; return saveExamReview(el.dataset.id, false).finally(() => { el.disabled = false; });
      case 'ex-skip': return saveExamReview(el.dataset.id, true);
      case 'ls-rv': el.disabled = true; return lessonReview(el.dataset.cat, el.dataset.id, el.dataset.v);
      case 'exp-new': return openExpSheet('');
      case 'exp-rate': el.disabled = true; return rateExp(el.dataset.v);
      case 'exp-stop': return stopExp();
      case 'exp-again': { const x = (U.experiments || []).find((e) => e.id === el.dataset.id); return openExpSheet(x ? x.text : '', x && x.days); }
      case 'letter-new': return openLetterWrite();
      case 'letter-open': return openLetter(el.dataset.id);
      case 'letter-del':
        return confirmSheet('편지를 지울까요?', '아직 열지 않은 편지예요. 지우면 되돌릴 수 없어요.', '지우기', async () => {
          try { await saveUser({ letters: U.letters.filter((l) => l.id !== el.dataset.id) }); } catch (e) {}
          refreshViews();
        });
      case 'why-add': return addWhy(el.dataset.src);
      case 'why-later': try { await saveUser({ whyAsked: true }); } catch (e) {} return renderHome();
      case 'why-del': try { await saveUser({ whys: U.whys.filter((_, i) => i !== +el.dataset.i) }); } catch (e) {} return refreshViews();
      case 'grow-more': ui.growAll[el.dataset.k] = !ui.growAll[el.dataset.k]; return renderRecords();
      case 'add-subject': {
        const v = ($('set-subject').value || '').trim();
        if (!v || U.subjects.includes(v)) return;
        if (U.subjects.length >= 12) return toast('과목은 12개까지예요');
        return settingsUpdate({ subjects: [...U.subjects, v] });
      }
      case 'del-subject': return settingsUpdate({ subjects: U.subjects.filter((_, i) => i !== +el.dataset.i) });
      case 'backup-export': return exportBackup();
      case 'backup-import': return pickImport();

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
        return settingsUpdate({ exams: [...U.exams, { id: 'e' + uid6(), name, start, end }] }, `${eul(name)} 추가했어요`);
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
      case 'wipe-detox': return openWipeDetox();
      case 'ls-add': return lessonAdd(el.dataset.cat);
      case 'ls-add-cat': return lessonAddCat();
      case 'ls-edit': return lessonEdit(el.dataset.cat, el.dataset.id);
      case 'ls-rename': ui.editLessonCat = el.dataset.cat; renderRecords(); { const i = $('ls-rename-' + el.dataset.cat); if (i) { i.focus(); i.select(); } } return;
      case 'ls-rename-save': {
        const v = ($('ls-rename-' + el.dataset.cat).value || '').trim();
        ui.editLessonCat = null;
        if (!v) return renderRecords();
        return saveLessons(cloneLessons().map((c) => (c.id === el.dataset.cat ? { ...c, name: v } : c)));
      }
      case 'ls-del-cat': {
        const c = U.lessons.find((x) => x.id === el.dataset.cat);
        return confirmSheet(`'${c.name}' 종류를 지울까요?`, c.items.length ? `교훈 ${c.items.length}개도 함께 지워져요.` : '빈 종류예요.', '지우기', () => saveLessons(cloneLessons().filter((x) => x.id !== c.id)));
      }
      case 'guide': return openGuide(false);
      case 'logout':
        if (navigator.onLine === false) return toast('인터넷에 연결된 뒤 로그아웃해 주세요. 아직 서버에 올라가지 않은 기록이 있을 수 있어요.', null, 4000);
        if (db.pending && db.pending() > 0) return toast('아직 서버에 올라가는 중인 기록이 있어요. 잠시 뒤 다시 해 주세요.', null, 4000);
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
      const si = e.target.closest('#star-in');
      if (si) {
        if (now() - starSkip < 400) return;
        let v = starFromX(si, e.clientX);
        if (v === 0.5 && ui.score === 0.5) v = 0;
        setScore(v);
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
    // 별점: 끌어서 맞추기 (탭은 click에서)
    let starDrag = null, starSkip = 0;
    document.addEventListener('pointerdown', (e) => { if (e.target.closest('#star-in')) starDrag = { id: e.pointerId, x0: e.clientX, moved: false }; });
    document.addEventListener('pointermove', (e) => {
      if (!starDrag || e.pointerId !== starDrag.id) return;
      const si = $('star-in');
      if (!si) return;
      if (starDrag.moved || Math.abs(e.clientX - starDrag.x0) > 6) { starDrag.moved = true; setScore(starFromX(si, e.clientX)); }
    });
    ['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, (e) => {
      if (starDrag && e.pointerId === starDrag.id) { if (starDrag.moved) starSkip = now(); starDrag = null; }
    }));
    document.addEventListener('keydown', (e) => {
      if (!e.target.closest || !e.target.closest('#star-in')) return;
      const v = ui.score == null ? 0 : ui.score;
      const nv = { ArrowRight: v + 0.5, ArrowUp: v + 0.5, ArrowLeft: v - 0.5, ArrowDown: v - 0.5, Home: 0, End: 5 }[e.key];
      if (nv == null) return;
      e.preventDefault(); setScore(Math.max(0, Math.min(5, nv)));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target.id) return;
      const map = { 'journal-input': 'save-journal', 'set-subject': 'add-subject', 'friend-code-input': 'add-friend', 'set-nick': 'save-nick', 'set-target': 'add-target', 'set-act': 'add-act', 'set-quote': 'add-quote', 'pledge-input': 'make-pledge' };
      if (map[e.target.id]) { e.preventDefault(); onAction(map[e.target.id], e.target); return; }
      if (e.target.classList.contains('ls-new')) { e.preventDefault(); lessonAdd(e.target.dataset.cat); return; }
      if (e.target.id === 'ls-new-cat') { e.preventDefault(); lessonAddCat(); return; }
      if (e.target.id.startsWith('ls-rename-')) { e.preventDefault(); onAction('ls-rename-save', { dataset: { cat: e.target.id.slice(10) } }); }
      if (e.target.id === 'why-home' || e.target.id === 'why-grow') { e.preventDefault(); addWhy(e.target.id); }
    });
    // 종료 버튼: 3초 동안 꾹 누르기
    document.addEventListener('pointerdown', (e) => { const g = e.target.closest('.ls-handle'); if (g) lsDragStart(e, g); });
    document.addEventListener('pointermove', lsDragMove, { passive: false });
    document.addEventListener('pointerup', lsDragEnd);
    document.addEventListener('pointercancel', lsDragEnd);
    document.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('[data-hold]');
      if (!h || (e.pointerType === 'mouse' && e.button !== 0)) return;
      holdStart(h);
    });
    ['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => holdEnd(true)));
    document.addEventListener('pointerout', (e) => { if (hold && e.target.closest('[data-hold]') === hold.el && !hold.el.contains(e.relatedTarget)) holdEnd(true); });
    document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-hold]')) e.preventDefault(); });
    if (!window.PointerEvent) {
      const T = (e) => ({ pointerId: 'touch', clientY: (e.touches[0] || e.changedTouches[0]).clientY, preventDefault: () => e.preventDefault() });
      document.addEventListener('touchstart', (e) => {
        const g = e.target.closest('.ls-handle'); if (g) lsDragStart(T(e), g);
        const h = e.target.closest('[data-hold]'); if (h) { e.preventDefault(); holdStart(h); }   // 터치 뒤 따라오는 가짜 마우스 이벤트 막기
      }, { passive: false });
      document.addEventListener('touchmove', (e) => { if (lsDrag) lsDragMove(T(e)); }, { passive: false });
      ['touchend', 'touchcancel'].forEach((ev) => document.addEventListener(ev, (e) => { if (lsDrag) lsDragEnd(T(e)); holdEnd(true); }));
      document.addEventListener('mousedown', (e) => { const h = e.target.closest('[data-hold]'); if (h && e.button === 0) holdStart(h); });
      document.addEventListener('mouseup', () => holdEnd(true));
    }
    document.addEventListener('keydown', (e) => { const h = e.target.closest && e.target.closest('[data-hold]'); if (h && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); holdStart(h); } });
    document.addEventListener('keyup', (e) => { if (hold && (e.key === 'Enter' || e.key === ' ')) holdEnd(true); });
    $('theme-btn').onclick = () => {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      applyTheme(dark ? 'light' : 'dark');
      if (ui.tab === 'settings') renderSettings();
    };
    $('reset-cancel').onclick = () => hide($('modal-reset'));
    $('modal-reset').onclick = (e) => { if (e.target.id === 'modal-reset' && now() - resetAt > 600) hide($('modal-reset')); };
    // 터치 기기: 창이 손가락 아래에서 열리면 손을 떼는 순간 바깥 클릭으로 닫혀 버리므로 잠깐은 무시해요
    $('modal-sheet').onclick = (e) => { if (e.target.id === 'modal-sheet' && now() - sheetAt > 600) closeSheet(); };
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
    // 새로고침 뒤에도 끝날 때 소리가 나도록: 집중 중에 화면을 한 번 누르면 소리를 켜 둬요
    ['pointerdown', 'touchstart', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if (U && U.focus) unlockAudio(); }, { passive: true }));
    $('fo-pause').onclick = toggleFocusPause;
    $('fo-stop').onclick = stopFocus;
    $('fo-min').onclick = () => focusUi(false);
    $('fo-ok').onclick = () => focusUi(false);
    try { ui.focusSub = localStorage.getItem('focusfill_focus_sub') || ''; } catch (e) {}
    // 화면을 다시 켜면(아이패드를 다시 열 때 등) 서버 기록을 한 번 새로 받아요 — 실시간 연결이 잠든 사이 놓친 게 없도록
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = now(); return; }
      if (!U) return;
      tick();
      if (ui.tab === 'friends') loadFriends();
      if (hiddenAt && now() - hiddenAt > 15000 && navigator.onLine !== false && db.mode === 'firebase') {
        const uid = me && me.uid;
        db.get(userPath(), { fresh: true }).then((d) => { if (U && me && me.uid === uid && d && d.onboarded) { firstSnap = false; onRemote(d); remoteRefresh(true); } }).catch(() => {});
      }
    });
    const darkMq = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { applyTheme(currentTheme()); if (U && ui.tab === 'home') renderLevelCard(); };
    if (darkMq.addEventListener) darkMq.addEventListener('change', onScheme); else if (darkMq.addListener) darkMq.addListener(onScheme);
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

  // 로딩 화면에서 오류가 나면 무한 로딩 대신 원인과 '다시 시도'를 보여줘요
  addEventListener('error', (e) => { if (onLoadingScreen()) showLoadError(() => location.reload(), e.message || (e.error && e.error.message)); });
  addEventListener('unhandledrejection', (e) => { if (onLoadingScreen()) showLoadError(() => location.reload(), (e.reason && (e.reason.code || e.reason.message)) || e.reason); });

  async function boot() {
    applyTheme(currentTheme());
    document.querySelectorAll('[data-ver]').forEach((el) => { el.textContent = `FocusFill v${APP_VERSION}`; });
    const lq = $('load-quote');
    if (lq) lq.textContent = quoteOfDay().text;
    try { db = useFirebase ? await FirebaseBackend() : LocalBackend(); }
    catch (e) {
      // 실제 계정을 쓰는 사이트는 절대 테스트 모드(빈 저장소)로 넘어가지 않아요
      showLoadError(() => location.reload(), navigator.onLine === false
        ? '인터넷이 없어요. 인터넷에 연결된 상태로 한 번 열면, 그다음부터는 인터넷 없이도 열려요.'
        : (e && e.message) || e);
      return;
    }
    if (db.mode === 'local') show($('test-banner'));
    setupAuth();
    setupOnboarding();
    setupApp();

    db.onAuth(onUser);
    // 로그인 상태 확인이 너무 오래 걸리면 (Safari 저장소 문제 등) 다시 시도할 수 있게
    setTimeout(() => { if (!authSeen && onLoadingScreen()) showLoadError(() => location.reload(), '로그인 상태를 확인하지 못했어요 (15초 초과)'); }, 15000);
  }

  // 계정 문서를 못 읽었을 때는 절대 처음 설정으로 보내지 않아요 (기존 기록을 덮어쓰지 않도록)
  function showLoadError(retry, detail) {
    const box = document.querySelector('.load-inner');
    if (!box) return;
    const wd = $('load-watchdog'); if (wd) wd.remove();
    let el = $('load-err');
    if (!el) {
      el = document.createElement('div'); el.id = 'load-err'; el.className = 'load-err';
      el.innerHTML = '<p>불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.</p><small class="load-why"></small><button class="btn primary" type="button">다시 시도</button>';
      box.appendChild(el);
    }
    el.querySelector('.load-why').textContent = detail ? String(detail).slice(0, 160) : '';
    show(el);
    el.querySelector('button').onclick = () => { hide(el); retry(); };
  }
  const onLoadingScreen = () => { const l = $('screen-loading'); return !!l && !l.classList.contains('hidden'); };
  let lastLoadErr = '';
  async function readUserDoc() {
    for (let i = 0; i < 2; i++) {
      try { return { data: await db.get(userPath()) }; } catch (e) { lastLoadErr = (e && (e.code || e.message)) || String(e); await new Promise((r) => setTimeout(r, 700 * (i + 1))); }
    }
    return null;
  }

  let authSeen = false;
  async function onUser(user) {
      authSeen = true;
      stopWatch();
      me = user;
      clearInterval(tickTimer);
      hide($('urge')); hide($('modal-reset')); closeSheet(); celQueue.length = 0; celOn = false; hide($('celebrate')); hide($('focus')); showWhyPop(false);
      if (!user) {
        document.title = BASE_TITLE;
        U = null; F.list = []; F.incoming = []; F.outgoing = []; F.loaded = false;
        setAuthMode('login');
        $('auth-pw').value = ''; $('auth-pw2').value = '';
        await waitLoad();
        go('screen-auth');
        return;
      }
      go('screen-loading');
      if ($('load-err')) hide($('load-err'));
      const got = await readUserDoc();
      if (me !== user) return;
      if (!got) { showLoadError(() => onUser(user), lastLoadErr); return; }
      let data = got.data;
      // 처음 설정 화면은 계정 문서가 정말 없거나, '처음부터 다시'로 지운 경우에만 보여요.
      // 문서에 onboarded 칸이 없는 건 일부만 읽힌 반쪽 문서라는 뜻 → 서버에서 다시 읽고, 그래도 안 되면 다시 시도 화면
      if (data && data.onboarded === undefined) {
        try { data = await db.get(userPath(), { fresh: true }); } catch (e) { data = undefined; }
        if (me !== user) return;
        if (!data || data.onboarded === undefined) { showLoadError(() => onUser(user), '계정 정보를 다 받지 못했어요'); return; }
      }
      if (!data || data.onboarded === false) {
        obKeep = data ? { friendCode: data.friendCode || '', codeOk: !!data.codeOk, share: data.share } : {};
        await waitLoad();
        resetOnboarding(data && data.nickname); go('screen-onboard'); obShow(); return;
      }
      U = normalize(data);
      try { await loadRecords(true); }
      catch (e) { U = null; showLoadError(() => onUser(user), (e && (e.code || e.message)) || e); return; }
      // 지난번에 서버에 못 올린 기록은 다 읽은 뒤에 다시 보내요 (먼저 보내면 반쪽 문서가 읽혀요)
      if (db.replay) { try { db.replay(user.uid); } catch (e) {} }
      await waitLoad();
      if (me !== user) return;
      await enterApp();
  }

  // 새 버전이 올라오면 강한 새로고침 없이 바로 바뀌어요
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      if (lsDrag || (document.activeElement && document.activeElement.matches('input, textarea'))) {
        toast('새 버전이 준비됐어요', () => location.reload(), 60000, '새로고침');
        return;
      }
      location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      addEventListener('focus', check);
      setInterval(check, 5 * MIN);
    }).catch(() => {});
  }
  boot().catch((e) => showLoadError(() => location.reload(), (e && e.message) || e));
})();
