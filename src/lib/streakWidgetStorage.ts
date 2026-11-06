// 연속 실천 위젯 값 쓰기. RoutineProvider가 불러오므로 Supabase·캘린더 모듈을 끌어오지 않게 widget.ts와 분리했다.
// 네이티브 모듈이라 TestFlight/개발 빌드에서만 동작한다. 웹과 Expo Go에서는 아무것도 하지 않는다.

import { Platform } from "react-native";
import type { StreakWidgetPayload } from "./streakWidget";

const APP_GROUP = "group.com.newblueday.mycalendar";

/** The package's own types, so a renamed or removed function fails typecheck instead of the phone. */
type ExtensionStorageType = typeof import("@bacons/apple-targets")["ExtensionStorage"];

let ExtensionStorage: ExtensionStorageType | null = null;
try {
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ExtensionStorage = require("@bacons/apple-targets").ExtensionStorage as ExtensionStorageType;
  }
} catch {
  ExtensionStorage = null;
}

let lastStreakJson: string | null = null;

/** 값이 바뀔 때만 쓰고 이 위젯만 새로고침한다. 기존 위젯의 widgetData 키는 건드리지 않는다. */
export function writeStreakWidget(payload: StreakWidgetPayload): void {
  if (!ExtensionStorage) return;
  const json = JSON.stringify(payload);
  if (json === lastStreakJson) return;
  try {
    new ExtensionStorage(APP_GROUP).set("streakWidget", json);
    ExtensionStorage.reloadWidget("StreakWidget");
    lastStreakJson = json;
  } catch {
    // 위젯 갱신 실패는 조용히 무시
  }
}
