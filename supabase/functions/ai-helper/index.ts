// 가벼운 AI 작업 모음 Edge Function (OpenAI gpt-5-mini).
//  - parse_event: 자연어 → 일정 JSON
//  - briefing: 오늘 데이터 → 아침 브리핑 문장
//  - diary_questions: 그날 데이터 → 회고 질문 3개 + 답변 예시 칩
//  - translate_diary: 일기 → 한/영/일 자연스러운 번역 + 외국어 첨삭 + 학습 표현 추출
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

const TRANSLATE_DIARY_SCHEMA = {
  name: "diary_translation",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      detected: { type: "string", enum: ["ko", "en", "ja"], description: "원문 언어" },
      ko: { type: "string" },
      en: { type: "string" },
      ja: { type: "string" },
      corrections: {
        type: "array",
        description: "원문이 영어/일본어일 때만: 어색한 문장 첨삭 (최대 5개). 한국어 원문이면 빈 배열.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            original: { type: "string" },
            corrected: { type: "string" },
            note: { type: "string", description: "왜 그런지 한국어 한 줄 설명" },
          },
          required: ["original", "corrected", "note"],
        },
      },
      expressions: {
        type: "array",
        description: "일기에서 뽑은 학습 표현: 영어 3개 + 일본어 3개",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            lang: { type: "string", enum: ["en", "ja"] },
            expression: { type: "string" },
            meaning: { type: "string", description: "한국어 뜻" },
            example: { type: "string", description: "그 언어로 된 짧은 예문 (일기 맥락 반영)" },
          },
          required: ["lang", "expression", "meaning", "example"],
        },
      },
    },
    required: ["detected", "ko", "en", "ja", "corrections", "expressions"],
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

    if (task === "week_line") {
      const text = await callOpenAI({
        system:
          "너는 개인 캘린더의 주간 요약가야. 한 주의 일정 제목들과 할 일·일기 일수를 보고 그 주의 핵심을 한국어 한 문장(35자 이내)으로 요약해. 일정 제목의 고유명사를 살리고, 데이터가 적으면 담백하게 써. 문장 하나만, 따옴표와 마침표 없이.",
        user: JSON.stringify(input, null, 1),
        maxTokens: 300,
      });
      return json({ result: text.trim().replace(/^["']|["']$/g, "") }, 200);
    }

    if (task === "translate_diary") {
      const text = await callOpenAI({
        system:
          "너는 한국어·영어·일본어에 능통한 번역가이자 언어 선생님이야. 언어 공부 중인 사용자의 일기를 받아 다음을 만들어. " +
          "(1) detected: 원문 언어 감지 (ko/en/ja — 섞여 있으면 가장 많이 쓴 언어). " +
          "(2) ko/en/ja: 세 언어 버전. 원문 언어는 원문을 그대로 두고, 나머지 두 언어는 직역이 아니라 그 언어 원어민이 자기 일기에 실제로 쓸 법한 자연스러운 구어체로 옮겨. 관용구·뉘앙스를 살리고 문화적으로 어색한 표현은 의역해. 일본어는 일기체(だ・である体 또는 편한 반말체)로 쓰되, 사용자가 한자를 잘 못 읽으니 **모든 한자 단어 바로 뒤에 괄호로 히라가나 발음**을 붙여 — 예: 今日(きょう)は友達(ともだち)と映画(えいが)を見(み)た。" +
          "(3) corrections: 원문이 영어나 일본어면 어색하거나 틀린 문장을 최대 5개 골라 자연스럽게 고치고 이유를 한국어 한 줄로 설명해. 원문이 한국어면 빈 배열. " +
          "(4) expressions: 이 일기에서 사용자가 실제로 말하고 싶었을 핵심 표현을 영어 3개, 일본어 3개 뽑아. 각각 원어민이 쓰는 자연스러운 구어 표현 + 한국어 뜻 + 일기 맥락에 맞는 그 언어 예문. 일본어 표현과 예문의 한자에도 괄호 히라가나 발음을 붙여.",
        user: JSON.stringify(input, null, 1),
        maxTokens: 6000,
        jsonSchema: TRANSLATE_DIARY_SCHEMA,
      });
      return json({ result: JSON.parse(text) }, 200);
    }

    return json({ error: "unknown_task" }, 400);
  } catch (e) {
    console.error("ai-helper error:", e);
    return json({ error: "ai_error", detail: e instanceof Error ? e.message : String(e) }, 502);
  }
});
