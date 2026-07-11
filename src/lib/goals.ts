// 방면별 목표 CRUD (관심사 탭 > 목표) + 일기-목표 자동 연결

import { invokeHelper } from "./aiHelper";
import { GoalCheckinRow, GoalRow, supabase } from "./supabase";

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

// ===== 일기 → 목표 자동 연결 (진전 기록) =====

/** 일기 저장 후 best-effort로 호출: AI가 진전 있는 목표를 골라 체크인 기록 */
export async function linkDiaryToGoals(dateKey: string, content: string): Promise<void> {
  try {
    if (!content.trim()) return;
    const goals = await listGoals();
    const active = goals.filter((g) => !g.done);
    if (active.length === 0) return;
    const { links } = await invokeHelper<{ links: { goalId: string; note: string }[] }>(
      "goal_link",
      {
        content: content.slice(0, 3000),
        goals: active.map((g) => ({ id: g.id, title: g.title })),
      }
    );
    if (!links.length) return;
    const userId = await requireUserId();
    const validIds = new Set(active.map((g) => g.id));
    await supabase.from("goal_checkins").upsert(
      links
        .filter((l) => validIds.has(l.goalId))
        .map((l) => ({ user_id: userId, goal_id: l.goalId, date: dateKey, note: l.note })),
      { onConflict: "goal_id,date" }
    );
  } catch {
    // 자동 연결 실패는 조용히 무시
  }
}

/** 목표별 진전 요약 (최근 90일): goalId → { count, lastNote, lastDate } */
export async function checkinSummary(): Promise<
  Record<string, { count: number; lastNote: string; lastDate: string }>
> {
  const { data } = await supabase
    .from("goal_checkins")
    .select("goal_id, date, note")
    .order("date", { ascending: false })
    .limit(300);
  const map: Record<string, { count: number; lastNote: string; lastDate: string }> = {};
  for (const row of (data ?? []) as Pick<GoalCheckinRow, "goal_id" | "date" | "note">[]) {
    if (!map[row.goal_id]) {
      map[row.goal_id] = { count: 1, lastNote: row.note, lastDate: row.date };
    } else {
      map[row.goal_id].count += 1;
    }
  }
  return map;
}
