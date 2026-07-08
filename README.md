# 나의 캘린더 (calendar-app)

구글 캘린더 연동 + 매일의 할 일/일기(사진 포함)를 한곳에서 관리하는 iPhone용 캘린더 앱.
React Native + Expo(SDK 57), Supabase(Auth/Postgres/Storage/Edge Functions) 기반.

## 기능

- **월간 캘린더**: 날짜별 dot 마커 (내 일정 / 구글 일정 / 할 일 / 일기)
- **구글 캘린더 연동**: 구글 로그인(OAuth) 후 구글 일정을 가져와 표시,
  앱에서 만든 일정을 구글 캘린더에도 등록 가능
- **할 일**: 날짜별 체크리스트
- **일기**: 날짜당 1개, 텍스트 + 사진 여러 장 (Supabase Storage)
- **오늘 탭**: 오늘의 일정/할 일/일기 요약

## 시작하기

처음이라면 **[SETUP.md](./SETUP.md)** 를 따라 Google Cloud / Supabase 설정부터 하세요.

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
- 반복 일정 생성/편집 불가 (구글의 반복 일정은 펼쳐져 표시됨)
- 알림/리마인더, 오프라인 캐시, 다중 캘린더 미지원
- Expo Go 개발 실행 기준. App Store 배포는 Apple 개발자 계정 필요
