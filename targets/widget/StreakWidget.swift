import WidgetKit
import SwiftUI

private let streakAppGroup = "group.com.newblueday.mycalendar"
private let streakDataKey = "streakWidget"
/// 그림 파일 이름의 동물 순서. 앱의 `STREAK_ANIMALS`(src/lib/streakWidget.ts)와 같아야 한다.
private let streakAnimals = ["otter", "cat", "bear", "hedgehog"]

// MARK: - 데이터 (앱의 src/lib/streakWidget.ts가 저장)

struct StreakWidgetData: Codable {
  let current: Int
  let todayDone: Bool
  let day: String
  let nextDay: String
}

enum StreakState: String {
  case zero, calm, worried, urgent, done
}

struct StreakView {
  let state: StreakState
  let days: Int?
  let animal: String
  let pose: Int
}

private func loadStreakData() -> StreakWidgetData? {
  guard let json = UserDefaults(suiteName: streakAppGroup)?.string(forKey: streakDataKey),
        let data = json.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(StreakWidgetData.self, from: data)
}

private func gregorian(_ zone: TimeZone) -> Calendar {
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = zone
  return calendar
}

/// 앱의 `routineDay`와 같다. 04시 전은 전날이다.
private func streakDayKey(_ date: Date) -> String {
  let calendar = gregorian(.current)
  let day = calendar.component(.hour, from: date) < 4
    ? (calendar.date(byAdding: .day, value: -1, to: date) ?? date)
    : date
  let parts = calendar.dateComponents([.year, .month, .day], from: day)
  return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
}

private func streakHour(_ date: Date) -> Int {
  gregorian(.current).component(.hour, from: date)
}

/// 1970-01-01부터 센 날 수. 앱의 `dayNumber`와 같다.
private func streakDayNumber(_ key: String) -> Int {
  let parts = key.split(separator: "-").compactMap { Int($0) }
  guard parts.count == 3,
        let utc = TimeZone(identifier: "UTC"),
        let date = gregorian(utc).date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
  else { return 0 }
  return Int(floor(date.timeIntervalSince1970 / 86_400))
}

/// 04~18시 평온, 18~21시 걱정, 21~04시 다급. 21시는 취침 잠금 시각이다.
private func streakHourState(_ hour: Int) -> StreakState {
  if hour >= 4 && hour < 18 { return .calm }
  if hour >= 18 && hour < 21 { return .worried }
  return .urgent
}

/// 앱의 `streakWidgetView`와 같은 규칙. 값이 없거나 깨졌으면 숫자 없이 평온한 그림이다.
func streakView(_ data: StreakWidgetData?, dayKey: String, hour: Int) -> StreakView {
  func make(_ key: String, _ state: StreakState, _ days: Int?) -> StreakView {
    let number = streakDayNumber(key)
    let animal = streakAnimals[((number % 4) + 4) % 4]
    let pose = (number / 4) % 2 == 0 ? 1 : 2
    return StreakView(state: state, days: days, animal: animal, pose: pose)
  }
  guard let data = data else { return make(dayKey, .calm, nil) }
  let key = dayKey < data.day ? data.day : dayKey
  if key == data.day {
    if data.todayDone { return make(key, .done, data.current) }
    return data.current > 0 ? make(key, streakHourState(hour), data.current) : make(key, .zero, 0)
  }
  if key == data.nextDay && data.todayDone && data.current > 0 {
    return make(key, streakHourState(hour), data.current)
  }
  return make(key, .zero, 0)
}

// MARK: - Timeline

struct StreakEntry: TimelineEntry {
  let date: Date
  let view: StreakView
}

private func streakEntry(_ data: StreakWidgetData?, at date: Date) -> StreakEntry {
  StreakEntry(date: date, view: streakView(data, dayKey: streakDayKey(date), hour: streakHour(date)))
}

/// 그림이 바뀌는 04시·18시·21시를 앞으로 count번 구한다.
private func streakChangeTimes(after date: Date, count: Int) -> [Date] {
  let calendar = gregorian(.current)
  var times: [Date] = []
  var cursor = date
  while times.count < count {
    let candidates = [4, 18, 21].compactMap { hour in
      calendar.nextDate(
        after: cursor,
        matching: DateComponents(hour: hour, minute: 0, second: 0),
        matchingPolicy: .nextTime
      )
    }
    guard let next = candidates.min() else { break }
    times.append(next)
    cursor = next
  }
  return times
}

struct StreakProvider: TimelineProvider {
  private let sample = StreakView(state: .done, days: 12, animal: "otter", pose: 1)

  func placeholder(in context: Context) -> StreakEntry {
    StreakEntry(date: Date(), view: sample)
  }

