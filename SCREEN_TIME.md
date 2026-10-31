# 스크린타임 기기 검증

기존 캘린더의 **설정 → 스크린타임 테스트 열기**로 진입한다.
이 단계는 잠금 기능 검증용이다. 실제 루틴 완료, FSRS, 보상 원장에는 아직 연결하지 않았다.

## 설치 조건

- 개인 아이폰, 이 테스트의 최소 버전은 iOS 17.4.
- Expo SDK 54 유지. 기존 Expo Go/설치 빌드에는 새 네이티브 모듈이 없어 재빌드가 필요하다.
- 본체 `com.newblueday.mycalendar`와 모니터 확장 `com.newblueday.mycalendar.screentime`에 Family Controls 권한 및 동일 App Group이 필요하다.
- TestFlight 등 배포용 서명에는 Apple의 Family Controls 배포 권한 승인을 확인해야 한다. 현재 계정의 승인 여부는 확인하지 않았다.
- 기존 위젯의 번들 식별자와 App Group은 유지한다.

### 2026-10-29 빌드 확인 결과

- Apple 프로그램 약관 동의 문제 해결, 확장 Bundle ID 등록 및 App Groups 설정 확인.
- 기존 배포 인증서를 재사용해 새 확장의 App Store 서명 프로파일을 생성하고 EAS에 연결했다.
- EAS 빌드 22 (`611dd4f2-afa9-4f2e-919a-375a7d89b583`)는 Xcode 서명 단계에서 실패했다.
- 본체와 확장 프로파일 모두 `com.apple.developer.family-controls` 권한이 포함되지 않았다. 개발용 capability 체크만으로 배포 준비가 완료된 것으로 판단하면 안 된다.
- Apple 개발자 콘솔에서 본체와 확장의 Family Controls **Distribution** 승인 상태를 확인해야 한다. 실제 승인 여부와 신청 여부는 아직 확인하지 못했다.
- 승인 후 두 대상의 프로파일을 갱신하고 포함된 entitlement를 확인한 뒤 재빌드한다.
- 기존 App Store Connect 앱 ID는 `6789025200`이며 `eas.json`의 자동 제출 설정에 추가했다. TestFlight 업로드는 아직 수행되지 않았다.

## 검증 순서

1. 스크린타임 접근과 알림을 허용한다.
2. 처음에는 인스타와 유튜브 등 앱 두 개만 선택한다.
3. 잠금 테스트를 시작한다. 두 앱을 각각 열어 잠금 화면을 확인한다.
4. 테스트 시간 10분을 지급한다. 아침 완료 전에는 두 앱이 계속 잠겨 있어야 한다.
5. 아침 루틴 완료로 처리한다. 두 앱의 잠금이 해제되어야 한다.
6. 첫 앱 3분, 두 번째 앱 3분처럼 번갈아 사용한다. 합산 사용량으로 잔액이 줄어야 한다.
7. 우리 앱을 닫고 계속 사용한다. 합산 8분에 알림, 합산 10분에 재잠금이 되는지 확인한다.
8. 앱을 사용하지 않고 다른 앱을 쓰거나 화면을 꺼 둔 시간에는 사용량이 늘지 않아야 한다.
9. 다른 날, 잔액을 남기고 앱을 닫아 둔다. 새벽 4시 이후 0분·아침 미완료·잠금 상태인지 확인한다. 실제 경계 통과로 검증하며 기기 시각 변경 결과를 대신 사용하지 않는다.
10. 테스트 중단 버튼으로 제한이 해제되는지 확인한다. 권한을 취소한 경우에도 종료 동작과 오류 표시를 확인한다.

기기 iOS 버전, 알림 도착 시각, 잠금 시각, 마지막 이벤트와 표시 사용량을 기록한다.
아직 이 체크리스트를 실제 기기에서 수행하지 않았다.

## 구현 범위와 한계

- 잠금은 ManagedSettings, 사용 감지는 DeviceActivity 모니터 확장에서 처리한다. 앱의 JS 타이머로 다른 앱 사용을 추정하지 않는다.
- 10개의 분 단위 사용량 이벤트로 표시를 갱신한다. 표시 잔액은 마지막으로 확인된 분 기준이며 초 단위 실시간 잔액이 아니다.
- iOS가 콜백을 전달하는 시점에 따라 알림·재잠금 지연이 발생할 수 있으므로 기기 검증 전 정확성을 보장하지 않는다.
- 테스트는 하루 한 번 10분만 지급하며 실행 중 시간 추가는 지원하지 않는다. 재시험은 테스트를 중단한 뒤 다시 시작한다. 이 버튼은 실제 보상 지급 수단이 아니다.
- 앱 선택은 테스트를 중단한 상태에서만 바꾼다. 과거 사용량은 새 테스트에 포함하지 않는다.
- 매일 기기 현지 시각 새벽 4시에 초기화한다. 다른 지역으로의 이동·재부팅도 향후 기기 검증 항목이다.
- 본인용 스크린타임 권한은 아이폰 설정에서 철회할 수 있다.
- 제한 앱에서 우리 앱으로 바로 이동하는 커스텀 차단 화면은 이번 단계에 포함하지 않는다.

## 로컬 확인

```sh
node scripts/check-screen-time.js
npm run typecheck
npm test -- --runInBand
```

Windows에서는 iOS prebuild와 Swift 컴파일을 실행할 수 없어 별도 iOS 빌드가 필요하다.
EAS의 기존 post-install 훅은 공유 Swift 파일을 동기화한 뒤 widget와 screentime 두 타겟 생성을 확인한다.
공유 로직의 원본은 `modules/routine-screen-time/ios/ScreenTimeState.swift`이고, 확장의 같은 파일은 `node scripts/sync-screen-time.js`로 갱신한다.

## 후속 통합 규칙

- 아침 루틴 10분, FSRS 오늘 분량 완료 20분, 헬스장 운동 30분을 독립 적립한다.
- 모두 공용 잔액으로 사용하고 새벽 4시에 이월 없이 초기화한다.
- 아침 루틴 완료 전에는 다른 루틴 보상이 있어도 사용할 수 없다.
- 힘든 날은 루틴별로 선택하며 아침 최소 5분, 단어 최소 5분, 집 운동 10분이다.
- 최소 목표 이후 전체 목표 달성 시 차액만 추가 지급한다.
- 종료 2분 전에 알리고 잔액 소진 시 잠근다.
- 학습 진행 막대·통계와 기존 캘린더의 달성 기록을 연결한다.

## 공식 자료

- https://developer.apple.com/videos/play/wwdc2022/110336/
- https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
- https://developer.apple.com/documentation/deviceactivity/deviceactivityevent/includespastactivity
- https://docs.expo.dev/modules/overview/
