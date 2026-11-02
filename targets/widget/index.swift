import WidgetKit
import SwiftUI

private let appGroup = "group.com.newblueday.mycalendar"
private let dataKey = "widgetData"

// MARK: - 데이터 모델 (앱이 App Group에 JSON으로 저장)

struct WidgetEventItem: Codable, Identifiable {
  let time: String
  let title: String
  let color: String
  var id: String { time + title }
}

struct WidgetMonthData: Codable {
  let title: String        // "2026년 7월"
  let firstWeekday: Int    // 1일의 요일 (0=월 … 6=일)
  let daysInMonth: Int
  let today: Int           // 오늘 날짜 (1-based)
  let eventDays: [Int]     // 일정이 있는 날짜들
  let diaryDays: [Int]?    // 일기 쓴 날
  let routineDays: [Int]?  // 루틴 전부 지킨 날
}

struct TodayWidgetData: Codable {
  let dateLabel: String
  let events: [WidgetEventItem]
  let tasksDone: Int
  let tasksTotal: Int
  let routinesDone: Int
  let routinesTotal: Int
  // 이전 버전 JSON에는 없을 수 있어 optional
  let month: WidgetMonthData?
  let routineStreak: Int?
  let diaryStreak: Int?
}

func loadWidgetData() -> TodayWidgetData? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let json = defaults.string(forKey: dataKey),
        let data = json.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(TodayWidgetData.self, from: data)
}

let sampleWidgetData = TodayWidgetData(
  dateLabel: "7월 10일 (금)",
  events: [
    WidgetEventItem(time: "10:00", title: "팀 회의", color: "#4A6CF7"),
    WidgetEventItem(time: "19:00", title: "저녁 약속", color: "#E86FA7"),
  ],
  tasksDone: 2,
  tasksTotal: 3,
  routinesDone: 1,
  routinesTotal: 2,
  month: WidgetMonthData(
    title: "2026년 7월",
    firstWeekday: 2,
    daysInMonth: 31,
    today: 10,
    eventDays: [3, 10, 14, 22, 28],
    diaryDays: [6, 7, 8, 9, 10],
    routineDays: [7, 8, 9, 10]
  ),
  routineStreak: 4,
  diaryStreak: 5
)

// MARK: - Timeline

struct TodayEntry: TimelineEntry {
  let date: Date
  let data: TodayWidgetData?
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: Date(), data: sampleWidgetData)
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayEntry(date: Date(), data: loadWidgetData() ?? sampleWidgetData))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    let entry = TodayEntry(date: Date(), data: loadWidgetData())
    let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(refresh)))
  }
}

// MARK: - 색상 유틸

extension Color {
  init(hex: String) {
    let cleaned = hex.replacingOccurrences(of: "#", with: "")
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)
    if cleaned.count == 6 {
      self.init(
        red: Double((value >> 16) & 0xFF) / 255.0,
        green: Double((value >> 8) & 0xFF) / 255.0,
        blue: Double(value & 0xFF) / 255.0
      )
    } else {
      self.init(red: 0.55, green: 0.45, blue: 0.91)
    }
  }
}

// MARK: - 오늘 위젯 뷰 (홈 화면)

struct EventRowView: View {
  let event: WidgetEventItem

  var body: some View {
    HStack(spacing: 5) {
      Circle()
        .fill(Color(hex: event.color))
        .frame(width: 6, height: 6)
      Text(event.time)
        .font(.system(size: 10, weight: .medium))
        .monospacedDigit()
        .foregroundStyle(.secondary)
      Text(event.title)
        .font(.system(size: 11, weight: .semibold))
        .lineLimit(1)
      Spacer(minLength: 0)
    }
  }
}

struct HomeTodayView: View {
  let data: TodayWidgetData?
  let family: WidgetFamily

  private var maxEvents: Int { family == .systemSmall ? 3 : 4 }

  var body: some View {
    if let data = data {
      VStack(alignment: .leading, spacing: 5) {
        HStack {
          Text(data.dateLabel)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.tint)
          Spacer()
          if family != .systemSmall {
            Text("할 일 \(data.tasksDone)/\(data.tasksTotal) · 루틴 \(data.routinesDone)/\(data.routinesTotal)")
              .font(.system(size: 9))
              .foregroundStyle(.secondary)
          }
        }

        if data.events.isEmpty {
          Spacer()
          Text("오늘 일정이 없어요 ☀️")
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
          Spacer()
        } else {
          ForEach(Array(data.events.prefix(maxEvents))) { event in
            EventRowView(event: event)
          }
          if data.events.count > maxEvents {
            Text("외 \(data.events.count - maxEvents)개")
              .font(.system(size: 9))
              .foregroundStyle(.secondary)
          }
          Spacer(minLength: 0)
        }

        if family == .systemSmall {
          Text("할 일 \(data.tasksDone)/\(data.tasksTotal)")
            .font(.system(size: 9))
            .foregroundStyle(.secondary)
        }
      }
    } else {
      PlaceholderView()
    }
  }
}

struct PlaceholderView: View {
  var body: some View {
    VStack(spacing: 4) {
      Text("루틴 친구들")
        .font(.system(size: 12, weight: .bold))
      Text("앱을 열면 오늘 일정이\n여기에 표시돼요")
        .font(.system(size: 10))
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
  }
}

// MARK: - 잠금 화면 뷰

struct LockRectView: View {
  let data: TodayWidgetData?

