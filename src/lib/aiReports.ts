// AI 리포트: 기간 데이터를 모아 Edge Function(ai-report)으로 보낸다.
// 반복 일정 전개/구글 병합 등은 클라이언트 로직을 재사용한다.

import {
  addDays,
  dateKeysBetween,
  dayBounds,
  formatKoreanDate,
  formatTime,
  parseDateKey,
  toDateKey,
} from "./dateUtils";
import { formatLog, listLogs, listLogsInRange, logKindOf } from "./dailyLogs";
import { getDiaryWithPhotos, listDiaryEntriesInRange } from "./diary";
import { CalendarEvent, mapGoogleEvent, mergeEvents } from "./eventMerge";
import { listLocalEventsInRange } from "./events";
import * as googleCalendar from "./googleCalendar";
import { expandEventRows } from "./recurrence";
import { listChecksInRange, listRoutines, routinesForDate } from "./routines";
import { supabase } from "./supabase";

export type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "mood"
  | "coach";

export function periodRange(type: ReportType, periodKey: string): { start: string; end: string } {
  if (type === "daily") return { start: periodKey, end: periodKey };
  if (type === "weekly") return { start: periodKey, end: addDays(periodKey, 6) };
  if (type === "monthly") {
    const [y, m] = periodKey.split("-").map(Number);
    return { start: `${periodKey}-01`, end: toDateKey(new Date(y, m, 0)) };
  }
  if (type === "quarterly") {
    // periodKey: "YYYY-Qn" (1분기=1~3월 … 4분기=10~12월)
    const y = Number(periodKey.slice(0, 4));
    const q = Number(periodKey.slice(6));
    const startMonth = (q - 1) * 3 + 1;
    return {
      start: `${y}-${String(startMonth).padStart(2, "0")}-01`,
      end: toDateKey(new Date(y, startMonth + 2, 0)),
    };
  }
  if (type === "mood") {
    // 해당 월 포함 최근 3개월
    const [y, m] = periodKey.split("-").map(Number);
    return { start: toDateKey(new Date(y, m - 3, 1)), end: toDateKey(new Date(y, m, 0)) };
  }
  if (type === "coach") {
    // periodKey = 주 시작(월요일): 지난주+이번주 2주 창
    return { start: addDays(periodKey, -7), end: addDays(periodKey, 6) };
  }
  return { start: `${periodKey}-01-01`, end: `${periodKey}-12-31` };
}

export function periodLabel(type: ReportType, periodKey: string): string {
  const { start, end } = periodRange(type, periodKey);
  if (type === "daily") return formatKoreanDate(periodKey);
  if (type === "weekly")
    return `${Number(start.slice(5, 7))}/${Number(start.slice(8, 10))} - ${Number(
      end.slice(5, 7)
    )}/${Number(end.slice(8, 10))}`;
  if (type === "monthly") return `${Number(periodKey.slice(0, 4))}년 ${Number(periodKey.slice(5, 7))}월`;
  if (type === "quarterly") {
    const q = Number(periodKey.slice(6));
    return `${Number(periodKey.slice(0, 4))}년 ${q}분기 (${(q - 1) * 3 + 1}~${q * 3}월)`;
  }
  if (type === "coach") return "이번 주 갓생 코칭 (최근 2주 기준)";
  if (type === "mood")
    return `~${Number(periodKey.slice(0, 4))}년 ${Number(periodKey.slice(5, 7))}월 (3개월)`;
  return `${periodKey}년`;
}

export async function getCachedReport(type: ReportType, periodKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_reports")
    .select("content")
    .eq("type", type)
    .eq("period_key", periodKey)
    .maybeSingle();
  if (error) return null;
  return (data as { content: string } | null)?.content ?? null;
}

/** 기간의 이벤트(로컬 전개 + 구글 병합, 구글 실패 시 로컬만) */
async function collectEvents(startKey: string, endKey: string): Promise<{
  events: CalendarEvent[];
  googleIncluded: boolean;
}> {
  const rangeStart = parseDateKey(startKey);
  const rangeEnd = parseDateKey(addDays(endKey, 1));
  const rows = await listLocalEventsInRange(rangeStart, rangeEnd);
  const local = expandEventRows(rows, rangeStart, rangeEnd);
  try {
    const items = await googleCalendar.listEvents(
      rangeStart.toISOString(),
      rangeEnd.toISOString()
    );
    const googleEvents = items
      .map(mapGoogleEvent)
      .filter((e): e is CalendarEvent => e !== null);
    return { events: mergeEvents(local, googleEvents), googleIncluded: true };
  } catch {
    return { events: mergeEvents(local, []), googleIncluded: false };
  }
}

function eventLine(e: CalendarEvent) {
  return {
    date: toDateKey(new Date(e.startAt)),
    title: e.title,
    time: e.allDay ? "종일" : formatTime(e.startAt),
    from: e.source === "google" ? "구글" : "앱",
  };
}

