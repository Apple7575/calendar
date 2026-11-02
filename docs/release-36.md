# iOS 1.0.0 (36)

- Expo project: hey9991s-team/calendar-app
- Bundle ID: com.newblueday.mycalendar
- App Store Connect app: 6789025200, 나의 캘린더
- Build: 9a5a8caa-5f47-49a4-a86f-f033d767f03e
- Submission: c13147dc-e779-4544-825e-eb28a25b27f7
- Runtime: 35bdd2d3a3ad2e7ed6caec200fc255c350be3acb

## 포함 변경

- 네 동물의 활동별 배치, 새 아이콘과 시작 화면, 친구들 탭.
- 기존 보리 자산·표시 제거.
- 학습 종료 유도 버튼 제거, 같은 학습 화면에서 추가 공부로 연결.
- 단어 복습 예정, 채점 취소 복귀, 돈 보상·지출 기능.
- 가로 원형 집중 타이머, 시간 조절, 과목명 숨김과 화면 꺼짐 방지.
- 계획 작성부터 시작하는 집중 단계: 계획 → 2 → 5 → 10 → 15 → 25분. 이후 25분 유지.
- 계획과 각 사진 단계 완료마다 스크린타임 5분.
- 집중 공부 2시간 비활동 시 계획 단계부터 재시작.
- 사진 돈 보상은 인정 글자 100자당 500원 유지.

## 검증

전체 테스트 277개와 타입 검사 통과. 웹에서 계획만으로 5분 지급, 2분 집중 후 사진으로 5분·100자 500원 지급, 다음 5분 단계, 2시간 비활동 후 계획 재시작 및 기존 보상 보존을 확인했다. 기기 자체의 실행·권한·스크린타임 차감·성능 검수는 TestFlight 설치 후 별도로 진행해야 한다.

2026-11-01 11:32:26 UTC 확인:

- EAS Build FINISHED / EAS Submit FINISHED
- Apple build 4c118849-9cc5-4fb9-ae1a-430f3b62b64e, version 36
- processingState VALID
- internalBuildState IN_BETA_TESTING
- 내부 Team (Expo) 그룹에 36번 빌드 포함 확인

TestFlight의 나의 캘린더에서 1.0.0 (36) 업데이트가 가능한 상태다. 일반 App Store 정식 출시나 외부 테스터 초대는 실행하지 않았다.
