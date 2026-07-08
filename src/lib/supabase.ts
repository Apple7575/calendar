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
  created_at: string;
  updated_at: string;
};

export type DiaryPhotoRow = {
  id: string;
  user_id: string;
  diary_id: string;
  storage_path: string;
  position: number;
  created_at: string;
};
