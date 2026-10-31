import DeviceActivity
import UserNotifications

class RoutineActivityMonitor: DeviceActivityMonitor {
  private func refresh() {
    do {
      try ScreenTimeStorage.update { state in
        if #available(iOS 17.4, *) { try ScreenTimeStorage.ensureProductionMonitoring(&state) }
        ScreenTimeStorage.apply(state)
      }
    } catch {
      // Preserve existing shields on storage errors. Do not silently unlock.
      NSLog("Routine Screen Time monitor: %@", error.localizedDescription)
    }
  }

  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    refresh() // Day changes are idempotent, including a late initial callback.
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    refresh()
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    do {
      try ScreenTimeStorage.update { state in
        // Ignore delayed callbacks from stopped sessions and previous days.
        guard state.enabled, state.session == activity.rawValue,
              let minutes = Int(event.rawValue), (1...120).contains(minutes) else {
          ScreenTimeStorage.apply(state)
          return
        }
        let previous = state.consumed
        state.consumed = max(previous, (state.rewardMode == true ? state.monitoringBaseConsumed ?? 0 : 0) + minutes)
        if state.rewardMode == true, minutes == 120 {
          if #available(iOS 17.4, *) { try ScreenTimeStorage.ensureProductionMonitoring(&state) }
        }
        ScreenTimeStorage.mark(&state, state.consumed >= state.granted
          ? "공용 시간 소진 · 다시 잠금" : "제한 앱 합산 \(state.consumed)분 사용 확인")
        ScreenTimeStorage.apply(state)
        if state.granted > 2 && previous < state.granted - 2 && state.consumed >= state.granted - 2 && state.consumed < state.granted {
          let content = UNMutableNotificationContent()
          content.title = "이용 시간이 2분 남았어요"
          content.body = "사용 중인 내용을 마무리해 주세요."
          content.sound = .default
          UNUserNotificationCenter.current().add(UNNotificationRequest(
            identifier: "routine-warning-\(state.day)-\(activity.rawValue)-\(state.granted)", content: content, trigger: nil
          ))
        }
      }
    } catch { NSLog("Routine Screen Time threshold: %@", error.localizedDescription) }
  }
}
