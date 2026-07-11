// 앱 진입 목표 팝업 문구: 목표가 바뀔 때만 AI로 12개를 만들어 캐시하고,
// 앱을 열 때마다 그중 하나를 랜덤으로 보여준다 (매번 AI 호출 없음).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { invokeHelper } from "./aiHelper";
import { listGoals } from "./goals";

const CACHE_KEY = "goal.mottos";

type MottoCache = { sig: string; phrases: string[] };

/** 오늘 보여줄 문구 하나. 목표가 없으면 null (팝업 안 띄움) */
export async function getMotto(): Promise<string | null> {
  try {
    const goals = (await listGoals()).filter((g) => !g.done);
    if (goals.length === 0) return null;
    const sig = goals
      .map((g) => g.title)
      .sort()
      .join("|");

    let cache: MottoCache | null = null;
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        cache = JSON.parse(raw) as MottoCache;
      } catch {
        cache = null;
      }
    }
    if (!cache || cache.sig !== sig || cache.phrases.length === 0) {
      const { phrases } = await invokeHelper<{ phrases: string[] }>("goal_mottos", {
        goals: goals.map((g) => ({ category: g.category, title: g.title })),
      });
      if (!phrases.length) return null;
      cache = { sig, phrases };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
    return cache.phrases[Math.floor(Math.random() * cache.phrases.length)];
  } catch {
    return null; // AI 미설정/실패 시 팝업 생략
  }
}

/** 닫기 버튼 문구 — 매번 다른 동기부여 멘트 */
const CLOSE_LABELS = [
  "한 걸음 더 가볼까 🔥",
  "오늘도 해내러 가기 💪",
  "미래의 나를 만나러 🚀",
  "지금, 시작 ✨",
  "갓생 모드 ON ⚡",
];

export function randomCloseLabel(): string {
  return CLOSE_LABELS[Math.floor(Math.random() * CLOSE_LABELS.length)];
}
