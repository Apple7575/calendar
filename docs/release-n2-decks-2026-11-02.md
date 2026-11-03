# N2와 단어장 화면 업데이트

## 최종 배포 결과

2026-11-02 23:36 KST 확인: **TestFlight 1.0.0 (38) 배포 완료**. Apple build `cd0215a8-b8f1-4b40-85c5-41c152de1577`의 처리 상태는 `VALID`, 내부 테스트 상태는 `IN_BETA_TESTING`이다. 기존 내부 그룹 `Team (Expo)`에 이 빌드가 포함되어 있으며 만료되지 않았다. Apple 직접 업로드는 `COMPLETE`, 오류·경고는 없다.

TestFlight에서 38번으로 업데이트한 뒤 **학습 → 내 단어장 → JLPT N2 단어장 추가**로 N2를 추가한다. 기존 N3와 별도 덱이며 N3 진도를 보존한다. 즐겨찾기·확인 필요 목록에는 직접 해제 버튼이 있고, 내 단어장에서는 학습·보상 설정 및 백업 메뉴를 제거했다. 각 기능은 기존 학습·설정 경로에서 이용한다.

OTA는 게시되지 않았으므로 37번 앱을 재시작하는 것만으로 적용되지 않는다. 아래의 대기·처리 중 기록은 배포 과정의 이력이다. EAS 자동 제출은 대기 중 취소하여 Apple 직접 업로드로 대체했으므로 EAS Submit의 `CANCELED` 표시는 정상이다. 실제 iPhone에서의 설치·재생 확인은 수행하지 않았다.

사용자가 N2 배포, 즐겨찾기·확인 필요 해제 확인/보완, ‘내 단어장’ 정리를 승인했다. TestFlight 37과 런타임이 호환되어 먼저 production 업데이트를 시도했지만 EAS의 자산 수 제한으로 거절됐다. 따라서 새 TestFlight 바이너리로 전달한다. 정식 App Store 출시나 외부 테스터 초대는 하지 않는다.

## 변경

- 즐겨찾기·확인 필요 목록에서 바로 표시를 해제한다. 카드 보기·신고 복사는 유지한다. 저장 중 중복 요청을 막고 실패하면 재시도할 수 있다.
- 기존 카드 옵션에도 해제 기능이 있었지만 목록 → 카드 → 옵션을 거쳐야 했다. 목록에 직접 노출했으며 카드·복습 진도·다른 표시를 삭제하지 않는다.
- 확인 필요 해제는 기존 `flagWord` 경로를 사용한다. 별도로 숨기거나 중지한 상태는 그대로이며, 오늘 목표 ID와 보상 기록을 초기화하지 않는다.
- ‘내 단어장’은 소유한 단어장, 추가할 수 있는 N3/N2, 컴퓨터 연결만 보여준다. 학습·보상 설정과 백업은 ‘나의 설정’, 모아둔 단어는 학습 탭에서 접근한다.
- N2 1,774노트와 단어·예문 음성 3,548개를 포함한다. ‘내 단어장 → JLPT N2 단어장 추가’로 로그인 없이 별도 덱을 추가한다. 자동으로 기존 N3에 합치거나 오늘 확정 목표를 확장하지 않는다.
- 저장된 PC 세션으로 Supabase 로그인 확인이 되지 않아 비공개 업로드는 실행되지 않았다. 기존 N3 비공개 저장소·정책·인증 설정을 변경하지 않았으며, 이번 전달은 앱 내 준비된 단어장 경로를 사용한다.

## 보존과 검증

