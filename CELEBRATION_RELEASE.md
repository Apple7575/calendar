# 완료 축하·보상 영수증·음성 개선

2026-10-31. 이번 사용자 요청으로 웹 검수 후 TestFlight 배포를 진행한다.

완료 화면은 실제 지급량(이번), 해당 목표의 오늘 지급 합계, 전체 적립, 실제 기기 사용 가능 잔액, 연결·반영·아침 조건 대기를 구분한다. 추가 단어는 배치별 granted/withheld 영수증을 저장한다. 한도에 걸린10장도5분을 받았다고 표시하지 않는다. 채점 취소·재실행·백업에서도 영수증을 보존/복원한다. 단어 기본·추가·짧은 복습 합계60분, 순서 보너스60분, 손글씨 보상 무상한 정책을 유지한다.

보리: assets/bori/celebration-v1/bori_{sprout,growing,blooming}_victory.json. 원래 growth-v3의 얼굴·몸·새싹·성장 장식을 사용하되 팔다리를 개별 레이어로 분리했다. 몸을 낮춤→큰 스타 점프→착지 눌림→다시 점프·양팔 만세·새싹 반동으로3.6초 구성. 요청한 완료에만 재생하며 모션 감소 설정은 정적 이미지를 쓴다. 완료 후 얼굴 크기가 튀지 않도록 마지막 포즈를 유지하고 누르면 동작만 다시 재생한다. 보상을 재지급하지 않는다. 원본은 보존한다.

생성 이미지: assets/bori/celebration-sunburst-v1.png. 기본 내장 imagegen 사용. 생성 원본은 C:/Users/SSAFY/.codex/generated_images/01a18500-e7fb-77e3-a517-a60e89d6b903/exec-922e5d3b-9ec8-4a60-bff8-731baec9d29a.png. 배경만 생성하고 캐릭터·한국어·실제 숫자·버튼은 앱/Lottie로 분리하여 임의 보상 숫자가 이미지에 들어가지 않게 했다.

최종 이미지 프롬프트:
> Create a polished portrait 9:16 mobile app celebration BACKGROUND illustration only, intended as a reusable backdrop behind separately rendered animated Bori character and live Korean text. Reference image shows Bori identity and palette ONLY; do NOT draw a character in this background. Warm storybook gouache / soft grain illustration, buttery yellow sunburst radiating from center at 52% height, light peach highlights, sky-blue ribbon confetti, sprout-green little paper leaves, a few ivory four-point sparkles. Puffy cream clouds along bottom corners and tiny upper corners. Luminous joyful 'morning routine complete' atmosphere, handcrafted premium friendly Korean habit app. Keep central 65% width, y=15% to85%, calm uncluttered with gentle yellow luminosity so dark text and animated character remain readable. No words, no lettering, no typography, no numerals, no UI buttons, no logo, no character. Full bleed no border. Avoid photorealistic textures, excessive confetti, dark saturated orange. 1024x1792 portrait.

음성:1,587단어/3,174파일의 앞뒤 무음을 정리. 원본·실패 시도·이전 파일명 aliases 보존. 단어 길이 최초182개 및 통계 갱신 후3개, 총185개만 추가 전사·단일 발음 검수·교체했다. 전체 원어민 청취를 실시한 것은 아니다. 최종 파일은 브라우저에서 전부 SHA/디코딩/비무음 검사를 통과했다. 단어 종료→예문 시작은 앱 타이머500ms. 자동 예문 끄기/수동 재생/넘김/백그라운드/언마운트는 대기를 취소한다. 모든 N3 음성을 앱에 포함해 기존 소유자 세션 만료와 별개로 오프라인 재생한다. PC 비공개 저장소 전송은 재로그인 후 별도 갱신할 수 있다.

검증:36 suites/234 tests, TypeScript, Screen Time 공유 구현·메타데이터 검사. 브라우저 실제 추가 학습20장:이번5분/한도 미적립5분/단어60분 한도/재실행 영수증 유지. 작은 아침 완료5분 및320px 가로 넘침 없음. 모션3단계·5프레임을 직접 렌더하여 누락/화면 잘림 수정. iOS 로컬 Hermes export는EAS 빌드와 구분한다.

손글씨 AI 서버는 사용자Supabase 재인증 후 handwriting-study v1 ACTIVE/verify_jwt=true로 배포했다. 실제 OPTIONS200/CORS 및 익명POST401 확인. 로그인한 사진의 실제 인식·카메라·스크린타임 기기 동작 검증은 별도로 확인해야 한다. 기존 데이터와 API 키는 변경하지 않았다.

배포 추적: iOS1.0.0(33), EAS build cc2ea674-ef63-43b1-84a4-0f6c98a9b883 / submission aec4dae4-f98c-4e9b-9efc-a5a407f3e883. 소유자hey9991s-team, Apple개인팀NR4Y2WD2S7, 앱com.newblueday.mycalendar 및 기존widget/screentime 서명 사용. runtime e130d87ec5b7eb28a30ef037fb3a7ea9c7aa167d. 빌드1회 실행, 자동 제출 예약. 최종 Apple 처리 상태는 .expo/release33-status.json에서 확인한다.

최종 음성 검증값:3,174개 번들 복사본이 선택된 원본SHA와 일치. 오디오 약89.1MiB, WAV예외1개. 앞무음 최대31.6ms, 뒤무음95%70.8ms/최대90.3ms. 길이 후보185개 처리/미해결0개, 갱신된 길이 검사 후보0개. 실제 아이폰 스피커 출력 지연과 원어민 전수 청취는 이 검사에 포함되지 않는다.

2026-10-31 09:12 UTC 조회: EAS build FINISHED / submission FINISHED / error=null. Apple빌드 목록에는 아직33 미표시(처리 대기). 설치 가능 여부는 후속 조회로 확인한다.

최종 2026-10-31 09:15:56 UTC: Apple빌드2c285fc4-1f13-4419-a8c4-49b48f38f8be /33, VALID / IN_BETA_TESTING, 내부Team (Expo) hasBuild=true. TestFlight 설치 가능 상태 확인. 실제 아이폰 앱 잠금·음성 출력·노트 사진 인식 품질은 사용자 기기에서 확인한다. 앱 삭제 없이 TestFlight 업데이트로 기존 데이터와 제한 앱 선택을 보존한다.
