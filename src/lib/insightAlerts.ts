// 인사이트 자동 감지 (규칙 기반, AI 호출 없음): 오늘 탭에서 하루 1회 계산.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { listLogsByKind } from "./dailyLogs";
import { addDays, todayKey, weekStartOf } from "./dateUtils";
import { supabase } from "./supabase";

const DISMISS_KEY = "insight.dismissed"; // { date, text }

export async function detectInsight(): Promise<string | null> {
  const today = todayKey();
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (raw) {
      const d = JSON.parse(raw) as { date: string };
      if (d.date === today) return null; // 오늘 이미 닫음
    }
  } catch {
    // 무시
  }

  const [{ data: diaries }, moneyLogs] = await Promise.all([
    supabase
      .from("diaries")
      .select("date, sleep_hours")
      .gte("date", addDays(today, -14))
      .order("date", { ascending: false }),
    listLogsByKind("money", addDays(today, -14), today).catch(() => []),
  ]);
  const dRows = (diaries ?? []) as { date: string; sleep_hours: number | null }[];

  // 1) 수면: 최근 기록 3개 연속 6시간 미만
  const sleeps = dRows
    .filter((d) => d.sleep_hours != null)
    .slice(0, 3)
    .map((d) => Number(d.sleep_hours));
  if (sleeps.length === 3 && sleeps.every((s) => s < 6)) {
    return "최근 3번의 수면이 전부 6시간 미만이에요. 오늘은 조금 일찍 자볼까요? 😴";
  }

  // 2) 지출: 이번 주가 지난주의 1.5배 이상
  const thisWeekStart = weekStartOf(today);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const sum = (from: string, to: string) =>
    moneyLogs
      .filter((l) => l.date >= from && l.date <= to && l.value_num != null)
      .reduce((s, l) => s + Number(l.value_num), 0);
  const thisWeek = sum(thisWeekStart, today);
  const lastWeek = sum(lastWeekStart, addDays(thisWeekStart, -1));
  if (lastWeek > 0 && thisWeek > lastWeek * 1.5) {
    return `이번 주 지출(${thisWeek.toLocaleString()}원)이 지난주의 1.5배를 넘었어요 💸`;
  }

  // 3) 일기 공백 5일 이상
  const lastDiary = dRows[0]?.date;
  if (lastDiary && lastDiary <= addDays(today, -5)) {
    return "일기가 5일째 비어 있어요. 오늘 한 줄이라도 남겨볼까요? ✍️";
  }
  return null;
}

export async function dismissInsight(): Promise<void> {
  await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify({ date: todayKey() }));
}
