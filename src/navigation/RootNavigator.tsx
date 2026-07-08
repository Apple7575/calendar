import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../hooks/useSession";
import { DayDetailScreen } from "../screens/DayDetailScreen";
import { DiaryEditScreen } from "../screens/DiaryEditScreen";
import { EventEditScreen } from "../screens/EventEditScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PhotoViewerScreen } from "../screens/PhotoViewerScreen";
import { useTheme } from "../theme/ThemeContext";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors: c } = useTheme();
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700", color: c.text },
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.background },
      }}
    >
      {session ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: "" }} />
          <Stack.Screen
            name="EventEdit"
            component={EventEditScreen}
            options={{ title: "일정" }}
          />
          <Stack.Screen
            name="DiaryEdit"
            component={DiaryEditScreen}
            options={{ title: "일기" }}
          />
          <Stack.Screen
            name="PhotoViewer"
            component={PhotoViewerScreen}
            options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
