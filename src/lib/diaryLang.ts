// 일기 다국어 번역(한/영/일) + 외국어 첨삭 + 학습 표현 카드.
// 번역은 diary_translations에 캐시하고, 원문이 바뀌면(source_hash 불일치) 다시 생성한다.

import * as Crypto from "expo-crypto";
import { invokeHelper } from "./aiHelper";
import {
  DiaryCorrection,
  DiaryLang,
  DiaryRow,
  DiaryTranslationRow,
  ExpressionRow,
  supabase,
} from "./supabase";

export const LANG_LABELS: Record<DiaryLang, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

export type DiaryTranslations = {
  detected: DiaryLang;
  byLang: Record<DiaryLang, string>;
  corrections: DiaryCorrection[];
};

type TranslateResult = {
  detected: DiaryLang;
  ko: string;
  en: string;
  ja: string;
  corrections: DiaryCorrection[];
  expressions: { lang: "en" | "ja"; expression: string; meaning: string; example: string }[];
};

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

async function hashOf(content: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
}

/**
 * 일기 번역을 가져온다. 캐시가 유효하면 즉시, 아니면 AI로 생성 후 저장.
 * 생성 시 학습 표현(expressions)도 함께 저장된다.
 */
export async function getDiaryTranslations(diary: DiaryRow): Promise<DiaryTranslations> {
  const content = diary.content.trim();
  if (!content) throw new Error("번역할 일기 내용이 없어요.");
  const hash = await hashOf(content);

  const { data: cachedRows, error: cacheError } = await supabase
    .from("diary_translations")
    .select("*")
    .eq("diary_id", diary.id);
  if (cacheError) throw new Error(`번역을 불러오지 못했어요: ${cacheError.message}`);

  const valid = ((cachedRows ?? []) as DiaryTranslationRow[]).filter(
    (r) => r.source_hash === hash
  );
  const langs: DiaryLang[] = ["ko", "en", "ja"];
  if (langs.every((l) => valid.some((r) => r.lang === l))) {
    const byLang = Object.fromEntries(
      langs.map((l) => [l, valid.find((r) => r.lang === l)!.content])
    ) as Record<DiaryLang, string>;
    const detected = valid[0].detected_lang;
    return {
      detected,
      byLang,
      corrections: valid.find((r) => r.lang === detected)?.corrections ?? [],
    };
  }

  // AI 생성
  const result = await invokeHelper<TranslateResult>("translate_diary", {
    date: diary.date,
    content: content.slice(0, 6000),
  });
  const byLang: Record<DiaryLang, string> = {
    ko: result.ko,
    en: result.en,
    ja: result.ja,
  };
  // 원문 언어는 원문을 그대로 보존 (모델이 다듬어 돌려줘도 원문 우선)
  byLang[result.detected] = content;

  const userId = await requireUserId();
  const { error: upsertError } = await supabase.from("diary_translations").upsert(
    langs.map((lang) => ({
      user_id: userId,
      diary_id: diary.id,
      lang,
      content: byLang[lang],
      source_hash: hash,
      detected_lang: result.detected,
      corrections: lang === result.detected ? result.corrections : [],
    })),
    { onConflict: "diary_id,lang" }
  );
  if (upsertError) throw new Error(`번역 저장에 실패했어요: ${upsertError.message}`);

  // 학습 표현 저장 (중복 표현은 무시)
  if (result.expressions.length > 0) {
    await supabase.from("expressions").upsert(
      result.expressions.map((e) => ({
        user_id: userId,
        diary_id: diary.id,
        date: diary.date,
        lang: e.lang,
        expression: e.expression,
        meaning: e.meaning,
        example: e.example,
      })),
      { onConflict: "user_id,lang,expression", ignoreDuplicates: true }
    );
  }

  return { detected: result.detected, byLang, corrections: result.corrections };
}

// ===== 표현 카드 =====

export async function listExpressions(lang?: "en" | "ja"): Promise<ExpressionRow[]> {
  let query = supabase
    .from("expressions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (lang) query = query.eq("lang", lang);
  const { data, error } = await query;
  if (error) throw new Error(`표현 카드를 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as ExpressionRow[];
}

export async function deleteExpression(id: string): Promise<void> {
  const { error } = await supabase.from("expressions").delete().eq("id", id);
  if (error) throw new Error(`표현 삭제에 실패했어요: ${error.message}`);
}

/** 아침 브리핑에 끼워 넣을 복습 표현 하나 (없으면 null) */
export async function randomExpression(): Promise<ExpressionRow | null> {
  const { data, error } = await supabase.from("expressions").select("*").limit(60);
  if (error) return null;
  const rows = (data ?? []) as ExpressionRow[];
  if (rows.length === 0) return null;
  return rows[Math.floor(Math.random() * rows.length)];
}
