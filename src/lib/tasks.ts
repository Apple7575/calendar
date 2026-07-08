import { supabase, TaskRow } from "./supabase";

export async function listTasks(dateKey: string): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("date", dateKey)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`할 일을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as TaskRow[];
}

export async function addTask(dateKey: string, title: string): Promise<TaskRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");

  const { data: maxRows } = await supabase
    .from("tasks")
    .select("position")
    .eq("date", dateKey)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = ((maxRows?.[0] as { position: number } | undefined)?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("tasks")
    .insert({ user_id: userId, date: dateKey, title: title.trim(), position: nextPosition })
    .select()
    .single();
  if (error) throw new Error(`할 일 추가에 실패했어요: ${error.message}`);
  return data as TaskRow;
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) throw new Error(`할 일 상태 변경에 실패했어요: ${error.message}`);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`할 일 삭제에 실패했어요: ${error.message}`);
}

/** 기간 내 할 일이 있는 날짜들 (캘린더 dot 표시용) */
export async function listTaskDatesInRange(startKey: string, endKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("date")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`할 일 날짜를 불러오지 못했어요: ${error.message}`);
  return [...new Set(((data ?? []) as { date: string }[]).map((r) => r.date))];
}
