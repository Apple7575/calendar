# 보리 성장 규칙 — 7일간의 작은 꾸준함

보리는 점수나 경쟁 순위가 아닌 사용자의 **실제 학습·루틴 활동**에 반응한다. 성장 단계는 해금 후 영구 유지되며 퇴화하거나 시들지 않는다.

| 단계 | 이름 | 해금 조건 | 외형 |
| --- | --- | --- | --- |
| 1 | 새싹 보리 (`sprout`) | 시작부터 | 두 잎의 기본 모습 |
| 2 | 봉오리 보리 (`growing`) | 최근 7일 중 의미 있는 활동일 **3일 이상** | 잎이 조금 커지고 작은 꽃봉오리 |
| 3 | 꽃 보리 (`blooming`) | 최근 7일 중 의미 있는 활동일 **5일 이상** + 다음 중 하나: 루틴 완료 3회 / 복습 50장 / 실제 집중 4시간 | 더 풍성한 잎과 작은 꽃 |

의미 있는 활동일 = 해당 날짜에 다음 중 **하나 이상** 충족한 날:

- 실제 집중 시간 합산 15분 이상
- FSRS 복습 카드 10장 이상
- 루틴 1개 이상 완료

활동은 하루 여러 건이어도 **활동일 1일**로만 계산한다. 7일 창은 오늘을 포함한 지난 7개 달력 날짜이며, 기기의 로컬 캘린더를 사용한다.

## 이벤트 연결

`BoriGrowthStore`는 사용자 기기에 성장 기록을 저장한다. 각각의 완료 이벤트에 *안정적인 고유 ID*를 전달하면 중복 호출이 합산되지 않는다.

- `growth.recordStudySession(id: sessionUUID, activeSeconds: elapsed)` : **종료된 세션**의 실제 활성 시간. 타이머 매초 호출하지 않는다.
- `growth.recordReviewSession(id: reviewUUID, cardsReviewed: count)` : 전체 복습 세션을 끝냈을 때 한 번 호출한다.
- `growth.recordRoutineCompletion(id: routineIDPlusDate)` : 루틴을 실제 완료할 때 한 번 호출한다.
- 위 메서드에서 새로운 단계가 반환되면 `bori.send(.growthUnlocked)`를 호출한다. 보리가 꽃봉오리/꽃을 톡 피우는 2.8초 애니메이션을 보여준다.
- 보리 뷰는 `bori_<stage>_<reaction>.json` 이름을 사용한다. `BoriReactiveMascotView(controller:growth:)`가 이 매핑을 자동 처리한다.

## 앱 화면 예시

```swift
@StateObject private var bori = BoriReactionController()
@StateObject private var growth = BoriGrowthStore()

var body: some View {
    BoriReactiveMascotView(controller: bori, growth: growth)
}

func onStudySessionFinished(id: String, activeSeconds: Int) {
    // Timer engine has already stopped and returns accumulated active seconds.
    let unlocked = growth.recordStudySession(id: id, activeSeconds: activeSeconds)
    bori.send(.studyEnded)
    if unlocked != nil { bori.send(.growthUnlocked) }
}

func onReviewFinished(id: String, cards: Int) {
    bori.send(.reviewCompleted(cardsReviewed: cards))
    if growth.recordReviewSession(id: id, cardsReviewed: cards) != nil {
        bori.send(.growthUnlocked) // The unlock animation takes priority.
    }
}

func onRoutineFinished(id: String) {
    bori.send(.routineCompleted)
    if growth.recordRoutineCompletion(id: id) != nil { bori.send(.growthUnlocked) }
}
```

## 데이터·접근성 정책

- 현재 로컬 저장소: `UserDefaults`, 스냅샷을 JSON으로 저장. 향후 앱의 로컬 DB/동기화와 통합 가능.
- 완료 이벤트 ID는 30일 동안 보관하며 중복 합산을 막는다. 최근 7일이 평가 대상이지만 30일 전까지 데이터는 중복 검증용으로 유지한다.
- `highestUnlocked`는 단조 증가, 미학습일·루틴 실패로 감소하지 않는다.
- iOS의 '동작 줄이기'가 켜지면 단계별 정적 PNG 표시.
- 기존 응원 쿨다운 및 우선순위는 유지한다. 성장 해금(40)이 복습 성공(30)보다 우선한다.
- 해금용 색·꽃은 시각적 보상이며 건강·학습 능력을 평가하거나 비교하는 등급이 아니다.

## 출시 전 확인

1. Xcode 타깃에 JSON 24개, Swift 소스 5개와 Asset Catalog 정적 PNG 3개를 추가한다.
2. XCTest 파일의 `YourAppModule`을 실제 앱 모듈 이름으로 바꾼다.
3. 기기에서 Lottie 재생, 단계 전환, 접근성 설정, 로컬 저장 복원, 중복 이벤트를 테스트한다.
4. 여러 기기에서 동일한 보리 성장 단계를 유지하려면 향후 기존 데이터 계층과 동기화한다.
