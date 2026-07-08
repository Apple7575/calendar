// 로컬 일정과 구글 일정을 하나의 표시 모델로 병합하는 순수 로직.
// RN/네트워크 의존 없음 — jest 단위 테스트 대상.

import { addDays, dateKeysBetween, toDateKey } from "./dateUtils";

export type CalendarEvent = {
  id: string;
  source: "local" | "google";
  title: string;
  /** ISO 문자열. 종일 일정은 로컬 00:00 기준 */
  startAt: string;
  endAt: string;
  allDay: boolean;
  description?: string;
  /** 로컬 일정이 구글에 등록된 경우 그 구글 이벤트 id */
  googleEventId?: string | null;
};

/** 구글 Calendar API events.list 응답의 개별 item (필요한 필드만) */
export type GoogleEventItem = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

/** 구글 이벤트를 CalendarEvent로 정규화. 취소되었거나 시간이 없으면 null */
export function mapGoogleEvent(item: GoogleEventItem): CalendarEvent | null {
  if (item.status === "cancelled") return null;
  const start = item.start ?? {};
  const end = item.end ?? {};

  if (start.date) {
    // 종일 일정: end.date는 exclusive → 표시용으로 하루 앞당김
    const endKey = end.date ? addDays(end.date, -1) : start.date;
    return {
      id: item.id,
      source: "google",
      title: item.summary?.trim() || "(제목 없음)",
      startAt: `${start.date}T00:00:00`,
      endAt: `${endKey < start.date ? start.date : endKey}T23:59:59`,
      allDay: true,
      description: item.description,
    };
  }
  if (start.dateTime) {
    return {
      id: item.id,
      source: "google",
      title: item.summary?.trim() || "(제목 없음)",
      startAt: start.dateTime,
      endAt: end.dateTime ?? start.dateTime,
      allDay: false,
      description: item.description,
    };
  }
  return null;
}

/**
 * 로컬 + 구글 병합.
 * 로컬 일정이 구글에 push된 경우(googleEventId 보유) 구글 쪽 사본은 제외해 중복 표시를 막는다.
 * 정렬: 종일 먼저, 그다음 시작 시각 순.
 */
export function mergeEvents(local: CalendarEvent[], google: CalendarEvent[]): CalendarEvent[] {
  const pushedIds = new Set(
    local.map((e) => e.googleEventId).filter((id): id is string => !!id)
  );
  const merged = [...local, ...google.filter((g) => !pushedIds.has(g.id))];
  return merged.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}

/**
 * 이벤트가 걸치는 모든 dateKey (로컬 시간 기준).
 * startAt이 UTC ISO(로컬 DB 저장분)든 타임존 없는 로컬 표기(구글 종일)든
 * Date 파싱 후 로컬로 변환하므로 동일하게 동작한다.
 */
export function eventDateKeys(event: CalendarEvent): string[] {
  const startKey = toDateKey(new Date(event.startAt));
  const endKey = toDateKey(new Date(event.endAt));
  return dateKeysBetween(startKey, endKey < startKey ? startKey : endKey);
}

/** 특정 날짜에 표시할 이벤트 */
export function eventsOnDate(events: CalendarEvent[], dateKey: string): CalendarEvent[] {
  return events.filter((e) => eventDateKeys(e).includes(dateKey));
}

type Dot = { key: string; color: string };
export type MarkedDates = Record<
  string,
  { dots: Dot[]; selected?: boolean; selectedColor?: string }
>;

/**
 * react-native-calendars markingType="multi-dot"용 마커 맵.
 * 일정(로컬/구글 색 구분), 할 일, 일기 순으로 dot을 쌓는다 (날짜당 최대 3종).
 */
export function buildMarkedDates(params: {
  events: CalendarEvent[];
  taskDates: string[];
  diaryDates: string[];
  colors: { event: string; googleEvent: string; task: string; diary: string; selected?: string };
  selectedDate?: string;
}): MarkedDates {
  const { events, taskDates, diaryDates, colors, selectedDate } = params;
  const marked: MarkedDates = {};
  const ensure = (key: string) => (marked[key] ??= { dots: [] });
  const addDot = (dateKey: string, dot: Dot) => {
    const entry = ensure(dateKey);
    if (!entry.dots.some((d) => d.key === dot.key)) entry.dots.push(dot);
  };

  for (const e of events) {
    const color = e.source === "google" ? colors.googleEvent : colors.event;
    const key = e.source === "google" ? "google" : "event";
    for (const dateKey of eventDateKeys(e)) addDot(dateKey, { key, color });
  }
  for (const dateKey of taskDates) addDot(dateKey, { key: "task", color: colors.task });
  for (const dateKey of diaryDates) addDot(dateKey, { key: "diary", color: colors.diary });

  if (selectedDate) {
    const entry = ensure(selectedDate);
    entry.selected = true;
    if (colors.selected) entry.selectedColor = colors.selected;
  }
  return marked;
}
