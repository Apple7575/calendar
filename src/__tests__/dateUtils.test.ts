import {
  addDays,
  addMonths,
  dateKeysBetween,
  dayBounds,
  formatKoreanDate,
  formatTime,
  monthBounds,
  monthFetchRange,
  monthKeyOf,
  monthsAgoKey,
  parseDateKey,
  toDateKey,
} from "../lib/dateUtils";

describe("dateUtils", () => {
  it("toDateKey / parseDateKey 왕복", () => {
    expect(toDateKey(new Date(2026, 6, 8))).toBe("2026-07-08");
    const d = parseDateKey("2026-07-08");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(8);
  });

  it("한 자리 월/일 zero-pad", () => {
    expect(toDateKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("monthKeyOf / addMonths (연 경계 포함)", () => {
    expect(monthKeyOf("2026-07-08")).toBe("2026-07");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("monthFetchRange는 앞뒤 1개월을 포함한다", () => {
    const { timeMin, timeMax } = monthFetchRange("2026-07");
    expect(new Date(timeMin).getTime()).toBe(new Date(2026, 5, 1).getTime());
    expect(new Date(timeMax).getTime()).toBe(new Date(2026, 8, 1).getTime());
  });

  it("dayBounds는 [자정, 다음날 자정)", () => {
    const { start, end } = dayBounds("2026-07-31");
    expect(toDateKey(start)).toBe("2026-07-31");
    expect(toDateKey(end)).toBe("2026-08-01");
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000);
  });

  it("monthBounds 연말 경계", () => {
    const { start, end } = monthBounds("2026-12");
    expect(toDateKey(start)).toBe("2026-12-01");
    expect(toDateKey(end)).toBe("2027-01-01");
  });

  it("formatKoreanDate", () => {
    // 2026-07-08은 수요일
    expect(formatKoreanDate("2026-07-08")).toBe("2026년 7월 8일 (수)");
  });

  it("formatTime은 로컬 HH:MM", () => {
    const iso = new Date(2026, 6, 8, 14, 5).toISOString();
    expect(formatTime(iso)).toBe("14:05");
  });

  it("addDays 월 경계", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("monthsAgoKey: n개월 전 같은 날, 없는 날은 말일로 클램프", () => {
    expect(monthsAgoKey("2026-07-08", 1)).toBe("2026-06-08");
    expect(monthsAgoKey("2026-07-08", 12)).toBe("2025-07-08");
    expect(monthsAgoKey("2026-03-31", 1)).toBe("2026-02-28"); // 2월 클램프
    expect(monthsAgoKey("2026-01-15", 3)).toBe("2025-10-15"); // 연 경계
  });

  it("dateKeysBetween 양끝 포함", () => {
    expect(dateKeysBetween("2026-07-30", "2026-08-01")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
    ]);
    expect(dateKeysBetween("2026-07-08", "2026-07-08")).toEqual(["2026-07-08"]);
    // end < start면 빈 배열
    expect(dateKeysBetween("2026-07-09", "2026-07-08")).toEqual([]);
  });
});
