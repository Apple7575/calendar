// 음성 전사 Edge Function: base64 오디오를 받아 OpenAI로 전사한다.
//
// 배포:
//   supabase functions deploy transcribe
//   (OPENAI_API_KEY secret은 ai-report와 공유)

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
  if (!Deno.env.get("OPENAI_API_KEY")) return json({ error: "server_not_configured" }, 500);

  let body: { audioBase64?: string; mime?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (!body.audioBase64) return json({ error: "bad_request" }, 400);

  // base64 → bytes → multipart
  const bytes = Uint8Array.from(atob(body.audioBase64), (ch) => ch.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: body.mime ?? "audio/m4a" }), "audio.m4a");
  form.append("model", "gpt-4o-mini-transcribe");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
    body: form,
  });
  const result = await res.json();
  if (!res.ok) {
    console.error("transcribe error:", result);
    return json({ error: "ai_error", detail: result?.error?.message ?? String(res.status) }, 502);
  }
  return json({ text: result?.text ?? "" }, 200);
});
