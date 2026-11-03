# Git Flow

2026-11-03 사용자 요청으로 도입한다. 브랜치는 폴더 계층이 아니라 커밋을 가리키는 이름이며, 아래 역할과 병합 흐름으로 운영한다.

| 브랜치 | 역할 | 분기 기준 | 반영 대상 |
|---|---|---|---|
| main | 릴리스 기준 | 장기 유지 | — |
| develop | 다음 버전 개발 통합 | main | release/* |
| feature/* | 기능 단위 개발 | develop | develop |
| release/* | 버전 안정화·배포 준비 | develop | main과 develop |
| hotfix/* | 배포 버전 긴급 수정 | main 또는 해당 배포 태그 | main과 develop, 진행 중 release가 있으면 함께 반영 |

예: `feature/vocabulary`, `feature/japanese-learning`, `release/1.1.0`, `hotfix/audio-playback`.

## 작업 순서

1. 미커밋 변경을 확인·보존하고 origin을 fetch한다. 공유 브랜치의 차이와 수정 파일 겹침을 확인한다.
2. 최신 develop에서 기능 브랜치를 만든다. 여러 담당자가 동시에 작업하면 각자 별도 worktree를 사용한다. 브랜치만 다르고 작업 폴더가 같으면 안전한 병렬 개발이 아니다.
3. 기능별 커밋과 관련 검증을 수행하고 develop 대상 PR로 합친다. 기능 경계를 남겨야 하는 통합은 `--no-ff` 병합을 사용한다. 다른 담당자의 작업을 reset/clean/강제 push로 정리하지 않는다.
4. 배포할 기능이 모이면 develop에서 release 브랜치를 만든다. 해당 릴리스의 검증·버그 수정만 수행한다.
5. 사용자 배포 승인에 따라 배포한다. 검증된 release를 main에 반영하고 버전 태그를 남기며, release 수정도 develop으로 반영한다. 앱 버전과 TestFlight 빌드 번호를 구분한다.
6. main의 긴급 수정은 hotfix에서 수행하고 main/develop 양쪽으로 반영한다. 미배포 코드가 main에 들어간 이행 기간에는 실제 배포 태그·배포 기록을 기준으로 hotfix를 시작한다.

## 이번 도입의 기준

- 시작 브랜치: `feat/n3-concept-flashcards`, HEAD `2710297`. 기존 `feat/*`와 backup 브랜치는 보존한다. 새 기능 이름부터 `feature/*`로 통일한다.
- 도입 전 로컬·원격 main은 `a91ac5e`였으며, 원격 develop/master는 없었다.
- 사용자가 현재 최신 작업 전부를 main/develop에 맞추도록 명시적으로 요청했다. 이번 한 번은 미배포 샘플도 포함한 최신 기준으로 두 브랜치를 정렬한다. 이를 TestFlight에 해당 코드가 배포됐다는 뜻으로 사용하지 않는다.
- 실제 최근 TestFlight는 1.0.0 (39)다. 이후 로컬 수정과 일본어 세션 샘플은 포함하지 않는다. 기존 릴리스 기록은 `release-concept-n3-2026-11-03.md`를 참조한다.
- main/develop 동기화 전 기존 main 위치를 backup 브랜치로 보존한다. 배포를 나타내는 버전 태그는 임의로 만들지 않는다.
- 원격 보호 규칙·필수 CI·PR 승인은 서버 설정이다. 로컬 문서 작성만으로 설정됐다고 표시하지 않는다.

## 담당 경계

- 단어장: PDF 처리, 어휘·예문·음성 자산, 덱 관리.
- 학습: 개념·복습·독해·청해·새 상황 세션.
- 통합: 학습 탭/내비게이션, RoutineProvider/저장 계약, 보상·서버 스키마·최종 배포. 공통 파일 수정은 담당 간 합의 후 반영한다.
- worktree마다 개발 서버 포트를 다르게 사용한다. worktree가 달라도 Supabase 프로젝트와 EAS/Apple 배포 대상은 공유하므로 동시에 스키마·배포를 변경하지 않는다.

기본 참고: [원래 Git Flow 모델](https://nvie.com/posts/a-successful-git-branching-model/). 원문의 master 역할에 이 저장소는 main을 사용한다.
