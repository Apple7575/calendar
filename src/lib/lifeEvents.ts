// 인생 타임라인: 연도별 큰 사건 기록

import { LifeEventRow, supabase } from "./supabase";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listLifeEvents(): Promise<LifeEventRow[]> {
  const { data, error } = await supabase
    .from("life_events")
    .select("*")
    .order("year", { ascending: false })
    .order("position")
    .order("created_at");
  if (error) throw new Error(`타임라인을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as LifeEventRow[];
}

export async function addLifeEvent(
  year: number,
  month: number | null,
  emoji: string,
  title: string
): Promise<LifeEventRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("life_events")
    .insert({ user_id: userId, year, month, emoji, title })
    .select()
    .single();
  if (error) throw new Error(`타임라인 저장에 실패했어요: ${error.message}`);
  return data as LifeEventRow;
}

export async function deleteLifeEvent(id: string): Promise<void> {
  const { error } = await supabase.from("life_events").delete().eq("id", id);
  if (error) throw new Error(`타임라인 삭제에 실패했어요: ${error.message}`);
}
