// 가벼운 AI 작업 (Edge Function ai-helper 호출):
// 자연어 일정 파싱, 아침 브리핑, 일기 회고 질문.

import { dayBounds, formatKoreanDate, formatTime, todayKey, toDateKey, parseDateKey } from "./dateUtils";
import { CalendarEvent, mapGoogleEvent, mergeEvents } from "./eventMerge";
import { listLocalEventsInRange } from "./events";
import * as googleCalendar from "./googleCalendar";
import { expandEventRows } from "./recurrence";
import { listCheckedRoutineIds, listRoutines, routinesForDate } from "./routines";
import { RepeatFreq, supabase } from "./supabase";

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

async function invokeHelper<T>(task: string, input: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<{ result: T }>("ai-helper", {
    body: { task, input },
  });
  if (error) {
    throw new Error("AI 요청에 실패했어요. ai-helper 함수 배포와 OPENAI_API_KEY 설정을 확인해 주세요.");
  }
  if (data?.result === undefined || data?.result === null) {
    throw new Error("AI 응답이 비어 있어요.");
  }
  return data.result;
}

// ===== 자연어 일정 파싱 =====

export type ParsedEvent = {
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  repeat: RepeatFreq | null;
  reminderMinutes: number | null;
};

export async function parseEventText(text: string): Promise<ParsedEvent> {
  const today = todayKey();
  const weekday = WEEKDAYS_KO[parseDateKey(today).getDay()];
  return invokeHelper<ParsedEvent>("parse_event", { text, today, weekday });
}

/** 파싱 결과 → 시작/종료 Date */
export function parsedEventDates(p: ParsedEvent): { start: Date; end: Date } {
  const base = parseDateKey(p.date);
  if (p.allDay || !p.startTime) {
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 0);
    return { start, end };
  }
  const [sh, sm] = p.startTime.split(":").map(Number);
  const start = new Date(base);
  start.setHours(sh, sm ?? 0, 0, 0);
  let end: Date;
  if (p.endTime) {
    const [eh, em] = p.endTime.split(":").map(Number);
    end = new Date(base);
    end.setHours(eh, em ?? 0, 0, 0);
    if (end.getTime() <= start.getTime()) end = new Date(start.getTime() + 60 * 60 * 1000);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return { start, end };
}

// ===== 그날 데이터 요약 (브리핑/일기 질문 공용) =====

async function collectDayContext(dateKey: string) {
  const { start, end } = dayBounds(dateKey);
  const rows = await listLocalEventsInRange(start, end);
  let events = expandEventRows(rows, start, end);
  try {
    const items = await googleCalendar.listEvents(start.toISOString(), end.toISOString());
    events = mergeEvents(
      events,
      items.map(mapGoogleEvent).filter((e): e is CalendarEvent => e !== null)
    );
  } catch {
    // 구글 미연결 — 로컬만
  }
  const [{ data: taskRows }, allRoutines, checked] = await Promise.all([
    supabase.from("tasks").select("title, done").eq("date", dateKey),
    listRoutines(),
    listCheckedRoutineIds(dateKey),
  ]);
  const routines = routinesForDate(allRoutines, dateKey);
  return {
    date: formatKoreanDate(dateKey),
    events: events
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .map((e) => ({
        title: e.title,
        time: e.allDay ? "종일" : formatTime(e.startAt),
      })),
    tasks: (taskRows ?? []) as { title: string; done: boolean }[],
    routines: routines.map((r) => ({ title: r.title, checked: checked.has(r.id) })),
  };
}

// ===== 아침 브리핑 =====

export async function generateBriefing(dateKey: string): Promise<string> {
  const context = await collectDayContext(dateKey);
  return invokeHelper<string>("briefing", context);
}

// ===== 일기 회고 질문 =====

export type DiaryQuestion = { question: string; options: string[] };

export async function generateDiaryQuestions(
  dateKey: string,
  mood: string | null
): Promise<DiaryQuestion[]> {
  const context = await collectDayContext(dateKey);
  const { questions } = await invokeHelper<{ questions: DiaryQuestion[] }>("diary_questions", {
    ...context,
    mood,
  });
  return questions.slice(0, 3);
}
