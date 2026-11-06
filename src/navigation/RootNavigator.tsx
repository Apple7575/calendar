import {PriorityPauseScreen} from '../features/routine/PriorityPauseScreen';
import {PriorityPlanScreen} from '../features/routine/PriorityPlanScreen';
import {GoalDetailScreen} from '../features/routine/GoalDetailScreen';
import {WeekCheckScreen} from '../features/routine/WeekCheckScreen';
import {NightReflectionScreen} from '../features/routine/NightReflectionScreen';
import {BuildCheckScreen} from '../features/routine/BuildCheckScreen';
import {CommitmentGate} from '../features/routine/CommitmentGate';
import {NextStudyGate} from '../features/routine/NextStudyGate';
import {NextStudyScreen} from '../features/routine/NextStudyScreen';
import {RestAlarmGate} from '../features/routine/RestAlarmGate';
import {CelebrationHost} from '../features/routine/Celebration';
import {FocusNoiseHost} from '../features/routine/FocusNoise';
import {EarnedRewardScreen} from '../features/routine/EarnedRewardScreen';
import {AnimalPreviewScreen} from '../features/routine/AnimalPreviewScreen';
import {FocusTimerScreen} from '../features/routine/FocusTimerScreen';
﻿import {HabitOrderSettingsScreen} from '../features/routine/HabitOrderSettingsScreen';
import { DeckCardsScreen } from "../features/routine/DeckCardsScreen";
import {SettingsHubScreen,ExperienceSettingsScreen} from '../features/routine/SettingsHubScreen';
import {TimeWalletScreen} from '../features/routine/TimeWalletScreen';
import {MoneyWalletScreen} from '../features/routine/MoneyWalletScreen';
import {DiaryDetailScreen} from '../features/routine/DiaryDetailScreen';
import { StudyHistoryScreen } from '../features/routine/StudyHistoryScreen';
import { DailyTimelineScreen } from '../features/routine/DailyTimeline';
import { StudyLogScreen } from '../features/routine/StudyLogScreen';
import {StudyForecastScreen} from '../features/routine/StudyForecastScreen';
import { StudyPreferencesScreen } from "../features/routine/StudySettingsScreens";
import {ConceptLabScreen} from '../features/conceptLab/ConceptLabScreen';
import {JapaneseSampleScreen} from '../features/conceptLab/JapaneseSampleScreen';
import { GuidedRoutineScreen } from "../features/routine/GuidedRoutineScreen";
import { BookStudyScreen } from "../features/routine/BookStudyScreen";
import { SpeakingSessionScreen } from "../features/routine/SpeakingSessionScreen";
import { EmergencyUnlockScreen } from "../features/routine/EmergencyUnlockScreen";
import { BackupScreen } from "../features/routine/BackupScreen";
import { SavedStudyScreen } from "../features/routine/SavedStudyScreen";
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
import { LifeLogScreen } from "../screens/LifeLogScreen";
import { PomodoroScreen } from "../screens/PomodoroScreen";
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
import { ScreenTimeTestScreen } from "../screens/ScreenTimeTestScreen";
import { StyleScreen } from "../screens/StyleScreen";
import { DiaryListenScreen } from "../screens/DiaryListenScreen";
import { VocabScreen } from "../screens/VocabScreen";
import { useTheme } from "../theme/ThemeContext";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";
import { RoutineProvider } from "../features/routine/RoutineProvider";
import { RoutineMorningScreen, RoutineRewardScreen, RoutineWorkoutScreen } from "../features/routine/RoutineFlowScreens";
import { RoutineStudySessionScreen, StudySettingsScreen } from "../features/routine/StudyScreens";
import { RoutineHistoryScreen } from "../features/routine/RecordScreens";
import { RoutineScreenTimeScreen } from "../features/routine/RoutineScreenTimeScreen";
import { RoutineSetupScreen } from "../features/routine/RoutineSetupScreen";
import { useReducedMotion } from "../features/routine/motion";
import { CalendarScreen } from "../screens/CalendarScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { InterestsScreen } from "../screens/InterestsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors: c } = useTheme();
  const { session, loading } = useSession();
  const reducedMotion = useReducedMotion();

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
    <RoutineProvider key={session?.user.id ?? "signed-out"} userId={session?.user.id}>
    <Stack.Navigator
      screenOptions={{
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700", color: c.text },
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.background },
        animation: reducedMotion ? "fade" : "default",
        animationDuration: reducedMotion ? 120 : undefined,
        gestureEnabled: true,
      }}
    >
      {session ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="PriorityPause" component={PriorityPauseScreen} options={{headerShown:false}}/>
          <Stack.Screen name="PriorityPlan" component={PriorityPlanScreen} options={{headerShown:false}}/>
          <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{headerShown:false}}/>
          <Stack.Screen name="WeekCheck" component={WeekCheckScreen} options={{headerShown:false}}/>
          <Stack.Screen name="NightReflection" component={NightReflectionScreen} options={{headerShown:false}}/>
          <Stack.Screen name="NextStudy" component={NextStudyScreen} options={{headerShown:false,presentation:"modal"}}/>
          <Stack.Screen name="BuildCheck" component={BuildCheckScreen} options={{headerShown:false}}/>
          <Stack.Screen name="SettingsHub" component={SettingsHubScreen} options={{headerShown:false}}/>
          <Stack.Screen name="ExperienceSettings" component={ExperienceSettingsScreen} options={{headerShown:false}}/>
          <Stack.Screen name="TimeWallet" component={TimeWalletScreen} options={{headerShown:false}}/><Stack.Screen name="HabitOrderSettings" component={HabitOrderSettingsScreen} options={{headerShown:false}}/>
          <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} options={{headerShown:false}}/>
          <Stack.Screen name="RoutineMorning" component={RoutineMorningScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoutineWorkout" component={RoutineWorkoutScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoutineStudySession" component={RoutineStudySessionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoutineReward" component={RoutineRewardScreen} options={{ headerShown: false, animation: "fade", animationDuration: reducedMotion ? 120 : 200 }} />
            <Stack.Screen name="EarnedReward" component={EarnedRewardScreen} options={{headerShown:false,animation:"fade"}}/>
          <Stack.Screen name="RoutineHistory" component={RoutineHistoryScreen} options={{ title: "학습 · 실천 기록" }} />
          <Stack.Screen name="StudyHistory" component={StudyHistoryScreen} options={{headerShown:false}}/>
          <Stack.Screen name="DailyTimeline" component={DailyTimelineScreen} options={{headerShown:false}}/>
          <Stack.Screen name="StudyLog" component={StudyLogScreen} options={{headerShown:false}}/>
          <Stack.Screen name="StudyForecast" component={StudyForecastScreen} options={{headerShown:false}}/>
          <Stack.Screen name="MoneyWallet" component={MoneyWalletScreen} options={{headerShown:false}}/>
          <Stack.Screen name="RoutineScreenTime" component={RoutineScreenTimeScreen} options={{ title: "앱 제한 설정" }} />
          <Stack.Screen name="RoutineSetup" component={RoutineSetupScreen} options={{ headerShown: false }} />
          <Stack.Screen name="GuidedRoutine" component={GuidedRoutineScreen} options={{headerShown:false}}/>
            <Stack.Screen name="AnimalPreview" component={AnimalPreviewScreen} options={{headerShown:false}}/>
            <Stack.Screen name="FocusTimer" component={FocusTimerScreen} options={{headerShown:false}}/>
            <Stack.Screen name="BookStudy" component={BookStudyScreen} options={{headerShown:false}}/>
            <Stack.Screen name="SpeakingSession" component={SpeakingSessionScreen} options={{headerShown:false}}/>
            <Stack.Screen name="EmergencyUnlock" component={EmergencyUnlockScreen} options={{headerShown:false}}/>
            <Stack.Screen name="RoutineBackup" component={BackupScreen} options={{headerShown:false}}/>
            <Stack.Screen name="SavedStudy" component={SavedStudyScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DeckCards" component={DeckCardsScreen} options={{headerShown:false}}/>
            <Stack.Screen name="StudyPreferences" component={StudyPreferencesScreen} options={{headerShown:false}}/>
            <Stack.Screen name="StudySettings" component={StudySettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ConceptLab" component={ConceptLabScreen} options={{headerShown:false}}/>
            <Stack.Screen name="JapaneseSample" component={JapaneseSampleScreen} options={{headerShown:false}}/>
          <Stack.Screen name="LegacyCalendar" component={CalendarScreen} options={{ title: "일정 캘린더" }} />
          <Stack.Screen name="LegacyToday" component={TodayScreen} options={{ title: "오늘의 기록" }} />
          <Stack.Screen name="LegacyReport" component={ReportScreen} options={{ title: "리포트" }} />
          <Stack.Screen name="LegacyInterests" component={InterestsScreen} options={{ title: "관심사 · 모든 기능" }} />
          <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ headerShown:false }} />
          <Stack.Screen
            name="EventEdit"
            component={EventEditScreen}
            options={{ title: "일정" }}
          />
          <Stack.Screen
            name="DiaryEdit"
            component={DiaryEditScreen}
            options={{ headerShown:false }}
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
          <Stack.Screen name="ScreenTimeTest" component={ScreenTimeTestScreen}
            options={{ title: "스크린타임 테스트" }} />
          <Stack.Screen
            name="MemoryMap"
            component={MemoryMapScreen}
            options={{ title: "추억 지도" }}
          />
          <Stack.Screen
            name="QuickAdd"
            component={QuickAddScreen}
            options={{ title: "빠른 일정 등록", presentation: "modal" }}
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
          <Stack.Screen
            name="Pomodoro"
            component={PomodoroScreen}
            options={{ title: "뽀모도로" }}
          />
          <Stack.Screen
            name="LifeLog"
            component={LifeLogScreen}
            options={{ title: "생활 기록" }}
          />
          <Stack.Screen
            name="Style"
            component={StyleScreen}
            options={{ title: "코디" }}
          />
          <Stack.Screen
            name="DiaryListen"
            component={DiaryListenScreen}
            options={{ headerShown:false }}
          />
          <Stack.Screen
            name="Vocab"
            component={VocabScreen}
            options={{ title: "단어장" }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
    <CommitmentGate/>
    <NextStudyGate/>
    <RestAlarmGate/>
    <CelebrationHost/>
    <FocusNoiseHost/>
    </RoutineProvider>
  );
}
