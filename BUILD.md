# TestFlight 빌드 가이드 — 터미널 없이 쓰는 앱 만들기

Apple 개발자 계정이 있으면 EAS(Expo 클라우드 빌드)로 앱을 빌드해서
**TestFlight로 아이폰에 설치**할 수 있습니다. 설치 후에는 Metro/터미널 없이
일반 앱처럼 실행됩니다.

빌드는 Expo 클라우드에서 되므로 **Mac이 없어도(Windows에서도) 가능합니다.**

## 0. 준비물

- Apple 개발자 계정 (Apple Developer Program 가입 완료)
- Expo 계정 — https://expo.dev 에서 무료 가입

## 1. 딱 한 번만 하면 되는 설정

이 폴더(calendar-app)에서:

```bash
npx eas-cli login          # Expo 계정 로그인
npx eas-cli build --platform ios --profile production
```

빌드 명령을 처음 실행하면 물어보는 것들:
- **EAS 프로젝트 생성** → Yes
- **Apple 계정 로그인** → Apple ID/비밀번호 (2단계 인증 코드 입력)
- **번들 ID 등록 / 인증서·프로비저닝 생성** → 전부 Yes (EAS가 자동 처리)

이후 클라우드에서 빌드가 돌아갑니다 (15~25분). 터미널을 닫아도 되고,
진행 상황은 expo.dev 대시보드에서 볼 수 있습니다.

## 2. TestFlight에 올리기

빌드가 끝나면:

```bash
npx eas-cli submit --platform ios --latest
```

- App Store Connect에 앱이 없으면 **자동으로 만들어 줍니다** (Yes 선택)
- 업로드 후 10~30분 뒤 App Store Connect → TestFlight에 빌드가 나타남
- **TestFlight → 내부 테스트 → 테스터에 본인 Apple ID 추가**

아이폰에서:
1. App Store에서 **TestFlight** 앱 설치
2. 초대 메일 수락 → 앱 설치
3. 끝! 이제 홈 화면에서 바로 실행 (터미널 불필요)

## 3. ⚠️ 구글 로그인용 설정 추가 (중요)

설치된 앱은 Expo Go가 아니라 자체 앱이라 리다이렉트 주소가 바뀝니다.
**Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs**에 추가:

```
calendarapp://**
```

(기존 `exp://**`는 Expo Go 개발용으로 그대로 둬도 됩니다.)

## 4. 이후 코드가 바뀌었을 때 업데이트하는 법

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

두 명령이면 새 버전이 TestFlight에 올라가고, 아이폰 TestFlight 앱에서
"업데이트"를 누르면 됩니다. (버전 번호는 자동 증가)

> 💡 더 편하게: `npx eas-cli update:configure`로 **EAS Update(OTA)**를 설정하면
> JS 코드 변경은 빌드 없이 `npx eas-cli update` 한 번으로 배포되고,
> 앱을 껐다 켜면 자동 반영됩니다. 네이티브 모듈 추가 시에만 재빌드가 필요해요.

## 5. TestFlight의 알아둘 점

- TestFlight 빌드는 90일 유효 — 90일에 한 번은 새 빌드를 올려야 합니다
  (EAS Update를 쓰면 빌드 자체는 거의 안 바뀌니 재빌드+재제출만 하면 됨)
- 완전히 영구적으로 쓰려면 App Store 정식 출시(비공개 배포는 불가)나
  Ad Hoc 배포(기기 등록, 1년 유효)도 가능합니다
- 이제 개발 빌드가 생겼으니 **홈 화면 위젯** 같은 네이티브 기능도
  추가할 수 있는 길이 열렸습니다
- **HealthKit 수면 가져오기**는 TestFlight/개발 빌드에서만 동작합니다
  (Expo Go에서는 버튼이 숨겨짐). HealthKit이 추가된 뒤 처음 빌드할 때
  기능(entitlement)이 자동 등록됩니다

## 6. 홈 화면 위젯 (⚠️ 빌드 전에 Team ID 입력 필수)

위젯이 추가된 뒤 처음 빌드하기 전에 **Apple Team ID**를 넣어야 합니다:

1. https://developer.apple.com/account 접속 → **Membership details**에서
   **Team ID** 확인 (10자리 영숫자, 예: AB12CD34EF)
2. `app.json`의 `"appleTeamId": "REPLACE_WITH_APPLE_TEAM_ID"`를 실제 값으로 교체
3. 평소처럼 빌드 + 제출:
   ```bash
   npx eas-cli build --platform ios --profile production
   npx eas-cli submit --platform ios --latest
   ```
   위젯 확장 타겟의 서명/프로비저닝은 EAS가 자동 처리합니다
   (처음 빌드 시 위젯용 번들 ID `...mycalendar.widget` 등록을 물어보면 Yes)

설치 후 사용법: 홈 화면 길게 누르기 → 왼쪽 위 **+** (또는 편집) →
"나의 캘린더" 검색 → 위젯 추가.

- **오늘** 위젯(작게/중간): 오늘의 일정(색상 포함)·할 일·루틴 진행
- **월간 달력** 위젯(크게, 4×4): 이번 달 전체 그리드 + 일정 있는 날 점 + 오늘 강조
- **잠금 화면** 위젯: 잠금 화면 길게 누르기 → 사용자화 → 위젯 추가
  (직사각형: 다음 일정 / 원형: 할 일 진행률)
- 데이터는 앱을 열거나 일정/할일/루틴을 수정할 때 갱신되고,
  30분마다 iOS가 새로 그립니다

## 7. 카메라·사진 권한 (순간 찍기)

가운데 카메라 탭은 카메라/사진 보관함 권한을 처음 사용할 때 요청합니다.
`app.json`의 expo-camera / expo-media-library 플러그인이 권한 문구를 넣으므로,
이 기능이 추가된 뒤 **재빌드가 필요**합니다.
