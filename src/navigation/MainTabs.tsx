import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardScreen } from "../features/routine/DashboardScreen";
import { RoutineCalendarScreen, RoutineMoreScreen } from "../features/routine/RecordScreens";
import { StudyHomeScreen } from "../features/routine/StudyScreens";
import { maybeAutoBackup } from "../lib/backup";
import { useTheme } from "../theme/ThemeContext";
import { MainTabParamList } from "./types";
import { motion, useReducedMotion } from "../features/routine/motion";
import {BoriHomeScreen} from '../features/routine/BoriHomeScreen';
import {RecordsHomeScreen} from '../features/routine/RecordsHomeScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const items: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  Today: { label: "오늘", icon: "sunny-outline", active: "sunny" },
  Study: { label: "학습", icon: "layers-outline", active: "layers" },
  Bori: { label: "보리", icon: "leaf-outline", active: "leaf" },
  Records: { label: "기록", icon: "journal-outline", active: "journal" },
};

function FloatingTabs({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme(), c = theme.colors;
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [opaque, setOpaque] = useState(false);
  useEffect(() => {
    let active = true;
    if (Platform.OS === "ios") AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setOpaque(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setOpaque);
    return () => { active = false; listener.remove(); };
  }, []);
  const selectedIndex = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    if (reduced) { selectedIndex.setValue(state.index); return; }
    const animation = Animated.timing(selectedIndex, { toValue: state.index, duration: motion.step, easing: motion.ease, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [state.index, reduced, selectedIndex]);
  const itemWidth = Math.max(0, width - 14) / state.routes.length;
  return <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 16), left: 16, right: 16,
    borderRadius: 34, shadowColor: c.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20 }}>
    <BlurView onLayout={event => setWidth(event.nativeEvent.layout.width)} intensity={opaque ? 100 : 24} tint={theme.isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"} style={{ borderRadius: 34, overflow: "hidden", padding: 6,
      flexDirection: "row", minHeight: 68, borderWidth: 1, borderColor: theme.isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.7)",
      backgroundColor: opaque ? c.card : "transparent" }}>
      {!opaque ? <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.isDark ? "rgba(18,23,32,0.2)" : "rgba(255,255,255,0.14)" }} /> : null}
      {width > 0 ? <Animated.View pointerEvents="none" style={{ position: "absolute", left: 7, top: 7, bottom: 7, width: itemWidth,
        borderRadius: 28, backgroundColor: c.primarySoft, transform: [{ translateX: Animated.multiply(selectedIndex, itemWidth) }] }} /> : null}
      {state.routes.map((route, index) => {
        const selected = state.index === index, item = items[route.name];
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }}
          onPress={() => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }} onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 7,
            borderRadius: 28, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
          <Ionicons name={selected ? item.active : item.icon} size={23} color={selected ? c.primary : c.textMuted} />
          <Text style={{ fontSize: 11, fontWeight: selected ? "800" : "600", color: selected ? c.primary : c.textMuted }}>{item.label}</Text>
        </Pressable>;
      })}
    </BlurView>
  </View>;
}

export function MainTabs() {
  const reduced = useReducedMotion();
  useEffect(() => { void maybeAutoBackup(); }, []);
  return <Tab.Navigator initialRouteName="Today" tabBar={props => <FloatingTabs {...props} />} screenOptions={{ headerShown: false,
    animation: reduced ? "none" : "fade", transitionSpec: { animation: "timing", config: { duration: 170, easing: motion.ease } } }}>
    <Tab.Screen name="Today" component={DashboardScreen} />
    <Tab.Screen name="Study" component={StudyHomeScreen} />
    <Tab.Screen name="Bori" component={BoriHomeScreen} />
    <Tab.Screen name="Records" component={RecordsHomeScreen} />
  </Tab.Navigator>;
}
