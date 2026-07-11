// 생활 기록: 식단/몸무게/걸음수/지출/학습/인바디 등 하루의 수치·텍스트 기록

import { DailyLogRow, supabase } from "./supabase";

export type LogKind = {
  key: string;
  label: string;
  emoji: string;
  /** true면 숫자 입력, false면 텍스트 입력 */
  numeric: boolean;
  unit?: string;
  placeholder: string;
};

export const LOG_KINDS: LogKind[] = [
  { key: "meal", label: "식단", emoji: "🍽️", numeric: false, placeholder: "예: 아침 샐러드, 점심 김치찌개" },
  { key: "weight", label: "몸무게", emoji: "⚖️", numeric: true, unit: "kg", placeholder: "예: 62.5" },
  { key: "steps", label: "걸음수", emoji: "👟", numeric: true, unit: "걸음", placeholder: "예: 8500" },
  { key: "money", label: "지출", emoji: "💸", numeric: true, unit: "원", placeholder: "예: 12000 (메모는 뒤에)" },
  { key: "study", label: "학습", emoji: "✏️", numeric: false, placeholder: "예: 일본어 문법 30분, 알고리즘 1문제" },
  { key: "inbody", label: "인바디", emoji: "📊", numeric: false, placeholder: "예: 체지방 18%, 골격근 32kg" },
];

export function logKindOf(key: string): LogKind {
  return LOG_KINDS.find((k) => k.key === key) ?? LOG_KINDS[0];
}

/** 기록 한 줄 표시용 문자열 */
export function formatLog(row: DailyLogRow): string {
  const kind = logKindOf(row.kind);
  if (row.value_num != null) {
    const num =
      row.kind === "steps" || row.kind === "money"
        ? Number(row.value_num).toLocaleString()
        : String(Number(row.value_num));
    return `${num}${kind.unit ?? ""}${row.value_text ? ` · ${row.value_text}` : ""}`;
  }
  return row.value_text ?? "";
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listLogs(dateKey: string): Promise<DailyLogRow[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("date", dateKey)
    .order("created_at");
  if (error) throw new Error(`기록을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as DailyLogRow[];
}

/** 입력 문자열 파싱: 숫자형 kind면 앞의 숫자를 value_num으로, 나머지는 메모로 */
export async function addLog(dateKey: string, kindKey: string, input: string): Promise<DailyLogRow> {
  const userId = await requireUserId();
  const kind = logKindOf(kindKey);
  let valueNum: number | null = null;
  let valueText: string | null = input.trim() || null;
  if (kind.numeric) {
    const m = /-?[\d,]+(\.\d+)?/.exec(input);
    if (!m) throw new Error(`${kind.label}은(는) 숫자로 입력해 주세요.`);
    valueNum = Number(m[0].replace(/,/g, ""));
    const rest = input.replace(m[0], "").trim();
    valueText = rest || null;
  }
  const { data, error } = await supabase
    .from("daily_logs")
    .insert({ user_id: userId, date: dateKey, kind: kindKey, value_num: valueNum, value_text: valueText })
    .select()
    .single();
  if (error) throw new Error(`기록 저장에 실패했어요: ${error.message}`);
  return data as DailyLogRow;
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from("daily_logs").delete().eq("id", id);
  if (error) throw new Error(`기록 삭제에 실패했어요: ${error.message}`);
}
