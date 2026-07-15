// 단어장: 일기·번역에서 만난 영어/일본어 표현을 저장하고 퀴즈로 복습한다.

import { supabase } from "./supabase";
import { detectTtsLang, TtsLang } from "./tts";

export type VocabWord = {
  id: string;
  user_id: string;
  word: string;
  meaning: string;
  lang: TtsLang;
  note: string | null;
  fav: boolean;
  correct_count: number;
  created_at: string;
};

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

export async function listVocab(): Promise<VocabWord[]> {
  const { data, error } = await supabase
    .from("vocab_words")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`단어장을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as VocabWord[];
}

export async function addVocab(input: {
  word: string;
  meaning: string;
  lang?: TtsLang;
  note?: string | null;
}): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("vocab_words").insert({
    user_id: userId,
    word: input.word,
    meaning: input.meaning,
    lang: input.lang ?? detectTtsLang(input.word),
    note: input.note ?? null,
  });
  if (error) {
    if (error.code === "23505") throw new Error("이미 저장한 단어예요.");
    throw new Error(`저장에 실패했어요: ${error.message}`);
  }
}

export async function deleteVocab(id: string): Promise<void> {
  const { error } = await supabase.from("vocab_words").delete().eq("id", id);
  if (error) throw new Error(`삭제에 실패했어요: ${error.message}`);
}

export async function toggleFavVocab(w: VocabWord): Promise<void> {
  const { error } = await supabase.from("vocab_words").update({ fav: !w.fav }).eq("id", w.id);
  if (error) throw new Error(`즐겨찾기에 실패했어요: ${error.message}`);
}

/** 퀴즈에서 맞혔을 때 카운트 올리기 (실패해도 조용히 무시) */
export function recordCorrect(w: VocabWord): void {
  supabase
    .from("vocab_words")
    .update({ correct_count: w.correct_count + 1 })
    .eq("id", w.id)
    .then(undefined, () => {});
}

/** 퀴즈 순서: 덜 맞힌 단어 먼저, 같은 횟수면 섞기 */
export function quizOrder(words: VocabWord[]): VocabWord[] {
  return [...words]
    .map((w) => ({ w, r: Math.random() }))
    .sort((a, b) => a.w.correct_count - b.w.correct_count || a.r - b.r)
    .map(({ w }) => w);
}
