// 자동 백업: 마지막 백업이 28일보다 오래됐으면 일기 전체를 마크다운으로 만들어
// Storage(diary-photos 버킷의 backups/ 폴더)에 조용히 업로드한다. 앱 실행 시 호출.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { todayKey } from "./dateUtils";
import { DiaryRow, supabase } from "./supabase";

const LAST_KEY = "backup.lastDate";
const BUCKET = "diary-photos";
const INTERVAL_DAYS = 28;

function buildMarkdown(rows: DiaryRow[]): string {
  const lines: string[] = [`# 일기 백업 (${todayKey()} 생성)`, ""];
  for (const d of rows) {
    lines.push(`## ${d.date}${d.mood ? ` ${d.mood}` : ""}`);
    if (d.highlight) lines.push(`> ${d.highlight}`);
    const meta = [
      d.energy ? `에너지 ${d.energy}/5` : null,
      d.sleep_hours != null ? `수면 ${Number(d.sleep_hours)}시간` : null,
      d.people.length ? `함께: ${d.people.join(", ")}` : null,
      d.gratitude ? `감사: ${d.gratitude}` : null,
    ].filter(Boolean);
    if (meta.length) lines.push(`_${meta.join(" · ")}_`);
    if (d.content) lines.push("", d.content);
    lines.push("");
  }
  return lines.join("\n");
}

export async function maybeAutoBackup(): Promise<void> {
  try {
    const last = await AsyncStorage.getItem(LAST_KEY);
    const today = todayKey();
    if (last) {
      const elapsed =
        (new Date(today).getTime() - new Date(last).getTime()) / 86_400_000;
      if (elapsed < INTERVAL_DAYS) return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data, error } = await supabase.from("diaries").select("*").order("date");
    if (error) return;
    const rows = (data ?? []) as DiaryRow[];
    if (rows.length === 0) return;

    const md = buildMarkdown(rows);
    const path = `${userId}/backups/diaries-${today}.md`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, new TextEncoder().encode(md).buffer as ArrayBuffer, {
        contentType: "text/markdown",
        upsert: true,
      });
    if (!uploadError) await AsyncStorage.setItem(LAST_KEY, today);
  } catch {
    // 백업 실패는 조용히 무시 (다음 실행 때 재시도)
  }
}
