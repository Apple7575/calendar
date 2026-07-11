// 방면별 목표 CRUD (관심사 탭 > 목표)

import { GoalRow, supabase } from "./supabase";

export const GOAL_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "career", label: "커리어", emoji: "💼" },
  { key: "dream", label: "꿈", emoji: "🌠" },
  { key: "money", label: "돈", emoji: "💰" },
  { key: "home", label: "집", emoji: "🏠" },
  { key: "health", label: "건강", emoji: "💪" },
  { key: "learning", label: "배움", emoji: "📚" },
  { key: "relationship", label: "관계", emoji: "🤝" },
  { key: "etc", label: "기타", emoji: "✨" },
];

export function categoryOf(key: string) {
  return GOAL_CATEGORIES.find((c) => c.key === key) ?? GOAL_CATEGORIES[7];
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listGoals(): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("done")
    .order("position")
    .order("created_at");
  if (error) throw new Error(`목표를 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as GoalRow[];
}

export async function addGoal(category: string, title: string): Promise<GoalRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: userId, category, title })
    .select()
    .single();
  if (error) throw new Error(`목표 저장에 실패했어요: ${error.message}`);
  return data as GoalRow;
}

export async function setGoalDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from("goals").update({ done }).eq("id", id);
  if (error) throw new Error(`목표 상태 변경에 실패했어요: ${error.message}`);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(`목표 삭제에 실패했어요: ${error.message}`);
}
