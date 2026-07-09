import { parseDateKey } from "./dateUtils";
import { RoutineCheckRow, RoutineRow, supabase } from "./supabase";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listRoutines(): Promise<RoutineRow[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("*")
    .order("position")
    .order("created_at");
  if (error) throw new Error(`루틴을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as RoutineRow[];
}

/** 해당 날짜(요일)에 해야 하는 활성 루틴. repeat_days 빈 배열 = 매일 */
export function routinesForDate(routines: RoutineRow[], dateKey: string): RoutineRow[] {
  const weekday = parseDateKey(dateKey).getDay();
  return routines.filter(
    (r) => r.active && (r.repeat_days.length === 0 || r.repeat_days.includes(weekday))
  );
}

export async function addRoutine(title: string, repeatDays: number[]): Promise<RoutineRow> {
  const userId = await requireUserId();
  const { data: maxRows } = await supabase
    .from("routines")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = ((maxRows?.[0] as { position: number } | undefined)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("routines")
    .insert({
      user_id: userId,
      title: title.trim(),
      repeat_days: [...new Set(repeatDays)].sort(),
      position: nextPosition,
    })
    .select()
    .single();
  if (error) throw new Error(`루틴 추가에 실패했어요: ${error.message}`);
  return data as RoutineRow;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from("routines").delete().eq("id", id);
  if (error) throw new Error(`루틴 삭제에 실패했어요: ${error.message}`);
}

export async function setRoutineActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("routines").update({ active }).eq("id", id);
  if (error) throw new Error(`루틴 변경에 실패했어요: ${error.message}`);
}

/** 해당 날짜에 체크된 루틴 id 집합 */
export async function listCheckedRoutineIds(dateKey: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("routine_checks")
    .select("routine_id")
    .eq("date", dateKey);
  if (error) throw new Error(`루틴 기록을 불러오지 못했어요: ${error.message}`);
  return new Set(((data ?? []) as { routine_id: string }[]).map((r) => r.routine_id));
}

export async function setRoutineChecked(
  routineId: string,
  dateKey: string,
  checked: boolean
): Promise<void> {
  if (checked) {
    const userId = await requireUserId();
    const { error } = await supabase
      .from("routine_checks")
      .upsert(
        { user_id: userId, routine_id: routineId, date: dateKey },
        { onConflict: "routine_id,date" }
      );
    if (error) throw new Error(`루틴 체크에 실패했어요: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("routine_checks")
      .delete()
      .eq("routine_id", routineId)
      .eq("date", dateKey);
    if (error) throw new Error(`루틴 체크 해제에 실패했어요: ${error.message}`);
  }
}

/** 기간 내 루틴 체크 목록 (AI 리포트/통계용) */
export async function listChecksInRange(
  startKey: string,
  endKey: string
): Promise<RoutineCheckRow[]> {
  const { data, error } = await supabase
    .from("routine_checks")
    .select("*")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`루틴 기록을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as RoutineCheckRow[];
}
