import { supabase } from "./supabase";

/** 구글 캘린더가 연결되어 있지 않음 (재로그인/재연결 필요) */
export class GoogleNotLinkedError extends Error {
  constructor(message = "구글 캘린더가 연결되어 있지 않아요. 설정에서 다시 연결해 주세요.") {
    super(message);
    this.name = "GoogleNotLinkedError";
  }
}

type CachedToken = { token: string; expiresAt: number };
let cached: CachedToken | null = null;
let refreshing: Promise<string> | null = null;

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** 로그인 직후 세션에 실려온 provider_token을 메모리에 적재 */
export function primeProviderToken(token: string, expiresInSec: number): void {
  cached = { token, expiresAt: Date.now() + expiresInSec * 1000 };
}

/** 401 등으로 토큰이 무효해졌을 때 강제 무효화 */
export function clearTokenCache(): void {
  cached = null;
}

/** refresh token을 서버(google_tokens)에 저장. 클라이언트는 쓰기만 가능(RLS). */
export async function saveRefreshToken(refreshToken: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from("google_tokens")
    .upsert(
      { user_id: userId, refresh_token: refreshToken, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    // 토큰 저장 실패는 로그인 자체를 막지 않는다 — 이후 갱신 시 재연결 안내로 이어짐
    console.warn("구글 refresh token 저장 실패:", error.message);
  }
}

/**
 * 유효한 구글 access token 반환.
 * 캐시가 만료 임박이면 Edge Function(google-token-refresh)으로 재발급.
 */
export async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return cached.token;
  }
  if (!refreshing) {
    refreshing = refreshAccessToken().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function refreshAccessToken(): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{
    access_token: string;
    expires_in: number;
  }>("google-token-refresh");

  if (error) {
    const status = await functionErrorStatus(error);
    if (status === 404 || status === 410) {
      cached = null;
      throw new GoogleNotLinkedError();
    }
    throw new Error("구글 토큰 갱신에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
  if (!data?.access_token) {
    throw new Error("구글 토큰 응답이 올바르지 않아요.");
  }
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function functionErrorStatus(error: unknown): Promise<number | null> {
  const context = (error as { context?: Response }).context;
  return typeof context?.status === "number" ? context.status : null;
}
