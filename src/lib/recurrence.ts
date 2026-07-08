// 반복 일정 확장 순수 로직. RN/네트워크 의존 없음 — jest 단위 테스트 대상.
//
// 모델: events 행 하나가 시리즈 전체를 나타낸다.
// - start_at/end_at은 첫 회차, repeat_freq가 주기, repeat_until(포함)이 종료일.
// - weekly는 첫 회차와 같은 요일, monthly는 같은 일(day). 없는 날(예: 2월 31일)은 건너뛴다.
// - 수정/삭제는 시리즈 전체 단위 (개별 회차 편집은 MVP 제외).

import { parseDateKey } from "./dateUtils";
import { CalendarEvent } from "./eventMerge";
import { EventRow, RepeatFreq } from "./supabase";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OCCURRENCES_SCAN = 500;

function toCalendarEvent(row: EventRow, startAt: string, endAt: string): CalendarEvent {
  return {
    id: row.id,
    source: "local",
    title: row.title,
    startAt,
    endAt,
    allDay: row.all_day,
    description: row.description ?? undefined,
    googleEventId: row.google_event_id,
  };
}

/** i번째 회차의 시작 시각. 없는 날짜(월 반복의 31일 등)는 null */
function nthOccurrenceStart(first: Date, freq: RepeatFreq, i: number): Date | null {
  if (freq === "daily" || freq === "weekly") {
    const step = freq === "daily" ? 1 : 7;
    return new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate() + step * i,
      first.getHours(),
      first.getMinutes(),
      first.getSeconds()
    );
  }
  const d = new Date(
    first.getFullYear(),
    first.getMonth() + i,
    first.getDate(),
    first.getHours(),
    first.getMinutes(),
    first.getSeconds()
  );
  // 대상 월에 그 일자가 없어 다음 달로 넘어간 경우
  return d.getDate() === first.getDate() ? d : null;
}

/** 범위 시작 직전 회차 인덱스로 점프 (오래된 시리즈의 불필요한 순회 방지) */
function approxStartIndex(first: Date, freq: RepeatFreq, rangeStart: Date): number {
  const diffMs = rangeStart.getTime() - first.getTime();
  if (diffMs <= 0) return 0;
  if (freq === "daily") return Math.max(0, Math.floor(diffMs / DAY_MS) - 2);
  if (freq === "weekly") return Math.max(0, Math.floor(diffMs / (7 * DAY_MS)) - 2);
  const months =
    (rangeStart.getFullYear() - first.getFullYear()) * 12 +
    (rangeStart.getMonth() - first.getMonth());
  return Math.max(0, months - 2);
}

/**
 * 이벤트 행들을 기간 내 표시용 인스턴스로 확장.
 * - 반복 없는 행: 그대로 1개 (기간과 겹칠 때만)
 * - 반복 행: 기간과 겹치는 회차마다 1개 (id는 시리즈 행 id 그대로 — 탭하면 시리즈 편집)
 */
export function expandEventRows(
  rows: EventRow[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const row of rows) {
    const first = new Date(row.start_at);
    const durationMs = Math.max(0, new Date(row.end_at).getTime() - first.getTime());

    if (!row.repeat_freq) {
      if (
        first.getTime() < rangeEnd.getTime() &&
        first.getTime() + durationMs > rangeStart.getTime()
      ) {
        out.push(toCalendarEvent(row, row.start_at, row.end_at));
      }
      continue;
    }

    // repeat_until은 그 날짜까지 포함 (로컬 그 날 23:59:59까지 시작하는 회차 인정)
    const until = row.repeat_until
      ? new Date(parseDateKey(row.repeat_until).getTime() + DAY_MS - 1000)
      : null;

    const startIndex = approxStartIndex(first, row.repeat_freq, rangeStart);
    for (let i = startIndex; i < startIndex + MAX_OCCURRENCES_SCAN; i++) {
      const occStart = nthOccurrenceStart(first, row.repeat_freq, i);
      if (occStart === null) continue;
      if (until && occStart.getTime() > until.getTime()) break;
      if (occStart.getTime() >= rangeEnd.getTime()) break;
      const occEnd = new Date(occStart.getTime() + durationMs);
      if (occEnd.getTime() <= rangeStart.getTime()) continue;
      out.push(toCalendarEvent(row, occStart.toISOString(), occEnd.toISOString()));
    }
  }
  return out;
}

/**
 * 구글 캘린더 recurrence 필드용 RRULE 문자열.
 * UNTIL은 DTSTART 타입과 맞춰야 한다: 종일(date)이면 날짜만, 시간 일정이면 UTC datetime.
 */
export function buildRRule(
  freq: RepeatFreq,
  untilDateKey: string | null,
  allDay: boolean
): string {
  const freqMap: Record<RepeatFreq, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    monthly: "MONTHLY",
  };
  let rule = `RRULE:FREQ=${freqMap[freq]}`;
  if (untilDateKey) {
    const compact = untilDateKey.replace(/-/g, "");
    rule += allDay ? `;UNTIL=${compact}` : `;UNTIL=${compact}T235959Z`;
  }
  return rule;
}

export const REPEAT_LABELS: Record<RepeatFreq, string> = {
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
};
