// Apple 건강(HealthKit) 수면 데이터 읽기.
// 네이티브 모듈이라 TestFlight/개발 빌드에서만 동작 — Expo Go에서는 조용히 비활성화된다.

import Constants from "expo-constants";
import { Platform } from "react-native";
import { parseDateKey } from "./dateUtils";

const SLEEP_ID = "HKCategoryTypeIdentifierSleepAnalysis";
// HKCategoryValueSleepAnalysis: 0=inBed, 1=asleepUnspecified, 2=awake, 3=core, 4=deep, 5=REM
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

type HealthKitModule = Record<string, (...args: unknown[]) => Promise<unknown>>;

let cachedModule: HealthKitModule | null | undefined;

function loadModule(): HealthKitModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== "ios") {
    cachedModule = null;
    return null;
  }
  // Expo Go에서는 require 시 Nitro가 에러 로그를 찍으므로 아예 시도하지 않는다
  if (Constants.appOwnership === "expo") {
    cachedModule = null;
    return null;
  }
  try {
    // Expo Go에는 네이티브 모듈이 없어 require가 던진다
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require("@kingstinct/react-native-healthkit") as HealthKitModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** 이 빌드에서 건강 데이터 사용 가능 여부 */
export function isHealthAvailable(): boolean {
  return loadModule() !== null;
}

type SleepSample = {
  value: number;
  startDate: string | Date;
  endDate: string | Date;
};

/**
 * 해당 날짜의 수면 시간(시간 단위, 0.5 단위 반올림).
 * 전날 18:00 ~ 당일 14:00 사이의 수면 단계 샘플을 합산한다.
 */
export async function fetchSleepHours(dateKey: string): Promise<number | null> {
  const HK = loadModule();
  if (!HK) throw new Error("이 기능은 TestFlight/개발 빌드에서만 사용할 수 있어요.");

  // 권한 요청 (라이브러리 버전에 따라 시그니처가 달라 순차 시도)
  const authFn = HK.requestAuthorization;
  if (typeof authFn === "function") {
    try {
      await authFn([], [SLEEP_ID]);
    } catch {
      try {
        await authFn({ read: [SLEEP_ID] });
      } catch {
        // 권한 요청 실패는 조회 단계 오류로 드러난다
      }
    }
  }

  const day = parseDateKey(dateKey);
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 18, 0);
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 14, 0);

  const queryFn = HK.queryCategorySamples;
  if (typeof queryFn !== "function") {
    throw new Error("건강 데이터 조회를 지원하지 않는 버전이에요.");
  }
  let samples: SleepSample[];
  try {
    samples = (await queryFn(SLEEP_ID, { from, to })) as SleepSample[];
  } catch {
    samples = (await queryFn(SLEEP_ID, {
      filter: { startDate: from, endDate: to },
    })) as SleepSample[];
  }

  let ms = 0;
  for (const s of samples ?? []) {
    if (!ASLEEP_VALUES.has(Number(s.value))) continue;
    const start = Math.max(new Date(s.startDate).getTime(), from.getTime());
    const end = Math.min(new Date(s.endDate).getTime(), to.getTime());
    if (end > start) ms += end - start;
  }
  if (ms === 0) return null;
  return Math.round((ms / 3600000) * 2) / 2;
}