/** 기간 내 루틴 목표/달성 계산 */
async function collectRoutineStats(startKey: string, endKey: string) {
  const [routines, checks] = await Promise.all([
    listRoutines(),
    listChecksInRange(startKey, endKey),
  ]);
  const days = dateKeysBetween(startKey, endKey);
  const checkCountByRoutine = new Map<string, number>();
  for (const ch of checks) {
    checkCountByRoutine.set(ch.routine_id, (checkCountByRoutine.get(ch.routine_id) ?? 0) + 1);
  }
  return routines
    .filter((r) => r.active)
    .map((r) => ({
      title: r.title,
      target: days.filter((d) => routinesForDate([r], d).length > 0).length,
      done: checkCountByRoutine.get(r.id) ?? 0,
    }));
}

async function buildPayload(
  type: ReportType,
  periodKey: string
): Promise<{ payload: Record<string, unknown>; photoUrls: string[] }> {
  const { start, end } = periodRange(type, periodKey);

  if (type === "daily") {
    const { start: ds, end: de } = dayBounds(periodKey);
    const rows = await listLocalEventsInRange(ds, de);
    let events = expandEventRows(rows, ds, de);
    let googleIncluded = false;
    try {
      const items = await googleCalendar.listEvents(ds.toISOString(), de.toISOString());
      events = mergeEvents(
        events,
        items.map(mapGoogleEvent).filter((e): e is CalendarEvent => e !== null)
      );
      googleIncluded = true;
    } catch {
      // 구글 미연결 — 로컬만
    }
    const [{ data: taskRows }, diary, routineStats, dayLogs] = await Promise.all([
      supabase.from("tasks").select("title, done").eq("date", periodKey),
      getDiaryWithPhotos(periodKey),
      collectRoutineStats(start, end),
      listLogs(periodKey).catch(() => []),
    ]);
    return {
      payload: {
        events: events.map(eventLine),
        googleIncluded,
        tasks: (taskRows ?? []) as { title: string; done: boolean }[],
        routines: routineStats,
        // 생활 기록 (운동/식단/몸무게/지출/학습 등)
        lifeLogs: dayLogs.map((l) => ({
          kind: logKindOf(l.kind).label,
          value: formatLog(l),
        })),
        diary: diary.diary
          ? {
              mood: diary.diary.mood,
              content: diary.diary.content.slice(0, 2000),
              highlight: diary.diary.highlight,
              energy: diary.diary.energy,
              sleepHours: diary.diary.sleep_hours,
              people: diary.diary.people,
              gratitude: diary.diary.gratitude,
            }
          : null,
        photoCount: diary.photos.length,
      },
      photoUrls: diary.photos.slice(0, 4).map((p) => p.url),
    };
  }

  if (type === "mood") {
    // 기분 트렌드: 3개월 일기(날짜/요일/기분) + 루틴 달성 + 날짜별 일정 수(로컬)
    const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
    const rangeStart = parseDateKey(start);
    const rangeEnd = parseDateKey(addDays(end, 1));
    const [{ data: entryRows }, routineStats, rows] = await Promise.all([
      supabase
        .from("diaries")
        .select("date, mood, energy, sleep_hours")
        .gte("date", start)
        .lte("date", end)
        .order("date"),
      collectRoutineStats(start, end),
      listLocalEventsInRange(rangeStart, rangeEnd),
    ]);
    const entries = (entryRows ?? []) as {
      date: string;
      mood: string | null;
      energy: number | null;
      sleep_hours: number | null;
    }[];
    const localEvents = expandEventRows(rows, rangeStart, rangeEnd);
    const eventCountByDate: Record<string, number> = {};
    for (const e of localEvents) {
      const key = toDateKey(new Date(e.startAt));
      eventCountByDate[key] = (eventCountByDate[key] ?? 0) + 1;
    }
    const moodCounts: Record<string, number> = {};
    for (const d of entries) if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] ?? 0) + 1;
    return {
      payload: {
        entries: entries.map((d) => ({
          date: d.date,
          weekday: WEEKDAYS_KO[parseDateKey(d.date).getDay()],
          mood: d.mood,
          energy: d.energy,
          sleepHours: d.sleep_hours != null ? Number(d.sleep_hours) : null,
          eventCount: eventCountByDate[d.date] ?? 0,
        })),
        moodCounts,
        routines: routineStats,
        note: "mood가 null이면 기분을 기록하지 않은 일기",
      },
      photoUrls: [],
    };
  }

  if (type === "coach") {
    // 갓생 코칭: 목표 + 최근 2주 생활 기록 요약
    const [{ data: goalRows }, routineStats, { data: taskRows }, { data: diaryRows }] =
      await Promise.all([
        supabase.from("goals").select("category, title, done").order("category"),
        collectRoutineStats(start, end),
        supabase.from("tasks").select("done").gte("date", start).lte("date", end),
        supabase
          .from("diaries")
          .select("date, mood, energy, sleep_hours, highlight")
          .gte("date", start)
          .lte("date", end)
          .order("date"),
      ]);
    const tasks2w = (taskRows ?? []) as { done: boolean }[];
    const diaries2w = (diaryRows ?? []) as {
      date: string;
      mood: string | null;
      energy: number | null;
      sleep_hours: number | null;
      highlight: string | null;
    }[];
    const sleeps = diaries2w
      .map((d) => (d.sleep_hours != null ? Number(d.sleep_hours) : null))
      .filter((v): v is number => v !== null);
    const energies = diaries2w
      .map((d) => d.energy)
      .filter((v): v is number => v !== null);
    return {
      payload: {
        goals: ((goalRows ?? []) as { category: string; title: string; done: boolean }[]),
        recentTwoWeeks: {
          diaryCount: diaries2w.length,
          highlights: diaries2w.map((d) => d.highlight).filter(Boolean).slice(0, 14),
          avgSleepHours: sleeps.length
            ? Math.round((sleeps.reduce((a, b) => a + b, 0) / sleeps.length) * 10) / 10
            : null,
          avgEnergy: energies.length
            ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10
            : null,
          tasksDone: tasks2w.filter((t) => t.done).length,
          tasksTotal: tasks2w.length,
          routines: routineStats,
        },
      },
      photoUrls: [],
    };
  }

  // weekly / monthly / yearly
  const [diaries, routineStats, { data: taskRows }] = await Promise.all([
    listDiaryEntriesInRange(start, end),
    collectRoutineStats(start, end),
    supabase.from("tasks").select("date, done").gte("date", start).lte("date", end),
  ]);
  const tasks = (taskRows ?? []) as { date: string; done: boolean }[];
  const moodCounts: Record<string, number> = {};
  for (const d of diaries) if (d.mood) moodCounts[d.mood] = (moodCounts[d.mood] ?? 0) + 1;

  if (type === "yearly") {
    // 연간: 월별 집계만 (내용은 보내지 않음)
    const { events, googleIncluded } = await collectEvents(start, end);
    const months = Array.from({ length: 12 }, (_, i) => {
      const mk = `${periodKey}-${String(i + 1).padStart(2, "0")}`;
      return {
        month: `${i + 1}월`,
        diaryCount: diaries.filter((d) => d.date.startsWith(mk)).length,
        eventCount: events.filter((e) => toDateKey(new Date(e.startAt)).startsWith(mk)).length,
      };
    });
    return {
      payload: {
        months,
        totals: {
          events: events.length,
          diaries: diaries.length,
          tasksDone: tasks.filter((t) => t.done).length,
          tasksTotal: tasks.length,
        },
        moodCounts,
        routines: routineStats,
        googleIncluded,
      },
      photoUrls: [],
    };
  }

  const { events, googleIncluded } = await collectEvents(start, end);
  const contentLimit = type === "weekly" ? 300 : type === "quarterly" ? 60 : 120;
  // 주간 리포트에는 생활 기록(운동 등)도 포함
  const weekLogs =
    type === "weekly" ? await listLogsInRange(start, end).catch(() => []) : [];
  const { data: diaryContents } = await supabase
    .from("diaries")
    .select("date, mood, content, highlight, energy, sleep_hours, people, gratitude")
    .gte("date", start)
    .lte("date", end)
    .order("date");
  type DiaryDetail = {
    date: string;
    mood: string | null;
    content: string;
    highlight: string | null;
    energy: number | null;
    sleep_hours: number | null;
    people: string[];
    gratitude: string | null;
  };
  return {
    payload: {
      events: events.slice(0, 60).map(eventLine),
      eventCount: events.length,
      googleIncluded,
      tasks: { done: tasks.filter((t) => t.done).length, total: tasks.length },
      routines: routineStats,
      diaries: ((diaryContents ?? []) as DiaryDetail[]).map((d) => ({
        date: d.date,
        mood: d.mood,
        highlight: d.highlight,
        energy: d.energy,
        sleepHours: d.sleep_hours != null ? Number(d.sleep_hours) : null,
        people: d.people,
        gratitude: d.gratitude,
        content: d.content.slice(0, contentLimit),
      })),
      moodCounts,
      ...(weekLogs.length > 0
        ? {
            lifeLogs: weekLogs.map((l) => ({
              date: l.date,
              kind: logKindOf(l.kind).label,
              value: formatLog(l),
            })),
          }
        : {}),
    },
    photoUrls: [],
  };
}

/** 리포트 생성 (또는 캐시 반환). AI 호출은 수십 초 걸릴 수 있다. */
export async function generateReport(
  type: ReportType,
  periodKey: string,
  force: boolean
): Promise<string> {
  const { payload, photoUrls } = await buildPayload(type, periodKey);
  const { data, error } = await supabase.functions.invoke<{ content: string }>("ai-report", {
    body: {
      type,
      periodKey,
      label: periodLabel(type, periodKey),
      payload,
      photoUrls,
      force,
    },
  });
  if (error) {
    throw new Error("리포트 생성에 실패했어요. ai-report 함수 배포와 OPENAI_API_KEY 설정을 확인해 주세요.");
  }
  if (!data?.content) throw new Error("리포트 응답이 비어 있어요.");
  return data.content;
}
