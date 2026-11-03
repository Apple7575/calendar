# Expo HAS CHANGED

## Git Flow (2026-11-03 사용자 확정)

- 브랜치 역할과 병합 절차는 `docs/GIT_WORKFLOW.md`를 따른다. 기본 배포 기준 이름은 `main`, 개발 통합은 `develop`, 새 기능은 `feature/*`다. `master`를 새로 만들지 않는다.
- 새 기능은 최신 `develop`에서 분기하고 검증 후 `develop`으로 합친다. 배포 준비는 `release/*`, 긴급 수정은 `main`에서 만든 `hotfix/*`로 진행하며 최종 수정은 `main`과 `develop` 모두에 반영한다.
- 다른 에이전트와 병렬 개발할 때는 브랜치와 worktree를 모두 분리한다. 같은 작업 폴더의 브랜치를 서로 전환하거나 공통 파일을 동시에 수정하지 않는다. 계정·저장·보상·스키마·배포 변경은 통합 담당이 조율한다.
- 기존 미커밋 작업을 보존한다. Git 동기화는 앱 배포 승인이 아니다. 이번 Git Flow 전환에서 최신 코드를 main/develop에 맞추라는 지시는 사용자 승인된 일회성 기준 정리이며, TestFlight 배포 완료를 뜻하지 않는다.

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

이 프로젝트는 **Expo SDK 54 고정**이다. 사용자의 iPhone Expo Go가 SDK 54를 지원하므로
SDK를 올리지 말 것 (사용자가 직접 확인한 사항).

## iOS 배포와 빌드 사용량

- 웹 미리보기에서 사용자와 확인한 뒤 사용자가 배포를 승인할 때만 EAS Build/Update를 실행한다. 기능 수정 요청만으로 자동 배포하지 않는다.

- 사용자는 EAS 무료 iOS 빌드 한도를 아끼기를 원한다. 화면·문구·JS 변경마다 새 바이너리를 빌드하지 않는다.
- 웹 미리보기로 변경 사항을 모아서 검증한다. 설치된 바이너리와 네이티브 런타임이 호환될 때 EAS Update를 사용한다.
- Update 채널은 production, runtimeVersion 정책은 fingerprint다. 네이티브 의존성·Swift·권한 변경은 새 빌드가 필요하다.
- expo-updates를 처음 포함하는 빌드 27 이전 앱에는 OTA 업데이트가 전달되지 않는다.
- 루틴 타이머의 시간·완료 정책은 사용자와 논의 중이다. 타이머 만료만으로 루틴 보상을 지급하지 않는다.

## Taste Skill / ECC (2026-11-02)

- 사용자는 **선별 스킬이 아닌 전체 네이티브 플러그인** 활성화를 요청했다. Codex 사용자 홈의 `taste-skill@taste-skill`과 `ecc@ecc`가 설치 원본이다. 프로젝트 `.agents/skills`에 같은 스킬을 중복 복사하지 않는다.
- 설치 위치·검증 결과·제약은 `docs/agent-tools-setup.md`에서 확인한다. 활성화는 모든 스킬을 매번 실행하라는 뜻이 아니다. 해당 작업에 맞는 스킬 본문을 읽고 사용한다.
- 화면 신설·개선·디자인 리뷰: `taste-skill:design-taste-frontend`를 사용한다. 먼저 화면의 핵심 질문, 주요 행동 하나, 실제 사용자 흐름과 빈 상태·진행·완료·오류 상태를 정한다. 기존 동물 캐릭터, Lottie, 제품 규칙과 브랜드를 보존한다. 같은 배너·카드·문구 반복으로 화면을 채우지 않는다.
- Taste의 `references/app-screens.md`를 읽되 데스크톱 대시보드 수치·스타일과 웹 구현 예시를 iPhone 앱의 강제 규칙으로 적용하지 않는다. CSS/Tailwind/DOM/웹 전용 애니메이션으로 네이티브 화면을 대체하지 않는다. 검수는 Expo 웹 미리보기와 실제 iOS 화면을 구분해서 보고한다. 이 Windows 환경의 브라우저 검수는 iOS 시뮬레이터·실기기 검증을 대신하지 않는다.
- 기획·정책: `ecc:product-capability`로 요구사항, 저장 데이터, 보상·잠금 불변조건, 미정 정책, 검증 기준을 정리한다. 기존 문서를 재사용하고 미정 값을 임의로 실제 보상에 적용하지 않는다.
- 구현·리뷰: 관련 ECC 기술 스킬과 `ecc:coding-standards`를 읽고 현재 코드·호출부·저장·복귀 경로를 확인한다. 리뷰 시 diff와 주변 코드, 실제 실패 조건을 확인하고 근거 없는 지적을 만들지 않는다.
- 테스트·검증: 보상·학습 스케줄러·타이머·저장·권한 등 동작 변경에는 `ecc:tdd-workflow`, 마무리에는 `ecc:verification-loop`를 사용한다. 검증 명령은 Windows/PowerShell과 실제 package.json에 맞춘다 (`npm.cmd run typecheck`, 필요한 Jest 테스트, `npm.cmd run check:screen-time`). 없는 build/lint 스크립트를 실행하거나 작은 시각 수정에 불필요한 테스트를 양산하지 않는다. Expo export와 유료 EAS 배포를 구분한다.
- 보안 관련 변경: `ecc:security-review`를 사용한다. 인증·사진·개인 기록·API·키·서버 권한을 점검하고, 네이티브 앱 번들/EXPO_PUBLIC 변수에 비밀 키를 넣지 않는다. 원격 DB 관리 검증은 실제 접근 권한 없이 통과로 표시하지 않는다.
- 전체 플러그인 설치만으로 Claude 전용 slash command/agent/hook가 Codex에서 동일하게 실행되는 것은 아니다. Codex의 도구·권한·신뢰 절차를 사용한다. 자동 훅 신뢰를 설정 파일 편집으로 우회하지 않는다. 기존 승인·배포 규칙과 사용자 선택을 보존한다.

## PDF 단어장 제작

- 새 PDF·새 단어장 작업은 [PDF_VOCABULARY_MANUAL.md](PDF_VOCABULARY_MANUAL.md)를 먼저 읽는다. 음성 세부 기준은 [AUDIO_PRODUCTION_GUIDE.md](AUDIO_PRODUCTION_GUIDE.md), 이전 N3 기록은 [RESUME_WORD_WORK.md](RESUME_WORD_WORK.md)에 있다.
- 사용자 확정: 새로 받는 PDF의 단어는 기존 N3에 추가·병합하지 않는다. 같은 급수·같은 단어여도 별도 덱 ID·노트 ID 접두사·출력 경로로 분리하고, 기존 N3 내용·진도·음성 연결을 보존한다. 사용자의 명시적 변경 요청 없이는 이 조건을 바꾸지 않는다.
- 현재 corpus 스크립트의 N3 전용 페이지·경로·ID를 새 PDF에 그대로 적용하지 않는다. 새 작업의 입력·출력·덱 ID를 분리하고 기존 N3와 학습 기록을 보존한다.
- 원문 추출과 생성 예문, 자동 검수와 사람 확인, 로컬 완성과 원격 게시·앱 배포를 구분해 보고한다. 새 작업의 유료 호출·게시·배포는 해당 세션의 승인 범위를 따른다.
