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

struct TodayWidgetData: Codable {
  let dateLabel: String
  let events: [WidgetEventItem]
  let tasksDone: Int
  let tasksTotal: Int
  let routinesDone: Int
  let routinesTotal: Int
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
  routinesTotal: 2
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

// MARK: - 뷰

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

struct TodayWidgetView: View {
  var entry: TodayEntry
  @Environment(\.widgetFamily) var family

  private var maxEvents: Int { family == .systemSmall ? 3 : 4 }

  var body: some View {
    if let data = entry.data {
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
      VStack(spacing: 4) {
        Text("나의 캘린더")
          .font(.system(size: 12, weight: .bold))
        Text("앱을 열면 오늘 일정이\n여기에 표시돼요")
          .font(.system(size: 10))
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
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
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct ExportedWidgets: WidgetBundle {
  var body: some Widget {
    TodayWidget()
  }
}
