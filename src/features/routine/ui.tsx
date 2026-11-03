import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";
import { motion, MotionEnter, usePressMotion, useReducedMotion } from "./motion";
import {useNavigation,useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {tapLight} from '../../lib/haptics';

export function Page({ title, right, children, footer, scrollable = true, floatingFooter = false, fillContent = false,embedded=false,scrollEnabled=true,scrollRef,showHeader=true }: { title: string; showHeader?:boolean; right?: ReactNode; children: ReactNode; footer?: ReactNode; scrollable?: boolean; floatingFooter?: boolean;fillContent?:boolean;embedded?:boolean;scrollEnabled?:boolean;scrollRef?:React.RefObject<ScrollView|null> }) {
  const { colors: c } = useTheme();
  const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),route=useRoute();
  const back=nav.canGoBack()&&!['Today','Study','Bori','Records','Calendar','More'].includes(route.name);
  if(embedded)return <View style={{gap:18}}>{children}</View>;
  const content = <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.surface }}>
    {showHeader?<View style={[u.header,{gap:10}]}>{back?<Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={()=>nav.goBack()} style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Icon name="arrow-back" size={23}/></Pressable>:null}<Text accessibilityRole="header" style={[u.title, { color: c.text,flex:1,fontSize:25 }]}>{title}</Text>{right??<Pressable accessibilityRole="button" accessibilityLabel="프로필·설정" onPress={()=>nav.navigate('SettingsHub')} style={{width:44,height:44,borderRadius:22,backgroundColor:c.primarySoft,alignItems:'center',justifyContent:'center'}}><Icon name="person-outline" size={21}/></Pressable>}</View>:null}
    {scrollable ? <ScrollView ref={scrollRef} scrollEnabled={scrollEnabled} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={[u.page, fillContent?{flexGrow:1}:null, footer ? { paddingBottom: floatingFooter ? fillContent?12:120 : 24 } : null]} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      : <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 16, paddingBottom: 12 }}>{children}</View>}
    {footer ? floatingFooter ? <View style={{position:'absolute',left:12,right:12,bottom:0}}>{footer}</View> : <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.surface, borderTopWidth: 1, borderColor: c.border, padding: 16 }}>{footer}</SafeAreaView> : null}
  </SafeAreaView>;
  return Platform.OS === "web" ? <MotionEnter style={{ flex: 1, backgroundColor: c.surface }}>{content}</MotionEnter> : content;
}
export function CardView({ children, style }: { children: ReactNode; style?: object }) {
  const { colors: c } = useTheme();
  return <View style={[u.card, { backgroundColor: c.card }, style]}>{children}</View>;
}
export function Copy({ children, muted = false, size = 15, weight = "500",numberOfLines,style }: { children: ReactNode; muted?: boolean; size?: number; numberOfLines?:number;style?:import('react-native').StyleProp<import('react-native').TextStyle>;weight?: "400" | "500" | "600" | "700" | "800" }) {
  const { colors: c } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ color: muted ? c.textMuted : c.text, fontSize: size, fontWeight: weight, lineHeight: size * 1.5, letterSpacing: -0.3 },style]}>{children}</Text>;
}
export function Action({ label, onPress, secondary = false, disabled = false, compact = false }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; compact?: boolean;
}) {
  const { colors: c, isDark } = useTheme();
  const press = usePressMotion(disabled);
  const reduced = useReducedMotion();
  return <Animated.View style={{ transform: [{ scale: press.scale }] }}><Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={()=>{tapLight();onPress();}}
    onPressIn={press.pressIn} onPressOut={press.pressOut}
    style={({ pressed }) => [u.action, { minHeight: compact ? 48 : 58, backgroundColor: secondary ? c.inputBg : c.primary,borderRadius:20,borderWidth:1,borderBottomWidth:pressed?1:4,borderColor:secondary?c.border:c.primary,transform:[{translateY:pressed&&!reduced?3:0}],
      opacity: disabled ? 0.45 : 1 }]}>
    <Text style={{ color: secondary ? c.text : isDark ? c.background : c.white, fontWeight: "700", fontSize: compact ? 15 : 17, textAlign: "center" }}>{label}</Text>
  </Pressable></Animated.View>;
}
export function Link({ label, onPress,disabled=false }: { label: string; onPress: () => void;disabled?:boolean }) {
  const { colors: c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6,opacity:disabled?0.45:1 }}>
    <Text style={{ color: c.textMuted, fontWeight: "600", textAlign: "center", fontSize: 14 }}>{label}</Text>
  </Pressable>;
}
export function Progress({ value, label }: { value: number; label: string }) {
  const { colors: c } = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const amount = useRef(new Animated.Value(Math.min(1, Math.max(0, value)))).current;
  useEffect(() => {
    const next = Math.min(1, Math.max(0, value));
    if (reduced) { amount.setValue(next); return; }
    const animation = Animated.timing(amount, { toValue: next, duration: motion.reward, easing: motion.ease, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [value, reduced, amount]);
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ height: 12, borderRadius: 6, backgroundColor: c.border, overflow: "hidden" }}>
    <Animated.View style={{ width: "100%", height: "100%", backgroundColor: c.primary, borderRadius: 6,
      transform: [{ translateX: amount.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: amount }] }} />
  </View>;
}
export { BoriMascot as Mascot } from "./BoriMascot";
export type { MascotMood } from "./boriAssets";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function RingSegment({ amount, arc, length, rotation, locked, color }: {
  amount: number; arc: number; length: number; rotation: number; locked: boolean; color: string;
}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(reduced ? amount : 0)).current;
  const [webAmount, setWebAmount] = useState(reduced ? amount : 0);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = value.addListener(({ value: next }) => setWebAmount(next));
    return () => value.removeListener(listener);
  }, [value]);
  useEffect(() => {
    if (reduced) { value.setValue(amount); return; }
    const animation = Animated.timing(value, { toValue: amount, duration: 650, easing: motion.ease, useNativeDriver: false });
    animation.start(); return () => animation.stop();
  }, [amount, reduced, value]);
  if (Platform.OS === "web") return <Circle cx="120" cy="120" r="100" stroke={color} strokeOpacity={locked ? 0.4 : 1} strokeWidth="17" fill="none"
    strokeDasharray={`${webAmount * arc} ${length - webAmount * arc}`} transform={`rotate(${rotation} 120 120)`} strokeLinecap="round" />;
  return <AnimatedCircle cx="120" cy="120" r="100" stroke={color} strokeOpacity={locked ? 0.4 : 1} strokeWidth="17" fill="none"
    strokeDasharray={value.interpolate({ inputRange: [0, 1], outputRange: [`0 ${length}`, `${arc} ${length - arc}`] })}
    transform={`rotate(${rotation} 120 120)`} strokeLinecap="round" />;
}
export function TimeRing({ paid, locked, children }: { paid: number[]; locked: boolean; children: ReactNode }) {
  const { colors: c } = useTheme();
  const radius = 100, length = 2 * Math.PI * radius;
  const budgets = [10, 20, 30]; let offset = 0;
  return <View style={{ width: 240, height: 240, alignSelf: "center", alignItems: "center", justifyContent: "center" }}>
    <Svg width="240" height="240" style={StyleSheet.absoluteFill}>
      {budgets.map((budget, i) => {
        const start = offset; offset += budget;
        const arc = budget / 60 * length - 9;
        const fill = Math.max(0, Math.min(1, paid[i] / budget)) * arc;
        return <React.Fragment key={i}>
          <Circle cx="120" cy="120" r={radius} stroke={c.border} strokeWidth="17" fill="none"
            strokeDasharray={`${arc} ${length - arc}`} transform={`rotate(${-90 + start / 60 * 360} 120 120)`} strokeLinecap="round" />
          {fill > 0 ? <RingSegment amount={Math.max(0, Math.min(1, paid[i] / budget))} arc={arc} length={length} rotation={-90 + start / 60 * 360} locked={locked} color={c.primary} /> : null}
        </React.Fragment>;
      })}
    </Svg>{children}
  </View>;
}
export function Icon({ name, size = 24, color }: { name: keyof typeof Ionicons.glyphMap; size?: number; color?: string }) {
  const { colors } = useTheme(); return <Ionicons name={name} size={size} color={color ?? colors.textMuted} />;
}
export const u = StyleSheet.create({
  header: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 27, fontWeight: "800", letterSpacing: -0.9 },
  page: { paddingHorizontal: 16, gap: 16, paddingBottom: 32 },
  card: { padding: 22, borderRadius: 26, gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  action: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
