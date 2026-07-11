import { anniversaryOccurrences, ddayInfo } from "../lib/dday";

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

describe("anniversaryOccurrences — 달력 외곽선용 발생일 맵", () => {
  const rows = [
    { id: "a", date: "1999-07-20", repeat_yearly: true },
    { id: "b", date: "2026-07-20", repeat_yearly: false },
    { id: "c", date: "2026-08-01", repeat_yearly: false },
  ];

  it("반복/1회성이 같은 날이면 둘 다 모인다", () => {
    const map = anniversaryOccurrences(rows, "2026-07-01", "2026-07-31");
    expect(map["2026-07-20"]?.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(map["2026-08-01"]).toBeUndefined(); // 기간 밖
  });

  it("반복 기념일은 해가 바뀌어도 나온다", () => {
    const map = anniversaryOccurrences(rows, "2027-07-01", "2027-07-31");
    expect(map["2027-07-20"]?.map((r) => r.id)).toEqual(["a"]);
  });

  it("연말~연초에 걸친 기간도 각 해의 발생일을 찾는다", () => {
    const jan1 = [{ id: "x", date: "2000-01-01", repeat_yearly: true }];
    const map = anniversaryOccurrences(jan1, "2026-12-25", "2027-01-05");
    expect(map["2027-01-01"]?.length).toBe(1);
  });
});
