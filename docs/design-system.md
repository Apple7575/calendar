# 공통 디자인 기준

2026-11-03 `feature/design-system`. 값의 원본은 `src/theme/tokens.ts`, `src/theme/roles.ts`, 컴포넌트의 원본은 `src/features/routine/ui.tsx`다. 이 문서는 고르는 기준과 담당자 전달 사항만 적는다.

## 방향

**검은 바탕의 연두, 또렷한 한 가지 행동, 곁에 있는 친구.** 2026-11-03 사용자 지시: "다크모드 일때는 검은색에 이 녹색으로 가자. 토스 디자인가이드 이런거 참고해서 ui ux올려줘. 우리 캐릭터도 잘 녹여주고."

- **기본 모드는 다크다.** 사용자 지시: "그냥 다크모드 라이트 모드로 변경 가능하게 해주고 기본은 다크모드로 하자." 설정의 `화면 모드`에서 라이트로 바꿀 수 있다. 집중 흐름은 고른 모드와 상관없이 다크다.
- **다크:** 배경 `#000000`, 카드 `#161616`, 주요 색 `#C4EA89`(타이머 연두). 집중 흐름도 같은 팔레트를 쓴다.
- **라이트:** 사용자 지시: "라이트 모드에서 진한 녹색으로 하자. 바탕 흰색도 완전 흰색 말고 살짝 웜톤 흰색 해줘." 바탕 `#F8F5EE`, 카드 `#FFFDF9`, 주요 색 `#3E6A2A`(노란 기운의 숲색). 글자·테두리 회색도 웜톤이다. 설정의 테마 선택은 유지한다. 연두는 밝은 바탕에서 대비가 낮아 라이트의 글자·아이콘 색으로 쓰지 않는다.
- **연두 위 글자는 검은색:** 대비 15.48:1. 흰 글자는 1.36:1이라 금지.

### 캐릭터

- 화면의 주인공 하나에만 쓴다. 상자에 가두지 않고 다음 행동 가까이에 둔다.
- `CharacterPeek`: 화면의 주인공 친구는 이것 하나로 그린다. 크기 기준은 `tokens.ts`의 `character`(폭의 1.3배, 최대 380)이고, 배경 없이 몸 아래쪽이 다음 카드 뒤로 들어간다. 오늘·학습·목표 탭이 같이 쓴다. 사용자 지시로 방 배경을 넣지 않는다.
- `EmptyState peek`: 빈 상태도 같은 크기의 친구와 카드로 그린다.
- 완료 표시: 오늘 탭의 루틴·학습은 완료하면 칸이 연한 주요 색으로 바뀌고 체크가 나오며, 위쪽 막대와 숫자가 함께 찬다. 완료 판단은 기존 기록을 읽기만 하고 보상을 새로 만들지 않는다.
- 동물 4종과 실제 Lottie를 유지하고, 새 친밀도나 보상을 만들지 않는다. 다크에서는 밝은 방 배경을 그리지 않는다.

### 토스에서 참고한 것

조작과 위계만 참고한다. 로고, 전용 폰트, 고유 화면은 쓰지 않는다.

