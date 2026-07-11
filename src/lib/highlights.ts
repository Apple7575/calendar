// 날짜 스티커 꾸미기 CRUD.
// 값 표현: 내장 스티커는 "cat" 같은 id, 내 이미지 스티커는 "img:<signedUrl>" —
// 달력/카드는 문자열 하나만 넘기면 Sticker 컴포넌트가 알아서 그린다.
// 이미지는 업로드 전에 256px 정사각형 JPEG(품질 0.8, 보통 20~40KB)로 압축한다.

import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { DayHighlightRow, supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;
/** 이미지 스티커 한 변 크기(px) — 달력 셀 표시용이라 이 이상은 용량 낭비 */
export const STICKER_IMAGE_SIZE = 256;

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

async function signImage(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SEC);
  return data?.signedUrl ?? null;
}

/** 행 → 표시 값 ("cat" 또는 "img:<url>") */
export async function highlightDisplayValue(row: DayHighlightRow | null): Promise<string | null> {
  if (!row) return null;
  if (row.sticker_id) return row.sticker_id;
  if (row.image_path) {
    const url = await signImage(row.image_path);
    return url ? `img:${url}` : null;
  }
  return null;
}

export async function getHighlight(dateKey: string): Promise<DayHighlightRow | null> {
  const { data, error } = await supabase
    .from("day_highlights")
    .select("*")
    .eq("date", dateKey)
    .maybeSingle();
  if (error) throw new Error(`꾸미기를 불러오지 못했어요: ${error.message}`);
  return (data as DayHighlightRow | null) ?? null;
}

/** 기간 내 스티커 맵 (dateKey → 표시 값) — 월간 달력 표시용 */
export async function listHighlightsInRange(
  startKey: string,
  endKey: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("day_highlights")
    .select("date, sticker_id, image_path")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`꾸미기를 불러오지 못했어요: ${error.message}`);
  const rows = (data ?? []) as Pick<DayHighlightRow, "date" | "sticker_id" | "image_path">[];

  const map: Record<string, string> = {};
  const imageRows = rows.filter((r) => !r.sticker_id && r.image_path);
  let urlByPath = new Map<string, string>();
  if (imageRows.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(imageRows.map((r) => r.image_path!), SIGNED_URL_TTL_SEC);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }
  for (const row of rows) {
    if (row.sticker_id) {
      map[row.date] = row.sticker_id;
    } else if (row.image_path) {
      const url = urlByPath.get(row.image_path);
      if (url) map[row.date] = `img:${url}`;
    }
  }
  return map;
}

/** 교체/삭제 시 이전 이미지 파일 정리 (best-effort) */
async function removeImageFileOf(dateKey: string): Promise<void> {
  try {
    const existing = await getHighlight(dateKey);
    if (existing?.image_path) {
      await supabase.storage.from(BUCKET).remove([existing.image_path]);
    }
  } catch {
    // 파일 정리 실패는 무시
  }
}

export async function setHighlight(dateKey: string, stickerId: string): Promise<void> {
  const userId = await requireUserId();
  await removeImageFileOf(dateKey);
  const { error } = await supabase
    .from("day_highlights")
    .upsert(
      { user_id: userId, date: dateKey, sticker_id: stickerId, image_path: null },
      { onConflict: "user_id,date" }
    );
  if (error) throw new Error(`꾸미기 저장에 실패했어요: ${error.message}`);
}

/**
 * 내 이미지를 스티커로 등록. 256px 정사각형 JPEG로 압축 후 업로드하므로
 * 원본이 커도 저장 용량은 수십 KB 수준이다. 표시 값("img:<url>")을 돌려준다.
 */
export async function setImageHighlight(dateKey: string, localUri: string): Promise<string> {
  const userId = await requireUserId();

  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: STICKER_IMAGE_SIZE } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const path = `${userId}/stickers/${Crypto.randomUUID()}.jpg`;
  const bytes = await new File(resized.uri).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (uploadError) throw new Error(`스티커 업로드에 실패했어요: ${uploadError.message}`);

  await removeImageFileOf(dateKey);
  const { error } = await supabase
    .from("day_highlights")
    .upsert(
      { user_id: userId, date: dateKey, sticker_id: null, image_path: path },
      { onConflict: "user_id,date" }
    );
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`꾸미기 저장에 실패했어요: ${error.message}`);
  }
  const url = await signImage(path);
  return url ? `img:${url}` : "";
}

export async function clearHighlight(dateKey: string): Promise<void> {
  await removeImageFileOf(dateKey);
  const { error } = await supabase.from("day_highlights").delete().eq("date", dateKey);
  if (error) throw new Error(`꾸미기 삭제에 실패했어요: ${error.message}`);
}
