import { computeStreak, countInMonth } from "../lib/streaks";

describe("computeStreak", () => {
  it("오늘 포함 연속", () => {
    expect(computeStreak(["2026-07-06", "2026-07-07", "2026-07-08"], "2026-07-08")).toBe(3);
  });

  it("오늘 아직 안 썼으면 어제까지의 연속을 유지", () => {
    expect(computeStreak(["2026-07-06", "2026-07-07"], "2026-07-08")).toBe(2);
  });

  it("어제도 없으면 0", () => {
    expect(computeStreak(["2026-07-05"], "2026-07-08")).toBe(0);
  });

  it("중간에 빈 날이 있으면 거기서 끊김", () => {
    expect(
      computeStreak(["2026-07-04", "2026-07-05", "2026-07-07", "2026-07-08"], "2026-07-08")
    ).toBe(2);
  });

  it("월 경계를 넘는 연속", () => {
    expect(
      computeStreak(["2026-06-29", "2026-06-30", "2026-07-01"], "2026-07-01")
    ).toBe(3);
  });

  it("빈 배열", () => {
    expect(computeStreak([], "2026-07-08")).toBe(0);
  });
});

describe("countInMonth", () => {
  it("해당 월만 센다 (중복 제거)", () => {
    expect(
      countInMonth(["2026-07-01", "2026-07-02", "2026-07-02", "2026-06-30"], "2026-07")
    ).toBe(2);
  });
});
