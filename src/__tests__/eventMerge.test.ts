import {
  buildMarkedDates,
  CalendarEvent,
  eventDateKeys,
  eventsOnDate,
  GoogleEventItem,
  mapGoogleEvent,
  mergeEvents,
} from "../lib/eventMerge";

const dotColors = {
  event: "#blue",
  googleEvent: "#green",
  task: "#orange",
  diary: "#pink",
};

function localEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "local-1",
    source: "local",
    title: "회의",
    startAt: new Date(2026, 6, 8, 14, 0).toISOString(),
    endAt: new Date(2026, 6, 8, 15, 0).toISOString(),
    allDay: false,
    googleEventId: null,
    ...overrides,
  };
}

describe("mapGoogleEvent", () => {
  it("시간 일정 매핑", () => {
    const item: GoogleEventItem = {
      id: "g1",
      summary: "치과",
      start: { dateTime: "2026-07-08T10:00:00+09:00" },
      end: { dateTime: "2026-07-08T11:00:00+09:00" },
    };
    const e = mapGoogleEvent(item)!;
    expect(e.source).toBe("google");
    expect(e.title).toBe("치과");
    expect(e.allDay).toBe(false);
  });

  it("종일 일정은 exclusive end.date를 하루 앞당긴다", () => {
    const item: GoogleEventItem = {
      id: "g2",
      summary: "여행",
      start: { date: "2026-07-10" },
      end: { date: "2026-07-12" }, // 실제로는 10~11일
    };
    const e = mapGoogleEvent(item)!;
    expect(e.allDay).toBe(true);
    expect(eventDateKeys(e)).toEqual(["2026-07-10", "2026-07-11"]);
  });

  it("하루짜리 종일 일정", () => {
    const item: GoogleEventItem = {
      id: "g3",
      start: { date: "2026-07-08" },
      end: { date: "2026-07-09" },
    };
    const e = mapGoogleEvent(item)!;
    expect(eventDateKeys(e)).toEqual(["2026-07-08"]);
    expect(e.title).toBe("(제목 없음)");
  });

  it("취소된 일정과 시간 없는 일정은 null", () => {
    expect(mapGoogleEvent({ id: "g4", status: "cancelled" })).toBeNull();
    expect(mapGoogleEvent({ id: "g5" })).toBeNull();
  });
});

describe("mergeEvents", () => {
  it("구글에 push된 로컬 일정의 구글 사본을 제거한다", () => {
    const local = [localEvent({ id: "l1", googleEventId: "g-pushed" })];
    const google: CalendarEvent[] = [
      { ...localEvent({ id: "g-pushed" }), source: "google" },
      { ...localEvent({ id: "g-other", title: "다른 일정" }), source: "google" },
    ];
    const merged = mergeEvents(local, google);
    expect(merged).toHaveLength(2);
    expect(merged.map((e) => e.id).sort()).toEqual(["g-other", "l1"]);
  });

  it("push된 반복 일정의 구글 인스턴스(recurringEventId)도 제거한다", () => {
    const local = [localEvent({ id: "l1", googleEventId: "g-series" })];
    const google: CalendarEvent[] = [
      {
        ...localEvent({ id: "g-series_20260708" }),
        source: "google",
        googleRecurringEventId: "g-series",
      },
      {
        ...localEvent({ id: "other_20260708", title: "구글 자체 반복" }),
        source: "google",
        googleRecurringEventId: "other-series",
      },
    ];
    const merged = mergeEvents(local, google);
    expect(merged.map((e) => e.id).sort()).toEqual(["l1", "other_20260708"]);
  });

  it("종일 먼저, 그다음 시작 시각 순 정렬", () => {
    const a = localEvent({ id: "a", startAt: new Date(2026, 6, 8, 15).toISOString() });
    const b = localEvent({ id: "b", startAt: new Date(2026, 6, 8, 9).toISOString() });
    const c = localEvent({
      id: "c",
      allDay: true,
      startAt: new Date(2026, 6, 8, 0).toISOString(),
    });
    const merged = mergeEvents([a, b, c], []);
    expect(merged.map((e) => e.id)).toEqual(["c", "b", "a"]);
  });
});

describe("eventsOnDate", () => {
  it("여러 날에 걸친 일정은 각 날짜에 모두 나온다", () => {
    const e = localEvent({
      startAt: new Date(2026, 6, 8, 22).toISOString(),
      endAt: new Date(2026, 6, 9, 2).toISOString(),
    });
    expect(eventsOnDate([e], "2026-07-08")).toHaveLength(1);
    expect(eventsOnDate([e], "2026-07-09")).toHaveLength(1);
    expect(eventsOnDate([e], "2026-07-10")).toHaveLength(0);
  });
});

describe("buildMarkedDates", () => {
  it("일정/할일/일기 dot을 쌓고 중복 key는 한 번만", () => {
    const events = [
      localEvent(),
      localEvent({ id: "local-2", title: "또 회의" }), // 같은 날 로컬 2개 → dot 1개
      { ...localEvent({ id: "g1" }), source: "google" as const },
    ];
    const marked = buildMarkedDates({
      events,
      taskDates: ["2026-07-08"],
      diaryDates: ["2026-07-09"],
      colors: dotColors,
    });
    expect(marked["2026-07-08"].dots.map((d) => d.key).sort()).toEqual([
      "event",
      "google",
      "task",
    ]);
    expect(marked["2026-07-09"].dots.map((d) => d.key)).toEqual(["diary"]);
  });

  it("selectedDate 표시", () => {
    const marked = buildMarkedDates({
      events: [],
      taskDates: [],
      diaryDates: [],
      colors: { ...dotColors, selected: "#sel" },
      selectedDate: "2026-07-08",
    });
    expect(marked["2026-07-08"].selected).toBe(true);
    expect(marked["2026-07-08"].selectedColor).toBe("#sel");
  });
});
