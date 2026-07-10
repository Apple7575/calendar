import {
  createNavigationContainerRef,
  DarkTheme as NavDark,
  DefaultTheme as NavLight,
  NavigationContainer,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setupNotificationHandler, topUpMomentReminders } from "./src/lib/notifications";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { RootStackParamList } from "./src/navigation/types";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";

setupNotificationHandler();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

function ThemedApp() {
  const t = useTheme();
  const lastNotification = Notifications.useLastNotificationResponse();

  // "순간 찍기" 알림 탭 → 카메라 열기 (로그인 전이면 조용히 무시)
  useEffect(() => {
    const screen = lastNotification?.notification.request.content.data?.screen;
    if (screen === "Camera" && navigationRef.isReady()) {
      try {
        navigationRef.navigate("Camera");
      } catch {
        // 로그인 게이트 등으로 라우트가 없으면 무시
      }
    }
  }, [lastNotification]);

  // 순간 찍기 알림 7일치 예약 유지 (꺼져 있으면 no-op)
  useEffect(() => {
    void topUpMomentReminders();
  }, []);

  const base = t.isDark ? NavDark : NavLight;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: t.colors.primary,
      background: t.colors.background,
      card: t.colors.background,
      text: t.colors.text,
      border: t.colors.border,
    },
  };
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={t.statusBar} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
