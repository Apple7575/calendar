import type { RoutineData } from "./routineModel";
export type BoriGrowthStage = "sprout" | "growing" | "blooming";
export const boriStageRank = { sprout: 0, growing: 1, blooming: 2 };

function firstDay(end: string): string {
  const [y, m, d] = end.split("-").map(Number), date = new Date(y, m - 1, d - 6, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function boriWeek(data: RoutineData, end: string) {
  const start = firstDay(end);
  let meaningfulDays = 0, reviewedCards = 0, studySeconds = 0, completedRoutines = 0;
  for (const [key, day] of Object.entries(data.days)) {
    if (key < start || key > end) continue;
    const reviewIds = new Set(day.plan?.reviewIds ?? []);
    const reviews = new Set(day.complete.filter(id => reviewIds.has(id))).size;
    const routines = Number(day.paid.morning > 0) + Number(day.paid.gym > 0);
    const seconds = Math.max(0, day.studySeconds);
    if (seconds >= 900 || reviews >= 10 || routines >= 1) meaningfulDays++;
    reviewedCards += reviews; studySeconds += seconds; completedRoutines += routines;
  }
  return { meaningfulDays, reviewedCards, studySeconds, completedRoutines };
}
export function advanceBoriGrowth(data: RoutineData, dayKey: string): RoutineData {
  let stage: BoriGrowthStage = data.boriStage ?? "sprout";
  // Initial migration also recognizes already-earned historical stages.
  const dates = data.boriStage ? [dayKey] : [...Object.keys(data.days).filter(key => key <= dayKey), dayKey];
  for (const end of dates) {
    const week = boriWeek(data, end);
    if (week.meaningfulDays >= 3 && boriStageRank[stage] < 1) stage = "growing";
    if (week.meaningfulDays >= 5 && (week.completedRoutines >= 3 || week.reviewedCards >= 50 || week.studySeconds >= 14400)) stage = "blooming";
    if (stage === "blooming") break;
  }
  return data.boriStage === stage ? data : { ...data, boriStage: stage };
}