  var body: some View {
    if let data = data {
      VStack(alignment: .leading, spacing: 1) {
        Text(data.dateLabel)
          .font(.system(size: 12, weight: .bold))
        if let first = data.events.first {
          Text("\(first.time) \(first.title)")
            .font(.system(size: 12))
            .lineLimit(1)
        } else {
          Text("일정 없는 하루 ☀️")
            .font(.system(size: 12))
        }
        Text("할 일 \(data.tasksDone)/\(data.tasksTotal) · 루틴 \(data.routinesDone)/\(data.routinesTotal)")
          .font(.system(size: 11))
          .foregroundStyle(.secondary)
      }
    } else {
      Text("루틴 친구들")
        .font(.system(size: 12, weight: .bold))
    }
  }
}

struct LockCircleView: View {
  let data: TodayWidgetData?

  var body: some View {
    if let data = data, data.tasksTotal > 0 {
      Gauge(value: Double(data.tasksDone), in: 0...Double(data.tasksTotal)) {
        Image(systemName: "checklist")
      } currentValueLabel: {
        Text("\(data.tasksDone)/\(data.tasksTotal)")
          .font(.system(size: 12, weight: .bold))
      }
      .gaugeStyle(.accessoryCircularCapacity)
    } else {
      ZStack {
        Circle().stroke(.secondary, lineWidth: 4).opacity(0.4)
        Image(systemName: "calendar")
          .font(.system(size: 18, weight: .semibold))
      }
    }
  }
}

struct TodayWidgetView: View {
  var entry: TodayEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .accessoryRectangular:
      LockRectView(data: entry.data)
    case .accessoryCircular:
      LockCircleView(data: entry.data)
    default:
      HomeTodayView(data: entry.data, family: family)
    }
  }
}

// MARK: - 월간 달력 위젯 뷰 (systemLarge)

struct MonthWidgetView: View {
  var entry: TodayEntry

  // 월요일 시작 (앱과 동일)
  private let weekdays = ["월", "화", "수", "목", "금", "토", "일"]

  var body: some View {
    if let data = entry.data, let month = data.month {
      VStack(spacing: 6) {
        HStack(alignment: .firstTextBaseline) {
          Text(month.title)
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(.tint)
          Spacer()
          // 스트릭: 위젯만 봐도 "잘 살고 있다"가 보이게
          Text("🔥\(data.routineStreak ?? 0)  📓\(data.diaryStreak ?? 0)")
            .font(.system(size: 11, weight: .bold))
        }

        let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
        LazyVGrid(columns: columns, spacing: 5) {
          ForEach(0..<7, id: \.self) { i in
            Text(weekdays[i])
              .font(.system(size: 10, weight: .bold))
              .foregroundStyle(i == 6 ? Color.red.opacity(0.75) : (i == 5 ? Color.blue.opacity(0.75) : Color.secondary))
          }
          ForEach(0..<month.firstWeekday, id: \.self) { _ in
            Text("")
          }
          ForEach(1...month.daysInMonth, id: \.self) { day in
            let isToday = day == month.today
            let weekday = (month.firstWeekday + day - 1) % 7
            let isRoutine = month.routineDays?.contains(day) ?? false
            let isDiary = month.diaryDays?.contains(day) ?? false
            VStack(spacing: 1) {
              Text("\(day)")
                .font(.system(size: 12, weight: isToday ? .bold : .medium))
                .monospacedDigit()
                .foregroundStyle(
                  isToday ? Color.white
                    : (weekday == 6 ? Color.red.opacity(0.85)
                       : (weekday == 5 ? Color.blue.opacity(0.85) : Color.primary))
                )
                .frame(width: 22, height: 22)
                .background(
                  isToday
                    ? AnyView(Circle().fill(Color.accentColor))
                    // 루틴을 전부 지킨 날은 은은한 채움 — 빈칸이 보이면 채우고 싶어진다
                    : (isRoutine
                       ? AnyView(Circle().fill(Color.accentColor.opacity(0.22)))
                       : AnyView(EmptyView()))
                )
              HStack(spacing: 2) {
                if isDiary {
                  Circle().fill(Color.green.opacity(0.85)).frame(width: 4, height: 4)
                }
                if month.eventDays.contains(day) {
                  Circle().fill(Color.accentColor.opacity(0.8)).frame(width: 4, height: 4)
                }
              }
              .frame(height: 4)
            }
          }
        }
        Spacer(minLength: 0)
      }
    } else {
      PlaceholderView()
    }
  }
}

// MARK: - 위젯 정의

struct TodayWidget: Widget {
  let kind: String = "TodayWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
        .containerBackground(for: .widget) {
          Color(uiColor: .systemBackground)
        }
    }
    .configurationDisplayName("오늘")
    .description("오늘의 일정과 할 일, 루틴을 보여줘요.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
  }
}

struct MonthWidget: Widget {
  let kind: String = "MonthWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      MonthWidgetView(entry: entry)
        .containerBackground(for: .widget) {
          Color(uiColor: .systemBackground)
        }
    }
    .configurationDisplayName("월간 달력")
    .description("이번 달 전체와 일정 있는 날을 한눈에 보여줘요.")
    .supportedFamilies([.systemLarge])
  }
}

@main
struct ExportedWidgets: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    MonthWidget()
  }
}
