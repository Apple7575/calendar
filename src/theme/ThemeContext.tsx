import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Appearance, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { DEFAULT_THEME_ID, focusTheme, getTheme, Theme, ThemeId } from "./themes";

const STORAGE_KEY = "theme.id.v2";

type ThemeContextValue = {
  theme: Theme;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme(DEFAULT_THEME_ID),
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem("theme.id")]).then(([saved, old]) => {
      if (active) setThemeIdState(getTheme(saved ?? (old === "dark" ? "dark" : DEFAULT_THEME_ID)).id);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  // 날짜 선택기·알림창 같은 시스템 UI가 휴대폰 설정이 아니라 앱에서 고른 모드를 따르게 한다.
  const isDark = getTheme(themeId).isDark;
  useEffect(() => {
    if (Platform.OS !== "web") Appearance.setColorScheme(isDark ? "dark" : "light");
  }, [isDark]);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme: getTheme(themeId), setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** 집중 공부 화면만 타이머 팔레트로 그린다. 사용자가 고른 앱 테마는 바꾸지 않는다. */
export function FocusThemeProvider({ children }: { children: ReactNode }) {
  const { setThemeId } = useContext(ThemeContext);
  return (
    <ThemeContext.Provider value={{ theme: focusTheme, setThemeId }}>
      <StatusBar style="light" />
      {children}
    </ThemeContext.Provider>
  );
}

/** 화면 트리를 다시 만들지 않고 테마만 바꾼다. theme이 없으면 사용자가 고른 테마 그대로다. */
export function ThemeOverride({ theme, children }: { theme?: Theme; children: ReactNode }) {
  const current = useContext(ThemeContext);
  return (
    <ThemeContext.Provider value={theme ? { theme, setThemeId: current.setThemeId } : current}>
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
