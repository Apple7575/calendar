# 공통 디자인 기준

2026-11-03 `feature/design-system`. 값의 원본은 `src/theme/tokens.ts`, `src/theme/roles.ts`, 컴포넌트의 원본은 `src/features/routine/ui.tsx`다. 이 문서는 고르는 기준과 담당자 전달 사항만 적는다.

## 방향

**따뜻한 친구들, 또렷한 한 가지 행동.** 동물과 무대의 따뜻한 색은 유지하고, 나머지는 파랑 하나와 중립색으로 조용하게 둔다. 채워진 파란 버튼을 보면 "지금 이걸 누르면 된다"고 알 수 있게 한다.

화면마다 먼저 답할 질문: 지금 어떤 상태인가 → 지금 무엇을 하면 되는가 → 누르면 무엇이 일어나는가.

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
| `title` | 24/32 800 | 화면 제목, 첫 행동 |
| `heading` | 20/28 800 | 장면 제목 |
| `section` | 17/25 800 | 묶음 제목, 큰 버튼 |
| `body` | 15/23 500 | 본문, 문제·해설 |
| `label` | 15/23 700 | 행 제목, 작은 버튼 |
| `caption` | 13/20 500 | 보조 설명. 이보다 작게 쓰지 않는다 |

기존 `Copy size={n}`은 가까운 단계로 자동으로 맞춰진다. 27 이상은 타이머·수치용이라 그대로 둔다. 설명을 줄이려고 글자를 줄이거나 문장을 자르지 않는다.

- 화면 좌우 여백은 `gutter`(16). 헤더·본문·하단 행동이 같은 값을 쓴다.
- 간격은 `space`(4·8·12·16·20·24·32). 묶음 안 8~12, 카드 안 12~16, 묶음 사이 16~24.
- 모서리는 `radii`: `chip` 12, `control` 16(버튼·입력창), `card` 20, `stage` 28(학습 카드·캐릭터 무대).
- 버튼 높이는 `control`: `large` 56, `compact` 48. 눌리는 것은 어느 방향이든 44 이상.
- 카드는 테두리 1px로 구분하고 그림자를 쓰지 않는다. 떠 있는 것에만 그림자를 쓴다.
- 한글 제목 줄바꿈은 `koreanTitle`을 쓴다. 공백 없는 일본어 문장에는 쓰지 않는다. 줄이 안 바뀌어 넘친다.

## 컴포넌트

```tsx
import {Action,Choice,CardView,Copy,EmptyState,Field,Link,LoadingState,NavCard,Notice,Page} from './ui';

<Action label="노트 사진 찍기" icon="camera" onPress={take}/>          // 기본: 다음 행동 하나
<Action secondary compact label="큰 타이머로 돌아가기" onPress={back}/>   // 보조
<Action variant="danger" label="단어장 삭제" onPress={confirmDelete}/>   // 위험. 결과를 문장으로 함께 쓴다
<Action loading={busy} label="저장" onPress={save}/>                    // 진행 중에는 눌리지 않는다
<Link label="이전 기록 보기" onPress={open}/>                           // 글자 버튼: 이동·열기
<Link muted label="나중에 할게요" onPress={skip}/>                       // 글자 버튼: 물러나기

<CardView><Copy variant="section">제목</Copy><Copy>설명</Copy></CardView> // 정보 카드: 눌리지 않음
<NavCard title="JLPT N2 단어장" subtitle="1774장 · 학습 중" onPress={open}/> // 이동 카드: 전체가 눌림
<MenuRow title="백업·복구" subtitle="마지막 백업" icon="cloud-upload-outline" onPress={open}/> // 카드 안의 목록 행
<Choice label="수학" selected={subject==='수학'} onPress={()=>setSubject('수학')}/> // 선택 항목
<Segments value={tab} onChange={setTab} items={items}/>                  // 화면 안 보기 전환

<Field label="공부 주제" value={v} onChangeText={setV} helper="저장하면 +5분" error={err}/>

<Notice tone="error" actionLabel="다시 시도" onAction={retry}>사진을 읽지 못했어요. 인터넷 연결을 확인해 주세요.</Notice>
<EmptyState title="아직 단어장이 없어요" description="컴퓨터에서 준비한 단어장을 받아요." actionLabel="단어장 가져오기" onAction={open}/>
<LoadingState label="일정 확인 중…"/>
```

`PriorityButton`, `PriorityField`, `PrimaryButton`은 예전 이름으로 남겨 두었고 내부는 `Action`·`Field`다. 새 코드는 바로 `Action`·`Field`를 쓴다.

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

`Page`에 `right={<Link label="닫기"…/>}`(닫기·나가기·중단)를 주면 뒤로 화살표는 자동으로 숨겨진다. 화면마다 나가는 길은 하나다.

## 담당자 전달 사항

이번 브랜치에서 아래 파일은 수정하지 않았다. 공통 컴포넌트 변경은 자동으로 반영된다. 아래는 해당 담당자가 직접 적용할 항목이다.