  func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
    let now = Date()
    let data = loadStreakData()
    if data == nil && context.isPreview {
      completion(StreakEntry(date: now, view: sample))
    } else {
      completion(streakEntry(data, at: now))
    }
  }

  /// 앞으로 이틀 치 바뀌는 시각을 미리 넣는다. 앱을 열지 않아도 표정과 끊김이 바뀐다.
  func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
    let now = Date()
    let data = loadStreakData()
    let times = streakChangeTimes(after: now, count: 6)
    let entries = [streakEntry(data, at: now)] + times.map { streakEntry(data, at: $0) }
    let refresh = times.last ?? now.addingTimeInterval(3_600)
    completion(Timeline(entries: entries, policy: .after(refresh)))
  }
}

// MARK: - 뷰

private struct StreakStyle {
  let top: String
  let bottom: String
  let number: String
  let flame: String
}

private func streakStyle(_ view: StreakView) -> StreakStyle {
  switch view.state {
  case .zero:
    return StreakStyle(top: "#D9F2A6", bottom: "#B9E276", number: "#2A3D14", flame: "zero")
  case .calm:
    return StreakStyle(top: "#4A5B7D", bottom: "#2F3C58", number: "#D7E0F2", flame: "calm")
  case .worried:
    return StreakStyle(top: "#B8692B", bottom: "#6F3414", number: "#FFE2BF", flame: "worried")
  case .urgent:
    return StreakStyle(top: "#C8173A", bottom: "#5C0A28", number: "#FFE3E6", flame: "urgent")
  case .done:
    let backgrounds: [String: (String, String)] = [
      "otter": ("#FFF6DF", "#FFE9B8"),
      "cat": ("#EEF8DC", "#D6EFB0"),
      "bear": ("#E4EEFF", "#C9DCFF"),
      "hedgehog": ("#FDE8F0", "#F9CFE0"),
    ]
    let pair = backgrounds[view.animal] ?? ("#FFF6DF", "#FFE9B8")
    return StreakStyle(top: pair.0, bottom: pair.1, number: "#E8690A", flame: "done")
  }
}

private func streakCharacterImage(_ view: StreakView) -> String {
  view.state == .done
    ? "streak_done\(view.pose)_\(view.animal)"
    : "streak_\(view.state.rawValue)_\(view.animal)"
}

/// 오늘 함 배경의 작은 조각. 위치는 158pt 위젯 기준이다.
private struct StreakConfetti: View {
  let unit: CGFloat
  private let pieces: [(x: CGFloat, y: CGFloat, size: CGFloat, color: String, round: Bool)] = [
    (14, 70, 7, "#FF8A1F", true),
    (136, 64, 6, "#6FBF4B", false),
    (10, 118, 5, "#F2B400", false),
    (142, 112, 7, "#F06A8A", true),
  ]

  var body: some View {
    ZStack(alignment: .topLeading) {
      ForEach(0..<pieces.count, id: \.self) { index in
        let piece = pieces[index]
        RoundedRectangle(cornerRadius: piece.round ? piece.size * unit / 2 : 2 * unit)
          .fill(Color(hex: piece.color))
          .frame(width: piece.size * unit, height: piece.size * unit)
          .offset(x: piece.x * unit, y: piece.y * unit)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct StreakWidgetView: View {
  let entry: StreakEntry

  private var label: String {
    guard let days = entry.view.days else { return "연속 일수를 아직 몰라요" }
    return entry.view.state == .done ? "\(days)일 연속, 오늘 실천함" : "\(days)일 연속"
  }

  var body: some View {
    let view = entry.view
    let style = streakStyle(view)
    GeometryReader { geo in
      // 시안의 158pt 위젯을 기준으로 다른 크기의 기기에서도 같은 비율로 놓는다.
      let unit = geo.size.width / 158
      ZStack(alignment: .top) {
        if view.state == .done {
          StreakConfetti(unit: unit)
        }
        Image(streakCharacterImage(view))
          .resizable()
          .scaledToFit()
          .frame(width: 128 * unit)
          .offset(y: 50 * unit)
        HStack(spacing: 4 * unit) {
          Image("streak_flame_\(style.flame)")
            .resizable()
            .frame(width: 32 * unit, height: 36 * unit)
          Text(verbatim: view.days.map { String($0) } ?? "-")
            .font(.system(size: 32 * unit, weight: .heavy))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .foregroundStyle(Color(hex: style.number))
            .widgetAccentable()
        }
        .padding(.top, 11 * unit)
      }
      .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
      .clipped()
    }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(label)
    .containerBackground(for: .widget) {
      LinearGradient(
        colors: [Color(hex: style.top), Color(hex: style.bottom)],
        startPoint: .top,
        endPoint: .bottom
      )
    }
  }
}

// MARK: - 위젯 정의

struct StreakWidget: Widget {
  let kind: String = "StreakWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
      StreakWidgetView(entry: entry)
    }
    .configurationDisplayName("연속 실천")
    .description("며칠 연속 실천했는지 동물과 불로 보여줘요.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}
