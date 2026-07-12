import { computeStreak, computeStreakWithRecovery, countInMonth } from "../lib/streaks";

describe("computeStreakWithRecovery — 하루 복구 허용", () => {
  it("하루 빠져도 이어진다", () => {
    expect(
      computeStreakWithRecovery(["2026-07-07", "2026-07-09", "2026-07-10"], "2026-07-10")
    ).toBe(3);
  });
  it("이틀 연속 빠지면 끊긴다", () => {
    expect(
      computeStreakWithRecovery(["2026-07-06", "2026-07-09", "2026-07-10"], "2026-07-10")
    ).toBe(2);
  });
  it("오늘 아직 안 했으면 어제 기준", () => {
    expect(computeStreakWithRecovery(["2026-07-08", "2026-07-09"], "2026-07-10")).toBe(2);
  });
  it("기록 없으면 0", () => {
    expect(computeStreakWithRecovery([], "2026-07-10")).toBe(0);
  });
});

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