- 브랜치 `feat/priority-first-start`, 기존 미커밋 변경 유지. 커밋·푸시·master 전환·학습 데이터 초기화 없음.
- `.expo/deck-release-20261102/source/`, `source-manifest.json`, `source.patch`에 3,702개 파일과 패치를 보존했다. 게시 전 내보내기 당시 코드와 해시 일치 확인.
- 기존 N3 자산 4,873개는 N2 작업 시작 시 SHA-256 기준으로 보존한다.
- RED: `check-deck-library-web.cjs`는 목록의 직접 해제 버튼 부재로 실패, `check-bundled-deck-web.cjs`는 N2 추가 버튼 부재로 실패. 구현 후 두 검사 모두 통과했다. 기존 미커밋 상태를 보존하기 위해 TDD 단계별 커밋 대신 실행 결과·캡처·소스 사본으로 근거를 남겼다.
- GREEN: 타입 검사, Jest 50 suites / 297 tests, Screen Time 정적 검사 통과.
- 웹 실제 경로: 즐겨찾기 해제 후 확인 필요는 유지, 확인 필요 해제 후 FSRS·오늘 목표·보상 보존, 재실행 후 저장 유지, N3/N2 별도 관리, N3만 있던 상태에서 로그인 없이 N2 추가, 중복 추가 방지, 확정된 N3 목표를 유지한 채 N2 전용 추가 학습 시작.
- 단어장 화면 360/390/768px, 해제·빈 목록 캡처는 `.expo/deck-release-20261102/`에 보관했다. 두 화면의 핵심 행동은 각각 ‘단어장 열기’와 ‘표시 해제’이며 기존 색·캐릭터·보상 규칙은 유지한다.
- Windows Chrome 검증은 iPhone 실기기 검증을 대신하지 않는다. 로컬 Windows에서 Swift 컴파일·기기 재생을 실행하지 않았다. 원격 iOS 빌드 결과는 아래 배포 결과에서 별도로 확인한다.

## 배포 대상

- Expo 프로젝트 `hey9991s-team/calendar-app`, ID `389de53e-8eb9-49bf-962c-b63d9a09bcdd`
- 채널 / EAS 브랜치 `production` (Git 브랜치와 별개)
- iOS 런타임 `6e99094ceed29dd728afa93f9f525143684f9c90`: 기존 TestFlight 1.0.0 (37)과 일치
- iOS export: `.expo/deck-release-20261102/ios/`, Hermes 24,733,082 bytes, 자산 참조 6,762개
- N2와 해제 UI가 실제 내보낸 번들에 포함됐는지 확인했다. 대량 음성 폴더의 반복 조회로 내보내기가 오래 걸렸으며, 프로파일링만 수행했다. node_modules나 앱의 네이티브 설정을 수정하지 않았다.

게시 결과는 아래에 이어 기록한다.

## 업데이트 방식 변경

- EAS Update 게시 요청은 자산 **6,759개**로 거절됐다. 오류는 플랫폼당 최대 **1,000개**이며, 여러 플랫폼을 합쳐도 최대 2,000개라는 응답이었다. Request ID `6dc744d7-3208-4e12-a104-0d7e44ea505b`.
- assetmap 업로드 후 게시가 실패했으며 새 OTA 업데이트 그룹은 생성되지 않았다. 37번 앱에 새 업데이트가 배포됐다고 보고하지 않는다.
- 이번에 추가한 음성만 3,548개이므로 현재 전달 구조로는 OTA에 포함할 수 없다. 음성·N3 자산·기존 제품 규칙을 바꾸거나 인증을 우회하는 대신 사용자가 승인한 배포를 새 production 빌드와 자동 제출로 이어갔다.
- `--freeze-credentials`로 기존 개인 Apple 팀 `NR4Y2WD2S7`의 인증서/프로비저닝 프로파일을 보존한다. 유료 플랜 전환이나 인증서 재생성은 하지 않는다.
- 빌드용 프로젝트 아카이브는 398 MB다. SDK/네이티브 의존성·앱 식별자·브랜치는 변경하지 않았다.
- 향후 OTA에서도 자산 수를 먼저 검사한다. 37/38은 런타임이 같지만 내장 음성은 다르므로, 38에 음성이 있다는 이유만으로 OTA에서 N2 음성을 제외하면 37에는 누락된다. 자산 선택 최적화는 대상 바이너리별 포함 여부 검증과 함께 별도 설계한다.

