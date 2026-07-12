// 이달의 TOP 5: 직접 고른 사진 + 한 줄 설명 (캘린더 탭 상단)

import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;
export const MONTH_TOP_LIMIT = 5;

export type MonthTopItem = {
  id: string;
  monthKey: string;
  imagePath: string;
  caption: string;
  position: number;
  url: string;
};

type Row = {
  id: string;
  month_key: string;
  image_path: string;
  caption: string;
  position: number;
};

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listMonthTop(monthKey: string): Promise<MonthTopItem[]> {
  const { data, error } = await supabase
    .from("month_highlights")
    .select("id, month_key, image_path, caption, position")
    .eq("month_key", monthKey)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`TOP 5를 불러오지 못했어요: ${error.message}`);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.image_path), SIGNED_URL_TTL_SEC);
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  return rows.map((r) => ({
    id: r.id,
    monthKey: r.month_key,
    imagePath: r.image_path,
    caption: r.caption,
    position: r.position,
    url: urlByPath.get(r.image_path) ?? "",
  }));
}

/** 사진 추가 (720px JPEG로 압축 업로드) */
export async function addMonthTop(
  monthKey: string,
  localUri: string,
  caption: string,
  position: number
): Promise<void> {
  const userId = await requireUserId();
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 720 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const path = `${userId}/monthtop/${Crypto.randomUUID()}.jpg`;
  const bytes = await new File(resized.uri).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (uploadError) throw new Error(`사진 업로드에 실패했어요: ${uploadError.message}`);
  const { error } = await supabase.from("month_highlights").insert({
    user_id: userId,
    month_key: monthKey,
    image_path: path,
    caption,
    position,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`저장에 실패했어요: ${error.message}`);
  }
}

/** 순위 저장: 배열 순서대로 position 갱신 */
export async function saveMonthTopOrder(items: MonthTopItem[]): Promise<void> {
  await Promise.all(
    items.map((it, idx) =>
      supabase.from("month_highlights").update({ position: idx }).eq("id", it.id)
    )
  );
}

export async function updateMonthTopCaption(id: string, caption: string): Promise<void> {
  const { error } = await supabase.from("month_highlights").update({ caption }).eq("id", id);
  if (error) throw new Error(`설명 저장에 실패했어요: ${error.message}`);
}

export async function removeMonthTop(item: MonthTopItem): Promise<void> {
  supabase.storage.from(BUCKET).remove([item.imagePath]).then(undefined, () => {});
  const { error } = await supabase.from("month_highlights").delete().eq("id", item.id);
  if (error) throw new Error(`삭제에 실패했어요: ${error.message}`);
}
