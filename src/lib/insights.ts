// 지표(기분/에너지/수면) 집계 순수 로직 — jest 테스트 대상.

import { dateKeysBetween } from "./dateUtils";

/** 기분 이모지 → 1~5 점수 */
export const MOOD_SCORE: Record<string, number> = {
  "😊": 5,
  "🙂": 4,
  "😐": 3,
  "😢": 2,
  "😠": 1,
};

export type DiaryMetricRow = {
  date: string;
  mood: string | null;
  energy: number | null;
  sleep_hours: number | null;
};

export type MetricPoint = { date: string; value: number | null };

export type MetricSeries = {
  mood: MetricPoint[];
  energy: MetricPoint[];
  sleep: MetricPoint[];
};

/** 기간의 모든 날짜에 대해 지표 시리즈 생성 (기록 없는 날은 null) */
export function buildDailySeries(
  rows: DiaryMetricRow[],
  startKey: string,
  endKey: string
): MetricSeries {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const days = dateKeysBetween(startKey, endKey);
  const point = (date: string, value: number | null): MetricPoint => ({ date, value });
  return {
    mood: days.map((d) => {
      const m = byDate.get(d)?.mood;
      return point(d, m != null ? MOOD_SCORE[m] ?? null : null);
    }),
    energy: days.map((d) => point(d, byDate.get(d)?.energy ?? null)),
    sleep: days.map((d) => {
      const s = byDate.get(d)?.sleep_hours;
      return point(d, s != null ? Number(s) : null);
    }),
  };
}

/** null 제외 평균 (기록이 없으면 null) */
export function average(points: MetricPoint[]): number | null {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 최근 N일 평균 vs 그 이전 N일 평균의 변화.
 * 어느 한쪽에 기록이 없으면 null.
 */
export function recentDelta(
  points: MetricPoint[],
  days = 7
): { recent: number; previous: number; delta: number } | null {
  if (points.length < days * 2) return null;
  const recent = average(points.slice(-days));
  const previous = average(points.slice(-days * 2, -days));
  if (recent === null || previous === null) return null;
  return { recent, previous, delta: recent - previous };
}

/** 요일(0=일…6=토)별 평균. dateKey의 요일은 로컬 기준 */
export function weekdayAverages(points: MetricPoint[]): (number | null)[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const p of points) {
    if (p.value === null) continue;
    const [y, m, d] = p.date.split("-").map(Number);
    buckets[new Date(y, m - 1, d).getDay()].push(p.value);
  }
  return buckets.map((b) => (b.length === 0 ? null : b.reduce((a, v) => a + v, 0) / b.length));
}

/** 기분 이모지별 개수 */
export function moodCounts(rows: DiaryMetricRow[]): { mood: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) if (r.mood) counts.set(r.mood, (counts.get(r.mood) ?? 0) + 1);
  return Object.keys(MOOD_SCORE)
    .filter((m) => counts.has(m))
    .map((m) => ({ mood: m, count: counts.get(m)! }));
}

/** 값이 있는 점만 이어 선분 그룹으로 (기록 없는 날은 선을 끊는다) */
export function lineSegments(points: MetricPoint[]): { index: number; value: number }[][] {
  const segments: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  points.forEach((p, index) => {
    if (p.value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push({ index, value: p.value });
    }
  });
  if (current.length > 0) segments.push(current);
  return segments;
}
