// 일기 전체를 마크다운으로 내보내기 (공유 시트로 저장/전송)

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { formatKoreanDate, todayKey } from "./dateUtils";
import { DiaryRow, supabase } from "./supabase";

function diaryToMarkdown(d: DiaryRow): string {
  const lines: string[] = [`## ${formatKoreanDate(d.date)}`];
  const meta: string[] = [];
  if (d.mood) meta.push(`기분 ${d.mood}`);
  if (d.energy) meta.push(`에너지 ${"⚡".repeat(d.energy)}`);
  if (d.sleep_hours != null) meta.push(`수면 ${Number(d.sleep_hours)}시간`);
  if (d.people?.length) meta.push(`함께: ${d.people.join(", ")}`);
  if (meta.length) lines.push(`> ${meta.join(" · ")}`);
  if (d.highlight) lines.push(`**${d.highlight}**`);
  if (d.content) lines.push("", d.content);
  if (d.gratitude) lines.push("", `🙏 감사: ${d.gratitude}`);
  return lines.join("\n");
}

/** 모든 일기를 마크다운 파일로 만들어 공유 시트를 연다 */
export async function exportDiariesAsMarkdown(): Promise<number> {
  const { data, error } = await supabase.from("diaries").select("*").order("date");
  if (error) throw new Error(`일기를 불러오지 못했어요: ${error.message}`);
  const diaries = (data ?? []) as DiaryRow[];
  if (diaries.length === 0) throw new Error("내보낼 일기가 아직 없어요.");

  const md = [
    `# 나의 일기 백업`,
    `내보낸 날짜: ${formatKoreanDate(todayKey())} · 총 ${diaries.length}편`,
    "",
    ...diaries.map(diaryToMarkdown),
  ].join("\n\n");

  const uri = `${FileSystem.cacheDirectory}일기백업-${todayKey()}.md`;
  await FileSystem.writeAsStringAsync(uri, md, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("이 기기에서는 공유를 사용할 수 없어요.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "text/markdown",
    dialogTitle: "일기 백업 내보내기",
  });
  return diaries.length;
}
