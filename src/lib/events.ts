import { eventColorHex } from "./eventColors";
import { CalendarEvent } from "./eventMerge";
import * as googleCalendar from "./googleCalendar";
import { cancelEventReminder, syncEventReminder } from "./notifications";
import { EventRow, RepeatFreq, supabase } from "./supabase";

export type EventInput = {
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  repeatFreq: RepeatFreq | null;
  /** "YYYY-MM-DD" (반복 시에만 의미, null = 무기한) */
  repeatUntil: string | null;
  /** 시작 몇 분 전 알림 (null = 없음) */
  reminderMinutes: number | null;
  /** 일정 색상 키 (null = 기본) */
  color: string | null;
};

export function toCalendarEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    source: "local",
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    description: row.description ?? undefined,
    googleEventId: row.google_event_id,
    colorHex: eventColorHex(row.color),
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("로그인이 필요해요.");
  return userId;
}

/**
 * 기간과 겹치는 로컬 일정 행.
 * 반복 일정 행은 start_at이 첫 회차라 기간 겹침으로 거를 수 없으므로 전부 가져온다
 * (개인용 앱에서 반복 일정 수는 적음). 실제 회차 전개는 expandEventRows가 한다.
 */
export async function listLocalEventsInRange(
  rangeStart: Date,
  rangeEnd: Date
): Promise<EventRow[]> {
  const [plain, recurring] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .is("repeat_freq", null)
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString())
      .order("start_at"),
    supabase.from("events").select("*").not("repeat_freq", "is", null),
  ]);
  if (plain.error) throw new Error(`일정을 불러오지 못했어요: ${plain.error.message}`);
  if (recurring.error) throw new Error(`일정을 불러오지 못했어요: ${recurring.error.message}`);
  return [...(plain.data ?? []), ...(recurring.data ?? [])] as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw new Error(`일정을 불러오지 못했어요: ${error.message}`);
  return data as EventRow;
}

export type SaveResult = { event: EventRow; googleWarning?: string };

function toDbFields(input: EventInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    start_at: input.startAt,
    end_at: input.endAt,
    all_day: input.allDay,
    repeat_freq: input.repeatFreq,
    repeat_until: input.repeatFreq ? input.repeatUntil : null,
    reminder_minutes: input.reminderMinutes,
    color: input.color,
  };
}

/** 알림 스케줄은 best-effort — 실패해도 저장을 막지 않는다 */
async function trySyncReminder(row: EventRow): Promise<void> {
  try {
    await syncEventReminder(row);
  } catch (e) {
    console.warn("알림 예약 실패:", e instanceof Error ? e.message : e);
  }
}

/** 일정 생성. pushToGoogle이면 구글 등록은 best-effort — 실패해도 로컬 저장은 유지. */
export async function createEvent(input: EventInput, pushToGoogle: boolean): Promise<SaveResult> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("events")
    .insert({ user_id: userId, ...toDbFields(input) })
    .select()
    .single();
  if (error) throw new Error(`일정 저장에 실패했어요: ${error.message}`);
  let event = data as EventRow;
  await trySyncReminder(event);

  if (!pushToGoogle) return { event };
  try {
    const googleEventId = await googleCalendar.insertEvent(input);
    const { data: updated, error: updateError } = await supabase
      .from("events")
      .update({ google_event_id: googleEventId, updated_at: new Date().toISOString() })
      .eq("id", event.id)
      .select()
      .single();
    if (!updateError && updated) event = updated as EventRow;
    return { event };
  } catch (e) {
    return {
      event,
      googleWarning: `일정은 저장됐지만 구글 캘린더 등록에 실패했어요. (${toMessage(e)})`,
    };
  }
}

/** 일정 수정. 구글에 등록된 일정이면 구글 반영은 best-effort. */
export async function updateEvent(row: EventRow, input: EventInput): Promise<SaveResult> {
  const { data, error } = await supabase
    .from("events")
    .update({ ...toDbFields(input), updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .select()
    .single();
  if (error) throw new Error(`일정 수정에 실패했어요: ${error.message}`);
  const event = data as EventRow;
  await trySyncReminder(event);

  if (!row.google_event_id) return { event };
  try {
    await googleCalendar.patchEvent(row.google_event_id, input);
    return { event };
  } catch (e) {
    return {
      event,
      googleWarning: `일정은 수정됐지만 구글 캘린더 반영에 실패했어요. (${toMessage(e)})`,
    };
  }
}

/** 일정 삭제 (반복이면 시리즈 전체). 구글 쪽 삭제는 best-effort. */
export async function deleteLocalEvent(row: EventRow): Promise<{ googleWarning?: string }> {
  let googleWarning: string | undefined;
  if (row.google_event_id) {
    try {
      await googleCalendar.deleteEvent(row.google_event_id);
    } catch (e) {
      googleWarning = `구글 캘린더에서 삭제하지 못했어요. (${toMessage(e)})`;
    }
  }
  const { error } = await supabase.from("events").delete().eq("id", row.id);
  if (error) throw new Error(`일정 삭제에 실패했어요: ${error.message}`);
  try {
    await cancelEventReminder(row.id);
  } catch {
    // 알림 취소 실패는 무시
  }
  return { googleWarning };
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
