import { monthWeeks, weekDays, weekStartOf } from "../lib/dateUtils";
import { assignLanes } from "../lib/lanes";

describe("weekStartOf / weekDays", () => {
  it("월요일 시작 주", () => {
    // 2026-07-08은 수요일 → 그 주 월요일은 7/6
    expect(weekStartOf("2026-07-08")).toBe("2026-07-06");
    expect(weekStartOf("2026-07-06")).toBe("2026-07-06");
    // 일요일은 그 주의 마지막 날 → 주 시작은 전 주 월요일
    expect(weekStartOf("2026-07-05")).toBe("2026-06-29");
  });

  it("주 7일 생성 (월 경계 포함)", () => {
    const days = weekDays("2026-06-29");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-06-29");
    expect(days[2]).toBe("2026-07-01");
    expect(days[6]).toBe("2026-07-05");
  });
});

describe("monthWeeks", () => {
  it("2026년 7월은 5주, 인접 월 포함 항상 7일", () => {
    const weeks = monthWeeks("2026-07");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-06-29"); // 첫 주는 6월 말 포함
    expect(weeks[0][2]).toBe("2026-07-01");
    expect(weeks[4][6]).toBe("2026-08-02"); // 마지막 주는 8월 초 포함
    for (const w of weeks) expect(w).toHaveLength(7);
  });

  it("1일이 월요일인 달(2026-06)은 1일부터 시작", () => {
    const weeks = monthWeeks("2026-06");
    expect(weeks[0][0]).toBe("2026-06-01");
    expect(weeks).toHaveLength(5);
    expect(weeks[4][1]).toBe("2026-06-30");
  });
});

describe("assignLanes", () => {
  type E = { id: string; s: number; e: number };
  const lane = (items: E[]) =>
    assignLanes(items, (x) => x.s, (x) => x.e).map((p) => ({
      id: p.item.id,
      lane: p.lane,
      lanes: p.lanes,
    }));

  it("겹치지 않으면 전부 lane 0, lanes 1", () => {
    const out = lane([
      { id: "a", s: 0, e: 10 },
      { id: "b", s: 10, e: 20 },
    ]);
    expect(out).toEqual([
      { id: "a", lane: 0, lanes: 1 },
      { id: "b", lane: 0, lanes: 1 },
    ]);
  });

  it("둘이 겹치면 lane 0/1, lanes 2", () => {
    const out = lane([
      { id: "a", s: 0, e: 10 },
      { id: "b", s: 5, e: 15 },
    ]);
    expect(out.find((o) => o.id === "a")).toEqual({ id: "a", lane: 0, lanes: 2 });
    expect(out.find((o) => o.id === "b")).toEqual({ id: "b", lane: 1, lanes: 2 });
  });

  it("사슬형 겹침은 한 클러스터로 묶인다", () => {
    // a(0-10) ∩ b(5-15), b ∩ c(12-20) — a와 c는 직접 안 겹치지만 같은 클러스터
    const out = lane([
      { id: "a", s: 0, e: 10 },
      { id: "b", s: 5, e: 15 },
      { id: "c", s: 12, e: 20 },
    ]);
    // c는 a가 끝난 lane 0 재사용
    expect(out.find((o) => o.id === "c")!.lane).toBe(0);
    for (const o of out) expect(o.lanes).toBe(2);
  });

  it("클러스터가 끝나면 lane 초기화", () => {
    const out = lane([
      { id: "a", s: 0, e: 10 },
      { id: "b", s: 5, e: 10 },
      { id: "c", s: 20, e: 30 },
    ]);
    expect(out.find((o) => o.id === "c")).toEqual({ id: "c", lane: 0, lanes: 1 });
  });
});
