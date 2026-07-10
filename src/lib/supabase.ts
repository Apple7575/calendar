import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const supabaseUrl = extra.supabaseUrl ?? "";
const supabaseAnonKey = extra.supabaseAnonKey ?? "";

export const isSupabaseConfigured =
  /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) && !supabaseAnonKey.startsWith("REPLACE");

// 키 미설정 상태에서도 앱이 부팅되도록 placeholder로 클라이언트를 만든다.
// (실제 데이터 호출만 실패하고, 화면에서 isSupabaseConfigured로 안내)
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  }
);

// ---- DB 로우 타입 ----

export type RepeatFreq = "daily" | "weekly" | "monthly";

export type EventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  google_event_id: string | null;
  /** null이면 반복 없음 */
  repeat_freq: RepeatFreq | null;
  /** 반복 종료일 "YYYY-MM-DD" (null = 무기한) */
  repeat_until: string | null;
  /** 시작 몇 분 전 알림 (null = 알림 없음, 0 = 정시) */
  reminder_minutes: number | null;
  /** 일정 색상 키 (null = 테마 기본색) */
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  done: boolean;
  position: number;
  created_at: string;
};

export type DiaryRow = {
  id: string;
  user_id: string;
  date: string;
  content: string;
  /** 기분 이모지 (null = 미선택) */
  mood: string | null;
  /** 오늘의 한 줄 (AI 추출 후 사용자 수정 가능) */
  highlight: string | null;
  /** 에너지/컨디션 1~5 */
  energy: number | null;
  /** 수면 시간 (0.5 단위) */
  sleep_hours: number | null;
  /** 함께한 사람 태그 */
  people: string[];
  /** 감사 한 가지 */
  gratitude: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineRow = {
  id: string;
  user_id: string;
  title: string;
  /** 빈 배열 = 매일, 아니면 요일 배열 (0=일 … 6=토) */
  repeat_days: number[];
  active: boolean;
  position: number;
  created_at: string;
};

export type RoutineCheckRow = {
  id: string;
  user_id: string;
  routine_id: string;
  date: string;
  created_at: string;
};

export type DiaryPhotoRow = {
  id: string;
  user_id: string;
  diary_id: string;
  storage_path: string;
  position: number;
  /** 촬영 시각 (EXIF 또는 카메라 촬영 순간, null = 알 수 없음) */
  taken_at: string | null;
  /** 좋아요(하트) */
  liked: boolean;
  /** 시각 오버레이 합성 사진일 때 원본 파일 경로 */
  original_path: string | null;
  created_at: string;
};

export type DiaryLang = "ko" | "en" | "ja";

export type DiaryCorrection = { original: string; corrected: string; note: string };

export type DiaryTranslationRow = {
  id: string;
  user_id: string;
  diary_id: string;
  lang: DiaryLang;
  content: string;
  /** 번역 당시 원문 해시 — 원문이 바뀌면 캐시 무효 */
  source_hash: string;
  /** AI가 감지한 원문 언어 */
  detected_lang: DiaryLang;
  /** 외국어 일기 첨삭 — 원문 언어 행에만 채워짐 */
  corrections: DiaryCorrection[];
  created_at: string;
};

export type ExpressionRow = {
  id: string;
  user_id: string;
  diary_id: string | null;
  date: string;
  lang: "en" | "ja";
  expression: string;
  meaning: string;
  example: string;
  created_at: string;
};
