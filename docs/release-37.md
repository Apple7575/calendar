# iOS 1.0.0 (37) — TestFlight

2026-11-02 사용자가 TestFlight 배포를 요청해 진행한다. 정식 App Store 출시와 외부 테스터 초대는 요청 범위가 아니다.

## 대상과 소스

- Expo: `hey9991s-team/calendar-app`
- Bundle ID: `com.newblueday.mycalendar`
- Apple 팀: `NR4Y2WD2S7`
- App Store Connect 앱: `6789025200`
- 현재 브랜치: `feat/priority-first-start`
- HEAD: `27102978a178ffc7c9a2e9d67e8f2eab4a8bc08d` + 보존된 미커밋 변경 포함
- 업로드 직전 소스 해시: `.expo/release-next-source-manifest.json`
- 미커밋 파일 사본·패치: `.expo/release-next-source/`, `.expo/release-next-source.patch`
- 기존 브랜치와 미커밋 상태를 유지한다. 커밋·푸시·master 전환은 하지 않았다.

## 포함 변경

- 홈 맨 위에 연속 실천·지금 사용 가능 시간·가용 금액. 상단 '오늘' 제목 제거, 날짜 옆 설정 진입 유지.
- 준비한 중요한 공부와 첫 행동에서 작은 시작. 다른 공부도 직접 선택할 수 있다.
- 집중 타이머 시간 조정은 펼쳐 사용하고, 필기 사진 제출 경로를 명확히 표시.
- 제출 화면을 사진 선택 → 인식 확인 → 저장으로 정리. 보상 기준·기록은 펼침, 인식 오류는 상단 표시.
- 전체 화면 캐릭터 축하와 실제 적립 결과, 공부를 이어가는 버튼.
- 기존 미커밋 캐릭터 확대와 시간 사용 토글 변경 포함.
- 첫 공부 사용 조건의 네이티브 `setPriorityGate` 포함. 기존 36번에 OTA만 적용하는 대신 새 바이너리를 생성한다.

보상 지급·잠금 기준·04시 경계·기록 보존 규칙은 기존 중요한 공부 실험 규칙을 유지한다.

## 사전 검증

- 타입 검사 통과.
- 전체 테스트 48 suites / 293 tests 통과.
- Screen Time 정적 검사 통과, 앱/확장의 공유 Swift 파일 SHA-256 일치.
- 홈 제목 제거·지표 이동 후 360×740 / 390×844 레이아웃과 다크 테마 확인.
- 이전 화면 개선에서 제출·보상·복귀, 중복 영수증 방지, 로컬 웹 export 확인.

## 배포 작업

- Build: `3d0d6a36-6be5-4d43-88ab-54898d4ff8f5`
- Submission: `b7e37cc6-3768-487b-936d-80ec372c8f93`
- Runtime / fingerprint: `6e99094ceed29dd728afa93f9f525143684f9c90`
- production profile / production channel / App Store distribution
- 기존 앱·위젯·Screen Time 프로비저닝 프로파일을 사용한다.
- EAS Build: https://expo.dev/accounts/hey9991s-team/projects/calendar-app/builds/3d0d6a36-6be5-4d43-88ab-54898d4ff8f5
- EAS Submit: https://expo.dev/accounts/hey9991s-team/projects/calendar-app/submissions/b7e37cc6-3768-487b-936d-80ec372c8f93

2026-11-02 08:30:38 UTC 최종 확인:

- EAS Build `FINISHED`, 오류 없음. Xcode 네이티브 컴파일·서명·아카이브 성공.
- EAS Submit `FINISHED`, 오류 없음.
- Apple build: `bc276a51-e7af-48e3-8b6f-2bbc141572af`, version `37`.
- Apple `processingState=VALID`, `expired=false`.
- 내부 상태 `IN_BETA_TESTING`.
- 기존 내부 `Team (Expo)` 그룹에 37번 포함(`hasBuild=true`). TestFlight 내부 테스트 설치 가능 상태 확인.
- Apple 최초 VALID 직후에는 그룹 조회에 아직 없었다. 직접 그룹 추가 요청은 422로 거절됐고, 이어진 조회에서 이미 `IN_BETA_TESTING` 및 기존 그룹 포함이 확인됐다. 추가 초대나 그룹 생성은 하지 않았다.
- 확인 응답은 `.expo/release37-status.json`에 보관했다.

TestFlight의 기존 '나의 캘린더' 앱에서 `1.0.0 (37)`로 업데이트한다. 정식 App Store 심사·출시 또는 외부 테스터 초대는 실행하지 않았다.

## iPhone에서 확인할 항목

설치 후 기존 기록과 잔액, 네 동물 동작, 공부 중 가로 전환·화면 꺼짐 방지, 사진 권한·인식, 첫 공부 완료 조건, 앱 종료 후 잠금, 시간 사용 차감·0분 잠금·새벽 4시 초기화를 확인해야 한다. Windows 웹 및 정적 검사로 실제 iPhone 동작이 검증됐다고 판단하지 않는다.
