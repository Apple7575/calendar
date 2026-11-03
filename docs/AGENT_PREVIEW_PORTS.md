# 에이전트별 웹 미리보기 포트

2026-11-03 실행 중인 서버를 확인해 기존 포트를 고정한다. 다른 담당자의 서버를 재시작하거나 종료하지 않는다.

| 담당 | 브랜치 | 포트 | 작업 폴더 |
|---|---|---:|---|
| PM·통합 | feat/n3-concept-flashcards | 8082 | C:/Users/SSAFY/orca/projects/routine/calendar |
| 집중 학습 | feature/focus-ux | 8123 | C:/Users/SSAFY/orca/workspaces/routine/cardinalfish/focus-ux |
| 단어장·일본어 학습 | feature/vocabulary | 8092 | C:/Users/SSAFY/orca/workspaces/routine/driftfish/vocabulary |
| 친구들 | feature/friends-ux | 8093 | C:/Users/SSAFY/orca/workspaces/routine/cormorant/friends-ux |

각 작업 폴더에서 `npx.cmd expo start --web --port <배정 포트>`로 실행한다. 이미 자기 서버가 실행 중이면 그대로 재사용한다. 포트가 사용 중이라고 임의의 다음 포트로 이동하지 말고, 점유 프로세스와 담당자를 먼저 확인한다.

- 브라우저 URL, 스크린샷, E2E 스크립트의 대상 포트를 모두 자기 포트로 맞춘다. 기존 스크립트의 8082 하드코딩을 그대로 사용하면 통합 화면을 검사하게 된다.
- 결과 보고에는 브랜치·작업 폴더·전체 URL을 함께 적는다. 브라우저 탭 이름도 `집중 8123`, `단어장 8092`, `친구들 8093`처럼 구분한다.
- 각 에이전트는 자기 브라우저 탭을 사용한다. 다른 담당자의 탭을 이동·새로고침해 덮어쓰지 않는다.
- localhost의 포트가 다르면 브라우저 저장소도 구분된다. 자기 미리보기 데이터를 지우면서 다른 포트의 실제 테스트 결과와 같다고 가정하지 않는다.
- 서로 다른 worktree에는 node_modules·서버 실행 위치도 확인한다. 포트만 나누고 같은 작업 폴더를 사용해서는 소스가 분리되지 않는다.
- 이 문서는 통합 폴더의 공유 기준이다. 다른 worktree에 변경이 자동 반영되지는 않으므로 담당자에게 배정 URL과 이 문서 경로를 직접 전달한다.

## 공용 검수 스크립트

주소가 고정돼 있던 검수 스크립트 12개는 `scripts/lib/preview-url.cjs`를 통해 `PREVIEW_PORT`를 읽는다. 미지정 기본값은 8082다. 잘못된 값은 다른 서버로 대체하지 않고 오류를 낸다. URL의 경로와 쿼리는 유지한다.

PowerShell 예:

```powershell
$env:PREVIEW_PORT = '8092'
node scripts/check-bundled-deck-web.cjs
node scripts/check-deck-library-web.cjs
```

집중 담당은 8123, 친구들 담당은 8093을 지정한다. 검사 결과가 최신 UI 문구와 맞는지는 해당 담당자가 따로 확인한다. 포트 교체가 기존 테스트의 기대 문구까지 갱신하는 것은 아니다.

## 로컬 Dot 페어링

```powershell
$env:PREVIEW_PORT = '8092'
node scripts/dot-learning-mcp.cjs --pair
```

- 허용 출처는 지정한 포트의 `http://localhost`와 `http://127.0.0.1` 두 개만이다. 기본 8082와 모든 담당 포트를 동시에 허용하지 않는다. 외부 주소·다른 포트·Origin 없는 요청은 기존처럼 403으로 차단한다.
- 페어링 서버 자체 주소는 기존 `127.0.0.1:8766`이다. `PREVIEW_PORT`는 **접속을 허용할 웹 미리보기 포트**다. 서로 다른 worktree라도 8766 페어링 서버는 동시에 여러 개 실행하지 않고 PM과 순서를 조율한다.
- 출처 검사와 OPTIONS/status/잘못된 요청 처리는 임시 포트의 로컬 HTTP 테스트로 확인했다. 실제 로그인 토큰 전송·DPAPI 저장·Supabase 계정 연결은 이 검증에서 실행하지 않았다.
- 관련 검사: `node --test scripts/lib/preview-url.test.cjs`.