## TestFlight 1.0.0 (38)

- Build `54a51af7-b443-465d-8987-1b459db83815`: [EAS Build](https://expo.dev/accounts/hey9991s-team/projects/calendar-app/builds/54a51af7-b443-465d-8987-1b459db83815)
- 자동 제출 `f354a116-2fff-462c-a7e2-08fc66a83059`: [EAS Submit](https://expo.dev/accounts/hey9991s-team/projects/calendar-app/submissions/f354a116-2fff-462c-a7e2-08fc66a83059)
- 2026-11-02 13:50:27 UTC 확인: Build `IN_PROGRESS`, Submit `AWAITING_BUILD`, 오류 없음. 완료/Apple 상태는 이어서 확인한다.
- 원격 buildNumber만 37 → 38로 증가했다. 런타임은 기존 37과 같은 `6e99094ceed29dd728afa93f9f525143684f9c90`이다.
- 2026-11-02 14:01:33 UTC 확인: Build `FINISHED`, 오류 없음. Xcode 컴파일·서명·아카이브 성공, IPA 약 213 MB. Submit은 `IN_QUEUE`이며 Apple 38번 빌드는 아직 조회되지 않았다.

## Apple 직접 업로드로 전환

- EAS Submit 작업은 14:00:08 UTC부터 실행 워커를 배정받지 못했다. 정상 우선순위·`startedAt=null`·오류 없음이었고, EAS 상태 페이지에도 Submit 장애 공지는 없었다.
- 같은 EAS 빌드의 IPA를 내려받아 앱 ID `com.newblueday.mycalendar`, 버전 `1.0.0`, build `38`, 프로비저닝 팀 `NR4Y2WD2S7`를 파일 안에서 확인했다. 파일 크기는 223,699,131 bytes, SHA-256은 `7b746c84ab48d22aae6b9e2a0028f09455c3404ff277b00d2eabab172f675c68`다.
- 14:22:33 UTC에 **아직 시작되지 않은** EAS 제출만 취소했다. Submission과 JobRun 모두 `CANCELED`, `startedAt=null`, Apple 업로드 없음인 것을 다시 확인한 뒤 직접 업로드를 생성했다. 새 빌드 생성·이중 제출·유료 우선 처리는 하지 않았다.
- Apple 공식 [Build uploads API](https://developer.apple.com/documentation/appstoreconnectapi/build-uploads)를 사용했다. 기존 EAS에 보관된 같은 개인 팀의 App Store Connect API 키로 JWT를 메모리에서만 생성했고 키·JWT·서명된 업로드 URL은 로그에 기록하지 않았다.
- Build upload ID `cd0215a8-b8f1-4b40-85c5-41c152de1577`, file ID `8444d1be-3ad4-4f2a-856b-4855fe4ee7bc`, 업로드 조각 43개.
- 클라이언트 체크섬 설명자 제출은 형식 오류로 거절됐다. [Commit a Build Upload File](https://developer.apple.com/documentation/appstoreconnectapi/patch-v1-builduploadfiles-_id_)의 선택 항목인 `sourceFileChecksums`는 생략하고 확정했다. 그 전에 Apple이 반환한 **모든 43개 조각의 ETag를 원본 부분의 MD5와 대조**하고, 범위가 전체 IPA를 빠짐없이 덮는지와 원본 SHA-256을 확인했다. 설치 파일 내용이나 서명을 수정하지 않았다.
- 업로드 확정 성공 후 Apple 상태는 `PROCESSING`, 오류·경고 0개다. `.expo/deck-release-20261102/direct-upload.json`, `direct-status.json`, `release38-status.json`에 단계별 확인을 보관한다.
- EAS Submit 페이지의 `CANCELED`는 위 대기 작업을 의도적으로 대체한 결과이며, 실제 전달 상태는 Apple의 build upload / build / 내부 그룹 상태로 판정한다.
