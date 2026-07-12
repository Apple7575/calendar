# 설정 가이드 (처음 한 번만)

앱을 실행하려면 **Google Cloud**와 **Supabase**에서 각각 무료 설정이 필요합니다.
아래 순서대로 따라 하면 됩니다. (약 20~30분)

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 가입 → **New project** (무료 플랜이면 충분)
2. 프로젝트가 만들어지면 **Project Settings → API**에서 아래 두 값을 복사해 둡니다.
   - `Project URL` (예: `https://abcdefgh.supabase.co`)
   - `anon public` 키
3. 프로젝트 참조 ID(위 URL의 `abcdefgh` 부분)를 기억해 두세요. 아래에서 `<프로젝트ref>`로 씁니다.

## 2. Google Cloud 설정

1. https://console.cloud.google.com → 새 프로젝트 생성
2. **API 및 서비스 → 라이브러리**에서 **Google Calendar API** 검색 → **사용 설정**
3. **API 및 서비스 → OAuth 동의 화면**
   - User Type: **외부(External)** → 만들기
   - 앱 이름 등 필수 항목 입력
   - **테스트 사용자**에 본인 Gmail 주소 추가 (게시하지 않는 한 테스트 사용자만 로그인 가능)
   - 범위(Scopes)는 따로 추가하지 않아도 됩니다 (앱이 로그인 시 요청)
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션** (중요! iOS 아님)
   - 승인된 리디렉션 URI에 추가:
     ```
     https://<프로젝트ref>.supabase.co/auth/v1/callback
     ```
   - 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호(secret)** 복사

## 3. Supabase에 구글 로그인 연결

1. Supabase 대시보드 → **Authentication → Sign In / Providers → Google**
   - Enable 켜기
   - 위에서 복사한 **Client ID / Client Secret** 입력 → 저장
2. **Authentication → URL Configuration → Redirect URLs**에 추가:
   ```
   exp://**
   ```
   (Expo Go 개발용. 나중에 정식 빌드를 만들면 `calendarapp://**`도 추가)

## 4. 데이터베이스 스키마 적용

1. Supabase 대시보드 → **SQL Editor**
2. 이 레포의 `supabase/migrations/` 폴더의 SQL을 **순서대로** 붙여넣고 **Run**:
   1. `0001_init.sql` — 테이블(events/tasks/diaries/diary_photos/google_tokens),
      RLS 정책, `diary-photos` 비공개 Storage 버킷과 정책
   2. `0002_features.sql` — 기분 기록, 반복 일정, 알림 컬럼
   3. `0003_routines_reports.sql` — 루틴, AI 리포트 캐시
   4. `0004_mood_report.sql` — 기분 트렌드 리포트 타입
   5. `0005_diary_fields.sql` — 오늘의 한 줄/에너지/수면/사람/감사
   6. `0006_event_color.sql` — 일정 색상
   7. `0007_photolog_lang.sql` — 사진 촬영시각/좋아요/원본 보관, 일기 번역 캐시, 표현 카드
   8. `0008_location_dday.sql` — 사진 위치(장소명), D-day/기념일
   9. `0009_day_highlights.sql` — 날짜 꾸미기(내장 스티커 + 내 이미지 스티커)
   10. `0010_decoration_combo.sql` — 사진+스티커 동시 사용, 기념일 외곽선 색
   11. `0011_quarterly_report.sql` — 분기 리포트 타입
   12. `0012_goals_coach.sql` — 방면별 목표, 갓생 코칭 리포트 타입
   13. `0013_life_records.sql` — 생활 기록(식단·몸무게 등), 인생 타임라인, 목표 진전
   14. `0014_timeline_month_cover.sql` — 타임라인 월, 일기 대표사진
   15. `0015_monthtop_workouts.sql` — 이달의 TOP 5 사진, 운동 종목/기록
   16. `0016_meals_avoid.sql` — 식단(끼니별 사진·칼로리), 하지 않기

## 5. Edge Function 배포 (구글 토큰 갱신용)

PC에서 [Supabase CLI](https://supabase.com/docs/guides/cli) 설치 후, 이 폴더(calendar-app)에서:

```bash
npx supabase login
npx supabase link --project-ref <프로젝트ref>
npx supabase secrets set GOOGLE_CLIENT_ID=<클라이언트ID> GOOGLE_CLIENT_SECRET=<클라이언트secret>
npx supabase functions deploy google-token-refresh
```

## 5-1. AI 기능 설정 (OpenAI API 키)

AI 리포트(하루/주간/월간/연간/기분), 자연어 일정 등록, 아침 브리핑,
일기 회고 질문, 일기 번역(한/영/일)·첨삭·표현 카드는 OpenAI API를 사용합니다.

> 이미 배포한 적이 있다면, 일기 번역 기능을 위해 `ai-helper`를 **다시 배포**해야 합니다.

1. https://platform.openai.com 에서 **API Keys** 발급 (사용한 만큼 과금 —
   가벼운 기능은 gpt-5-mini, 긴 리포트는 gpt-5를 쓰며 개인용 기준 1회 수십 원 이하)
2. 이 폴더에서:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=<발급받은 키>
   npx supabase functions deploy ai-report
   npx supabase functions deploy ai-helper
   npx supabase functions deploy transcribe
   ```
키는 서버(Edge Function)에만 저장되고 앱에는 들어가지 않습니다.
AI 기능을 안 쓸 거면 건너뛰어도 됩니다 — AI 화면에서만 오류가 표시되고
브리핑 카드는 조용히 숨겨집니다.

## 6. 앱에 키 입력

`app.json`의 `extra` 부분을 실제 값으로 바꿉니다:

```json
"extra": {
  "supabaseUrl": "https://<프로젝트ref>.supabase.co",
  "supabaseAnonKey": "<anon public 키>"
}
```

## 7. 실행 (iPhone)

1. 아이폰에 App Store에서 **Expo Go** 설치
2. PC에서:
   ```bash
   npm install
   npx expo start --tunnel
   ```
   ⚠️ 반드시 `--tunnel` 옵션을 쓰세요. 일반(LAN) 모드는 리다이렉트 주소가
   `exp://192.168.x.x` 형태(IP)가 되는데, Supabase가 IP 주소 리다이렉트를 차단해서
   **구글 로그인이 실패**합니다. tunnel 모드면 `exp://xxx.exp.direct`라 문제없습니다.
3. 터미널의 QR 코드를 아이폰 카메라로 스캔 → Expo Go에서 앱 열림
4. **구글로 시작하기** → 구글 로그인 → 권한 동의
   - "확인되지 않은 앱" 경고가 나오면 **고급 → 이동**으로 진행 (테스트 사용자라 정상)

## 문제 해결

| 증상 | 원인/해결 |
|---|---|
| 구글 로그인 후 앱으로 안 돌아옴 | tunnel 모드인지 확인. Supabase Redirect URLs에 `exp://**` 있는지 확인 |
| "구글 캘린더가 연결되어 있지 않아요" | 설정 탭 → 구글 캘린더 다시 연결 (권한 동의 화면에서 캘린더 권한 체크) |
| 로그인 시 redirect_uri_mismatch | Google Cloud의 리디렉션 URI가 `https://<프로젝트ref>.supabase.co/auth/v1/callback`과 정확히 일치하는지 확인 |
| 일정/일기 저장 실패 | SQL(0001_init.sql)을 실행했는지, app.json 키가 맞는지 확인 |
| 사진 업로드 실패 | SQL의 Storage 정책 부분까지 실행됐는지 확인 (`diary-photos` 버킷) |
