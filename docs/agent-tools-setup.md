# Taste / ECC 설치 기록

확인일: 2026-11-02. 이번 작업은 도구 설치·프로젝트 지침 설정만 수행했다. 앱 코드·화면·앱 의존성과 배포는 변경하지 않았다. 작업 시작 전에 있던 화면 수정 5개 파일은 그대로 유지했다.

## 환경과 설치 방식

- Windows / PowerShell, Codex CLI 0.166.0, Node 24.18.0.
- Expo ~54.0.35, React Native 0.81.5, React 19.1.0, TypeScript ~5.9.2.
- 공식 저장소의 Codex native plugin 방식으로 설치. 사용자 요청 변경에 따라 선별 스킬 설치에서 전체 플러그인으로 전환했다.
- 공식 안내: [Taste](https://github.com/Leonxlnx/taste-skill#install), [ECC Codex](https://github.com/affaan-m/ECC/tree/main/.codex-plugin), [OpenAI plugins](https://learn.chatgpt.com/docs/plugins), [OpenAI hooks](https://learn.chatgpt.com/docs/hooks).

| 도구 | 버전 | 설치 경로 |
|---|---|---|
| Taste Skill | 2.1.5 | `C:/Users/SSAFY/.codex/plugins/cache/taste-skill/taste-skill/2.1.5` |
| ECC | 2.2.3 | `C:/Users/SSAFY/.codex/plugins/cache/ecc/ecc/2.2.3` |

공식 명령: `codex plugin marketplace add Leonxlnx/taste-skill`, `codex plugin add taste-skill@taste-skill`, ECC는 각각 `affaan-m/ECC`, `ecc@ecc` 사용. 전역 설정은 CLI가 병합했다. 기존 모든 설정값이 유지되는지 TOML 비교로 확인했다. 백업은 `C:/Users/SSAFY/.codex/config.before-taste-ecc-20261102.toml`이며 비밀 값이 포함될 수 있어 공유·커밋하지 않는다.

전체 플러그인은 이 사용자 Codex 홈에서 활성화된다. 현재 대화의 도구 목록이 즉시 다시 구성되지는 않으므로 새 세션에서 사용한다. 설치 도중 생성된 6개 프로젝트 스킬 사본은 워크스페이스 `tmp/selected-skills-before-full-plugin`에 이동하여 중복 발견을 방지했다.

## 실행 검증

- `codex plugin list --json`: 두 플러그인 모두 `installed: true`, `enabled: true`.
- 실제 Codex app-server `skills/list` + `forceReload: true`: **ECC 350개, Taste 1개** 발견, 활성화, 관련 파싱 오류 0. README의 오래된 개수 대신 실제 로더 결과를 기록한다. 일부 대표 이름: `ecc:configure-ecc`, `ecc:product-capability`, `ecc:coding-standards`, `ecc:tdd-workflow`, `ecc:verification-loop`, `ecc:security-review`, `taste-skill:design-taste-frontend`.
- ECC 공식 `scripts/codex/check-plugin-cache.js`: 스킬·MCP·훅·아이콘·이미지 경로 모두 통과.
- Taste `scripts/draw.mjs --list tones`: 정상 실행. 디자인 생성이나 앱 수정은 하지 않았다.
- ECC 기본 `chrome-devtools-mcp@1.10.1`: MCP initialize 및 tools/list 성공, 도구 30개 확인. 브라우저를 열거나 사용자 탭을 조작하지 않았다.
- ECC 훅 런타임 패키지: 공식 cache-local 방식으로 `npm ci --omit=dev --ignore-scripts --no-audit --no-fund --no-bin-links` 설치. 앱 node_modules와는 별개다. 플러그인 업그레이드 시 이 캐시 설치는 다시 필요할 수 있다.
- 실제 Codex `hooks/list` 재검사: ECC `sessionStart` 훅 발견, `enabled: true`, **`trustStatus: untrusted`**, 경고·오류 0. 최초 fingerprint 경고는 런타임 설치 후 재검사에서 사라졌다. 자동 실행은 `/hooks`에서 현재 정의를 검토·신뢰하기 전까지 대기한다. 훅 실제 실행 성공을 주장하지 않는다.

## 프로젝트 적용 기준과 제약

`AGENTS.md`에 작업별 사용 기준을 기록했다. 전체 카탈로그가 설치되었지만 이번 설치 작업에서 앱 리디자인·기능 구현·테스트 실행은 요청 범위가 아니다.

Taste는 화면의 핵심 행동과 위계·배치·문구·상태 검수에 적용한다. 기존 4종 동물 캐릭터와 진짜 Lottie를 유지한다. 웹용 DOM 검사기는 Expo 웹에만 사용하고, 네이티브 화면에 Tailwind/CSS/데스크톱 대시보드 기준을 강제하지 않는다. Windows에서는 iOS 시뮬레이터나 실제 iPhone 성능을 확인할 수 없다.

ECC의 Claude 전용 slash command·모델명·에이전트·Bash 예시는 Codex 네이티브 지원과 다를 수 있다. 설치가 코드 리뷰용 별도 에이전트를 자동 실행하는 것은 아니다. 보상·잠금 정책과 SDK 54 고정, 기존 배포 승인 규칙은 유지한다. 전체 설치 자체를 근거로 보안 점검·회귀 테스트·실기기 검증이 완료됐다고 표시하지 않는다.

## 다음 요청 예시

- “Taste Skill로 오늘 화면의 핵심 행동을 하나로 정리해 줘. 기존 캐릭터와 기능은 유지하고 변경 전후를 비교해 줘.”
- “ECC의 product-capability로 계획 → 공부 → 제출 → 보상 흐름의 검증 기준부터 정리해 줘.”
- “ECC 관련 스킬로 이 버그를 재현하고 수정·검증·리뷰까지 진행해 줘.”

새 Codex 세션에서 `/plugins`로 두 플러그인을 확인한다. ECC의 자동 SessionStart 훅은 `/hooks`에서 현재 정의를 검토·신뢰한 뒤 새 세션의 실행 결과를 확인한다. 수동으로 신뢰 해시를 조작하지 않는다.
