import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { clearTokenCache, primeProviderToken, saveRefreshToken } from "./googleTokens";
import { supabase } from "./supabase";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export type SignInResult = { canceled: boolean };

/**
 * Supabase Auth의 구글 OAuth 로그인.
 * Expo Go에서는 tunnel 모드(exp://xxx.exp.direct)로 실행해야 한다 —
 * Supabase가 IP 호스트(exp://192.168.x.x) 리다이렉트를 차단하기 때문.
 */
export async function signInWithGoogle(options: { selectAccount?: boolean } = {}): Promise<SignInResult> {
  const redirectTo = makeRedirectUri();
  const previousUser = (await supabase.auth.getSession()).data.session?.user.id;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      scopes: GOOGLE_CALENDAR_SCOPE,
      queryParams: {
        access_type: "offline",
        prompt: options.selectAccount ? "select_account consent" : "consent",
      },
    },
  });
  if (error) throw new Error(`구글 로그인 시작 실패: ${error.message}`);
  if (!data?.url) throw new Error("구글 로그인 URL을 받지 못했어요.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    return { canceled: true };
  }

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) throw new Error(`로그인 오류: ${errorCode}`);
  if (params.error_description) throw new Error(`로그인 오류: ${params.error_description}`);

  if (params.code) {
    // PKCE 흐름
    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw new Error(`세션 생성 실패: ${exchangeError.message}`);
    if (previousUser !== sessionData.session?.user.id) { clearTokenCache(); invalidateGoogleCache(); }
    await captureProviderTokens(
      sessionData.session?.provider_token,
      sessionData.session?.provider_refresh_token
    );
    return { canceled: false };
  }

  if (params.access_token && params.refresh_token) {
    // implicit 흐름 폴백 (토큰이 URL fragment로 오는 경우)
    const { data: sessionData, error: setError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (setError) throw new Error(`세션 생성 실패: ${setError.message}`);
    if (previousUser !== sessionData.session?.user.id) { clearTokenCache(); invalidateGoogleCache(); }
    await captureProviderTokens(
      (sessionData.session as { provider_token?: string } | null)?.provider_token ??
        params.provider_token,
      (sessionData.session as { provider_refresh_token?: string } | null)
        ?.provider_refresh_token ?? params.provider_refresh_token
    );
    return { canceled: false };
  }

  throw new Error("로그인 응답에서 인증 정보를 찾지 못했어요.");
}

async function captureProviderTokens(
  providerToken: string | null | undefined,
  providerRefreshToken: string | null | undefined
) {
  if (providerToken) {
    // 구글 access token 기본 수명 1시간
    primeProviderToken(providerToken, 3600);
  }
  if (providerRefreshToken) {
    // prompt=consent 로그인에서만 확실히 오므로, 있을 때만 갱신하고 없으면 기존 저장분 유지
    await saveRefreshToken(providerRefreshToken);
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error(`로그아웃 실패: ${error.message}`);
  clearTokenCache(); invalidateGoogleCache();
}
