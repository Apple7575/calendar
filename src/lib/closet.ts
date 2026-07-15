// 코디: 옷장 아이템(옷·신발·헤어·향수) + OOTD 사진 기록

import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;

export const CLOSET_CATEGORIES = ["옷", "신발", "헤어", "향수", "기타"] as const;
export type ClosetCategory = (typeof CLOSET_CATEGORIES)[number];

export type ClosetItemRow = {
  id: string;
  user_id: string;
  category: ClosetCategory;
  title: string;
  note: string | null;
  image_path: string | null;
  fav: boolean;
  created_at: string;
};

export type ClosetItem = ClosetItemRow & { url: string | null };

export type OotdRow = {
  id: string;
  user_id: string;
  date: string;
  note: string | null;
  image_path: string;
  /** 기록한 순간의 기온 ℃ */
  temp_c: number | null;
  /** open-meteo weather code */
  weather_code: number | null;
  created_at: string;
};

export type OotdLog = OotdRow & { url: string | null };

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

/** 이미지 리사이즈 + 업로드 → storage 경로 반환 */
async function uploadImage(localUri: string, userId: string, folder: string): Promise<string> {
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 900 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const path = `${userId}/${folder}/${Crypto.randomUUID()}.jpg`;
  const bytes = await new File(resized.uri).arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg" });
  if (error) throw new Error(`사진 업로드에 실패했어요: ${error.message}`);
  return path;
}

/** storage 경로들 → 서명 URL 매핑 */
async function signUrls(paths: string[]): Promise<Map<string, string>> {
  const urlByPath = new Map<string, string>();
  if (paths.length === 0) return urlByPath;
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SEC);
  for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  return urlByPath;
}

// ---------- 옷장 아이템 ----------

export async function listClosetItems(): Promise<ClosetItem[]> {
  const { data, error } = await supabase
    .from("closet_items")
    .select("*")
    .order("fav", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`옷장을 불러오지 못했어요: ${error.message}`);
  const rows = (data ?? []) as ClosetItemRow[];
  const urlByPath = await signUrls(
    rows.map((r) => r.image_path).filter((p): p is string => !!p)
  );
  return rows.map((r) => ({
    ...r,
    url: r.image_path ? (urlByPath.get(r.image_path) ?? null) : null,
  }));
}

export async function addClosetItem(input: {
  category: ClosetCategory;
  title: string;
  note: string | null;
  localUri: string | null;
}): Promise<void> {
  const userId = await requireUserId();
  const imagePath = input.localUri ? await uploadImage(input.localUri, userId, "closet") : null;
  const { error } = await supabase.from("closet_items").insert({
    user_id: userId,
    category: input.category,
    title: input.title,
    note: input.note,
    image_path: imagePath,
  });
  if (error) {
    if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
    throw new Error(`저장에 실패했어요: ${error.message}`);
  }
}

export async function toggleFavClosetItem(item: ClosetItem): Promise<void> {
  const { error } = await supabase
    .from("closet_items")
    .update({ fav: !item.fav })
    .eq("id", item.id);
  if (error) throw new Error(`즐겨찾기에 실패했어요: ${error.message}`);
}

export async function deleteClosetItem(item: ClosetItem): Promise<void> {
  if (item.image_path) {
    supabase.storage.from(BUCKET).remove([item.image_path]).then(undefined, () => {});
  }
  const { error } = await supabase.from("closet_items").delete().eq("id", item.id);
  if (error) throw new Error(`삭제에 실패했어요: ${error.message}`);
}

// ---------- OOTD ----------

export async function listOotd(): Promise<OotdLog[]> {
  const { data, error } = await supabase
    .from("ootd_logs")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`OOTD를 불러오지 못했어요: ${error.message}`);
  const rows = (data ?? []) as OotdRow[];
  const urlByPath = await signUrls(rows.map((r) => r.image_path));
  return rows.map((r) => ({
    ...r,
    temp_c: r.temp_c != null ? Number(r.temp_c) : null,
    url: urlByPath.get(r.image_path) ?? null,
  }));
}

/** 기간 안에 OOTD를 기록한 날짜들 (캘린더 dot 표시용) */
export async function listOotdDatesInRange(startKey: string, endKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("ootd_logs")
    .select("date")
    .gte("date", startKey)
    .lte("date", endKey);
  if (error) throw new Error(`OOTD 날짜를 불러오지 못했어요: ${error.message}`);
  return [...new Set(((data ?? []) as { date: string }[]).map((r) => r.date))];
}

export async function addOotd(input: {
  date: string;
  note: string | null;
  localUri: string;
  tempC?: number | null;
  weatherCode?: number | null;
}): Promise<void> {
  const userId = await requireUserId();
  const imagePath = await uploadImage(input.localUri, userId, "ootd");
  const { error } = await supabase.from("ootd_logs").insert({
    user_id: userId,
    date: input.date,
    note: input.note,
    image_path: imagePath,
    temp_c: input.tempC ?? null,
    weather_code: input.weatherCode ?? null,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([imagePath]);
    throw new Error(`저장에 실패했어요: ${error.message}`);
  }
}

export async function deleteOotd(log: OotdLog): Promise<void> {
  supabase.storage.from(BUCKET).remove([log.image_path]).then(undefined, () => {});
  const { error } = await supabase.from("ootd_logs").delete().eq("id", log.id);
  if (error) throw new Error(`삭제에 실패했어요: ${error.message}`);
}
