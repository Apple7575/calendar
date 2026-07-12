// 식단 기록: 끼니별 사진·그람·칼로리 (인아웃 스타일)

import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";

const BUCKET = "diary-photos";
const SIGNED_URL_TTL_SEC = 3600;

export const MEAL_SLOTS = ["아침", "점심", "저녁", "간식"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type MealRow = {
  id: string;
  user_id: string;
  date: string;
  slot: MealSlot;
  title: string;
  grams: number | null;
  kcal: number | null;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  image_path: string | null;
  created_at: string;
};

export type Meal = MealRow & { url: string | null };

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listMeals(dateKey: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("date", dateKey)
    .order("created_at");
  if (error) throw new Error(`식단을 불러오지 못했어요: ${error.message}`);
  const rows = (data ?? []) as MealRow[];
  const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SEC);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }
  return rows.map((r) => ({
    ...r,
    grams: r.grams != null ? Number(r.grams) : null,
    kcal: r.kcal != null ? Number(r.kcal) : null,
    carb_g: r.carb_g != null ? Number(r.carb_g) : null,
    protein_g: r.protein_g != null ? Number(r.protein_g) : null,
    fat_g: r.fat_g != null ? Number(r.fat_g) : null,
    url: r.image_path ? (urlByPath.get(r.image_path) ?? null) : null,
  }));
}

export async function addMeal(input: {
  date: string;
  slot: MealSlot;
  title: string;
  grams: number | null;
  kcal: number | null;
  carbG?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
  localUri: string | null;
}): Promise<void> {
  const userId = await requireUserId();
  let imagePath: string | null = null;
  if (input.localUri) {
    const resized = await ImageManipulator.manipulateAsync(
      input.localUri,
      [{ resize: { width: 640 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    imagePath = `${userId}/meals/${Crypto.randomUUID()}.jpg`;
    const bytes = await new File(resized.uri).arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(imagePath, bytes, { contentType: "image/jpeg" });
    if (uploadError) throw new Error(`사진 업로드에 실패했어요: ${uploadError.message}`);
  }
  const { error } = await supabase.from("meals").insert({
    user_id: userId,
    date: input.date,
    slot: input.slot,
    title: input.title,
    grams: input.grams,
    kcal: input.kcal,
    carb_g: input.carbG ?? null,
    protein_g: input.proteinG ?? null,
    fat_g: input.fatG ?? null,
    image_path: imagePath,
  });
  if (error) {
    if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
    throw new Error(`식단 저장에 실패했어요: ${error.message}`);
  }
}

export async function deleteMeal(meal: Meal): Promise<void> {
  if (meal.image_path) {
    supabase.storage.from(BUCKET).remove([meal.image_path]).then(undefined, () => {});
  }
  const { error } = await supabase.from("meals").delete().eq("id", meal.id);
  if (error) throw new Error(`삭제에 실패했어요: ${error.message}`);
}
