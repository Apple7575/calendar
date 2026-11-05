// 홈 화면 위젯 데이터 갱신.
// App Group의 UserDefaults에 오늘 데이터 + 이번 달 달력 데이터를 JSON으로 쓰고 위젯을 리로드한다.
// 네이티브 모듈이라 TestFlight/개발 빌드에서만 동작 — Expo Go에서는 no-op.

import { Platform } from "react-native";
import { formatTime, monthBounds, parseDateKey, todayKey } from "./dateUtils";
import {
  CalendarEvent,
  eventDateKeys,
  eventsOnDate,
  mapGoogleEvent,
  mergeEvents,
} from "./eventMerge";
import { listLocalEventsInRange } from "./events";
import * as googleCalendar from "./googleCalendar";
import { expandEventRows } from "./recurrence";
import { addDays } from "./dateUtils";
import { listDiaryEntriesInRange } from "./diary";
import { listCheckedRoutineIds, listChecksInRange, listRoutines, routinesForDate } from "./routines";
import { computeStreakWithRecovery } from "./streaks";
import type { StreakWidgetPayload } from "./streakWidget";
import { supabase } from "./supabase";

const APP_GROUP = "group.com.newblueday.mycalendar";
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

type ExtensionStorageType = {
  new (group: string): { set: (key: string, value: string) => void };
  reloadWidget: (name?: string) => void;
};

let ExtensionStorage: ExtensionStorageType | null = null;
try {
  if (Platform.OS === "ios") {
    // Expo Go에는 네이티브 모듈이 없어 require가 던진다
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ExtensionStorage = require("@bacons/apple-targets")
      .ExtensionStorage as ExtensionStorageType;
  }
} catch {
  ExtensionStorage = null;
}

/**
 * 위젯에 오늘 + 이번 달 데이터를 밀어넣는다. 실패해도 앱 흐름을 막지 않는 best-effort.
 * 일정 저장/할일·루틴 체크/오늘 탭 진입 시 호출된다.
 */
export async function updateWidget(): Promise<void> {
  if (!ExtensionStorage) return;
  try {
    const dateKey = todayKey();
    const monthKey = dateKey.slice(0, 7);
    const { start: monthStart, end: monthEnd } = monthBounds(monthKey);

    // 이번 달 전체 일정을 한 번에 가져와 오늘 목록/월간 dot 모두에 사용
    const rows = await listLocalEventsInRange(monthStart, monthEnd);
    let monthEvents: CalendarEvent[] = expandEventRows(rows, monthStart, monthEnd);
    try {
      const items = await googleCalendar.listEvents(
        monthStart.toISOString(),
        monthEnd.toISOString()
      );
      monthEvents = mergeEvents(
        monthEvents,
        items.map(mapGoogleEvent).filter((e): e is CalendarEvent => e !== null)
      );
    } catch {
      // 구글 미연결 — 로컬만
    }
    const todayEvents = eventsOnDate(monthEvents, dateKey);

    const [{ data: taskRows }, allRoutines, checked, diaryEntries, checks60] =
      await Promise.all([
        supabase.from("tasks").select("done").eq("date", dateKey),
        listRoutines(),
        listCheckedRoutineIds(dateKey),
        listDiaryEntriesInRange(addDays(dateKey, -60), dateKey).catch(() => []),
        listChecksInRange(addDays(dateKey, -60), dateKey).catch(() => []),
      ]);

    // 최근 60일: 루틴을 전부 지킨 날들 (스트릭·달력 표시용)
    const checksByDate = new Map<string, Set<string>>();
    for (const ch of checks60) {
      if (!checksByDate.has(ch.date)) checksByDate.set(ch.date, new Set());
      checksByDate.get(ch.date)!.add(ch.routine_id);
    }
    const routineFullDays: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const key = addDays(dateKey, -i);
      const due = routinesForDate(allRoutines, key);
      if (due.length > 0 && due.every((r) => checksByDate.get(key)?.has(r.id))) {
        routineFullDays.push(key);
      }
    }
    const diaryDates = diaryEntries.map((e) => e.date);
    const tasks = (taskRows ?? []) as { done: boolean }[];
    const routines = routinesForDate(allRoutines, dateKey);

    // 월간 달력(systemLarge) 데이터: 일정 있는 날짜(dot)
    const eventDaySet = new Set<number>();
    for (const e of monthEvents) {
      for (const key of eventDateKeys(e)) {
        if (key.startsWith(monthKey)) eventDaySet.add(Number(key.slice(8)));
      }
    }

    const d = parseDateKey(dateKey);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const payload = {
      dateLabel: `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS_KO[d.getDay()]})`,
      events: todayEvents.slice(0, 6).map((e) => ({
        time: e.allDay ? "종일" : formatTime(e.startAt),
        title: e.title,
        color: e.colorHex ?? (e.source === "google" ? "#2FA36B" : "#8B72E8"),
      })),
      tasksDone: tasks.filter((t) => t.done).length,
      tasksTotal: tasks.length,
      routinesDone: routines.filter((r) => checked.has(r.id)).length,
      routinesTotal: routines.length,
      month: {
        title: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
        // 월요일 시작 (0=월 … 6=일)
        firstWeekday: (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7,
        daysInMonth,
        today: d.getDate(),
        eventDays: [...eventDaySet].sort((a, b) => a - b),
        // 잘 살고 있는 표시: 일기 쓴 날 / 루틴 전부 지킨 날
        diaryDays: diaryDates
          .filter((k) => k.startsWith(monthKey))
          .map((k) => Number(k.slice(8))),
        routineDays: routineFullDays
          .filter((k) => k.startsWith(monthKey))
          .map((k) => Number(k.slice(8))),
      },
      // 스트릭 (하루 빠짐 복구 허용)
      routineStreak: computeStreakWithRecovery(routineFullDays, dateKey),
      diaryStreak: computeStreakWithRecovery(diaryDates, dateKey),
    };

    const storage = new ExtensionStorage(APP_GROUP);
    storage.set("widgetData", JSON.stringify(payload));
    ExtensionStorage.reloadWidget();
  } catch {
    // 위젯 갱신 실패는 조용히 무시
  }
}

let lastStreakJson: string | null = null;

/** 연속 실천 위젯 값을 쓴다. 바뀔 때만 쓰고 이 위젯만 새로고침한다. 기존 위젯의 widgetData 키는 건드리지 않는다. */
export function writeStreakWidget(payload: StreakWidgetPayload): void {
  if (!ExtensionStorage) return;
  const json = JSON.stringify(payload);
  if (json === lastStreakJson) return;
  try {
    new ExtensionStorage(APP_GROUP).set("streakWidget", json);
    ExtensionStorage.reloadWidget("StreakWidget");
    lastStreakJson = json;
  } catch {
    // 위젯 갱신 실패는 조용히 무시
  }
}
