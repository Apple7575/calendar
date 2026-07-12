// 자주 먹는 음식: 최근 기록 + 즐겨찾기 (AsyncStorage, 기기 로컬)

import AsyncStorage from "@react-native-async-storage/async-storage";
import { FoodItem } from "./foodDb";

const KEY = "meals.savedFoods";
const MAX = 30;

export type SavedFood = {
  name: string;
  /** 영양 DB에서 고른 경우 100g 기준 값 */
  per100: FoodItem["per100"] | null;
  grams: number | null;
  kcal: number | null;
  fav: boolean;
  lastUsed: number;
};

export async function loadSavedFoods(): Promise<SavedFood[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedFood[]) : [];
  } catch {
    return [];
  }
}

async function persist(list: SavedFood[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/** 식단 저장 시 호출 — 같은 이름은 갱신, 최근순 유지 (즐겨찾기는 밀려나지 않음) */
export async function recordFood(
  entry: Omit<SavedFood, "fav" | "lastUsed">
): Promise<SavedFood[]> {
  const list = await loadSavedFoods();
  const existing = list.find((f) => f.name === entry.name);
  const next: SavedFood[] = [
    { ...entry, fav: existing?.fav ?? false, lastUsed: Date.now() },
    ...list.filter((f) => f.name !== entry.name),
  ];
  const favs = next.filter((f) => f.fav);
  const rest = next.filter((f) => !f.fav).slice(0, Math.max(0, MAX - favs.length));
  const trimmed = [...favs, ...rest];
  await persist(trimmed);
  return trimmed;
}

export async function toggleFavFood(name: string): Promise<SavedFood[]> {
  const list = await loadSavedFoods();
  const next = list.map((f) => (f.name === name ? { ...f, fav: !f.fav } : f));
  await persist(next);
  return next;
}

export async function removeSavedFood(name: string): Promise<SavedFood[]> {
  const list = await loadSavedFoods();
  const next = list.filter((f) => f.name !== name);
  await persist(next);
  return next;
}

/** 표시 순서: 즐겨찾기 먼저, 그 안에서 최근 사용순. 최대 12개 */
export function sortedSavedFoods(list: SavedFood[]): SavedFood[] {
  return [...list]
    .sort((a, b) => (a.fav === b.fav ? b.lastUsed - a.lastUsed : a.fav ? -1 : 1))
    .slice(0, 12);
}
