import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../hooks/useSession";
import { CameraScreen } from "../screens/CameraScreen";
import { DayDetailScreen } from "../screens/DayDetailScreen";
import { ExpressionsScreen } from "../screens/ExpressionsScreen";
import { DiaryEditScreen } from "../screens/DiaryEditScreen";
import { EventEditScreen } from "../screens/EventEditScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PhotoViewerScreen } from "../screens/PhotoViewerScreen";
import { GalleryScreen } from "../screens/GalleryScreen";
import { QuickAddScreen } from "../screens/QuickAddScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { RoutineManageScreen } from "../screens/RoutineManageScreen";
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
          <Stack.Screen
            name="Routines"
            component={RoutineManageScreen}
            options={{ title: "루틴 관리" }}
          />
          <Stack.Screen
            name="Reports"
            component={ReportScreen}
            options={{ title: "AI 리포트" }}
          />
          <Stack.Screen
            name="QuickAdd"
            component={QuickAddScreen}
            options={{ title: "빠른 일정 등록" }}
          />
          <Stack.Screen
            name="Gallery"
            component={GalleryScreen}
            options={{ title: "사진첩" }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }}
          />
          <Stack.Screen
            name="Expressions"
            component={ExpressionsScreen}
            options={{ title: "표현 카드" }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
