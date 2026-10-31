import { advanceBoriGrowth, boriWeek } from "../lib/boriGrowth";
import { emptyData, emptyDay } from "../lib/routineModel";

function routineDays(count: number) {
  const data = emptyData();
  for (let i = 0; i < count; i++) data.days[`2026-10-${29 - i}`] = { ...emptyDay(), paid: { morning: 5, words: 0, gym: 0 } };
  return data;
}
it("unlocks a bud on three distinct meaningful days, not three actions in one day", () => {
  expect(advanceBoriGrowth(routineDays(3), "2026-10-29").boriStage).toBe("growing");
  const data = routineDays(1); data.days["2026-10-29"].paid.gym = 30; data.days["2026-10-29"].studySeconds = 14400;
  expect(advanceBoriGrowth(data, "2026-10-29").boriStage).toBe("sprout");
});
it("unlocks flowers on five active days plus three completed routines", () => {
  const data = routineDays(5), next = advanceBoriGrowth(data, "2026-10-29");
  expect(next.boriStage).toBe("blooming");
  expect(next.days).toBe(data.days); // Growth never changes FSRS progress or rewards.
});
it("counts unique completed due cards, not new cards, retries or answer count", () => {
  const data = emptyData(), day = emptyDay();
  day.plan = { ids: ["due", "fresh"], reviewIds: ["due"], newLimit: 1 };
  day.complete = ["due", "due", "fresh"]; day.responses = 100;
  data.days["2026-10-29"] = day;
  expect(boriWeek(data, "2026-10-29")).toMatchObject({ reviewedCards: 1, meaningfulDays: 0 });
});
it("unlocks flowers from fifty due reviews across five days", () => {
  const data = emptyData();
  for (let i = 0; i < 5; i++) {
    const ids = Array.from({ length: 10 }, (_, n) => `word-${i}-${n}`);
    data.days[`2026-10-${29 - i}`] = { ...emptyDay(), plan: { ids, reviewIds: ids, newLimit: 0 }, complete: ids };
  }
  expect(advanceBoriGrowth(data, "2026-10-29").boriStage).toBe("blooming");
});
it("requires the extra milestone beyond five short study days", () => {
  const data = emptyData();
  for (let i = 0; i < 5; i++) data.days[`2026-10-${29 - i}`] = { ...emptyDay(), studySeconds: 900 };
  expect(advanceBoriGrowth(data, "2026-10-29").boriStage).toBe("growing");
  data.days["2026-10-29"].studySeconds = 10800;
  expect(advanceBoriGrowth(data, "2026-10-29").boriStage).toBe("blooming");
});
it("uses an inclusive seven-day window and excludes future records", () => {
  const data = routineDays(7);
  data.days["2026-10-22"] = { ...emptyDay(), studySeconds: 20000 };
  data.days["2026-10-30"] = { ...emptyDay(), studySeconds: 20000 };
  expect(boriWeek(data, "2026-10-29")).toMatchObject({ meaningfulDays: 7, completedRoutines: 7, studySeconds: 0 });
});
it("migrates earned historical growth and retains it after missed days and reload", () => {
  const grown = advanceBoriGrowth(routineDays(5), "2026-12-01");
  expect(grown.boriStage).toBe("blooming");
  const restored = JSON.parse(JSON.stringify(grown));
  expect(advanceBoriGrowth(restored, "2027-01-01")).toBe(restored);
});
it("repeating the same record update never accumulates extra activities", () => {
  const first = advanceBoriGrowth(routineDays(3), "2026-10-29");
  expect(advanceBoriGrowth(first, "2026-10-29")).toBe(first);
  expect(boriWeek(first, "2026-10-29").completedRoutines).toBe(3);
});
