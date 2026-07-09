import {
  average,
  buildDailySeries,
  lineSegments,
  moodCounts,
  recentDelta,
  weekdayAverages,
} from "../lib/insights";

const rows = [
  { date: "2026-07-01", mood: "😊", energy: 4, sleep_hours: 7.5 },
  { date: "2026-07-03", mood: "😐", energy: 2, sleep_hours: 6 },
];

describe("buildDailySeries", () => {
  it("기간 전체 날짜를 채우고 없는 날은 null", () => {
    const s = buildDailySeries(rows, "2026-07-01", "2026-07-04");
    expect(s.mood.map((p) => p.value)).toEqual([5, null, 3, null]);
    expect(s.energy.map((p) => p.value)).toEqual([4, null, 2, null]);
    expect(s.sleep.map((p) => p.value)).toEqual([7.5, null, 6, null]);
  });

  it("모르는 이모지는 null", () => {
    const s = buildDailySeries(
      [{ date: "2026-07-01", mood: "🤖", energy: null, sleep_hours: null }],
      "2026-07-01",
      "2026-07-01"
    );
    expect(s.mood[0].value).toBeNull();
  });
});

describe("average / recentDelta", () => {
  it("null 제외 평균", () => {
    expect(
      average([
        { date: "a", value: 4 },
        { date: "b", value: null },
        { date: "c", value: 2 },
      ])
    ).toBe(3);
    expect(average([{ date: "a", value: null }])).toBeNull();
  });

  it("최근 7일 vs 이전 7일", () => {
    const points = [
      ...Array.from({ length: 7 }, (_, i) => ({ date: `p${i}`, value: 2 })),
      ...Array.from({ length: 7 }, (_, i) => ({ date: `r${i}`, value: 4 })),
    ];
    const d = recentDelta(points, 7)!;
    expect(d.recent).toBe(4);
    expect(d.previous).toBe(2);
    expect(d.delta).toBe(2);
  });

  it("데이터 부족 시 null", () => {
    expect(recentDelta([{ date: "a", value: 1 }], 7)).toBeNull();
  });
});

describe("weekdayAverages", () => {
  it("요일별 평균 (2026-07-05는 일요일)", () => {
    const out = weekdayAverages([
      { date: "2026-07-05", value: 2 }, // 일
      { date: "2026-07-12", value: 4 }, // 일
      { date: "2026-07-06", value: 5 }, // 월
    ]);
    expect(out[0]).toBe(3);
    expect(out[1]).toBe(5);
    expect(out[2]).toBeNull();
  });
});

describe("moodCounts", () => {
  it("점수 순서대로, 있는 것만", () => {
    const out = moodCounts([
      { date: "a", mood: "😐", energy: null, sleep_hours: null },
      { date: "b", mood: "😊", energy: null, sleep_hours: null },
      { date: "c", mood: "😊", energy: null, sleep_hours: null },
      { date: "d", mood: null, energy: null, sleep_hours: null },
    ]);
    expect(out).toEqual([
      { mood: "😊", count: 2 },
      { mood: "😐", count: 1 },
    ]);
  });
});

describe("lineSegments", () => {
  it("null에서 선이 끊긴다", () => {
    const segs = lineSegments([
      { date: "a", value: 1 },
      { date: "b", value: 2 },
      { date: "c", value: null },
      { date: "d", value: 3 },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0].map((s) => s.index)).toEqual([0, 1]);
    expect(segs[1].map((s) => s.index)).toEqual([3]);
  });
});
