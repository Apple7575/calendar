// D-day / 기념일 CRUD

import { AnniversaryRow, supabase } from "./supabase";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listAnniversaries(): Promise<AnniversaryRow[]> {
  const { data, error } = await supabase
    .from("anniversaries")
    .select("*")
    .order("position")
    .order("created_at");
  if (error) throw new Error(`디데이를 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as AnniversaryRow[];
}

export type AnniversaryInput = {
  title: string;
  date: string;
  repeatYearly: boolean;
  emoji: string;
};

export async function addAnniversary(input: AnniversaryInput): Promise<AnniversaryRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("anniversaries")
    .insert({
      user_id: userId,
      title: input.title,
      date: input.date,
      repeat_yearly: input.repeatYearly,
      emoji: input.emoji,
    })
    .select()
    .single();
  if (error) throw new Error(`디데이 저장에 실패했어요: ${error.message}`);
  return data as AnniversaryRow;
}

export async function deleteAnniversary(id: string): Promise<void> {
  const { error } = await supabase.from("anniversaries").delete().eq("id", id);
  if (error) throw new Error(`디데이 삭제에 실패했어요: ${error.message}`);
}
