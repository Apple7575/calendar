# 나의 캘린더 (calendar-app)

구글 캘린더 연동 + 매일의 할 일/일기(사진 포함)를 한곳에서 관리하는 iPhone용 캘린더 앱.
React Native + Expo(SDK 54), Supabase(Auth/Postgres/Storage/Edge Functions) 기반.
(SDK 54 고정 — 사용자 iPhone의 Expo Go가 지원하는 버전. 올리지 말 것.)

## 기능

- **월간 캘린더**: 자체 그리드 + 날짜별 dot 마커, 왼쪽 **주차(W1~) 바**를 누르면
  그 주의 요약이 행 아래로 펼쳐짐 + 월간 통계 카드
- **주간 보기**: 0~24시 시간표에 일정이 배치되고(겹치면 가로 분할),
  빈 시간을 누르면 그 시각으로 일정 등록, 날짜 헤더를 누르면 상세로 이동
- **루틴**: 요일별 반복 습관 체크 (오늘/날짜 상세에서 체크, 관리 화면에서 생성)
- **AI 리포트**: 하루/주간/월간/연간/기분 트렌드 — 일정·할 일·루틴·일기·사진(하루)을
  모아 회고 리포트 생성(OpenAI: 리포트 gpt-5, 경량 작업 gpt-5-mini), 생성본은 캐시
- **자연어 일정 등록**: 캘린더 ✨ 버튼 — "내일 오후 3시 치과"라고 쓰면 AI가 일정으로
- **아침 브리핑**: 오늘 탭 상단 카드에 오늘 일정/할 일 AI 요약 (하루 1회),
  설정에서 매일 아침 알림도 가능
- **일기 질문으로 쓰기**: 그날 일정 기반 AI 회고 질문 3개 + 답변 예시 버튼 —
  누르기만 해도 일기가 쌓이고, 직접 입력도 가능
- **구글 캘린더 연동**: 구글 로그인(OAuth) 후 구글 일정을 가져와 표시,
  앱에서 만든 일정을 구글 캘린더에도 등록 가능 (반복 일정은 RRULE로 push)
- **반복 일정**: 매일/매주/매월, 종료일 지정 가능 (수정/삭제는 시리즈 전체)
- **일정 알림**: 정시/10분/30분/1시간 전 로컬 알림 (반복 일정은 반복 알림)
- **할 일**: 날짜별 체크리스트
- **일기**: 날짜당 1개, 텍스트 + 기분 이모지 + 사진 여러 장 (Supabase Storage),
  사진 전체화면 뷰어. **오늘의 한 줄**(비워두면 AI가 추출, 수정 가능),
  에너지(1~5)·수면 시간·함께한 사람 태그·감사 한 가지 기록
- **오늘 탭**: 오늘의 일정/할 일/일기 + "그날의 기록" (1달/3달/6달/1년/2년 전 같은 날 일기)
- **일기 리마인드**: 매일 원하는 시각에 알림 (설정 탭)
- **스트릭/통계**: 연속 작성일, 이번 달 일기 수, 기분 모아보기 (캘린더 탭 하단)
- **검색**: 일정/할 일/일기 통합 검색 (검색 탭)

## 시작하기

처음이라면 **[SETUP.md](./SETUP.md)** 를 따라 Google Cloud / Supabase 설정부터 하세요.
터미널 없이 일반 앱처럼 쓰려면 **[BUILD.md](./BUILD.md)** (TestFlight 빌드)를 보세요.

```bash
npm install
npx expo start --tunnel   # 반드시 tunnel 모드 (구글 로그인 때문)
```

아이폰의 Expo Go 앱으로 QR을 스캔해 실행합니다.

## 개발

```bash
npm test          # jest 단위 테스트 (순수 로직: dateUtils, eventMerge)
npm run typecheck # tsc --noEmit
```

## 구조

```
src/
  screens/      화면 (Login, Calendar, Today, DayDetail, EventEdit, DiaryEdit, Settings)
  components/   재사용 UI (DayOverview, Section, PrimaryButton)
  navigation/   React Navigation v7 (stack + bottom tabs)
  hooks/        useSession, useGoogleEvents(월별 메모리 캐시), useDayData
  lib/          비즈니스 로직
    supabase.ts       클라이언트 + DB 타입
    auth.ts           구글 OAuth 로그인 (Supabase Auth + expo-web-browser)
    googleTokens.ts   구글 access token 캐시/갱신
    googleCalendar.ts 구글 Calendar REST API
    events.ts / tasks.ts / diary.ts  CRUD
    dateUtils.ts / eventMerge.ts     순수 로직 (단위 테스트 대상)
  theme/tokens.ts     디자인 토큰 (색/폰트/간격 — 하드코딩 금지)
supabase/
  migrations/0001_init.sql              스키마 + RLS + Storage 정책
  functions/google-token-refresh/       구글 토큰 갱신 Edge Function
```

## 동작 방식 메모

- **구글 동기화**: 보이는 달 ±1개월을 열람 시 fetch, 월별 메모리 캐시.
  DB에 캐시하지 않음. 앱→구글 등록은 best-effort (실패해도 로컬 저장 유지).
- **구글 refresh token**: `google_tokens` 테이블에 저장하되 RLS로 클라이언트 읽기 차단.
  갱신은 Edge Function(`google-token-refresh`)이 service role로 처리 —
  client secret은 Supabase secrets에만 존재.
- **일기 사진**: 비공개 버킷 `diary-photos`, 경로 `{user_id}/{diary_id}/{uuid}.jpg`,
  표시는 signed URL(1시간).

## 알려진 한계 (MVP)

- 구글 일정은 읽기 전용으로 표시 (앱에서 수정 불가)
- 반복 일정은 시리즈 단위 편집만 가능 (개별 회차 수정 불가).
  종료일이 지난 반복 알림은 자동으로 멈추지 않음 — 일정을 삭제하거나 알림을 꺼야 함
- 오프라인 캐시, 다중 캘린더, 홈 위젯 미지원
- Expo Go 개발 실행 기준. App Store 배포는 Apple 개발자 계정 필요
