// 헬스 앱식 운동 기록: 종목(풀업/푸쉬업…)별 횟수를 날짜로 쌓고 성장 추이를 본다.

import { supabase } from "./supabase";

export type ExerciseRow = {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  position: number;
  created_at: string;
};

export type WorkoutRecordRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  date: string;
  value: number;
  created_at: string;
};

/** 기본 종목 (탭 한 번으로 내 목록에 추가) */
export const DEFAULT_EXERCISES: { name: string; unit: string }[] = [
  { name: "풀업", unit: "개" },
  { name: "푸쉬업", unit: "개" },
  { name: "스쿼트", unit: "개" },
  { name: "벤치프레스", unit: "kg" },
  { name: "데드리프트", unit: "kg" },
  { name: "플랭크", unit: "초" },
  { name: "러닝", unit: "km" },
  { name: "버피", unit: "개" },
];

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listExercises(): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("position")
    .order("created_at");
  if (error) throw new Error(`종목을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as ExerciseRow[];
}

export async function addExercise(name: string, unit: string): Promise<ExerciseRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ user_id: userId, name: name.trim(), unit: unit.trim() || "개" })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("이미 있는 종목이에요.");
    throw new Error(`종목 추가에 실패했어요: ${error.message}`);
  }
  return data as ExerciseRow;
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw new Error(`종목 삭제에 실패했어요: ${error.message}`);
}

export async function addRecord(
  exerciseId: string,
  dateKey: string,
  value: number
): Promise<WorkoutRecordRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("workout_records")
    .insert({ user_id: userId, exercise_id: exerciseId, date: dateKey, value })
    .select()
    .single();
  if (error) throw new Error(`기록 저장에 실패했어요: ${error.message}`);
  return data as WorkoutRecordRow;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from("workout_records").delete().eq("id", id);
  if (error) throw new Error(`기록 삭제에 실패했어요: ${error.message}`);
}

/** 최근 기록 전체 (최신순, 종목별 화면에서 날짜 합계로 가공) */
export async function listRecentRecords(limit = 800): Promise<WorkoutRecordRow[]> {
  const { data, error } = await supabase
    .from("workout_records")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`기록을 불러오지 못했어요: ${error.message}`);
  return ((data ?? []) as WorkoutRecordRow[]).map((r) => ({ ...r, value: Number(r.value) }));
}

/** 종목별 날짜 합계 시계열 (오래된 → 최신) */
export function dailyTotals(
  records: WorkoutRecordRow[],
  exerciseId: string
): { date: string; total: number }[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.exercise_id !== exerciseId) continue;
    map.set(r.date, (map.get(r.date) ?? 0) + r.value);
  }
  return [...map.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 하루 리포트용: 그날의 종목별 합계 */
export async function recordsForDate(
  dateKey: string
): Promise<{ name: string; unit: string; total: number }[]> {
  const [exercises, { data }] = await Promise.all([
    listExercises(),
    supabase.from("workout_records").select("exercise_id, value").eq("date", dateKey),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const totals = new Map<string, number>();
  for (const r of (data ?? []) as { exercise_id: string; value: number }[]) {
    totals.set(r.exercise_id, (totals.get(r.exercise_id) ?? 0) + Number(r.value));
  }
  return [...totals.entries()]
    .map(([id, total]) => {
      const ex = byId.get(id);
      return ex ? { name: ex.name, unit: ex.unit, total } : null;
    })
    .filter((v): v is { name: string; unit: string; total: number } => v !== null);
}
