// 가벼운 AI 작업 모음 Edge Function (OpenAI gpt-5-mini).
//  - parse_event: 자연어 → 일정 JSON
//  - briefing: 오늘 데이터 → 아침 브리핑 문장
//  - diary_questions: 그날 데이터 → 회고 질문 3개 + 답변 예시 칩
//
// 배포:
//   supabase secrets set OPENAI_API_KEY=...   (ai-report와 공유)
//   supabase functions deploy ai-helper

import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-5-mini";

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function callOpenAI(options: {
  system: string;
  user: string;
  maxTokens: number;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: options.maxTokens,
      reasoning_effort: "minimal",
      response_format: options.jsonSchema
        ? { type: "json_schema", json_schema: { ...options.jsonSchema, strict: true } }
        : undefined,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? `openai_http_${res.status}`);
  return body?.choices?.[0]?.message?.content ?? "";
}

const PARSE_EVENT_SCHEMA = {
  name: "parsed_event",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      date: { type: "string", description: "YYYY-MM-DD" },
      startTime: { type: ["string", "null"], description: "HH:MM 24시간제, 종일이면 null" },
      endTime: { type: ["string", "null"], description: "HH:MM, 모르면 null(1시간으로 처리)" },
      allDay: { type: "boolean" },
      repeat: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", null] },
      reminderMinutes: {
        type: ["integer", "null"],
        description: "알림 요청이 있을 때만: 0/10/30/60",
      },
    },
    required: ["title", "date", "startTime", "endTime", "allDay", "repeat", "reminderMinutes"],
  },
};

const DIARY_QUESTIONS_SCHEMA = {
  name: "diary_questions",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            question: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
              description: "누르기만 하면 되는 짧은 답변 예시 4개 (일기 문장으로 자연스러운 1인칭)",
            },
          },
          required: ["question", "options"],
        },
      },
    },
    required: ["questions"],
  },
};

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

  let body: { task?: string; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const { task, input } = body;
  if (!task || !input) return json({ error: "bad_request" }, 400);

  try {
    if (task === "parse_event") {
      const text = await callOpenAI({
        system:
          "너는 한국어 자연어를 캘린더 일정으로 바꾸는 파서야. 오늘 날짜와 요일이 주어지니 '내일', '다음 주 금요일', '매주 월요일' 같은 상대 표현을 정확한 날짜로 계산해. 시간 언급이 없으면 allDay=true. '알려줘/알림' 요청이 있으면 reminderMinutes를 채워.",
        user: `오늘: ${input.today} (${input.weekday}요일)\n입력: ${input.text}`,
        maxTokens: 800,
        jsonSchema: PARSE_EVENT_SCHEMA,
      });
      return json({ result: JSON.parse(text) }, 200);
    }

    if (task === "briefing") {
      const text = await callOpenAI({
        system:
          "너는 개인 캘린더 앱의 아침 브리핑 작성자야. 오늘의 일정/할 일/루틴 데이터를 보고 한국어로 2~3문장의 짧고 산뜻한 아침 브리핑을 써. 시간이 있는 첫 일정은 시각과 함께 언급하고, 일정이 없으면 여유로운 하루라고 말해줘. 이모지는 1개까지만.",
        user: JSON.stringify(input, null, 1),
        maxTokens: 500,
      });
      return json({ result: text.trim() }, 200);
    }

    if (task === "diary_questions") {
      const text = await callOpenAI({
        system:
          "너는 일기 앱의 회고 질문 작성자야. 그날의 일정/할 일/루틴/기분 데이터를 참고해 그 사람에게 맞춘 한국어 회고 질문 3개를 만들어. 첫 질문은 그날의 구체적 사건(일정 제목 등)과 연결하고, 나머지는 감정/배움/내일 중에서. 각 질문마다 누르기만 해도 되는 짧은 1인칭 답변 예시 4개를 만들어. 답변 예시는 서로 다른 방향(긍정/보통/아쉬움/유머 등)으로, 각 20자 이내.",
        user: JSON.stringify(input, null, 1),
        maxTokens: 1500,
        jsonSchema: DIARY_QUESTIONS_SCHEMA,
      });
      return json({ result: JSON.parse(text) }, 200);
    }

    if (task === "highlight") {
      const text = await callOpenAI({
        system:
          "너는 일기에서 '오늘의 한 줄'을 뽑는 도우미야. 일기 내용에서 그날을 가장 잘 요약하는 한 줄(30자 이내, 1인칭, 마침표 없이)을 한국어로 만들어. 일기에 있는 내용만 쓰고, 문장 하나만 출력해.",
        user: JSON.stringify(input, null, 1),
        maxTokens: 200,
      });
      return json({ result: text.trim().replace(/^["']|["']$/g, "") }, 200);
    }

    return json({ error: "unknown_task" }, 400);
  } catch (e) {
    console.error("ai-helper error:", e);
    return json({ error: "ai_error", detail: e instanceof Error ? e.message : String(e) }, 502);
  }
});
