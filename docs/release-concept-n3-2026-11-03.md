# 개념서 N3 TestFlight 배포 · 2026-11-03

- 사용자 배포 승인: “어 배포해줘.”
- 브랜치 `feat/n3-concept-flashcards` 유지. 기존 미커밋 변경을 포함하며 commit/push/reset/stash 없이 진행.
- 개인 앱 `com.newblueday.mycalendar`, Expo `hey9991s-team/calendar-app`, Apple 팀 `NR4Y2WD2S7`, ASC 앱 `6789025200`.
- 새 버전 **1.0.0 (39)**. 기존 인증서와 프로파일을 `--freeze-credentials`로 사용한다.
- [EAS Build](https://expo.dev/accounts/hey9991s-team/projects/calendar-app/builds/38ea7466-e718-4c17-a405-7f925d1fcd9e)

## 포함 범위

`학습 → 내 단어장 → 개념서 N3 · 별도 실험 단어장`에서 진입한다. 기존 N3/N2 어휘 덱과 분리된 실험 기능이다. 짧은 문제·해설, 플래시카드 자기 평가, 개념별 기록과 복습 일정, 선택 후 요청하는 AI 새 문제 생성을 포함한다. 생성은 자동 실행하지 않는다.

전체 903개 중 검증된 카드 686개, 보류 217개. PDF 비어휘 범위 209페이지의 1차 처리가 끝났으나 보류 문항과 이미지·원음 의존 문제의 해결까지 완료한 것은 아니다. 생성 음성 8개를 포함한다. 자세한 내용은 [처리 결과](n3-corpus-2026-11-03.md).

## 사전 검증과 보존

- Jest 57 suites / 342 tests 통과 기록 확인. 이번 배포 전 타입 검사 재실행 통과.
- iOS release export 완료: Hermes 번들 25,554,537 bytes, 자산 파일 6,766개. 개념서 진입점과 최신 음식 문제의 짧은 문구가 실제 번들에 포함됨을 확인.
- 번들에서 OpenAI 프로젝트 비밀 키 형식 및 PEM 개인 키 형식이 검출되지 않았다. 이는 모든 종류의 비밀을 완전 탐지하는 검사가 아니다.
- 배포 전 파일 9,324개 / 292,840,657 bytes를 `.expo/concept-release-20261103/source/`에 복사했다. manifest SHA-256 및 `source.patch`, Git 상태를 보관했고 원본과 일치함을 확인했다.
- 기존 자산 수가 EAS Update 제한을 초과하므로 이전 배포와 같이 새 바이너리로 전달한다. 기존 내장 음성을 제외하거나 런타임 정책을 변경하지 않았다.
- 업로드 아카이브 약 401 MB. Expo SDK 54 및 의존성은 유지한다.

## 원격 진행

- EAS 빌드 ID `38ea7466-e718-4c17-a405-7f925d1fcd9e`.
- 2026-11-03 03:51:48 UTC: `IN_QUEUE`. 아직 Apple 업로드 또는 TestFlight 이용 가능 상태로 보고하지 않는다.
- 완료 후 IPA 내부 버전·번들 ID·프로비저닝 팀을 확인하고 Apple 업로드 및 내부 테스트 그룹 상태를 이어서 기록한다.

### 빌드 완료 및 Apple 전송

- 2026-11-03 04:01:19 UTC: EAS `FINISHED`, 빌드 오류 없음. 런타임 `6e99094ceed29dd728afa93f9f525143684f9c90`.
- IPA 내부에서 bundle `com.newblueday.mycalendar`, version `1.0.0`, build `39`, 팀 `NR4Y2WD2S7` 확인.
- IPA 226,795,229 bytes, SHA-256 `5dbc2f31ab4c9529a3967c13cb82d90008792e2207f0986258bab4a4cf9a0c29`.
- IPA의 `main.jsbundle`에서 최신 개념서 진입점과 음식 문제 문구를 확인하고, 개념서 MP3 8개를 로컬 원본 SHA-256과 대조했다.
- 기존 개인 팀의 App Store Connect API 키로 Apple 공식 Build uploads API에 직접 전달한다. EAS Submit 작업은 생성하지 않아 이중 제출이 없다. 키/JWT/서명된 업로드 URL을 출력하지 않는다.
- Apple build upload ID `88184262-704c-43b6-b30f-e053106e3230`, 총 44개 조각. 업로드 완료 및 Apple 처리 결과는 이어 기록한다.
- 2026-11-03 04:03:18 UTC: 44개 조각 전송 및 전체 범위·각 조각 MD5 대조 완료. 원본 IPA SHA-256 일치. Apple 업로드 확정 성공, `PROCESSING`, 오류·경고 0개.
- 업로드 file ID `3a4ef3a1-7d83-4c78-a76e-6afddbae0b80`. Apple이 반환한 조각별 ETag를 검증하고 선택 항목인 `sourceFileChecksums`를 생략하는 기존 검증된 경로를 사용했다. IPA 내용·서명 변경 없음.

### TestFlight 이용 가능 확인

- **2026-11-03 04:09:21 UTC (한국 13:09): 배포 완료.** Apple upload `COMPLETE`, build `VALID`, `expired=false`, 내부 상태 `IN_BETA_TESTING`.
- Apple build ID `88184262-704c-43b6-b30f-e053106e3230`, **1.0.0 (39)**.
- 기존 내부 그룹 **Team (Expo)** (`253b5463-3b7c-4ce0-8fc6-f876038f0ef3`)에 39번 빌드가 연결된 것을 실제 관계 조회로 확인했다. 새 그룹이나 테스터를 만들지 않았다.
- TestFlight에서 업데이트 후 `학습 → 내 단어장 → 개념서 N3 · 별도 실험 단어장`으로 진입한다. 실제 iPhone에서 업데이트·기존 진도 복원·음성 재생 확인은 별도로 남아 있다.
- 증거: `.expo/concept-release-20261103/direct-status.json`, `release39-status.json`, `direct-prepare.json`, `ipa-content-verification.json`.

Windows의 웹·번들 검증은 실제 iPhone에서의 화면·오디오·Screen Time 실행 검증과 구분한다. App Store 공개 심사·출시는 이 작업의 범위가 아니다.
