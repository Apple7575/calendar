# 단어 작업 상태 — 2026-10-31 재개 완료

Dot은 보류. 기존 원본·학습 데이터·사용자 변경을 보존했다. 커밋·푸시·추가 EAS 배포 없음.

## 콘텐츠·음성

- PDF 단어 파트 40쪽(PDF 4~43)의 중복 312건을 합친 1,587개를 JLPT N3 단어장 하나로 앱에 반영. 기존 97개 ID·FSRS·즐겨찾기·직접 수정·고정 일일 목표 유지. 문형 파트 제외.
- cedar 음성 3,174개 완료. 단어 1,587개 전사·읽기 비교: 원본 1,089개 재사용, 498개 보정. 문장 전체 전사·원어민 전수 청취는 미실시.
- 모든 단어·예문 앞무음 제거. 발음 시작 보존 여유 약 20ms, 최종 RMS 검사 중앙값/95% 지점 20ms, 최대 50ms. 3,174개 해시·디코딩·무음 검사 오류 없음. 자른 길이와 재생시간 변화 일치.
- ../output/corpus-audio/manifest.before-trim.json 및 원본 파일 보존. 최종 manifest reviewed/trimmed. 전체 생성·finalize를 다시 실행해 덮어쓰지 않는다.
- 카드 앞면에서 단어·예문 플레이어 미리 준비 후 재사용. 웹 클릭→play 요청 약 5~13ms. 아이폰 스피커 출력 지연 미측정.
- 소유자 비공개 저장소에 전 파일 전송. 새 앱은 study-decks-v2 전체 덱 우선 수신. 구형 빌드 29는 study-decks의 97개 호환 덱을 받아 미지원 원격 음성 문제 방지. 전체 덱 수신에는 최신 앱 배포 필요.

## 학습 기능

- 추가 카드 10장 완료→5분, 하루 상한 없음. Again은 완료 아님. FSRS 다음 복습이 다음 학습일 04:00 이후면 완료. 재실행 중복 지급 없음.
- 마지막 채점 취소: FSRS·완료·응답·보상 복원 및 취소 이력. 실패·재시작 복구 journal, 재시도 구현. 생활 루틴 및 이미 소비한 시간 보존.
- 보상 감소 취소는 새 Swift adjustStudyRewards/supportsStudyUndo 필요. 구형 빌드는 로컬 변경 전 차단. Swift 실제 컴파일·기기 확인 대기.
- 덱별·카드별 응답 이력, 7/30일 통계 구현. 과거 합계 보존. 없었던 상세 이력을 추정 생성하지 않는다.

## 검증·배포

- 타입 검사, 24개 스위트/163개 테스트, Screen Time 메타데이터·공유 구현 검사 통과.
- 최신 iOS Hermes 로컬 export 성공: 232 assets, 6.93MB bundle. EAS 빌드 횟수 미사용. Swift 컴파일 검증과 구분.
- 웹 음성 선로딩/재사용, 자동 단어→예문 설정, 채점 취소·통계·추가 보상 검사 스크립트: .expo/check-audio-preload.cjs, check-study-interactions.cjs, check-study-history.cjs.
- 미리보기 http://localhost:8082/ 카드 바로 보기 http://localhost:8082/?studyDemo=1
- 기존 빌드 29 b95082e1-dda9-471f-9594-cebb216b31e4 업로드 완료 및 Apple 내부 TestFlight 그룹 포함 조회. 이번 변경 미배포.
- AGENTS.md에 따라 웹 리뷰 및 사용자 배포 승인 후 다음 묶음 네이티브 빌드. 새 취소 기능 때문에 전체 변경은 OTA만으로 완료 불가.
- 키·암호화 소유자 세션을 출력하거나 앱에 포함하지 않는다. 원본·검수 로그·백업 삭제 금지.

## 추가 진행 (2026-10-31)

- 빌드 30 bf3e8b9f-7205-4af9-bc05-159e35d216d6 및 자동 제출 c03bae77-4b9f-42a8-99b7-524aaf6029d0 성공. Apple VALID / IN_BETA_TESTING, 내부 Team(Expo) 포함 확인.
- 후속 미배포 코드: 단어/문장 개별 속도(1/1.25/1.5/1.75/2), 직접 추가 장수, 10장 중간 및 완료 축하. 설정/실재생/추가 보상/Undo 축하 중복 방지 브라우저 검사 완료, 24 suites/165 tests 통과.
- 효과음은 사용자 선택 대기. 비교용 8개 http://localhost:8082/sound-review.html, 원본과 라이선스 ../design-review/sounds 보관. 추천 중간 m1 / 완료 c1, 별도 적립음 생략. 승인 전 실제 학습에 소리 적용하지 않음.
- 최신 Metro 포트8082 유지. .expo/check-study-customization.cjs 및 check-sound-review.cjs에 회귀 검증 저장. 배포 후속 변경은 웹 승인 뒤 묶어 OTA 검토. build30과 네이티브 호환 여부 fingerprint 확인 후 결정.

## 효과음 승인 완료

2026-10-31 사용자 추천 조합 승인. milestone=A confirmation_001, complete=A PIZZI00, 별도 적립음 없음. assets/sounds/study에 적용했고 공유 audio focus/정지/중복 방지 구현. 웹 실제 각1회 재생과 회귀 검증, 25 suites/168 tests 및 타입 통과. 추가 배포 없음. 예전 선택 대기 메모는 이 항목으로 대체한다.

## 빌드31 진행 정보

사용자 요청으로 배포 실행. Build def802d0-8655-4419-bd23-bbefcba1bf03, submission 3c91ce47-99de-41d5-81a3-d1fca89094dc. runtime/fingerprint 278074bd12f10bfde95be1231aa6c909d080e640. 최종 27 suites/173 tests 및 타입 검사 통과. 루틴/신고 복사 웹 검증 통과, 기존 속도/장수/효과음/자동 예문 회귀도 통과. 빌드 중이며 최종 결과는 아래 후속 항목에서 확인.
화면 전체 리뷰 자료 요청은 취소됐으므로 만들지 않는다. 신고 재생성 워크플로: 학습→저장·확인할 단어→확인 필요→신고 전체 복사(또는 개별)→카카오톡/ChatGPT에 붙여넣기. 목차/PDF 등 화면자료 작업을 재개하지 않는다.

빌드31 결과: EAS 빌드 FINISHED, 자동 제출 FINISHED, error=null. Swift 컴파일 성공. 최초 App Store Connect 조회에서는31 미표시(Apple 처리 대기). 실제 기기에서 간단 완료 후 잠금 해제 및 신고 복사 확인 필요. 이 상태와 기기 검증을 구분한다.

빌드31 Apple 처리 완료: VALID / IN_BETA_TESTING, Team (Expo) hasBuild=true. 내부 TestFlight 설치 가능 상태를 확인했다. 실제 아이폰 앱 잠금 해제 체감 검증은 사용자 기기에서 확인한다.
