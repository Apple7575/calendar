// 일기 TTS: 언어를 감지(한/영/일)해 그 언어 목소리로 읽어준다.

import * as Speech from "expo-speech";

export type TtsLang = "ko" | "en" | "ja";

const LOCALE: Record<TtsLang, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };

/** 글자 구성으로 언어 추정: 가나 → 일본어, 한글 → 한국어, 그 외 → 영어 */
export function detectTtsLang(text: string): TtsLang {
  if (/[぀-ヿ]/.test(text)) return "ja"; // 히라가나·가타카나
  if (/[가-힯]/.test(text)) return "ko"; // 한글
  return "en";
}

export function stopSpeaking(): void {
  Speech.stop();
}

export const TTS_LOCALES = LOCALE;

/**
 * 문장 단위로 쪼갠다 (듣기 플레이어·쉐도잉용).
 * 한/영/일 문장부호(. ! ? 。 ！ ？)와 줄바꿈 기준, 구분자는 앞 문장에 붙인다.
 */
export function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?。！？\n]+[.!?。！？]*/g) ?? [];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * 읽는 중이면 멈추고 false, 아니면 읽기 시작하고 true.
 * onEnd는 끝나거나 멈추거나 실패할 때 한 번 불린다 (버튼 상태 복구용).
 */
export async function toggleSpeak(
  text: string,
  lang: TtsLang | null,
  onEnd?: () => void
): Promise<boolean> {
  if (await Speech.isSpeakingAsync()) {
    Speech.stop();
    return false;
  }
  Speech.speak(text, {
    language: LOCALE[lang ?? detectTtsLang(text)],
    onDone: onEnd,
    onStopped: onEnd,
    onError: onEnd,
  });
  return true;
}
