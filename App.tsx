import {
  DarkTheme as NavDark,
  DefaultTheme as NavLight,
  NavigationContainer,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setupNotificationHandler } from "./src/lib/notifications";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";

setupNotificationHandler();

function ThemedApp() {
  const t = useTheme();
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
    <NavigationContainer theme={navTheme}>
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
