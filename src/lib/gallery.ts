// 월별 일기 사진 모아보기 + 좋아요 사진 모아보기

import { ViewerPhoto } from "../navigation/types";
import { DiaryPhotoRow, DiaryRow, supabase } from "./supabase";

export type GalleryPhoto = {
  id: string;
  url: string;
  date: string;
  takenAt: string | null;
  liked: boolean;
  originalPath: string | null;
  lat: number | null;
  lng: number | null;
  place: string | null;
};

export type GalleryMonth = {
  monthKey: string;
  photos: GalleryPhoto[];
};

const SIGNED_URL_TTL_SEC = 3600;
const BUCKET = "diary-photos";

export function galleryPhotoToViewer(p: GalleryPhoto): ViewerPhoto {
  return {
    url: p.url,
    id: p.id,
    takenAt: p.takenAt,
    liked: p.liked,
    originalPath: p.originalPath,
    lat: p.lat,
    lng: p.lng,
    place: p.place,
  };
}

async function withUrls(
  rows: DiaryPhotoRow[],
  dateByDiary: Map<string, string>
): Promise<GalleryPhoto[]> {
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
      takenAt: r.taken_at,
      liked: r.liked,
      originalPath: r.original_path,
      lat: r.lat,
      lng: r.lng,
      place: r.place,
    }))
    .filter((p) => p.url);
}

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

  const photos = await withUrls((photoRows ?? []) as DiaryPhotoRow[], dateByDiary);
  return photos.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 좋아요(하트) 누른 사진 전체 (최신순) */
export async function listLikedPhotos(limit = 300): Promise<GalleryPhoto[]> {
  const { data: photoRows, error } = await supabase
    .from("diary_photos")
    .select("*")
    .eq("liked", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`좋아요 사진을 불러오지 못했어요: ${error.message}`);
  const rows = (photoRows ?? []) as DiaryPhotoRow[];
  if (rows.length === 0) return [];

  const diaryIds = [...new Set(rows.map((r) => r.diary_id))];
  const { data: diaries, error: diaryError } = await supabase
    .from("diaries")
    .select("id, date")
    .in("id", diaryIds);
  if (diaryError) throw new Error(`사진 날짜를 불러오지 못했어요: ${diaryError.message}`);
  const dateByDiary = new Map(
    ((diaries ?? []) as Pick<DiaryRow, "id" | "date">[]).map((d) => [d.id, d.date])
  );

  const photos = await withUrls(rows, dateByDiary);
  return photos.sort((a, b) => (a.date < b.date ? 1 : -1));
}
