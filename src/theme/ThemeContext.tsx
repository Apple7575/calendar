import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Appearance, AppState, Platform } from "react-native";
import { isNightScreen, nextNightChange, screenTheme } from "../lib/nightScreen";
import { StatusBar } from "expo-status-bar";
import { DEFAULT_THEME_ID, focusTheme, getTheme, restoreThemeId, Theme, ThemeId } from "./themes";

const STORAGE_KEY = "theme.id.v2";

type ThemeContextValue = {
  /** 지금 그리는 테마. 밤에는 밤 화면이다. */
  theme: Theme;
  /** 사용자가 고른(저장된) 테마. 밤에도 바뀌지 않는다. */
  themeId: ThemeId;
  /** 21:00~04:30 밤 화면 중인지. */
  night: boolean;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme(DEFAULT_THEME_ID),
  themeId: DEFAULT_THEME_ID,
  night: false,
  setThemeId: () => {},
});

/** 취침 잠금과 같은 시각(21:00~04:30)인지. 바뀌는 시각에 맞춰 다시 보고, 앱이 다시 앞에 오면 다시 본다. */
function useNightScreen() {
  const [night, setNight] = useState(() => isNightScreen(Date.now()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const now = Date.now();
      setNight(isNightScreen(now));
      if (timer) clearTimeout(timer);
      timer = setTimeout(check, Math.max(1000, nextNightChange(now) - now + 500));
    };
    check();
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") check(); });
    return () => { if (timer) clearTimeout(timer); sub.remove(); };
  }, []);
  return night;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const night = useNightScreen();
  const theme = screenTheme(themeId, night);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem("theme.id")]).then(([saved, old]) => {
      if (!active) return;
      const id = restoreThemeId(saved, old);
      setThemeIdState(id);
      // 옛 테마를 저장해 둔 경우 다크로 바꿔 저장해 둔다.
      if (saved && saved !== id) AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // 날짜 선택기·알림창 같은 시스템 UI가 휴대폰 설정이 아니라 앱에서 고른 모드를 따르게 한다.
  const isDark = theme.isDark;
  useEffect(() => {
    if (Platform.OS !== "web") Appearance.setColorScheme(isDark ? "dark" : "light");
  }, [isDark]);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, night, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** 집중 공부 화면만 타이머 팔레트로 그린다. 사용자가 고른 앱 테마는 바꾸지 않는다. */
export function FocusThemeProvider({ children }: { children: ReactNode }) {
  const current = useContext(ThemeContext);
  return (
    <ThemeContext.Provider value={{ ...current, theme: focusTheme }}>
      <StatusBar style="light" />
      {children}
    </ThemeContext.Provider>
  );
}

/** 화면 트리를 다시 만들지 않고 테마만 바꾼다. theme이 없으면 사용자가 고른 테마 그대로다. */
export function ThemeOverride({ theme, children }: { theme?: Theme; children: ReactNode }) {
  const current = useContext(ThemeContext);
  return (
    <ThemeContext.Provider value={theme ? { ...current, theme } : current}>
      {theme ? <StatusBar style={theme.statusBar} /> : null}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeControls(): ThemeContextValue {
  return useContext(ThemeContext);
}
