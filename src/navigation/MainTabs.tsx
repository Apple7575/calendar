import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { CalendarScreen } from "../screens/CalendarScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { useTheme } from "../theme/ThemeContext";
import { fontSizes } from "../theme/tokens";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <Ionicons name={focused ? active : inactive} size={22} color={color} />
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