### 집중 학습 (feature/focus-ux, 8123)

기준 커밋 `f67ed45`. 타이머 세로 상단 깨짐과 `EarnedRewardScreen` 타일 색은 이 커밋에서 해결됐다.

- `StudyHomeScreen`: 집중 쪽은 채워진 버튼이 하나로 정리됐다. 단어 쪽은 `오늘의 일본어 시작`과 `오늘 학습 시작`이 아직 함께 채워져 있다. 덱 칩은 `Choice`로 바꾼다.
- `FocusRampStart`: 공부 주제 칩(높이 40px)은 `Choice`, 입력창 2개는 `Field`로 바꾼다.
- `HandwritingStudy`: 오류는 `Notice tone="error"`로 바꾼다.
- 타이머 가로 화면: 상단 버튼과 `일시정지` 버튼 사이에 간격이 없다.
- `scripts/check-action-flow-ui.cjs`: develop과 충돌한다. 이 브랜치와 무관하며 develop과 `f67ed45`만 합쳐도 난다. 자체 포트 변수 대신 develop의 `previewUrl`을 쓰는 쪽으로 정리한다.
- `scripts/check-priority-first-web.cjs`: focus-ux에서 `다음 시작 위치 남기기`를 찾지 못해 시간 초과된다. 단독 상태에서도 같다. 이 스크립트와 `check-priority-ui-layout.cjs`는 `PREVIEW_PORT`를 읽는다.

### 단어장·일본어 학습 (feature/vocabulary, 8092)

- `StudyCard` 터치 영역 44px: feature/vocabulary `a0ac614`에 반영됐다(미병합). 임시 병합에서 플래시카드 앞·뒷면의 44px 미만 항목 0건을 확인했다.
- `JapaneseSampleScreen`의 막힌 이유 3칸은 사용자 결정에 따라 누르면 바로 저장하고 다음 문제로 넘어가는 실행 버튼이다. 선택 상태가 없으므로 `Choice`로 옮기지 않는다. 일반 버튼 컴포넌트로 바꾸더라도 가로 3칸은 유지한다. 새 상황의 표현 5개는 선택 항목이므로 `Choice` 대상이다.
- 덱 목록의 눌리는 카드를 `NavCard`로 바꾼다. 지금도 모양은 비슷하지만 별도 구현이다.
- `DeckCardsScreen`의 입력창 4개는 `Field`로 바꾼다.
- `JapaneseSampleScreen`: 선택지와 입력은 `Choice`·`Field`, 문제·상황·해설 문장은 `Copy variant="body"`로 둔다. 문장을 줄이지 않는다. 일본어 문장에 `koreanTitle`을 쓰지 않는다.

### 친구들 (feature/friends-ux, 8093)

- 담당자 회신(2026-11-03): 적용은 이 브랜치가 develop에 병합된 뒤로 미룬다. 사용자가 친구들 탭을 목표 탭으로 바꾸는 안을 검토 중이므로, `BoriHomeScreen` 작업은 탭 유지가 결정된 경우에만 한다. 기준 화면은 develop이 아니라 feature/friends-ux의 구성이다.
- `AnimalCharacterPicker`는 설정에서도 쓰므로 탭 결정과 무관하게 남는다. 역할 라벨은 `Copy`가 아닌 직접 지정한 10px라 글자 단계가 자동 적용되지 않는다.
- 라벨 크기는 PM 조율 대상이다. 웹에서 값만 바꿔 잰 결과, 12px은 360·390px에서 모두 한 줄이고 네 칸 타일 높이가 112px이다. 13px은 360px에서 `집중 · 운동`, `저녁 · 일기`가 두 줄이 되어 타일이 110px에서 128px로 커진다. 13px 기준을 지키려면 타일 안쪽 여백이나 문구도 함께 조정해야 하며, 이 조합은 아직 측정하지 않았다.
- 320px에서 타일이 3+1로 나뉘는 것은 기존 동작이다. 라벨 크기와 무관하게 난다.

### PM·통합

- `RoutineSetupScreen`, `MoneyWalletScreen`, `HabitOrderSettingsScreen`, `AdditionalStudyChooser`, `screens/*`의 기존 도구는 입력창·색이 아직 개별 구현이다. 범위를 정해 주면 이어서 옮긴다.
- 병합 순서: 이 브랜치의 공통 변경을 먼저 합치면 각 담당자는 새 컴포넌트를 바로 쓸 수 있다.

## 검증 방법

```powershell
$env:PREVIEW_PORT = '8094'
node scripts/check-design-system-web.cjs after
```

20개 화면을 360·390px로 찍어 `.expo/design-system/<이름>`에 저장하고 터치 영역·가로 넘침을 측정한다. 웹 미리보기 검사이며 실제 iPhone의 키보드·안전 영역·햅틱·BlurView 동작을 확인하지 않는다. `CI=1`로 서버를 띄우면 Metro가 파일 변경을 감시하지 않아 이전 코드를 측정하게 되므로 쓰지 않는다.
