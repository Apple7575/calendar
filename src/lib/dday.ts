// D-day 계산 (순수 로직 — jest 테스트 대상)

import { parseDateKey, toDateKey } from "./dateUtils";

export type DdayInfo = {
  /** 남은 일수. 0 = 오늘, 음수 = 지남(1회성만) */
  days: number;
  /** "D-3" | "D-DAY" | "D+5" */
  label: string;
  /** 다음(또는 해당) 발생일 dateKey */
  upcomingDate: string;
};

function diffDays(fromKey: string, toKey: string): number {
  const ms = parseDateKey(toKey).getTime() - parseDateKey(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

/** year년의 m월 d일. 그 달에 없는 날(2/29 평년)은 말일로 클램프 */
function occurrenceIn(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return toDateKey(new Date(year, month - 1, Math.min(day, lastDay)));
}

/**
 * 기념일의 D-day 정보.
 * repeatYearly=true면 다음 발생일 기준(항상 D-n 또는 D-DAY),
 * false면 그 날짜 기준(지났으면 D+n — 만난 지 n일 같은 카운트업).
 */
export function ddayInfo(eventDate: string, todayKey: string, repeatYearly: boolean): DdayInfo {
  if (!repeatYearly) {
    const days = diffDays(todayKey, eventDate);
    const label = days === 0 ? "D-DAY" : days > 0 ? `D-${days}` : `D+${-days}`;
    return { days, label, upcomingDate: eventDate };
  }
  const [, m, d] = eventDate.split("-").map(Number);
  const thisYear = Number(todayKey.slice(0, 4));
  let next = occurrenceIn(thisYear, m, d);
  if (next < todayKey) next = occurrenceIn(thisYear + 1, m, d);
  const days = diffDays(todayKey, next);
  return { days, label: days === 0 ? "D-DAY" : `D-${days}`, upcomingDate: next };
}
