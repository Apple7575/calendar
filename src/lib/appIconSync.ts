// 앱 아이콘을 규칙(appIcon.ts)에 맞게 바꾼다. 네이티브 모듈이라 TestFlight/개발 빌드의 iOS에서만 동작한다.
// 웹·Expo Go·테스트에서는 아무것도 하지 않는다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { APP_ICON_NAMES, nativeIconName, nextAppIcon, type AppIconLast } from "./appIcon";

/** The package's own types, so a renamed or removed function fails typecheck instead of the phone. */
type IconModule = typeof import("expo-alternate-app-icons");

let icons: IconModule | null = null;
try {
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    icons = require("expo-alternate-app-icons") as IconModule;
  }
} catch {
  icons = null;
}

const LAST_KEY = "appIcon.last.v1";

let running: Promise<void> = Promise.resolve();

/** 앱이 앞에 있을 때만 바꾼다. 실패하면 다음에 앱을 열 때 다시 시도한다. */
export function syncAppIcon(day: string, hour: number, todayDone: boolean): Promise<void> {
  running = running.catch(() => {}).then(async () => {
    if (!icons?.supportsAlternateIcons || AppState.currentState !== "active") return;
    const raw = await AsyncStorage.getItem(LAST_KEY);
    const last = raw ? (JSON.parse(raw) as AppIconLast) : null;
    // 네이티브 이름("SmileOtter")을 규칙의 이름("smile-otter")으로 바꿔 비교한다. 기본 아이콘이면 null이다.
    const nativeCurrent = icons.getAppIconName();
    const current = APP_ICON_NAMES.find((name) => nativeIconName(name) === nativeCurrent) ?? null;
    const next = nextAppIcon({ last, current, day, hour, todayDone });
    if (!next) return;
    await icons.setAlternateAppIcon(nativeIconName(next.icon));
    await AsyncStorage.setItem(LAST_KEY, JSON.stringify(next.last));
  }).catch(() => {});
  return running;
}
