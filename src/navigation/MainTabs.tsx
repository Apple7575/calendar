import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Camera as CameraIcon } from "phosphor-react-native/src/icons/Camera";
import { CalendarBlank } from "phosphor-react-native/src/icons/CalendarBlank";
import { ChartLineUp } from "phosphor-react-native/src/icons/ChartLineUp";
import { Compass } from "phosphor-react-native/src/icons/Compass";
import { Sun } from "phosphor-react-native/src/icons/Sun";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { GoalMottoModal } from "../components/GoalMottoModal";
import { maybeAutoBackup } from "../lib/backup";
import { CalendarScreen } from "../screens/CalendarScreen";
import { InterestsScreen } from "../screens/InterestsScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes } from "../theme/tokens";
import { MainTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type PhosphorIcon = typeof CalendarBlank;

function tabIcon(Icon: PhosphorIcon) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <Icon size={22} weight={focused ? "fill" : "regular"} color={color} />
  );
}

/** 탭 화면 없이 버튼만 두는 자리 (실제로는 카메라 모달이 열린다) */
function CameraTabPlaceholder() {
  return null;
}

function CameraTabButton({ c }: { c: ThemeColors }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={cameraButtonStyles.slot} pointerEvents="box-none">
      <TouchableOpacity
        style={[cameraButtonStyles.button, { backgroundColor: c.primary }]}
        onPress={() => navigation.navigate("Camera")}
        activeOpacity={0.85}
        accessibilityLabel="순간 찍기"
      >
        <CameraIcon size={26} weight="fill" color={c.white} />
      </TouchableOpacity>
    </View>
  );
}

export function MainTabs() {
  const { colors: c } = useTheme();
  // 앱 실행 시 1회: 자동 백업 점검 (28일 주기, 조용히)
  React.useEffect(() => {
    void maybeAutoBackup();
  }, []);
  return (
    <>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: fontSizes.caption, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.border,
        },
      }}
    >
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: "캘린더", tabBarIcon: tabIcon(CalendarBlank) }}
      />
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: "오늘", tabBarIcon: tabIcon(Sun) }}
      />
      <Tab.Screen
        name="CameraTab"
        component={CameraTabPlaceholder}
        options={{
          title: "",
          tabBarButton: () => <CameraTabButton c={c} />,
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{ title: "리포트", tabBarIcon: tabIcon(ChartLineUp) }}
      />
      <Tab.Screen
        name="Interests"
        component={InterestsScreen}
        options={{ title: "관심사", tabBarIcon: tabIcon(Compass) }}
      />
    </Tab.Navigator>
    <GoalMottoModal />
    </>
  );
}

const cameraButtonStyles = StyleSheet.create({
  slot: { flex: 1, alignItems: "center" },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
