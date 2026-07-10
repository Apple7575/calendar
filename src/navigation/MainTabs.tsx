import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { CalendarScreen } from "../screens/CalendarScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes } from "../theme/tokens";
import { MainTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <Ionicons name={focused ? active : inactive} size={22} color={color} />
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
        <Ionicons name="camera" size={26} color={c.white} />
      </TouchableOpacity>
    </View>
  );
}

export function MainTabs() {
  const { colors: c } = useTheme();
  return (
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
        options={{ title: "캘린더", tabBarIcon: tabIcon("calendar", "calendar-outline") }}
      />
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: "오늘", tabBarIcon: tabIcon("sunny", "sunny-outline") }}
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
        name="Search"
        component={SearchScreen}
        options={{ title: "검색", tabBarIcon: tabIcon("search", "search-outline") }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "설정", tabBarIcon: tabIcon("settings", "settings-outline") }}
      />
    </Tab.Navigator>
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
