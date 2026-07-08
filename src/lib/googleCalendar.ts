import { addDays } from "./dateUtils";
import { GoogleEventItem } from "./eventMerge";
import { clearTokenCache, getAccessToken } from "./googleTokens";
import { buildRRule } from "./recurrence";
import { RepeatFreq } from "./supabase";

const BASE = "https://www.googleapis.com/calendar/v3/calendars/primary";

export type GoogleEventInput = {
  title: string;
  description?: string | null;
  /** ISO 문자열 */
  startAt: string;
  endAt: string;
  allDay: boolean;
  repeatFreq?: RepeatFreq | null;
  repeatUntil?: string | null;
};

async function googleFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401 && retry) {
    clearTokenCache();
    return googleFetch(path, init, false);
  }
  return res;
}

async function ensureOk(res: Response, action: string): Promise<void> {
  if (res.ok) return;
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message ?? "";
  } catch {
    // 본문 파싱 실패는 무시
  }
  // 로그인은 됐지만 캘린더 권한(scope)이 빠진 토큰 — 재동의가 필요
  if (res.status === 403 && /insufficient/i.test(detail)) {
    throw new Error(
      "구글 캘린더 접근 권한이 없어요. 설정 탭 → '구글 캘린더 다시 연결'을 누르고, 구글 동의 화면에서 캘린더 항목의 체크박스를 켜 주세요."
    );
  }
  throw new Error(`구글 캘린더 ${action} 실패 (${res.status})${detail ? `: ${detail}` : ""}`);
}

/** 기간 내 구글 이벤트 목록 (반복 일정은 개별 인스턴스로 펼침) */
export async function listEvents(timeMin: string, timeMax: string): Promise<GoogleEventItem[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await googleFetch(`/events?${params.toString()}`);
  await ensureOk(res, "불러오기");
  const body = (await res.json()) as { items?: GoogleEventItem[] };
  return body.items ?? [];
}

function toGoogleBody(input: GoogleEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? undefined,
  };
  if (input.allDay) {
    const startDate = input.startAt.slice(0, 10);
    const endDate = input.endAt.slice(0, 10);
    body.start = { date: startDate };
    // 구글 종일 일정의 end.date는 exclusive
    body.end = { date: addDays(endDate < startDate ? startDate : endDate, 1) };
  } else {
    // 반복 일정은 구글이 start/end에 timeZone을 요구한다
    const timeZone = input.repeatFreq
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;
    body.start = { dateTime: input.startAt, timeZone };
    body.end = { dateTime: input.endAt, timeZone };
  }
  if (input.repeatFreq) {
    body.recurrence = [buildRRule(input.repeatFreq, input.repeatUntil ?? null, input.allDay)];
  }
  return body;
}

/** 구글 primary 캘린더에 일정 생성, 생성된 구글 이벤트 id 반환 */
export async function insertEvent(input: GoogleEventInput): Promise<string> {
  const res = await googleFetch("/events", {
    method: "POST",
    body: JSON.stringify(toGoogleBody(input)),
  });
  await ensureOk(res, "등록");
  const body = (await res.json()) as { id: string };
  return body.id;
}

export async function patchEvent(googleEventId: string, input: GoogleEventInput): Promise<void> {
  const res = await googleFetch(`/events/${encodeURIComponent(googleEventId)}`, {
    method: "PATCH",
    body: JSON.stringify(toGoogleBody(input)),
  });
  await ensureOk(res, "수정");
}

export async function deleteEvent(googleEventId: string): Promise<void> {
  const res = await googleFetch(`/events/${encodeURIComponent(googleEventId)}`, {
    method: "DELETE",
  });
  // 이미 지워진 경우는 성공으로 간주
  if (res.status === 404 || res.status === 410) return;
  await ensureOk(res, "삭제");
}
