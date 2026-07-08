// 날짜 문자열 규약
// - dateKey: "YYYY-MM-DD" (기기 로컬 기준)
// - monthKey: "YYYY-MM"

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/**
 * 구글 캘린더 fetch 범위: 해당 월의 앞뒤 1개월을 포함.
 * timeMin은 전월 1일 00:00, timeMax는 익월 말일 다음날 00:00 (로컬 기준 ISO).
 */
export function monthFetchRange(monthKey: string): { timeMin: string; timeMax: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 2, 1);
  const end = new Date(y, m + 1, 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

/** 해당 로컬 날짜의 [00:00, 다음날 00:00) 경계 */
export function dayBounds(dateKey: string): { start: Date; end: Date } {
  const start = parseDateKey(dateKey);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return { start, end };
}

/** monthKey에 해당하는 월의 [1일, 익월 1일) 경계 */
export function monthBounds(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}

export function formatKoreanDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS_KO[d.getDay()]})`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "YYYY-MM-DD"에 일수를 더한 dateKey */
export function addDays(dateKey: string, delta: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

/** 두 dateKey 사이(양끝 포함)의 모든 dateKey */
export function dateKeysBetween(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cur = startKey;
  // 안전장치: 잘못된 입력으로 무한루프 방지 (최대 62일)
  for (let i = 0; i < 62 && cur <= endKey; i++) {
    keys.push(cur);
    cur = addDays(cur, 1);
  }
  return keys;
}
