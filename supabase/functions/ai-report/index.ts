// AI 리포트 생성 Edge Function (OpenAI).
// 클라이언트가 기간 데이터를 모아 보내면 리포트를 생성하고 ai_reports에 캐시한다.
// OpenAI API 키는 이 함수의 secrets에만 존재.
//
// 배포:
//   supabase secrets set OPENAI_API_KEY=...
//   supabase functions deploy ai-report

import { createClient } from "npm:@supabase/supabase-js@2";

type ReportType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "mood" | "coach";

// 기능별 모델: 가벼운 요약은 mini, 긴 분석·글쓰기는 gpt-5
const MODELS: Record<ReportType, string> = {
  daily: "gpt-5-mini",
  weekly: "gpt-5-mini",
  monthly: "gpt-5",
  quarterly: "gpt-5",
  yearly: "gpt-5",
  mood: "gpt-5",
  coach: "gpt-5",
};

const MAX_TOKENS: Record<ReportType, number> = {
  daily: 2500,
  weekly: 3000,
  monthly: 3500,
  quarterly: 3500,
  yearly: 4000,
  mood: 3500,
  coach: 3000,
};

const INSTRUCTIONS: Record<ReportType, string> = {
  daily:
    "아래 데이터는 사용자의 오늘 하루 기록이야. '오늘의 하루', '잘한 점', '내일을 위한 한마디' 세 부분으로 나눠 따뜻한 하루 정리 리포트를 써줘. 사진이 있다면 사진 속 장면도 자연스럽게 언급해줘.",
  weekly:
    "아래 데이터는 사용자의 한 주 기록이야. '이번 주 돌아보기', '숫자로 보는 한 주'(일정/할 일/루틴/일기 통계), '다음 주를 위한 제안' 세 부분으로 주간 리포트를 써줘.",
  monthly:
    "아래 데이터는 사용자의 한 달 기록이야. '이달의 하이라이트', '기분과 리듬'(기분 분포와 루틴/일기 습관), '다음 달을 위한 제안' 세 부분으로 월간 리포트를 써줘.",
  quarterly:
    "아래 데이터는 사용자의 한 분기(3개월) 기록이야. '이번 분기 돌아보기'(굵직한 흐름과 사건), '분기의 리듬'(기분/루틴/일기 습관의 변화), '다음 분기를 위한 방향' 세 부분으로 분기 회고 리포트를 써줘. 월과 연 사이의 중간 호흡답게, 세세한 나열보다 흐름과 변화를 짚어줘.",
  yearly:
    "아래 데이터는 사용자의 일 년 기록 요약이야. '올해의 발자취', '숫자로 보는 일 년', '내년을 향해' 세 부분으로 연간 회고 리포트를 써줘. 월별 흐름의 변화가 보이면 짚어줘.",
  mood:
    "아래 데이터는 사용자의 최근 3개월 기분 기록과 생활 데이터야. '기분 흐름'(시간에 따른 변화), '패턴 발견'(요일/루틴/일정과 기분의 관계, 데이터에 근거가 있을 때만), '기분을 위한 제안' 세 부분으로 기분 트렌드 분석을 써줘. 데이터가 부족하면 부족하다고 솔직히 말하고 무리한 해석은 하지 마.",
  coach:
    "아래 데이터는 사용자의 방면별 목표 목록과 최근 2주 생활 기록이야. 사용자는 '탑클래스 갓생'을 살고 싶어 해. 목표를 이룬 사람들의 보편적 습관(규칙적 수면, 아침 루틴, 운동, 꾸준한 학습, 기록, 목표를 작은 단위로 쪼개기)을 비교 기준으로 삼되 비난하지 말고: '지금 잘하고 있는 것'(기록에서 근거 찾기), '탑클래스와의 갭'(각 목표와 실제 기록을 비교해 구체적으로 — 예: 수면 평균 vs 권장, 루틴 달성률), '이번 주 실천 3가지'(목표와 직결되고 작고 측정 가능하게) 세 부분으로 갓생 코칭을 써줘. 목표가 없으면 방면별 목표부터 정하자고 제안해.",
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

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function callOpenAI(
  model: string,
  maxTokens: number,
  userContent: ContentPart[]
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `openai_http_${res.status}`);
  }
  return body?.choices?.[0]?.message?.content ?? "";
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
  if (!type || !periodKey || !payload || !(type in MODELS)) {
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

  if (!Deno.env.get("OPENAI_API_KEY")) return json({ error: "server_not_configured" }, 500);

  const content: ContentPart[] = [
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
    content.push({ type: "image_url", image_url: { url } });
  }

  let text: string;
  try {
    text = await callOpenAI(MODELS[type], MAX_TOKENS[type], content);
    if (!text) return json({ error: "empty_response" }, 502);
  } catch (e) {
    console.error("openai error:", e);
    return json({ error: "ai_error", detail: e instanceof Error ? e.message : String(e) }, 502);
  }

  await admin.from("ai_reports").upsert(
    { user_id: userId, type, period_key: periodKey, content: text },
    { onConflict: "user_id,type,period_key" }
  );

  return json({ content: text, cached: false }, 200);
});
