import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../hooks/useSession";
import { AnniversariesScreen } from "../screens/AnniversariesScreen";
import { CameraScreen } from "../screens/CameraScreen";
import { DayDetailScreen } from "../screens/DayDetailScreen";
import { ExpressionsScreen } from "../screens/ExpressionsScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { SpeechScreen } from "../screens/SpeechScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { WorkoutScreen } from "../screens/WorkoutScreen";
import { MealsScreen } from "../screens/MealsScreen";
import { AvoidScreen } from "../screens/AvoidScreen";
import { BodyScreen } from "../screens/BodyScreen";
import { RecapScreen } from "../screens/RecapScreen";
import { RoutinePlayerScreen } from "../screens/RoutinePlayerScreen";
import { WeeklyReviewScreen } from "../screens/WeeklyReviewScreen";
import { DiaryEditScreen } from "../screens/DiaryEditScreen";
import { EventEditScreen } from "../screens/EventEditScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PhotoViewerScreen } from "../screens/PhotoViewerScreen";
import { GalleryScreen } from "../screens/GalleryScreen";
import { MemoryMapScreen } from "../screens/MemoryMapScreen";
import { QuickAddScreen } from "../screens/QuickAddScreen";
import { RoutineManageScreen } from "../screens/RoutineManageScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
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
            name="Settings"
            component={SettingsScreen}
            options={{ title: "설정" }}
          />
          <Stack.Screen
            name="MemoryMap"
            component={MemoryMapScreen}
            options={{ title: "추억 지도" }}
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
          <Stack.Screen
            name="Anniversaries"
            component={AnniversariesScreen}
            options={{ title: "D-day · 기념일" }}
          />
          <Stack.Screen
            name="Goals"
            component={GoalsScreen}
            options={{ title: "목표 · 갓생" }}
          />
          <Stack.Screen
            name="Timeline"
            component={TimelineScreen}
            options={{ title: "인생 타임라인" }}
          />
          <Stack.Screen
            name="Speech"
            component={SpeechScreen}
            options={{ title: "스피치 · 대화" }}
          />
          <Stack.Screen
            name="Workout"
            component={WorkoutScreen}
            options={{ title: "운동 기록" }}
          />
          <Stack.Screen
            name="Meals"
            component={MealsScreen}
            options={{ title: "식단 기록" }}
          />
          <Stack.Screen
            name="Avoid"
            component={AvoidScreen}
            options={{ title: "하지 않기" }}
          />
          <Stack.Screen
            name="WeeklyReview"
            component={WeeklyReviewScreen}
            options={{ title: "주간 회고" }}
          />
          <Stack.Screen
            name="Body"
            component={BodyScreen}
            options={{ title: "몸 · 습관" }}
          />
          <Stack.Screen
            name="Recap"
            component={RecapScreen}
            options={{ title: "리캡" }}
          />
          <Stack.Screen
            name="RoutinePlayer"
            component={RoutinePlayerScreen}
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
