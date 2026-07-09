// AI 리포트 생성 Edge Function.
// 클라이언트가 기간 데이터를 모아 보내면 Claude로 회고 리포트를 생성하고
// ai_reports 테이블에 캐시한다. Anthropic API 키는 이 함수의 secrets에만 존재.
//
// 배포:
//   supabase secrets set ANTHROPIC_API_KEY=...
//   supabase functions deploy ai-report

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

type ReportType = "daily" | "weekly" | "monthly" | "yearly";

const MAX_TOKENS: Record<ReportType, number> = {
  daily: 1200,
  weekly: 1500,
  monthly: 1800,
  yearly: 2200,
};

const INSTRUCTIONS: Record<ReportType, string> = {
  daily:
    "아래 데이터는 사용자의 오늘 하루 기록이야. '오늘의 하루', '잘한 점', '내일을 위한 한마디' 세 부분으로 나눠 따뜻한 하루 정리 리포트를 써줘. 사진이 있다면 사진 속 장면도 자연스럽게 언급해줘.",
  weekly:
    "아래 데이터는 사용자의 한 주 기록이야. '이번 주 돌아보기', '숫자로 보는 한 주'(일정/할 일/루틴/일기 통계), '다음 주를 위한 제안' 세 부분으로 주간 리포트를 써줘.",
  monthly:
    "아래 데이터는 사용자의 한 달 기록이야. '이달의 하이라이트', '기분과 리듬'(기분 분포와 루틴/일기 습관), '다음 달을 위한 제안' 세 부분으로 월간 리포트를 써줘.",
  yearly:
    "아래 데이터는 사용자의 일 년 기록 요약이야. '올해의 발자취', '숫자로 보는 일 년', '내년을 향해' 세 부분으로 연간 회고 리포트를 써줘. 월별 흐름의 변화가 보이면 짚어줘.",
};

const SYSTEM_PROMPT = `너는 개인 캘린더/일기 앱의 회고 도우미야.
- 반드시 한국어로, 다정하지만 과장 없이 담백하게 쓴다.
- 제공된 데이터에 있는 사실만 언급한다. 없는 일을 지어내지 않는다.
- 데이터가 적으면 짧게 쓰고, 기록이 적다는 것을 나무라지 않는다.
- 소제목은 '## '로 시작하고, 본문은 짧은 문단으로 쓴다. 목록이 필요하면 '- '를 쓴다.
- 사용자를 부를 때는 호칭 없이 자연스럽게 쓴다.`;

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

  let body: {
    type?: ReportType;
    periodKey?: string;
    label?: string;
    payload?: unknown;
    photoUrls?: string[];
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const { type, periodKey, label, payload, photoUrls, force } = body;
  if (!type || !periodKey || !payload || !(type in MAX_TOKENS)) {
    return json({ error: "bad_request" }, 400);
  }

  // 캐시 확인
  if (!force) {
    const { data: cached } = await admin
      .from("ai_reports")
      .select("content")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("period_key", periodKey)
      .maybeSingle();
    if (cached) return json({ content: cached.content, cached: true }, 200);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "server_not_configured" }, 500);
  const anthropic = new Anthropic({ apiKey });

  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `${INSTRUCTIONS[type]}\n\n[기간] ${label ?? periodKey}\n[데이터]\n${JSON.stringify(
        payload,
        null,
        1
      )}`,
    },
  ];
  // 하루 리포트에는 일기 사진(최대 4장)을 함께 보여준다
  for (const url of (photoUrls ?? []).slice(0, 4)) {
    content.push({ type: "image", source: { type: "url", url } });
  }

  let text: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: MAX_TOKENS[type],
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") {
      return json({ error: "refused" }, 502);
    }
    const textBlock = response.content.find((b) => b.type === "text");
    text = textBlock && "text" in textBlock ? textBlock.text : "";
    if (!text) return json({ error: "empty_response" }, 502);
  } catch (e) {
    console.error("anthropic error:", e);
    return json({ error: "ai_error" }, 502);
  }

  await admin.from("ai_reports").upsert(
    { user_id: userId, type, period_key: periodKey, content: text },
    { onConflict: "user_id,type,period_key" }
  );

  return json({ content: text, cached: false }, 200);
});
