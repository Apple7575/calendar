// 월별 일기 사진 모아보기

import { DiaryPhotoRow, DiaryRow, supabase } from "./supabase";

export type GalleryPhoto = {
  id: string;
  url: string;
  date: string;
};

export type GalleryMonth = {
  monthKey: string;
  photos: GalleryPhoto[];
};

const SIGNED_URL_TTL_SEC = 3600;
const BUCKET = "diary-photos";

/** 특정 월의 일기 사진 전체 (signed URL 포함, 날짜순) */
export async function listMonthPhotos(monthKey: string): Promise<GalleryPhoto[]> {
  const start = `${monthKey}-01`;
  const [y, m] = monthKey.split("-").map(Number);
  const end = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const { data: diaries, error } = await supabase
    .from("diaries")
    .select("id, date")
    .gte("date", start)
    .lte("date", end);
  if (error) throw new Error(`사진을 불러오지 못했어요: ${error.message}`);
  const diaryRows = (diaries ?? []) as Pick<DiaryRow, "id" | "date">[];
  if (diaryRows.length === 0) return [];
  const dateByDiary = new Map(diaryRows.map((d) => [d.id, d.date]));

  const { data: photoRows, error: photoError } = await supabase
    .from("diary_photos")
    .select("*")
    .in("diary_id", diaryRows.map((d) => d.id))
    .order("position");
  if (photoError) throw new Error(`사진을 불러오지 못했어요: ${photoError.message}`);
  const rows = (photoRows ?? []) as DiaryPhotoRow[];
  if (rows.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL_SEC);
  if (signError) throw new Error(`사진 주소 발급에 실패했어요: ${signError.message}`);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows
    .map((r) => ({
      id: r.id,
      url: urlByPath.get(r.storage_path) ?? "",
      date: dateByDiary.get(r.diary_id) ?? "",
    }))
    .filter((p) => p.url)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
