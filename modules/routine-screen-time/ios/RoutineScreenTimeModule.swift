import ExpoModulesCore
import FamilyControls
import DeviceActivity
import SwiftUI
import UIKit

public class RoutineScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RoutineScreenTime")

    AsyncFunction("enableRoutineMode") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.enableRoutineMode()
    }
    AsyncFunction("syncRewards") { (day: String, paid: [String: Int]) throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.syncRewards(day: day, paid: paid)
    }
    AsyncFunction("adjustStudyRewards") { (day: String, previous: [String: Int], target: [String: Int]) throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.adjustStudyRewards(day: day, previous: previous, target: target)
    }

    AsyncFunction("setPriorityGate") { (day: String, from: String, complete: Bool) throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeStorage.update { state in
        guard day == state.day else { return }
        guard from.isEmpty || from.range(of: "^\\d{4}-\\d{2}-\\d{2}$", options: .regularExpression) != nil else {
          throw ScreenTimeStorage.failure("첫 공부 시작 날짜를 확인해 주세요.")
        }
        state.priorityStartDay = from.isEmpty ? nil : from
        state.priorityComplete = complete
        if ScreenTimeStorage.priorityRequired(state) && !complete { state.usingRewards = false }
        ScreenTimeStorage.apply(state)
      }
    }
    AsyncFunction("startRewardUse") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.startRewardUse()
    }
    AsyncFunction("pauseRewardUse") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeStorage.update { state in state.usingRewards = false; ScreenTimeStorage.apply(state) }
    }
    AsyncFunction("setFocusWindow") { (until: Double) throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeStorage.update { state in
        guard until.isFinite, until >= 0, until <= Date().timeIntervalSince1970 * 1000 + 86401000 else {
          throw ScreenTimeStorage.failure("공부 종료 시각을 확인해 주세요.")
        }
        let changed = abs((state.focusUntil ?? 0) - until / 1000) > 0.1
        state.focusUntil = until / 1000
        if changed && until > Date().timeIntervalSince1970 * 1000 { state.usingRewards = false }
        ScreenTimeStorage.apply(state)
      }
    }

    AsyncFunction("getStatus") { () throws -> [String: Any] in
      guard #available(iOS 17.4, *) else { return ["supported": false] }
      return try ScreenTimeService.status()
    }
    AsyncFunction("requestAuthorization") { () async throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("selectApps") { (promise: Promise) in
      guard #available(iOS 17.4, *) else { promise.reject(self.unsupported()); return }
      do { try ScreenTimeService.presentPicker(promise: promise) }
      catch { promise.reject(error) }
    }.runOnQueue(.main)
    AsyncFunction("enable") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.enable()
    }
    AsyncFunction("completeMorning") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.completeMorning()
    }
    AsyncFunction("grantTestTime") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.grant()
    }
    AsyncFunction("disable") { () throws -> Void in
      guard #available(iOS 17.4, *) else { throw self.unsupported() }
      try ScreenTimeService.disable()
    }
  }

  private func unsupported() -> NSError {
    NSError(domain: "RoutineScreenTime", code: 2,
      userInfo: [NSLocalizedDescriptionKey: "이 테스트는 iOS 17.4 이상에서 사용할 수 있어요."])
  }
}

@available(iOS 17.4, *)
private enum ScreenTimeService {
  static let center = DeviceActivityCenter()

