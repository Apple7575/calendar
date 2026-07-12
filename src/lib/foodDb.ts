// 식약처 식품영양성분 DB 검색 (공공데이터포털 FoodNtrCpntDbInfo02).
// 인아웃 스타일로 핵심만: 100g당 칼로리·탄수화물·단백질·지방(+당류).
// 키는 app.json extra.foodApiKey — 무료 공공 키(과금 없음)라 클라이언트에 둔다.

import Constants from "expo-constants";

const ENDPOINT =
  "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

export type FoodItem = {
  name: string;
  maker: string | null;
  /** 100g 기준 */
  per100: {
    kcal: number | null;
    carb: number | null;
    protein: number | null;
    fat: number | null;
    sugar: number | null;
  };
};

function num(v: unknown): number | null {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function isFoodDbConfigured(): boolean {
  const key = (Constants.expoConfig?.extra as Record<string, string>)?.foodApiKey ?? "";
  return !!key && !key.startsWith("REPLACE");
}

/** 식품명으로 영양성분 검색 (상위 10개) */
export async function searchFood(query: string): Promise<FoodItem[]> {
  const key = (Constants.expoConfig?.extra as Record<string, string>)?.foodApiKey ?? "";
  if (!key || key.startsWith("REPLACE")) {
    throw new Error("영양 DB 키가 없어요. app.json extra.foodApiKey에 발급받은 키를 넣어 주세요.");
  }
  const url =
    `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}` +
    `&type=json&pageNo=1&numOfRows=10&FOOD_NM_KR=${encodeURIComponent(query.trim())}`;
  // 공공데이터 게이트웨이가 간헐적으로 403을 내서 1회 재시도한다
  let res = await fetch(url);
  if (!res.ok) {
    await new Promise((r) => setTimeout(r, 700));
    res = await fetch(url);
  }
  if (!res.ok) {
    throw new Error(
      `영양 DB 요청 실패 (${res.status})${
        res.status === 403 ? " — 방금 발급한 키면 반영까지 잠시 기다려 주세요" : ""
      }`
    );
  }
  const data = (await res.json()) as {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: unknown };
  };
  if (data.header?.resultCode && data.header.resultCode !== "00") {
    throw new Error(`영양 DB 오류: ${data.header.resultMsg ?? data.header.resultCode}`);
  }
  const rawItems = data.body?.items;
  const list: Record<string, unknown>[] = Array.isArray(rawItems)
    ? (rawItems as Record<string, unknown>[])
    : [];
  return list
    .map((it) => {
      // 응답이 { item: {...} }로 감싸져 오는 경우도 처리
      const item = ((it as { item?: Record<string, unknown> }).item ?? it) as Record<
        string,
        unknown
      >;
      return {
        name: String(item.FOOD_NM_KR ?? ""),
        maker: item.MAKER_NM ? String(item.MAKER_NM) : null,
        per100: {
          kcal: num(item.AMT_NUM1), // 에너지(kcal)
          carb: num(item.AMT_NUM6), // 탄수화물(g)
          protein: num(item.AMT_NUM3), // 단백질(g)
          fat: num(item.AMT_NUM4), // 지방(g)
          sugar: num(item.AMT_NUM7), // 당류(g)
        },
      };
    })
    .filter((f) => f.name);
}

/** 그람 수에 맞춰 100g 기준 값을 환산 (grams가 없으면 100g 기준 그대로) */
export function scaleNutrient(per100Value: number | null, grams: number | null): number | null {
  if (per100Value == null) return null;
  const factor = grams != null && grams > 0 ? grams / 100 : 1;
  return Math.round(per100Value * factor * 10) / 10;
}
