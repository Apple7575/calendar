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
export function occurrenceIn(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return toDateKey(new Date(year, month - 1, Math.min(day, lastDay)));
}

/** 기념일 외곽선 색 팔레트 — 분야/중요도는 사용자가 색에 의미를 부여해 쓴다 */
export const ANNIV_COLORS: { key: string; hex: string; label: string }[] = [
  { key: "rose", hex: "#FF6B87", label: "핑크" },
  { key: "amber", hex: "#FFB020", label: "노랑" },
  { key: "sky", hex: "#5AA9F5", label: "하늘" },
  { key: "violet", hex: "#9B7DE8", label: "보라" },
  { key: "green", hex: "#3FBF77", label: "초록" },
  { key: "coral", hex: "#FF8A4C", label: "주황" },
];

export function annivHex(key: string): string {
  return ANNIV_COLORS.find((c) => c.key === key)?.hex ?? "#FF6B87";
}

export type AnniversaryLike = { date: string; repeat_yearly: boolean };

/**
 * 기간 내 기념일 발생일 맵 (dateKey → 기념일들).
 * 매년 반복은 기간에 걸친 각 해의 발생일로 펼친다 (2/29는 평년 2/28로).
 */
export function anniversaryOccurrences<T extends AnniversaryLike>(
  rows: T[],
  startKey: string,
  endKey: string
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  const push = (key: string, row: T) => {
    (map[key] ??= []).push(row);
  };
  const startYear = Number(startKey.slice(0, 4));
  const endYear = Number(endKey.slice(0, 4));
  for (const row of rows) {
    if (!row.repeat_yearly) {
      if (row.date >= startKey && row.date <= endKey) push(row.date, row);
      continue;
    }
    const [, m, d] = row.date.split("-").map(Number);
    for (let y = startYear; y <= endYear; y++) {
      const key = occurrenceIn(y, m, d);
      if (key >= startKey && key <= endKey) push(key, row);
    }
  }
  return map;
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
