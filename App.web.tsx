import {HabitOrderSettingsScreen} from './src/features/routine/HabitOrderSettingsScreen';
import { DayDetailScreen } from "./src/screens/DayDetailScreen";
import {SettingsHubScreen,ExperienceSettingsScreen} from './src/features/routine/SettingsHubScreen';
import {TimeWalletScreen} from './src/features/routine/TimeWalletScreen';
import {DiaryDetailScreen} from './src/features/routine/DiaryDetailScreen';
import { StudyHistoryScreen } from './src/features/routine/StudyHistoryScreen';
import { PhotoViewerScreen } from "./src/screens/PhotoViewerScreen";
import { DiaryListenScreen } from "./src/screens/DiaryListenScreen";
import { DiaryEditScreen } from "./src/screens/DiaryEditScreen";
import { DeckCardsScreen } from "./src/features/routine/DeckCardsScreen";
import { StudyPreferencesScreen } from "./src/features/routine/StudySettingsScreens";
import { useSession } from "./src/hooks/useSession";
import { GuidedRoutineScreen } from "./src/features/routine/GuidedRoutineScreen";
import { BookStudyScreen } from "./src/features/routine/BookStudyScreen";
import { BackupScreen } from "./src/features/routine/BackupScreen";
import { SavedStudyScreen } from "./src/features/routine/SavedStudyScreen";
import n3Deck from './assets/decks/n3-vocabulary.json';
import { emptyData,mergePublishedDeck } from './src/lib/routineModel';
import React, { useState } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { RoutineProvider } from "./src/features/routine/RoutineProvider";
import { MainTabs } from "./src/navigation/MainTabs";
import { RoutineMorningScreen, RoutineRewardScreen, RoutineWorkoutScreen } from "./src/features/routine/RoutineFlowScreens";
import { RoutineStudySessionScreen, StudySettingsScreen } from "./src/features/routine/StudyScreens";
import { RoutineHistoryScreen } from "./src/features/routine/RecordScreens";
import { Action, CardView, Copy, Page } from "./src/features/routine/ui";
import { RootStackParamList } from "./src/navigation/types";
import { MotionProvider } from "./src/features/routine/motion";
import { DesktopDeckManager } from "./src/features/routine/DesktopDeckManager";
import { RoutineSetupScreen } from "./src/features/routine/RoutineSetupScreen";
import { BoriPreviewScreen } from "./src/features/routine/BoriPreview.web";

const Stack = createNativeStackNavigator<RootStackParamList>();
function DeviceOnly({ navigation }: { navigation: { goBack: () => void } }) {
  return <Page title="아이폰에서 사용할 기능"><CardView><Copy>이 미리보기에서는 새 루틴 화면과 학습 흐름을 둘러볼 수 있어요. 스크린타임 차단과 기존 앱 기능은 아이폰 앱에서 사용할 수 있어요.</Copy><Action label="돌아가기" onPress={() => navigation.goBack()} /></CardView></Page>;
}
function Preview() {
  const {session}=useSession();
  const demo=typeof window!=="undefined"&&new URLSearchParams(window.location.search).get('studyDemo')==='1';
  const [demoData]=useState(()=>demo?mergePublishedDeck(emptyData(),{...n3Deck,schema:'routine.japanese-deck.v1'}):undefined);
  const { colors: c } = useTheme();
  const navigation = useNavigationContainerRef<RootStackParamList>();
  return <View style={{ flex: 1, backgroundColor: "#E9ECEF", alignItems: "center" }}>
    <View style={{ width: "100%", maxWidth: 460, flex: 1, backgroundColor: c.surface }}>
      <View style={{ paddingVertical: 9, paddingHorizontal: 16, backgroundColor: c.primarySoft }}><Text style={{ color: c.text, fontSize: 12, textAlign: "center" }}>웹 미리보기 · 이 브라우저에만 기록 저장 · 앱 차단 미지원</Text>
      </View>
      <RoutineProvider key={session?.user.id??'preview'} userId={session?`web-preview:${session.user.id}`:demo?'web-study-demo':'web-preview'} cloudUserId={session?.user.id} initialData={demoData}>
        <NavigationContainer ref={navigation} onReady={()=>{if(demo)navigation.navigate('RoutineStudySession',{level:'full'})}}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="SettingsHub" component={SettingsHubScreen}/>
            <Stack.Screen name="ExperienceSettings" component={ExperienceSettingsScreen}/>
            <Stack.Screen name="TimeWallet" component={TimeWalletScreen}/><Stack.Screen name="HabitOrderSettings" component={HabitOrderSettingsScreen}/>
            <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen}/>
            <Stack.Screen name="RoutineMorning" component={RoutineMorningScreen} />
            <Stack.Screen name="RoutineWorkout" component={RoutineWorkoutScreen} />
            <Stack.Screen name="RoutineReward" component={RoutineRewardScreen} />
            <Stack.Screen name="RoutineStudySession" component={RoutineStudySessionScreen} />
            <Stack.Screen name="RoutineHistory" component={RoutineHistoryScreen} />
            <Stack.Screen name="StudyHistory" component={StudyHistoryScreen} />
            <Stack.Screen name="RoutineSetup" component={RoutineSetupScreen} />
            <Stack.Screen name="GuidedRoutine" component={GuidedRoutineScreen} options={{headerShown:false}}/>
            <Stack.Screen name="BookStudy" component={BookStudyScreen} options={{headerShown:false}}/>
            <Stack.Screen name="RoutineBackup" component={BackupScreen} options={{headerShown:false}}/>
            <Stack.Screen name="SavedStudy" component={SavedStudyScreen} />
            <Stack.Screen name="DeckCards" component={DeckCardsScreen} options={{headerShown:false}}/>
            <Stack.Screen name="StudyPreferences" component={StudyPreferencesScreen} options={{headerShown:false}}/>
            <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{headerShown:false}}/>
            <Stack.Screen name="PhotoViewer" component={PhotoViewerScreen} options={{headerShown:false}}/>
            <Stack.Screen name="DiaryListen" component={DiaryListenScreen} options={{headerShown:false}}/>
            <Stack.Screen name="DiaryEdit" component={DiaryEditScreen} options={{headerShown:false}}/>
            <Stack.Screen name="StudySettings" component={StudySettingsScreen} />
            {(["RoutineScreenTime", "LegacyCalendar", "LegacyToday", "LegacyReport", "LegacyInterests", "Gallery", "Camera", "Routines", "Settings", "Workout", "EventEdit"] as const).map(name => <Stack.Screen key={name} name={name} component={DeviceOnly} />)}
          </Stack.Navigator>
        </NavigationContainer>
      </RoutineProvider>
    </View>
  </View>;
}
export default function App() {
  const manager = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("manage") === "1";
  const bori = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("bori") === "1";
  return <SafeAreaProvider><ThemeProvider><MotionProvider>{bori ? <NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Main" component={BoriPreviewScreen} /></Stack.Navigator></NavigationContainer> : manager ? <DesktopDeckManager /> : <Preview />}</MotionProvider></ThemeProvider></SafeAreaProvider>;
}

