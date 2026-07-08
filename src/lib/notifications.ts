// 로컬 알림 (Expo Go iOS에서 동작; 원격 푸시는 사용하지 않음).
// 스케줄된 알림 id는 기기별 개념이므로 DB가 아닌 AsyncStorage에 보관한다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { formatTime } from "./dateUtils";
import { EventRow } from "./supabase";

const eventKey = (eventId: string) => `notif.event.${eventId}`;
const DIARY_NOTIF_ID_KEY = "notif.diary.id";
const DIARY_PREF_KEY = "notif.diary.pref";

export type DiaryReminderPref = { enabled: boolean; hour: number; minute: number };
const DEFAULT_DIARY_PREF: DiaryReminderPref = { enabled: false, hour: 21, minute: 30 };

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function reminderLabel(minutes: number): string {
  if (minutes === 0) return "지금 시작해요";
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}시간 뒤에 시작해요`;
  return `${minutes}분 뒤에 시작해요`;
}

/**
 * 일정의 알림을 (재)스케줄. reminder_minutes가 null이면 취소만 한다.
 * 반복 일정은 반복 트리거로 등록한다.
 * 주의: repeat_until이 지나도 반복 트리거는 계속 울린다 — 시리즈 삭제/알림 해제로 정리 (MVP 한계).
 */
export async function syncEventReminder(row: EventRow): Promise<void> {
  await cancelEventReminder(row.id);
  if (row.reminder_minutes === null) return;

  const start = new Date(row.start_at);
  const remindAt = new Date(start.getTime() - row.reminder_minutes * 60 * 1000);

  const content: Notifications.NotificationContentInput = {
    title: row.title,
    body: row.all_day
      ? "오늘 일정이 있어요"
      : `${formatTime(row.start_at)} · ${reminderLabel(row.reminder_minutes)}`,
    sound: true,
  };

  let trigger: Notifications.NotificationTriggerInput;
  if (!row.repeat_freq) {
    if (remindAt.getTime() <= Date.now()) return; // 이미 지난 일정
    trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: remindAt };
  } else if (row.repeat_freq === "daily") {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: remindAt.getHours(),
      minute: remindAt.getMinutes(),
    };
  } else if (row.repeat_freq === "weekly") {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: remindAt.getDay() + 1, // expo: 1 = 일요일
      hour: remindAt.getHours(),
      minute: remindAt.getMinutes(),
    };
  } else {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: remindAt.getDate(),
      hour: remindAt.getHours(),
      minute: remindAt.getMinutes(),
    };
  }

  const id = await Notifications.scheduleNotificationAsync({ content, trigger });
  await AsyncStorage.setItem(eventKey(row.id), JSON.stringify([id]));
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(eventKey(eventId));
  if (!raw) return;
  try {
    const ids = JSON.parse(raw) as string[];
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // 저장된 id가 깨졌으면 키만 정리
  }
  await AsyncStorage.removeItem(eventKey(eventId));
}

// ===== 일기 리마인드 (매일 반복) =====

export async function getDiaryReminderPref(): Promise<DiaryReminderPref> {
  const raw = await AsyncStorage.getItem(DIARY_PREF_KEY);
  if (!raw) return DEFAULT_DIARY_PREF;
  try {
    return { ...DEFAULT_DIARY_PREF, ...(JSON.parse(raw) as Partial<DiaryReminderPref>) };
  } catch {
    return DEFAULT_DIARY_PREF;
  }
}

export async function setDiaryReminder(pref: DiaryReminderPref): Promise<void> {
  const oldId = await AsyncStorage.getItem(DIARY_NOTIF_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId);
    await AsyncStorage.removeItem(DIARY_NOTIF_ID_KEY);
  }
  await AsyncStorage.setItem(DIARY_PREF_KEY, JSON.stringify(pref));
  if (!pref.enabled) return;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "오늘의 일기",
      body: "오늘 하루는 어땠나요? 잊기 전에 남겨보세요 ✍️",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: pref.hour,
      minute: pref.minute,
    },
  });
  await AsyncStorage.setItem(DIARY_NOTIF_ID_KEY, id);
}
