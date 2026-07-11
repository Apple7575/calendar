// 날짜 꾸미기 CRUD: 사진 배경(image_path)과 스티커(sticker_id)를 한 날짜에
// 같이 쓸 수 있다 — 사진은 달력 셀 배경, 스티커는 그 위 배지.
// 이미지는 업로드 전에 256px JPEG(품질 0.8, 보통 20~40KB)로 압축한다.

import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { DayHighlightRow, supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;
/** 이미지 스티커 한 변 크기(px) — 달력 셀 표시용이라 이 이상은 용량 낭비 */
export const STICKER_IMAGE_SIZE = 256;

/** 한 날짜의 꾸미기 상태 */
export type DayDecoration = {
  stickerId: string | null;
  imageUrl: string | null;
};

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

export async function getHighlight(dateKey: string): Promise<DayHighlightRow | null> {
  const { data, error } = await supabase
    .from("day_highlights")
    .select("*")
    .eq("date", dateKey)
    .maybeSingle();
  if (error) throw new Error(`꾸미기를 불러오지 못했어요: ${error.message}`);
  return (data as DayHighlightRow | null) ?? null;
}

/** 행 → 표시용 꾸미기 (이미지 signed URL 포함) */
export async function decorationOf(row: DayHighlightRow | null): Promise<DayDecoration> {
  if (!row) return { stickerId: null, imageUrl: null };
  return {
    stickerId: row.sticker_id,
    imageUrl: row.image_path ? await signImage(row.image_path) : null,
  };
}

/** 기간 내 꾸미기 맵 (dateKey → DayDecoration) — 월간 달력 표시용 */
export async function listHighlightsInRange(
  startKey: string,
  endKey: string
): Promise<Record<string, DayDecoration>> {
  const { data, error } = await supabase
    .from("day_highlights")
    .select("date, sticker_id, image_path")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`꾸미기를 불러오지 못했어요: ${error.message}`);
  const rows = (data ?? []) as Pick<DayHighlightRow, "date" | "sticker_id" | "image_path">[];

  const urlByPath = new Map<string, string>();
  const imagePaths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(imagePaths, SIGNED_URL_TTL_SEC);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const map: Record<string, DayDecoration> = {};
  for (const row of rows) {
    map[row.date] = {
      stickerId: row.sticker_id,
      imageUrl: row.image_path ? (urlByPath.get(row.image_path) ?? null) : null,
    };
  }
  return map;
}

/** 스티커 설정 — 기존 사진 배경은 유지 */
export async function setSticker(dateKey: string, stickerId: string): Promise<void> {
  const userId = await requireUserId();
  const existing = await getHighlight(dateKey);
  const { error } = await supabase.from("day_highlights").upsert(
    {
      user_id: userId,
      date: dateKey,
      sticker_id: stickerId,
      image_path: existing?.image_path ?? null,
    },
    { onConflict: "user_id,date" }
  );
  if (error) throw new Error(`꾸미기 저장에 실패했어요: ${error.message}`);
}

/**
 * 내 이미지를 배경으로 등록 — 기존 스티커는 유지.
 * 256px JPEG로 압축 후 업로드하고, 표시용 signed URL을 돌려준다.
 */
export async function setImageHighlight(dateKey: string, localUri: string): Promise<string | null> {
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
  if (uploadError) throw new Error(`이미지 업로드에 실패했어요: ${uploadError.message}`);

  const existing = await getHighlight(dateKey);
  const { error } = await supabase.from("day_highlights").upsert(
    {
      user_id: userId,
      date: dateKey,
      sticker_id: existing?.sticker_id ?? null,
      image_path: path,
    },
    { onConflict: "user_id,date" }
  );
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`꾸미기 저장에 실패했어요: ${error.message}`);
  }
  // 교체된 이전 이미지 파일 정리 (best-effort)
  if (existing?.image_path) {
    supabase.storage.from(BUCKET).remove([existing.image_path]).then(undefined, () => {});
  }
  return signImage(path);
}

/** 스티커만 제거 — 사진 배경이 없으면 행 자체를 지운다 */
export async function clearSticker(dateKey: string): Promise<void> {
  const existing = await getHighlight(dateKey);
  if (!existing) return;
  if (existing.image_path) {
    const { error } = await supabase
      .from("day_highlights")
      .update({ sticker_id: null })
      .eq("id", existing.id);
    if (error) throw new Error(`꾸미기 저장에 실패했어요: ${error.message}`);
  } else {
    const { error } = await supabase.from("day_highlights").delete().eq("id", existing.id);
    if (error) throw new Error(`꾸미기 삭제에 실패했어요: ${error.message}`);
  }
}

/** 사진 배경만 제거 — 스티커가 없으면 행 자체를 지운다 */
export async function clearImage(dateKey: string): Promise<void> {
  const existing = await getHighlight(dateKey);
  if (!existing) return;
  if (existing.image_path) {
    supabase.storage.from(BUCKET).remove([existing.image_path]).then(undefined, () => {});
  }
  if (existing.sticker_id) {
    const { error } = await supabase
      .from("day_highlights")
      .update({ image_path: null })
      .eq("id", existing.id);
    if (error) throw new Error(`꾸미기 저장에 실패했어요: ${error.message}`);
  } else {
    const { error } = await supabase.from("day_highlights").delete().eq("id", existing.id);
    if (error) throw new Error(`꾸미기 삭제에 실패했어요: ${error.message}`);
  }
}
