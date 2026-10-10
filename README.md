# FocusFill

현재 버전: **v1.0.1**

도파민 대신 집중으로 하루를 채우는 디톡스 웹앱. (1단계: 계정, 온보딩, 진행 시간 타이머, 리셋, 참기)

## 계정
- ProFill과 **같은 Firebase 프로젝트(profill-e1257)** 를 써서, ProFill 아이디/비밀번호로 그대로 로그인돼요.
- 아이디는 내부적으로 `아이디@iasa-protein.app` 형태로 바뀌어 저장돼요 (메일은 보내지 않음).
- FocusFill 데이터는 `focusfill_users`, `focusfill_public`에 따로 저장돼서 ProFill 데이터와 섞이지 않아요.

## 설정 (한 번만)
Firebase 콘솔 → ProFill 프로젝트 → Firestore → 규칙 탭에 `firestore.rules` 내용을 붙여넣고 게시.
(ProFill 규칙 + FocusFill 규칙이 합쳐져 있어요.)

## 데이터 구조
- `focusfill_users/{uid}` (본인만): 닉네임, 성별, 디톡스 대상, 규칙, 대체 활동, 참기 시간, 자동 디톡스 시간대, 동기 문구, 공개 범위, 시작 시각, 최장 기록, 경험치, 배지
- `focusfill_users/{uid}/streaks` · `/urges` · `/journal` (본인만): 리셋 기록, 참기 기록, 한 줄 일기
- `focusfill_public/{uid}` (나와 친구만): 닉네임 + 공개를 켠 항목(진행 시간, 최장 기록, 레벨, 배지 수, 이번 주 참기)
- `focusfill_codes/{코드}`: 친구 코드 → 계정 (코드를 알아야만 조회)
- `focusfill_friendreq/{보낸사람_받는사람}`: 친구 요청/관계

## 버전 기록
- **v1.0.1** — 노트북(브라우저 탭·설치 앱) 아이콘을 모서리가 둥근 정사각형으로 변경
- **v1.0.0** — 전체 기능 완성: 배지·경험치·레벨, 달력, 한 줄 일기, 통계, 주간 리포트, 동기 문구, 친구(코드·순위·공개 범위), 설정 전체, ProFill 연결, 주황 테마 디자인
- **v0.1.0** — 1단계: 아이디 로그인(ProFill 계정 공유), 온보딩, 타이머, 리셋, 참기

## 버전 올리는 곳
`app.js`의 `APP_VERSION`, `sw.js`의 `VERSION`, `index.html`의 `?v=` 세 곳을 같은 숫자로 바꾸기
