// 생활 기록: 식단/몸무게/걸음수/지출/학습/운동 등 하루의 수치·텍스트 기록

import { invokeHelper } from "./aiHelper";
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
  { key: "workout", label: "운동", emoji: "💪", numeric: false, placeholder: "예: 헬스 1시간(가슴), 러닝 5km" },
  { key: "inbody", label: "인바디", emoji: "📊", numeric: false, placeholder: "예: 체지방 18%, 골격근 32kg" },
  { key: "meds", label: "약·영양제", emoji: "💊", numeric: false, placeholder: "예: 유산균, 비타민D" },
  { key: "media", label: "책·영화", emoji: "🎬", numeric: false, placeholder: "예: 데미안 3장, 영화 인셉션" },
  { key: "sleepwake", label: "기상·취침", emoji: "⏰", numeric: false, placeholder: "예: 기상 7:00, 취침 00:30" },
  { key: "avoid", label: "어김", emoji: "🚫", numeric: false, placeholder: "예: 야식 (하지 않기 항목)" },
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

/** 기간 내 특정 종류 기록 (최신 날짜부터) — 운동 히스토리 등 */
export async function listLogsByKind(
  kind: string,
  startKey: string,
  endKey: string
): Promise<DailyLogRow[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("kind", kind)
    .gte("date", startKey)
    .lte("date", endKey)
    .order("date", { ascending: false })
    .order("created_at");
  if (error) throw new Error(`기록을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as DailyLogRow[];
}

/** 기간 내 전체 생활 기록 — 리포트 데이터용 */
export async function listLogsInRange(startKey: string, endKey: string): Promise<DailyLogRow[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .gte("date", startKey)
    .lte("date", endKey)
    .order("date");
  if (error) throw new Error(`기록을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as DailyLogRow[];
}

/**
 * 말/글 한마디를 여러 기록으로 자동 분해해 저장.
 * "몸무게 62.5고 아침에 샐러드 먹고 헬스 1시간 했어" → 몸무게/식단/운동 3건.
 * 저장된 기록들을 돌려준다.
 */
export async function addLogsFromText(dateKey: string, text: string): Promise<DailyLogRow[]> {
  const { logs } = await invokeHelper<{ logs: { kind: string; text: string }[] }>(
    "parse_logs",
    { text: text.slice(0, 1000) }
  );
  const validKeys = new Set(LOG_KINDS.map((k) => k.key));
  const saved: DailyLogRow[] = [];
  for (const item of logs) {
    if (!validKeys.has(item.kind) || !item.text.trim()) continue;
    try {
      saved.push(await addLog(dateKey, item.kind, item.text));
    } catch {
      // 개별 실패는 건너뜀
    }
  }
  if (saved.length === 0) throw new Error("기록할 내용을 찾지 못했어요. 다시 말해 주세요.");
  return saved;
}
