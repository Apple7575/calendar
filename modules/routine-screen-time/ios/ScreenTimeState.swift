// Shared with the monitor extension by scripts/sync-screen-time.js.
import Foundation
import Darwin
import FamilyControls
import ManagedSettings
import DeviceActivity

@available(iOS 16.0, *)
struct ScreenTimeState: Codable {
  var day = ScreenTimeStorage.dayKey()
  var enabled = false
  var selection = FamilyActivitySelection()
  var session: String? = nil
  var granted = 0
  var consumed = 0
  var monitoringBaseConsumed: Int? = nil
  var morningComplete = false
  var priorityStartDay: String? = nil
  var priorityComplete: Bool? = nil
  var rewardMode: Bool? = nil
  var usingRewards: Bool? = nil
  var focusUntil: Double? = nil
  var paid: [String: Int]? = nil
  var lastEvent = "아직 테스트하지 않았어요."
  var lastEventAt: Double = Date().timeIntervalSince1970
}

@available(iOS 16.0, *)
enum ScreenTimeStorage {
  static let group = "group.com.newblueday.mycalendar"
  static let dailyActivity = "routine.daily"
  static let productionActivity = "routine.production.v2"
  static let sleepActivity = "routine.sleep"
  static let store = ManagedSettingsStore(named: .init("routine.screen-time"))

  static func dayKey(_ date: Date = Date()) -> String {
    let calendar = Calendar.current
    let day = calendar.component(.hour, from: date) < 4
      ? calendar.date(byAdding: .day, value: -1, to: date)! : date
    let c = calendar.dateComponents([.year, .month, .day], from: day)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
  }

