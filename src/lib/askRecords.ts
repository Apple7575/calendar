// 내 기록에게 물어보기: 최근 기록을 요약해 AI에게 질문한다.

import { invokeHelper } from "./aiHelper";
import { formatLog, listLogsInRange, logKindOf } from "./dailyLogs";
import { addDays, todayKey } from "./dateUtils";
import { supabase } from "./supabase";
import { dailyTotals, listExercises, listRecentRecords } from "./workouts";

export async function askRecords(question: string): Promise<string> {
  const today = todayKey();
  const from = addDays(today, -365);

  const [{ data: diaries }, logs, exercises, records, { data: anniv }, { data: events }, { data: goals }] =
    await Promise.all([
      supabase
        .from("diaries")
        .select("date, mood, highlight, content")
        .gte("date", from)
        .order("date", { ascending: false })
        .limit(200),
      listLogsInRange(addDays(today, -90), today).catch(() => []),
      listExercises().catch(() => []),
      listRecentRecords().catch(() => []),
      supabase.from("anniversaries").select("title, date, repeat_yearly"),
      supabase.from("life_events").select("year, month, title"),
      supabase.from("goals").select("category, title, done"),
    ]);

  const payload = {
    question,
    today,
    diaries: ((diaries ?? []) as { date: string; mood: string | null; highlight: string | null; content: string }[]).map(
      (d) => ({
        date: d.date,
        mood: d.mood,
        line: d.highlight ?? d.content.slice(0, 60),
      })
    ),
    lifeLogs90d: logs.map((l) => ({
      date: l.date,
      kind: logKindOf(l.kind).label,
      value: formatLog(l),
    })),
    workouts: exercises.map((ex) => {
      const series = dailyTotals(records, ex.id);
      return {
        name: ex.name,
        unit: ex.unit,
        first: series[0] ?? null,
        last: series[series.length - 1] ?? null,
        best: series.reduce((m, s) => Math.max(m, s.total), 0),
      };
    }),
    anniversaries: anniv ?? [],
    lifeEvents: events ?? [],
    goals: goals ?? [],
  };
  return invokeHelper<string>("ask_records", payload);
}
