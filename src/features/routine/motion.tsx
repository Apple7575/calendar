import React, { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import {useExperiencePreferences} from '../../lib/experiencePreferences';

export const motion = { quick: 140, step: 240, reveal: 180, reward: 420, ease: Easing.bezier(0.22, 1, 0.36, 1) };
const ReducedMotion = createContext(true);
export function MotionProvider({ children }: { children: ReactNode }) {
  const preferences=useExperiencePreferences();
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    const query = Platform.OS === "web" && typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : undefined;
    if (query) setReduced(query.matches);
    else AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const onChange = (value: boolean) => { if (active) setReduced(value); };
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", onChange);
    const webChange = () => onChange(query?.matches ?? true);
    query?.addEventListener("change", webChange);
    return () => { active = false; subscription.remove(); query?.removeEventListener("change", webChange); };
  }, []);
  return <ReducedMotion.Provider value={reduced||!preferences.motion}>{children}</ReducedMotion.Provider>;
}
export const useReducedMotion = () => useContext(ReducedMotion);

/** A presentation-only cross-slide: incoming content is the single interactive layer. */
export function MotionSwap({ transitionKey, children, style, direction = 1 }: {
  transitionKey: string | number; children: ReactNode; style?: StyleProp<ViewStyle>; direction?: 1 | -1;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const previous = useRef({ key: transitionKey, children });
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { key: transitionKey, children };
    if (last.key === transitionKey) return;
    progress.stopAnimation();
    if (reduced) { progress.setValue(1); setOutgoing(null); return; }
    setOutgoing(last.children);
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: motion.step, easing: motion.ease, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setOutgoing(null); });
    // A later transition stops the preceding animation before installing a new layer.
  });
  useEffect(() => () => progress.stopAnimation(), [progress]);
  useEffect(() => { if (reduced) { progress.stopAnimation(); progress.setValue(1); setOutgoing(null); } }, [reduced, progress]);
  return <View style={[{ overflow: "hidden" }, style]}>
    {outgoing ? <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -28 * direction] }) }] }}>{outgoing}</Animated.View> : null}
    <Animated.View testID="motion-incoming" style={{ opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [28 * direction, 0] }) }] }}>{children}</Animated.View>
  </View>;
}

export function MotionEnter({ children, delay = 0, style, celebration = false }: {
  children: ReactNode; delay?: number; style?: StyleProp<ViewStyle>; celebration?: boolean;
}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, delay, duration: celebration ? motion.reward : motion.reveal, easing: motion.ease, useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [reduced, value, delay, celebration]);
  return <Animated.View style={[style, { opacity: value, transform: [
    { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [celebration ? 18 : 8, 0] }) },
    { scale: value.interpolate({ inputRange: [0, 1], outputRange: [celebration ? 0.88 : 1, 1] }) },
  ] }]}>{children}</Animated.View>;
}

export function CountUp({ value, prefix = "", suffix = "", style, animateInitial = false, delay = 0 }: {
  value: number; prefix?: string; suffix?: string; style?: StyleProp<TextStyle>; animateInitial?: boolean; delay?: number;
}) {
  const reduced = useReducedMotion();
  const animated = useRef(new Animated.Value(animateInitial && !reduced ? 0 : value)).current;
  const [display, setDisplay] = useState(animateInitial && !reduced ? 0 : value);
  useEffect(() => {
    const listener = animated.addListener(({ value: next }) => setDisplay(Math.round(next)));
    if (reduced) { animated.setValue(value); setDisplay(value); }
    else {
      const animation = Animated.timing(animated, { toValue: value, duration: motion.reward, delay, easing: motion.ease, useNativeDriver: false });
      animation.start();
    }
    return () => { animated.stopAnimation(); animated.removeListener(listener); };
  }, [value, reduced, animated, delay]);
  return <Text accessible accessibilityLabel={`${prefix}${value}${suffix}`} style={style}>{prefix}{display}{suffix}</Text>;
}

export function usePressMotion(disabled = false) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (disabled || reduced) { scale.stopAnimation(); scale.setValue(1); } }, [disabled, reduced, scale]);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const pressIn = () => {
    if (disabled || reduced) return;
    Animated.timing(scale, { toValue: 0.97, duration: 90, easing: motion.ease, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    if (reduced) return;
    Animated.spring(scale, { toValue: 1, stiffness: 420, damping: 28, mass: 0.7, useNativeDriver: true }).start();
  };
  return { scale, pressIn, pressOut };
}
