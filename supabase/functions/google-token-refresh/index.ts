// 구글 access token 재발급 Edge Function.
// 클라이언트는 refresh token을 읽을 수 없으므로(RLS), 여기서 service role로 조회해
// 구글 token endpoint로 갱신한다. client secret은 이 함수의 secrets에만 존재한다.
//
// 배포:
//   supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
//   supabase functions deploy google-token-refresh

import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const { data: row, error: rowError } = await admin
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (rowError) return json({ error: "db_error" }, 500);
  if (!row) return json({ error: "not_linked" }, 404);

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return json({ error: "server_not_configured" }, 500);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenBody = await tokenRes.json();

  if (!tokenRes.ok) {
    // 사용자가 구글 계정 설정에서 권한을 회수한 경우 등 — 재연결 필요
    if (tokenBody.error === "invalid_grant") {
      await admin.from("google_tokens").delete().eq("user_id", userId);
      return json({ error: "reauth_required" }, 410);
    }
    return json({ error: "google_error", detail: tokenBody.error ?? null }, 502);
  }

  return json(
    { access_token: tokenBody.access_token, expires_in: tokenBody.expires_in ?? 3600 },
    200
  );
});