- [TDS 타이포그래피](https://tossmini-docs.toss.im/tds-mobile/foundation/typography/): 17은 일반 본문, 15는 작은 본문, 13은 "안 읽어도 됨" 등급이다. 그래서 꼭 읽어야 할 문장은 `lead`(17) 또는 `body`(15)로 쓰고, 13에 넣지 않는다.
- [TDS 색상](https://tossmini-docs.toss.im/tds-mobile/foundation/colors/): 회색 배경 위 흰 면처럼 면의 단계로 구분한다는 구성을 참고했다. 이 문서는 다크 모드를 다루지 않아 다크 값은 이 앱의 결정이다.
- [앱인토스 UX 가이드](https://developers-apps-in-toss.toss.im/landing-page/landing-page-en/design/consumer-ux-guide): 해요체, 능동·긍정 문장, 라벨만 봐도 다음 일을 알 수 있는 버튼, 설명을 반복하지 않는 버튼, 항상 있는 나가는 길, 화면당 꼭 필요한 그래픽 하나.

## 색의 의미

색 값이 아니라 역할을 고른다. `colorRoles(useTheme())`는 현재 테마에서 값을 계산하므로 다크·집중 테마에서도 그대로 쓴다.

| 역할 | 쓰는 곳 | 쓰지 않는 곳 |
|---|---|---|
| `primary` | 영역의 다음 행동 하나, 선택됨, 이동 글자 | 장식, 여러 버튼 동시 사용 |
| `secondary` | 함께 놓이는 다른 선택 | 다음 행동 |
| `danger` | 삭제·초기화, 오류 | 단순 경고 |
| `success` | 완료 | 일반 강조 |
| `warning` | 확인이 필요한 조건 | 오류 |
| `info` | 일반 안내 | 행동 유도 |

## 글자·간격·형태

| 글자 역할 | 크기/줄 간격 | 용도 |
|---|---|---|
| `title` | 24/33 800 | 화면 제목, 첫 행동 |
| `heading` | 20/29 800 | 장면 제목 |
| `section` | 17/25 800 | 묶음 제목, 큰 버튼 |
| `lead` | 17/26 500 | 꼭 읽어야 하는 문장: 문제·상황·해설·안내 |
| `body` | 15/23 500 | 일반 본문 |
| `label` | 15/23 700 | 행 제목, 작은 버튼 |
| `caption` | 13/20 500 | 건너뛰어도 되는 보조 정보. 이보다 작게 쓰지 않는다 |

기존 `Copy size={n}`은 가까운 단계로 자동으로 맞춰진다. 27 이상은 타이머·수치용이라 그대로 둔다. 설명을 줄이려고 글자를 줄이거나 문장을 자르지 않는다.

- 화면 좌우 여백은 `gutter`(16). 헤더·본문·하단 행동이 같은 값을 쓴다.
- 간격은 `space`(4·8·12·16·20·24·32). 묶음 안 8~12, 카드 안 12~16, 묶음 사이 16~24.
- 모서리는 `radii`: `chip` 12, `control` 16(버튼·입력창), `card` 20, `stage` 28(학습 카드·캐릭터 무대).
- 버튼 높이는 `control`: `large` 56, `compact` 48. 눌리는 것은 어느 방향이든 44 이상.
- 면은 배경과 카드의 색 단계로 구분한다. 카드 테두리와 목록 구분선을 쓰지 않는다. 테두리는 보조 버튼과 입력창에만 쓰고, 그림자는 떠 있는 것에만 쓴다.
- 버튼은 납작하게 둔다. 입체 하단선을 쓰지 않고, 채운 색으로 위계를 나눈다.
- 한글 제목 줄바꿈은 `koreanTitle`을 쓴다. 공백 없는 일본어 문장에는 쓰지 않는다. 줄이 안 바뀌어 넘친다.

## 컴포넌트

```tsx
import {Action,Choice,CardView,Copy,EmptyState,Field,Link,LoadingState,NavCard,Notice,Page} from './ui';

<Action label="노트 사진 찍기" icon="camera" onPress={take}/>          // 기본: 다음 행동 하나
<Action secondary compact label="큰 타이머로 돌아가기" onPress={back}/>   // 보조
<Action variant="danger" label="단어장 삭제" onPress={confirmDelete}/>   // 위험. 결과를 문장으로 함께 쓴다
<Action loading={busy} label="저장" onPress={save}/>                    // 진행 중에는 눌리지 않는다
<IconAction large icon="pause" label="타이머 멈추기" onPress={pause}/>   // 재생·멈춤은 아이콘으로. 글자는 스크린리더용
<Link label="이전 기록 보기" onPress={open}/>                           // 글자 버튼: 이동·열기
<Link muted label="나중에 할게요" onPress={skip}/>                       // 글자 버튼: 물러나기

<CardView><Copy variant="section">제목</Copy><Copy>설명</Copy></CardView> // 정보 카드: 눌리지 않음
<NavCard title="JLPT N2 단어장" subtitle="1774장 · 학습 중" onPress={open}/> // 이동 카드: 전체가 눌림
<MenuRow title="백업·복구" subtitle="마지막 백업" icon="cloud-upload-outline" onPress={open}/> // 카드 안의 목록 행
<Choice label="수학" selected={subject==='수학'} onPress={()=>setSubject('수학')}/> // 선택 항목
<Segments value={tab} onChange={setTab} items={items}/>                  // 화면 안 보기 전환

<Choice labelVariant="lead" fill label={표현} selected={picked} onPress={pick}/>   // 학습 내용을 고르는 선택지. 기본은 짧은 칩용 13px
<Field label="공부 주제" value={v} onChangeText={setV} helper="저장하면 +5분" error={err}/>
<Field label="메모" multiline minHeight={72} value={v} onChangeText={setV}/>  // 짧은 값은 한 줄 입력이 우선, 필요할 때만 높이 조절

<Notice tone="error" actionLabel="다시 시도" onAction={retry}>사진을 읽지 못했어요. 인터넷 연결을 확인해 주세요.</Notice>
<EmptyState title="아직 단어장이 없어요" description="컴퓨터에서 준비한 단어장을 받아요." actionLabel="단어장 가져오기" onAction={open}/>
<LoadingState label="일정 확인 중…"/>
```

- 이름표는 입력창 위에 둔다. 플레이스홀더를 이름표 대신 쓰지 않는다. 예외: 검색창은 접근성 라벨과 플레이스홀더만 쓸 수 있다(사용자의 화면 정리 지시, PM 허용).
- 웹의 선택 상태: react-native-web 0.21은 `accessibilityState`를 DOM으로 옮기지 않는다. 공통 컴포넌트는 `aria-*`도 함께 준다(`Choice`는 `aria-pressed`, 탭은 `aria-selected`, `Action`은 `aria-busy`). 공통 컴포넌트 밖의 직접 만든 `Pressable`에도 같은 처리가 필요하다.

`PriorityButton`, `PriorityField`, `PrimaryButton`은 예전 이름으로 남겨 두었고 내부는 `Action`·`Field`다. 새 코드는 바로 `Action`·`Field`를 쓴다.

## 타이머

- 집중과 루틴은 `TimerFace` 원형 시계를 함께 쓴다.
- 멈춤·재생은 아이콘이다. `휴식 시작`처럼 뜻이 복잡한 조작은 글자로 둔다.
- 시간 초과는 화면 전체를 뒤집는다(사용자 지시). 연두 `#C4EA89` 바탕에 검은 글자이고 대비는 15.48:1이다. 값은 `overtimeTheme`, 판단은 `focusClockInverted`와 루틴의 `left<=0`이다. 표시만 바꾸며 보상과 완료는 그대로다.

## 키보드

`Page`의 스크롤 영역은 iOS에서 키보드만큼 여백을 자동으로 받는다. `Field`는 포커스와 줄 추가 때 칸 전체가 키보드 위에 보이도록 화면을 올린다. 그래서 새 입력창은 직접 만든 `TextInput` 대신 `Field`를 쓴다. `KeyboardAvoidingView`로 감싼 화면은 `Page keyboardInsets={false}`로 여백이 겹치지 않게 한다.

## 상태 표시

- 비활성: 불투명도 0.5. 왜 안 되는지 옆이나 아래에 문장으로 적는다.
- 진행 중: `Action loading` 또는 `LoadingState`. 무엇을 기다리는지 적는다.
- 빈 상태: `EmptyState`. 내용이 나타날 자리에 이유와 첫 행동을 둔다.
- 오류: `Notice tone="error"`. 일어난 자리에서 무슨 일인지와 다음 행동을 적는다. `<Copy>{error}</Copy>`를 새로 쓰지 않는다.

## 나가기·저장·다음

| 행동 | 위치와 표현 |
|---|---|
| 탭 첫 화면 | 왼쪽 비움, 오른쪽 프로필 |
| 들어온 화면 | 왼쪽 `←` 하나 |
| 몰입 흐름(학습 세션·제출 등) | 오른쪽 `닫기` 글자 하나 |
| 저장·다음 | 내용 아래 또는 `Page footer`의 기본 버튼 |
| 집중 타이머 | 자체 헤더 유지. 가로 배치에서 시계와 버튼을 나누는 구성을 유지 |

`Page`에 `right={<Link label="닫기"…/>}`(닫기·나가기·중단)를 주면 뒤로 화살표는 자동으로 숨겨진다. 화면마다 나가는 길은 하나다. 그 링크가 `disabled`이면 나갈 길이 없어지므로 화살표를 남긴다.

뒤로와 오른쪽 행동의 목적지가 달랐던 화면(다른 화면은 둘 다 `goBack`이라 달라지는 것이 없다):

| 화면 | 오른쪽 행동의 목적지 | 뒤로의 목적지(이전) | 지금 |
|---|---|---|---|
| `ConceptGenerationScreen` | 닫기 → 문법·독해·청해 첫 화면, 생성 중 비활성 | 학습 첫 화면 밖으로 | 평소 2단계로 도달, 생성 중에는 `←` 유지 |
| `ConceptLabBriefPreview` | 닫기 → 같은 첫 화면 | 같은 첫 화면 밖으로 | 2단계로 도달 |
| `ConceptLabSession` | 중단 → 같은 첫 화면 | 같은 첫 화면 밖으로 | 2단계로 도달 |
| `BookStudyScreen` | 닫기 → 우선순위 집중 중이면 `PriorityPause`, 아니면 `goBack` | 언제나 `goBack` | 우선순위 집중 중에는 `PriorityPause`를 거친다 |

## 담당자 전달 사항

이번 브랜치에서 아래 파일은 수정하지 않았다. 공통 컴포넌트 변경은 자동으로 반영된다. 아래는 해당 담당자가 직접 적용할 항목이다.

### 집중 학습 (feature/focus-ux, 8123)

기준 커밋 `4b8bc14`. 타이머 세로 상단 깨짐, 가로 간격, 주제 칩 높이, `EarnedRewardScreen` 타일 색, 검사 스크립트 충돌과 실패는 해결됐다. 이 브랜치와 임시 병합해 검사 3종이 통과했다.

- `StudyHomeScreen`: 집중 쪽은 채워진 버튼이 하나로 정리됐다. 단어 쪽은 `오늘의 일본어 시작`과 `오늘 학습 시작`이 아직 함께 채워져 있다. 덱 칩은 `Choice`로 바꾼다.
- `FocusRampStart`: 공부 주제 칩은 `Choice`, 입력창 2개는 `Field`로 바꾼다.
- `HandwritingStudy`: 오류는 `Notice tone="error"`로 바꾼다.

### 단어장·일본어 학습 (feature/vocabulary, 8092)

- `StudyCard` 터치 영역 44px: feature/vocabulary `a0ac614`에 반영됐다(미병합). 임시 병합에서 플래시카드 앞·뒷면의 44px 미만 항목 0건을 확인했다.
- `JapaneseSampleScreen`의 막힌 이유 3칸은 사용자 결정에 따라 누르면 바로 저장하고 다음 문제로 넘어가는 실행 버튼이다. 선택 상태가 없으므로 `Choice`로 옮기지 않는다. 일반 버튼 컴포넌트로 바꾸더라도 가로 3칸은 유지한다. 새 상황의 표현 5개는 선택 항목이므로 `Choice` 대상이다.
- 덱 목록의 눌리는 카드를 `NavCard`로 바꾼다. 지금도 모양은 비슷하지만 별도 구현이다.
- `DeckCardsScreen`의 입력창 4개는 `Field`로 바꾼다.
- `JapaneseSampleScreen`: 선택지와 입력은 `Choice`·`Field`, 문제·상황·해설 문장은 `Copy variant="body"`로 둔다. 문장을 줄이지 않는다. 일본어 문장에 `koreanTitle`을 쓰지 않는다.

### 목표 탭 (feature/goal-tab, 8093)

- 친구들 탭은 목표 탭으로 대체됐다. `BoriHomeScreen`은 삭제됐고 검수 대상이 아니다.
- 병합 후 캐릭터는 `CharacterPeek`이나 `EmptyState peek`, 꼭 읽을 문장은 `Copy variant="lead"`를 검토한다.
- `AnimalCharacterPicker` 역할 라벨: PM 보류 해제에 따라 13/20으로 올리고 타일 좌우 여백을 2로 줄였다. 문구는 그대로이고 360·375·390px에서 한 줄, 잘림 없음, 타일 높이 116px이다. 320px에서 타일이 3+1로 나뉘는 것은 기존 동작이다.

### PM·통합

- `RoutineSetupScreen`, `MoneyWalletScreen`, `HabitOrderSettingsScreen`, `AdditionalStudyChooser`, `screens/*`의 기존 도구는 입력창·색이 아직 개별 구현이다. 범위를 정해 주면 이어서 옮긴다.
- 병합 순서: 이 브랜치의 공통 변경을 먼저 합치면 각 담당자는 새 컴포넌트를 바로 쓸 수 있다.

## 검증 방법

```powershell
$env:PREVIEW_PORT = '8094'
node scripts/check-design-system-web.cjs after
```

`PREVIEW_PORT`를 지정하지 않으면 검사 스크립트는 PM 서버(8082)로 간다. 실행 전에 자기 포트를 지정한다.

20개 화면을 360·390px로 찍어 `.expo/design-system/<이름>`에 저장하고 터치 영역·가로 넘침을 측정한다. 웹 미리보기 검사이며 실제 iPhone의 키보드·안전 영역·햅틱·BlurView 동작을 확인하지 않는다. `CI=1`로 서버를 띄우면 Metro가 파일 변경을 감시하지 않아 이전 코드를 측정하게 되므로 쓰지 않는다.
