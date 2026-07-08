import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { DiaryPhotoRow, DiaryRow, supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;

export type DiaryPhoto = DiaryPhotoRow & { url: string };
export type DiaryWithPhotos = { diary: DiaryRow | null; photos: DiaryPhoto[] };

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function getDiaryWithPhotos(dateKey: string): Promise<DiaryWithPhotos> {
  const { data: diary, error } = await supabase
    .from("diaries")
    .select("*")
    .eq("date", dateKey)
    .maybeSingle();
  if (error) throw new Error(`일기를 불러오지 못했어요: ${error.message}`);
  if (!diary) return { diary: null, photos: [] };

  const { data: photoRows, error: photoError } = await supabase
    .from("diary_photos")
    .select("*")
    .eq("diary_id", (diary as DiaryRow).id)
    .order("position")
    .order("created_at");
  if (photoError) throw new Error(`사진을 불러오지 못했어요: ${photoError.message}`);

  const rows = (photoRows ?? []) as DiaryPhotoRow[];
  const photos = await withSignedUrls(rows);
  return { diary: diary as DiaryRow, photos };
}

async function withSignedUrls(rows: DiaryPhotoRow[]): Promise<DiaryPhoto[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL_SEC);
  if (error) throw new Error(`사진 주소 발급에 실패했어요: ${error.message}`);
  const urlByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.storage_path) ?? "" }));
}

export async function upsertDiary(dateKey: string, content: string): Promise<DiaryRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("diaries")
    .upsert(
      { user_id: userId, date: dateKey, content, updated_at: new Date().toISOString() },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();
  if (error) throw new Error(`일기 저장에 실패했어요: ${error.message}`);
  return data as DiaryRow;
}

function contentTypeOf(uri: string): { contentType: string; ext: string } {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return { contentType: "image/png", ext: "png" };
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
    return { contentType: "image/heic", ext: "heic" };
  }
  return { contentType: "image/jpeg", ext: "jpg" };
}

/** 기기 사진을 Storage에 올리고 diary_photos 행을 만든다 */
export async function addPhoto(
  diary: DiaryRow,
  localUri: string,
  position: number
): Promise<DiaryPhotoRow> {
  const userId = await requireUserId();
  const { contentType, ext } = contentTypeOf(localUri);
  const path = `${userId}/${diary.id}/${Crypto.randomUUID()}.${ext}`;

  const bytes = await new File(localUri).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType });
  if (uploadError) throw new Error(`사진 업로드에 실패했어요: ${uploadError.message}`);

  const { data, error } = await supabase
    .from("diary_photos")
    .insert({ user_id: userId, diary_id: diary.id, storage_path: path, position })
    .select()
    .single();
  if (error) {
    // DB 기록 실패 시 고아 파일 정리 (best-effort)
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`사진 정보 저장에 실패했어요: ${error.message}`);
  }
  return data as DiaryPhotoRow;
}

export async function deletePhoto(photo: DiaryPhotoRow): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path]);
  if (storageError) throw new Error(`사진 파일 삭제에 실패했어요: ${storageError.message}`);
  const { error } = await supabase.from("diary_photos").delete().eq("id", photo.id);
  if (error) throw new Error(`사진 삭제에 실패했어요: ${error.message}`);
}

/** 기간 내 일기가 있는 날짜들 (캘린더 dot 표시용) */
export async function listDiaryDatesInRange(startKey: string, endKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("diaries")
    .select("date")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`일기 날짜를 불러오지 못했어요: ${error.message}`);
  return ((data ?? []) as { date: string }[]).map((r) => r.date);
}
