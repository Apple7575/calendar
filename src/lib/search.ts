import { toDateKey } from "./dateUtils";
import { supabase } from "./supabase";

export type SearchResult = {
  type: "event" | "task" | "diary";
  id: string;
  /** 이동할 날짜 (반복 일정은 첫 회차 날짜) */
  date: string;
  title: string;
  snippet?: string;
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  event: "일정",
  task: "할 일",
  diary: "일기",
};

export function typeLabel(type: SearchResult["type"]): string {
  return TYPE_LABELS[type];
}

/** PostgREST or() 구문과 충돌하는 문자를 제거한 ilike 패턴 */
function likePattern(query: string): string {
  return `%${query.replace(/[,()%]/g, " ").trim()}%`;
}

/** 일정 제목/메모, 할 일, 일기 내용을 통합 검색 (최신 날짜순) */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = likePattern(query);
  if (q === "%%") return [];

  const [events, tasks, diaries] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, start_at")
      .or(`title.ilike.${q},description.ilike.${q}`)
      .limit(50),
    supabase.from("tasks").select("id, title, date").ilike("title", q).limit(50),
    supabase.from("diaries").select("id, content, date").ilike("content", q).limit(50),
  ]);
  if (events.error) throw new Error(`검색에 실패했어요: ${events.error.message}`);
  if (tasks.error) throw new Error(`검색에 실패했어요: ${tasks.error.message}`);
  if (diaries.error) throw new Error(`검색에 실패했어요: ${diaries.error.message}`);

  const results: SearchResult[] = [
    ...(events.data ?? []).map((r) => ({
      type: "event" as const,
      id: r.id as string,
      date: toDateKey(new Date(r.start_at as string)),
      title: r.title as string,
      snippet: (r.description as string | null) ?? undefined,
    })),
    ...(tasks.data ?? []).map((r) => ({
      type: "task" as const,
      id: r.id as string,
      date: r.date as string,
      title: r.title as string,
    })),
    ...(diaries.data ?? []).map((r) => ({
      type: "diary" as const,
      id: r.id as string,
      date: r.date as string,
      title: (r.content as string).slice(0, 60) || "(내용 없는 일기)",
    })),
  ];

  return results.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
