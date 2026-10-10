# FocusFill

도파민 대신 집중으로 하루를 채우는 디톡스 웹앱. (1단계: 계정, 온보딩, 진행 시간 타이머, 리셋, 참기)

## 실행
- `firebase-config.js`가 비어 있으면 **테스트 모드**(이 기기 브라우저에만 저장)로 동작해요.
- 실제 계정/친구 기능을 쓰려면 아래 Firebase 설정을 해주세요.

## Firebase 설정 (ProFill과 같은 방식)
1. Firebase 콘솔에서 새 프로젝트 생성 → 웹 앱 추가 → 나오는 설정값을 `firebase-config.js`에 붙여넣기
2. Authentication → 로그인 방법에서 **이메일/비밀번호**, **Google** 사용 설정
3. Firestore Database 생성 → 규칙 탭에 `firestore.rules` 내용 붙여넣고 게시
4. 배포한 도메인(예: GitHub Pages 주소)을 Authentication → 설정 → 승인된 도메인에 추가

## 데이터 구조
- `users/{uid}` (본인만): 닉네임, 성별, 디톡스 대상, 규칙, 시작 시각, 최장 기록, 참기 성공 수, 진행 중인 참기
- `users/{uid}/streaks` (본인만): 지난 기록 (시작, 끝, 걸린 시간, 이유, 메모)
- `users/{uid}/urges` (본인만): 참기 기록 (시각, 시간, 대체 활동, 결과)
- `publicProfiles/{uid}` (친구용): 닉네임, 시작 시각, 최장 기록, 친구 코드
