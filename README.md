# FocusFill

도파민 대신 집중으로 하루를 채우는 디톡스 웹앱. (1단계: 계정, 온보딩, 진행 시간 타이머, 리셋, 참기)

## 계정
- ProFill과 **같은 Firebase 프로젝트(profill-e1257)** 를 써서, ProFill 아이디/비밀번호로 그대로 로그인돼요.
- 아이디는 내부적으로 `아이디@iasa-protein.app` 형태로 바뀌어 저장돼요 (메일은 보내지 않음).
- FocusFill 데이터는 `focusfill_users`, `focusfill_public`에 따로 저장돼서 ProFill 데이터와 섞이지 않아요.

## 설정 (한 번만)
Firebase 콘솔 → ProFill 프로젝트 → Firestore → 규칙 탭에 `firestore.rules` 내용을 붙여넣고 게시.
(ProFill 규칙 + FocusFill 규칙이 합쳐져 있어요.)

## 데이터 구조
- `focusfill_users/{uid}` (본인만): 닉네임, 성별, 디톡스 대상, 규칙, 시작 시각, 최장 기록, 참기 성공 수, 진행 중인 참기
- `focusfill_users/{uid}/streaks` (본인만): 지난 기록 (시작, 끝, 걸린 시간, 이유, 메모)
- `focusfill_users/{uid}/urges` (본인만): 참기 기록 (시각, 시간, 대체 활동, 결과)
- `focusfill_public/{uid}` (친구용): 닉네임, 시작 시각, 최장 기록, 친구 코드
