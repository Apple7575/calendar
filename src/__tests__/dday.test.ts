import { ddayInfo } from "../lib/dday";

describe("ddayInfo — 1회성", () => {
  it("미래 날짜는 D-n", () => {
    expect(ddayInfo("2026-07-20", "2026-07-11", false)).toEqual({
      days: 9,
      label: "D-9",
      upcomingDate: "2026-07-20",
    });
  });

  it("당일은 D-DAY", () => {
    expect(ddayInfo("2026-07-11", "2026-07-11", false).label).toBe("D-DAY");
  });

  it("지난 날짜는 D+n (카운트업)", () => {
    const info = ddayInfo("2026-01-01", "2026-07-11", false);
    expect(info.label).toBe("D+191");
    expect(info.days).toBe(-191);
  });
});

describe("ddayInfo — 매년 반복", () => {
  it("올해 발생일이 아직 안 지났으면 올해 기준", () => {
    const info = ddayInfo("1999-08-15", "2026-07-11", true);
    expect(info.upcomingDate).toBe("2026-08-15");
    expect(info.label).toBe("D-35");
  });

  it("올해 발생일이 지났으면 내년 기준", () => {
    const info = ddayInfo("1999-03-01", "2026-07-11", true);
    expect(info.upcomingDate).toBe("2027-03-01");
    expect(info.days).toBeGreaterThan(200);
  });

  it("발생일 당일은 D-DAY", () => {
    expect(ddayInfo("2000-07-11", "2026-07-11", true).label).toBe("D-DAY");
  });

  it("2월 29일 생일은 평년에 2월 28일로", () => {
    // 2026년은 평년
    const info = ddayInfo("2024-02-29", "2026-01-10", true);
    expect(info.upcomingDate).toBe("2026-02-28");
  });
});
