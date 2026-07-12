// 로컬 알림 (Expo Go iOS에서 동작; 원격 푸시는 사용하지 않음).
// 스케줄된 알림 id는 기기별 개념이므로 DB가 아닌 AsyncStorage에 보관한다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { addDays, formatTime, parseDateKey, todayKey } from "./dateUtils";
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

// ===== 아침 브리핑 알림 (매일 반복, 고정 문구 — 내용은 앱을 열면 AI가 생성) =====

const BRIEFING_NOTIF_ID_KEY = "notif.briefing.id";
const BRIEFING_PREF_KEY = "notif.briefing.pref";

export type BriefingReminderPref = { enabled: boolean; hour: number; minute: number };
const DEFAULT_BRIEFING_PREF: BriefingReminderPref = { enabled: false, hour: 8, minute: 0 };

export async function getBriefingReminderPref(): Promise<BriefingReminderPref> {
  const raw = await AsyncStorage.getItem(BRIEFING_PREF_KEY);
  if (!raw) return DEFAULT_BRIEFING_PREF;
  try {
    return { ...DEFAULT_BRIEFING_PREF, ...(JSON.parse(raw) as Partial<BriefingReminderPref>) };
  } catch {
    return DEFAULT_BRIEFING_PREF;
  }
}

export async function setBriefingReminder(pref: BriefingReminderPref): Promise<void> {
  const oldId = await AsyncStorage.getItem(BRIEFING_NOTIF_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId);
    await AsyncStorage.removeItem(BRIEFING_NOTIF_ID_KEY);
  }
  await AsyncStorage.setItem(BRIEFING_PREF_KEY, JSON.stringify(pref));
  if (!pref.enabled) return;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "오늘의 아침 브리핑 ☀️",
      body: "오늘 일정과 할 일을 AI가 정리해 뒀어요. 열어서 확인해 보세요.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: pref.hour,
      minute: pref.minute,
    },
  });
  await AsyncStorage.setItem(BRIEFING_NOTIF_ID_KEY, id);
}

// ===== 순간 찍기 알림 (매일 랜덤 시각 1회, 7일치 예약) =====
// 반복 트리거는 시각이 고정이라 못 쓰고, 날짜별 DATE 트리거를 미리 깔아둔다.
// 앱을 열 때마다 topUpMomentReminders()가 지난 날짜를 정리하고 7일치를 채운다.

const MOMENT_PREF_KEY = "notif.moment.pref";
const MOMENT_IDS_KEY = "notif.moment.ids"; // { "YYYY-MM-DD": notificationId }

export type MomentReminderPref = { enabled: boolean };

/** 랜덤 시각: 10:00 ~ 20:59 사이 */
function randomMomentTime(dateKey: string): Date {
  const d = parseDateKey(dateKey);
  const minutes = Math.floor(Math.random() * 11 * 60);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    10 + Math.floor(minutes / 60),
    minutes % 60
  );
}

export async function getMomentReminderPref(): Promise<MomentReminderPref> {
  const raw = await AsyncStorage.getItem(MOMENT_PREF_KEY);
  if (!raw) return { enabled: false };
  try {
    return { enabled: !!(JSON.parse(raw) as MomentReminderPref).enabled };
  } catch {
    return { enabled: false };
  }
}

async function readMomentIds(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(MOMENT_IDS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function setMomentReminder(pref: MomentReminderPref): Promise<void> {
  await AsyncStorage.setItem(MOMENT_PREF_KEY, JSON.stringify(pref));
  if (pref.enabled) {
    await topUpMomentReminders();
    return;
  }
  const ids = await readMomentIds();
  await Promise.all(
    Object.values(ids).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
  await AsyncStorage.removeItem(MOMENT_IDS_KEY);
}

/** 지난 날짜 정리 + 오늘부터 7일치 랜덤 시각 알림 예약 채우기 (앱 실행 시 호출) */
export async function topUpMomentReminders(): Promise<void> {
  const pref = await getMomentReminderPref();
  if (!pref.enabled) return;

  const map = await readMomentIds();
  const today = todayKey();
  for (const key of Object.keys(map)) {
    if (key < today) delete map[key]; // 이미 울렸거나 지난 예약
  }
  for (let i = 0; i < 7; i++) {
    const dateKey = addDays(today, i);
    if (map[dateKey]) continue;
    const at = randomMomentTime(dateKey);
    if (at.getTime() <= Date.now()) continue; // 오늘 몫의 랜덤 시각이 이미 지남
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "지금 이 순간 📸",
        body: "잠깐, 오늘의 한 장면을 남겨볼까요? 가운데 카메라 버튼 하나면 돼요.",
        sound: true,
        data: { screen: "Camera" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    map[dateKey] = id;
  }
  await AsyncStorage.setItem(MOMENT_IDS_KEY, JSON.stringify(map));
}

// ===== 주말 회고 알림 (매주 일요일 저녁) =====

const REVIEW_NOTIF_ID_KEY = "notif.review.id";
const REVIEW_PREF_KEY = "notif.review.pref";

export type ReviewReminderPref = { enabled: boolean };

export async function getReviewReminderPref(): Promise<ReviewReminderPref> {
  const raw = await AsyncStorage.getItem(REVIEW_PREF_KEY);
  if (!raw) return { enabled: false };
  try {
    return { enabled: !!(JSON.parse(raw) as ReviewReminderPref).enabled };
  } catch {
    return { enabled: false };
  }
}

export async function setReviewReminder(pref: ReviewReminderPref): Promise<void> {
  const oldId = await AsyncStorage.getItem(REVIEW_NOTIF_ID_KEY);
  if (oldId) {
    await Notifications.cancelScheduledNotificationAsync(oldId).catch(() => {});
    await AsyncStorage.removeItem(REVIEW_NOTIF_ID_KEY);
  }
  await AsyncStorage.setItem(REVIEW_PREF_KEY, JSON.stringify(pref));
  if (!pref.enabled) return;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "이번 주를 돌아볼 시간 🌙",
      body: "리포트 확인 → 목표 점검 → 다음 주 다짐까지 5분이면 돼요.",
      sound: true,
      data: { screen: "WeeklyReview" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // 일요일
      hour: 20,
      minute: 0,
    },
  });
  await AsyncStorage.setItem(REVIEW_NOTIF_ID_KEY, id);
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