  // File locking and atomic writes serialize the app and extension. A single
  // Codable file also prevents observing partially updated session fields.
  static func update<T>(_ body: (inout ScreenTimeState) throws -> T) throws -> T {
    guard let directory = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: group
    ) else { throw failure("공유 저장소에 접근할 수 없어요. App Group 서명을 확인해 주세요.") }
    let lockURL = directory.appendingPathComponent("routine-screen-time.lock")
    let fd = open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard fd >= 0 else { throw failure("스크린타임 저장소를 열지 못했어요.") }
    defer { close(fd) }
    guard flock(fd, LOCK_EX) == 0 else { throw failure("스크린타임 저장소를 잠그지 못했어요.") }
    defer { flock(fd, LOCK_UN) }
    let url = directory.appendingPathComponent("routine-screen-time.json")
    var state: ScreenTimeState
    if FileManager.default.fileExists(atPath: url.path) {
      state = try JSONDecoder().decode(ScreenTimeState.self, from: Data(contentsOf: url))
    } else {
      state = ScreenTimeState()
    }
    if state.day != dayKey() {
      state.day = dayKey()
      state.session = state.rewardMode == true ? "\(productionActivity).\(state.day)" : nil
      state.granted = 0
      state.consumed = 0
      state.monitoringBaseConsumed = 0
      state.morningComplete = false
      state.priorityComplete = false
      state.paid = [:]
      state.usingRewards = false
      mark(&state, "새벽 4시 초기화 · 아침 루틴 대기")
    }
    if state.rewardMode == true && !(state.session?.hasPrefix("\(productionActivity).\(state.day)") ?? false) {
      state.session = "\(productionActivity).\(state.day).\(UUID().uuidString)"
    }
    let result = try body(&state)
    try JSONEncoder().encode(state).write(to: url, options: .atomic)
    return result
  }

  static func mark(_ state: inout ScreenTimeState, _ message: String) {
    state.lastEvent = message
    state.lastEventAt = Date().timeIntervalSince1970
  }

  @available(iOS 17.4, *)
  static func ensureProductionMonitoring(_ state: inout ScreenTimeState) throws {
    guard state.enabled, state.rewardMode == true else { return }
    let center = DeviceActivityCenter()
    let sleep = DeviceActivityName(sleepActivity)
    if !center.activities.contains(sleep) {
      try center.startMonitoring(sleep, during: DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 21), intervalEnd: DateComponents(hour: 4, minute: 30), repeats: true))
    }
    // Rotate bounded event batches so arbitrarily large earned balances keep counting.
    if state.consumed - (state.monitoringBaseConsumed ?? 0) >= 120 {
      state.session = "\(productionActivity).\(state.day).\(UUID().uuidString)"
    }
    let name = DeviceActivityName(state.session ?? "\(productionActivity).\(state.day)")
    guard !center.activities.contains(name) else { return }
    let old = center.activities.filter { $0.rawValue.hasPrefix("routine.production.") }
    if !old.isEmpty { center.stopMonitoring(old) }
    let parts = state.day.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3,
      let start = Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 4)),
      let end = Calendar.current.date(byAdding: .day, value: 1, to: start) else {
      throw failure("하루 시작 시각을 확인하지 못했어요.")
    }
    let components: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
    let schedule = DeviceActivitySchedule(
      intervalStart: Calendar.current.dateComponents(components, from: start),
      intervalEnd: Calendar.current.dateComponents(components, from: end), repeats: false)
    var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
    for minute in 1...120 {
      events[.init(String(minute))] = DeviceActivityEvent(
        applications: state.selection.applicationTokens, categories: state.selection.categoryTokens,
        webDomains: state.selection.webDomainTokens, threshold: DateComponents(minute: minute), includesPastActivity: false)
    }
    try center.startMonitoring(name, during: schedule, events: events)
    // New monitoring starts from now. Preserve usage already recorded by the old build.
    state.monitoringBaseConsumed = state.consumed
  }

  static func sleepLocked(_ state: ScreenTimeState, at date: Date = Date()) -> Bool {
    guard state.rewardMode == true else { return false }
    let components = Calendar.current.dateComponents([.hour, .minute], from: date)
    let minute = (components.hour ?? 0) * 60 + (components.minute ?? 0)
    return minute >= 21 * 60 || minute < 4 * 60 + 30
  }
  static func locked(_ state: ScreenTimeState) -> Bool {
    guard state.enabled else { return false }
    return !state.morningComplete || (priorityRequired(state) && state.priorityComplete != true) || state.consumed >= state.granted || sleepLocked(state)
      || (state.rewardMode == true && (state.usingRewards != true || (state.focusUntil ?? 0) > Date().timeIntervalSince1970))
  }
  static func priorityRequired(_ state: ScreenTimeState) -> Bool {
    guard state.rewardMode == true, let start = state.priorityStartDay, !start.isEmpty else { return false }
    return state.day >= start
  }
  static func apply(_ state: ScreenTimeState) {
    let isLocked = locked(state)
    store.shield.applications = isLocked && !state.selection.applicationTokens.isEmpty
      ? state.selection.applicationTokens : nil
    store.shield.applicationCategories = isLocked && !state.selection.categoryTokens.isEmpty
      ? .specific(state.selection.categoryTokens) : nil
    store.shield.webDomains = isLocked && !state.selection.webDomainTokens.isEmpty
      ? state.selection.webDomainTokens : nil
    store.shield.webDomainCategories = isLocked && !state.selection.categoryTokens.isEmpty
      ? .specific(state.selection.categoryTokens) : nil
  }

  static func snapshot(_ state: ScreenTimeState) -> [String: Any] {
    [
      "day": state.day,
      "enabled": state.enabled,
      "selectedApps": state.selection.applicationTokens.count,
      "selectedCategories": state.selection.categoryTokens.count,
      "selectedWebsites": state.selection.webDomainTokens.count,
      "grantedMinutes": state.granted,
      "consumedMinutes": state.consumed,
      "morningComplete": state.morningComplete,
      "supportsPriorityGate": true,
      "priorityRequired": priorityRequired(state),
      "priorityComplete": state.priorityComplete == true,
      "rewardMode": state.rewardMode == true,
      "locked": locked(state),
      "policyVersion": 2,
      "supportsStudyUndo": true,
      "supportsOrderBonus": true,
      "supportsFreeStudyRewards": true,
      "supportsHandwritingRewards": true,
      "supportsProgressiveWordRewards": true,
      "sleepLocked": sleepLocked(state),
      "usingRewards": state.usingRewards == true,
      "focusUntil": (state.focusUntil ?? 0) * 1000,
      "lastEvent": state.lastEvent,
      "lastEventAt": state.lastEventAt * 1000
    ]
  }

  static func failure(_ message: String) -> NSError {
    NSError(domain: "RoutineScreenTime", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
}
