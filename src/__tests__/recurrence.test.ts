import { buildRRule, expandEventRows } from "../lib/recurrence";
import { EventRow } from "../lib/supabase";

function row(overrides: Partial<EventRow> = {}): EventRow {
  const start = new Date(2026, 6, 6, 19, 0); // 2026-07-06(월) 19:00
  const end = new Date(2026, 6, 6, 20, 0);
  return {
    id: "e1",
    user_id: "u1",
    title: "운동",
    description: null,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    all_day: false,
    google_event_id: null,
    repeat_freq: null,
    repeat_until: null,
    reminder_minutes: null,
    color: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const july = { start: new Date(2026, 6, 1), end: new Date(2026, 7, 1) };

describe("expandEventRows", () => {
  it("반복 없는 일정은 그대로 1개", () => {
    const out = expandEventRows([row()], july.start, july.end);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("e1");
  });

  it("반복 없는 일정이 범위 밖이면 제외", () => {
    const out = expandEventRows([row()], new Date(2026, 7, 1), new Date(2026, 8, 1));
    expect(out).toHaveLength(0);
  });

  it("매일 반복: 7/6 시작이면 7월에 26회", () => {
    const out = expandEventRows([row({ repeat_freq: "daily" })], july.start, july.end);
    expect(out).toHaveLength(26); // 7/6~7/31
    expect(new Date(out[0].startAt).getDate()).toBe(6);
    expect(new Date(out[25].startAt).getDate()).toBe(31);
    // 시간 유지
    expect(new Date(out[10].startAt).getHours()).toBe(19);
  });

  it("매주 반복: 같은 요일(월)로 4회", () => {
    const out = expandEventRows([row({ repeat_freq: "weekly" })], july.start, july.end);
    expect(out.map((e) => new Date(e.startAt).getDate())).toEqual([6, 13, 20, 27]);
    for (const e of out) expect(new Date(e.startAt).getDay()).toBe(1);
  });

  it("repeat_until 포함 종료", () => {
    const out = expandEventRows(
      [row({ repeat_freq: "daily", repeat_until: "2026-07-10" })],
      july.start,
      july.end
    );
    expect(out).toHaveLength(5); // 7/6~7/10
  });

  it("매월 반복: 31일 시작이면 31일 없는 달은 건너뜀", () => {
    const start = new Date(2026, 0, 31, 9, 0); // 1/31
    const r = row({
      start_at: start.toISOString(),
      end_at: new Date(2026, 0, 31, 10, 0).toISOString(),
      repeat_freq: "monthly",
    });
    // 2월 범위: 없음
    expect(expandEventRows([r], new Date(2026, 1, 1), new Date(2026, 2, 1))).toHaveLength(0);
    // 3월 범위: 3/31 1회
    const march = expandEventRows([r], new Date(2026, 2, 1), new Date(2026, 3, 1));
    expect(march).toHaveLength(1);
    expect(new Date(march[0].startAt).getDate()).toBe(31);
  });

  it("오래된 시리즈도 미래 범위를 제대로 확장 (인덱스 점프)", () => {
    const start = new Date(2023, 0, 1, 8, 0); // 3년 반 전 시작 매일 반복
    const r = row({
      start_at: start.toISOString(),
      end_at: new Date(2023, 0, 1, 8, 30).toISOString(),
      repeat_freq: "daily",
    });
    const out = expandEventRows([r], july.start, july.end);
    expect(out).toHaveLength(31); // 7월 매일
  });

  it("자정에 걸친 일정은 시작일 기준 회차가 이전 날 범위에도 잡힌다", () => {
    const start = new Date(2026, 6, 6, 23, 0);
    const r = row({
      start_at: start.toISOString(),
      end_at: new Date(2026, 6, 7, 1, 0).toISOString(),
      repeat_freq: "weekly",
    });
    // 7/7 하루 범위: 7/6 23:00 시작 회차가 겹침
    const out = expandEventRows([r], new Date(2026, 6, 7), new Date(2026, 6, 8));
    expect(out).toHaveLength(1);
  });
});

describe("buildRRule", () => {
  it("기본 주기", () => {
    expect(buildRRule("daily", null, false)).toBe("RRULE:FREQ=DAILY");
    expect(buildRRule("weekly", null, false)).toBe("RRULE:FREQ=WEEKLY");
    expect(buildRRule("monthly", null, false)).toBe("RRULE:FREQ=MONTHLY");
  });

  it("UNTIL: 시간 일정은 UTC datetime, 종일은 날짜만", () => {
    expect(buildRRule("weekly", "2026-12-31", false)).toBe(
      "RRULE:FREQ=WEEKLY;UNTIL=20261231T235959Z"
    );
    expect(buildRRule("weekly", "2026-12-31", true)).toBe(
      "RRULE:FREQ=WEEKLY;UNTIL=20261231"
    );
  });
});