  static func enableRoutineMode() throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard !state.enabled else {
        if state.rewardMode == true { return }
        throw ScreenTimeStorage.failure("테스트 모드를 중단한 뒤 루틴을 연결해 주세요.")
      }
      guard !state.selection.applicationTokens.isEmpty || !state.selection.categoryTokens.isEmpty
        || !state.selection.webDomainTokens.isEmpty else {
        throw ScreenTimeStorage.failure("먼저 제한할 앱을 선택해 주세요.")
      }
      try center.startMonitoring(.init(ScreenTimeStorage.dailyActivity), during: schedule())
      state.rewardMode = true
      state.usingRewards = false
      state.enabled = true
      state.session = "\(ScreenTimeStorage.productionActivity).\(state.day)"
      state.granted = 0
      state.consumed = 0
      state.paid = [:]
      state.morningComplete = false
      ScreenTimeStorage.mark(&state, "루틴 연결 · 아침 루틴 대기")
      try ScreenTimeStorage.ensureProductionMonitoring(&state)
      ScreenTimeStorage.apply(state)
    }
  }

  static func syncRewards(day: String, paid: [String: Int]) throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard day == state.day, state.enabled, state.rewardMode == true else { return }
      let allowed = ["morning": [0, 5, 10], "gym": [0, 10, 30], "book": [0, 5, 10, 15, 20], "quick": [0, 2, 4], "order": [0, 60]]
      var ledger = state.paid ?? [:]
      let words = paid["words"] ?? 0
      guard words >= 0, words % 5 == 0 else { throw ScreenTimeStorage.failure("단어 보상 값을 확인해 주세요.") }
      ledger["words"] = max(ledger["words"] ?? 0, words)
      for (unit, values) in allowed {
        let value = paid[unit] ?? 0
        guard values.contains(value) else { throw ScreenTimeStorage.failure("보상 값이 올바르지 않아요.") }
        ledger[unit] = max(ledger[unit] ?? 0, value)
      }
      let extra = paid["extra"] ?? 0
      guard extra >= 0, extra % 5 == 0 else { throw ScreenTimeStorage.failure("추가 학습 보상 값이 올바르지 않아요.") }
      ledger["extra"] = max(ledger["extra"] ?? 0, extra)
      let freeStudy = paid["freeStudy"] ?? 0
      guard freeStudy >= 0, freeStudy % 5 == 0 else { throw ScreenTimeStorage.failure("자유 공부 보상 값이 올바르지 않아요.") }
      ledger["freeStudy"] = max(ledger["freeStudy"] ?? 0, freeStudy)
        let handwriting = paid["handwriting"] ?? 0
        guard handwriting >= 0 else { throw ScreenTimeStorage.failure("손글씨 공부 보상 값을 확인해 주세요.") }
        ledger["handwriting"] = max(ledger["handwriting"] ?? 0, handwriting)
      let penalty = paid["penalty"] ?? 0
      guard penalty >= 0 else { throw ScreenTimeStorage.failure("벌점 값을 확인해 주세요.") }
      // Kept apart from the reward ledger, which is the sum of earned minutes.
      state.penalty = max(state.penalty ?? 0, penalty)
      let wasMorningComplete = state.morningComplete
      state.paid = ledger
      state.granted = ScreenTimeStorage.netGranted(state)
      state.morningComplete = (ledger["morning"] ?? 0) > 0
      // Both a small (5) and full (10) morning finish open the reward gate.
      // Only the first completion starts use; later syncs preserve a user's pause.
      if !wasMorningComplete && state.morningComplete {
        state.usingRewards = true
        ScreenTimeStorage.mark(&state, "아침 루틴 완료 · 모은 시간 사용 가능")
      }
      ScreenTimeStorage.apply(state)
    }
  }

  static func startRewardUse() throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard state.enabled, state.rewardMode == true, state.morningComplete, state.granted > state.consumed else {
        throw ScreenTimeStorage.failure("아침 루틴과 남은 이용 시간을 확인해 주세요.")
      }
      guard !ScreenTimeStorage.sleepLocked(state) else { throw ScreenTimeStorage.failure("21시부터 04시 30분까지는 취침 잠금이에요.") }
      guard !ScreenTimeStorage.priorityRequired(state) || state.priorityComplete == true else { throw ScreenTimeStorage.failure("오늘 1순위 공부의 작은 시작과 필기 사진을 먼저 확인해 주세요.") }
      guard (state.focusUntil ?? 0) <= Date().timeIntervalSince1970 else { throw ScreenTimeStorage.failure("공부와 휴식이 끝난 뒤 사용할 수 있어요.") }
      state.usingRewards = true
      ScreenTimeStorage.mark(&state, "모은 시간 사용 시작")
      ScreenTimeStorage.apply(state)
    }
  }

  static func adjustStudyRewards(day: String, previous: [String: Int], target: [String: Int]) throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard day == state.day, state.enabled, state.rewardMode == true else {
        throw ScreenTimeStorage.failure("같은 학습일의 스크린타임 연결을 확인해 주세요.")
      }
      var ledger = state.paid ?? [:]
      for key in ["words", "extra", "quick", "order"] {
        let old = previous[key] ?? 0, next = target[key] ?? 0, current = ledger[key] ?? 0
        let valid = key == "quick" ? [0, 2, 4].contains(next) : key == "order" ? [0, 60].contains(next) : next >= 0 && next % 5 == 0
        guard valid, old >= next, current == old || current <= next else {
          throw ScreenTimeStorage.failure("학습 보상이 바뀌었어요. 상태를 새로 확인해 주세요.")
        }
        ledger[key] = next
      }
      state.paid = ledger
      state.granted = ScreenTimeStorage.netGranted(state)
      if state.consumed >= state.granted { state.usingRewards = false }
      ScreenTimeStorage.mark(&state, "마지막 채점 취소 · 학습 보상 복원")
      ScreenTimeStorage.apply(state)
    }
  }

  static func requireAuthorization() throws {
    guard AuthorizationCenter.shared.authorizationStatus == .approved else {
      throw ScreenTimeStorage.failure("먼저 스크린타임 접근을 허용해 주세요.")
    }
  }

  static func status() throws -> [String: Any] {
    try ScreenTimeStorage.update { state in
      if AuthorizationCenter.shared.authorizationStatus == .approved {
        try ScreenTimeStorage.ensureProductionMonitoring(&state)
      }
      ScreenTimeStorage.apply(state)
      var result = ScreenTimeStorage.snapshot(state)
      result["supported"] = true
      result["authorized"] = AuthorizationCenter.shared.authorizationStatus == .approved
      return result
    }
  }

  static func schedule() -> DeviceActivitySchedule {
    // 24h less 1s, safely above DeviceActivity's minimum interval length.
    DeviceActivitySchedule(intervalStart: DateComponents(hour: 4),
      intervalEnd: DateComponents(hour: 3, minute: 59, second: 59), repeats: true)
  }

  static func enable() throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard !state.selection.applicationTokens.isEmpty || !state.selection.categoryTokens.isEmpty
              || !state.selection.webDomainTokens.isEmpty else {
        throw ScreenTimeStorage.failure("먼저 제한할 앱을 선택해 주세요.")
      }
      guard !state.enabled else { return }
      try center.startMonitoring(.init(ScreenTimeStorage.dailyActivity), during: schedule())
      state.enabled = true
      state.rewardMode = false
      state.morningComplete = false
      state.granted = 0
      state.consumed = 0
      ScreenTimeStorage.mark(&state, "잠금 시작 · 아침 루틴 대기")
      ScreenTimeStorage.apply(state)
    }
  }

  static func completeMorning() throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard state.rewardMode != true else { throw ScreenTimeStorage.failure("실제 아침 루틴 화면에서 완료해 주세요.") }
      guard state.enabled else { throw ScreenTimeStorage.failure("먼저 잠금 테스트를 시작해 주세요.") }
      state.morningComplete = true
      ScreenTimeStorage.mark(&state, "아침 루틴 완료를 테스트로 처리했어요.")
      ScreenTimeStorage.apply(state)
    }
  }

  static func grant() throws {
    try requireAuthorization()
    try ScreenTimeStorage.update { state in
      guard state.rewardMode != true else { throw ScreenTimeStorage.failure("루틴 모드에서는 테스트 시간을 지급하지 않아요.") }
      guard state.enabled else { throw ScreenTimeStorage.failure("먼저 잠금 테스트를 시작해 주세요.") }
      guard state.granted == 0 else {
        throw ScreenTimeStorage.failure("10분 테스트는 하루 한 번이에요. 재시험하려면 테스트를 중단하고 시작해 주세요.")
      }
      // Do not restart a running session: that would lose previously used time.
      let oldSessions = center.activities.filter { $0.rawValue.hasPrefix("routine.session.") }
      if !oldSessions.isEmpty { center.stopMonitoring(oldSessions) }
      let name = "routine.session.\(UUID().uuidString)"
      var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
      for minute in 1...10 {
        events[.init(String(minute))] = DeviceActivityEvent(
          applications: state.selection.applicationTokens,
          categories: state.selection.categoryTokens,
          webDomains: state.selection.webDomainTokens,
          threshold: DateComponents(minute: minute), includesPastActivity: false)
      }
      try center.startMonitoring(.init(name), during: schedule(), events: events)
      state.session = name
      state.granted = 10
      state.consumed = 0
      ScreenTimeStorage.mark(&state, state.morningComplete
        ? "테스트 시간 10분 지급" : "테스트 시간 10분 적립 · 아침 루틴 완료 전 사용 불가")
      ScreenTimeStorage.apply(state)
    }
  }

  static func disable() throws {
    // Always offer an exit, including after the user revokes authorization.
    let activities = center.activities.filter { $0.rawValue.hasPrefix("routine.") }
    if !activities.isEmpty { center.stopMonitoring(activities) }
    defer { ScreenTimeStorage.store.clearAllSettings() }
    try ScreenTimeStorage.update { state in
      state.enabled = false
      state.rewardMode = false
      state.paid = [:]
      state.session = nil
      state.granted = 0
      state.consumed = 0
      state.morningComplete = false
      ScreenTimeStorage.mark(&state, "테스트 중단 · 제한 해제")
    }
  }

  static func presentPicker(promise: Promise) throws {
    try requireAuthorization()
    let initial = try ScreenTimeStorage.update { state -> FamilyActivitySelection in
      guard !state.enabled else {
        throw ScreenTimeStorage.failure("앱을 바꾸려면 먼저 테스트를 중단해 주세요.")
      }
      return state.selection
    }
    guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene })
      .first(where: { $0.activationState == .foregroundActive }),
      var presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
      throw ScreenTimeStorage.failure("앱 선택 화면을 열지 못했어요.")
    }
    while let presented = presenter.presentedViewController { presenter = presented }
    let controller = UIHostingController(rootView: RoutineAppPicker(initial: initial) { selection in
      if let selection {
        do {
          try ScreenTimeStorage.update { state in
            guard !state.enabled else { throw ScreenTimeStorage.failure("테스트가 이미 시작됐어요.") }
            state.selection = selection
          }
          promise.resolve(nil)
        } catch { promise.reject(error) }
      } else { promise.resolve(nil) }
      presenter.dismiss(animated: true)
    })
    controller.isModalInPresentation = true
    presenter.present(controller, animated: true)
  }
}

@available(iOS 17.4, *)
private struct RoutineAppPicker: View {
  @State var selection: FamilyActivitySelection
  let finish: (FamilyActivitySelection?) -> Void

  init(initial: FamilyActivitySelection, finish: @escaping (FamilyActivitySelection?) -> Void) {
    _selection = State(initialValue: initial)
    self.finish = finish
  }

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("제한할 앱 선택")
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("취소") { finish(nil) } }
          ToolbarItem(placement: .confirmationAction) { Button("저장") { finish(selection) } }
        }
    }
  }
}
