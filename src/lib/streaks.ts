// 일기 작성 스트릭/통계 순수 로직 — jest 단위 테스트 대상.

import { addDays } from "./dateUtils";

/**
 * 연속 작성일 수.
 * 오늘 썼으면 오늘부터, 아직 안 썼으면 어제까지의 연속 기록을 센다
 * (하루가 끝나기 전엔 스트릭이 깨진 것으로 보지 않는다).
 */
export function computeStreak(diaryDates: string[], today: string): number {
  const set = new Set(diaryDates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** 해당 월("YYYY-MM")에 일기를 쓴 날 수 */
export function countInMonth(diaryDates: string[], monthKey: string): number {
  return new Set(diaryDates.filter((d) => d.startsWith(monthKey))).size;
}
