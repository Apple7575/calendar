// 빈 상태 일러스트: 웅크리고 자는 고양이가 숨 쉬듯 들썩이고 z z z가 떠오른다.

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

function useBreath(): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v]);
  return v;
}

function Zzz({ delay, left, top, size }: { delay: number; left: number; top: number; size: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 2100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v, delay]);
  return (
    <Animated.Text
      style={[
        styles.z,
        {
          left,
          top,
          fontSize: size,
          opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
          ],
        },
      ]}
    >
      z
    </Animated.Text>
  );
}

/** color에는 테마의 textMuted 정도가 잘 어울린다 */
export function SleepyCat({ color, size = 100 }: { color: string; size?: number }) {
  const breath = useBreath();
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <View style={{ width: size, height: size * 0.8 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={size} height={size * 0.8} viewBox="0 0 100 80">
          {/* 몸통 */}
          <Ellipse cx={46} cy={58} rx={30} ry={16} fill={color} opacity={0.18} />
          <Ellipse cx={46} cy={58} rx={30} ry={16} fill="none" stroke={color} strokeWidth={2.5} />
          {/* 꼬리 */}
          <Path
            d="M17 60 q-9 -1 -7 -11 q1 -5 6 -6"
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* 머리 */}
          <Circle cx={68} cy={46} r={15} fill={color} opacity={0.18} />
          <Circle cx={68} cy={46} r={15} fill="none" stroke={color} strokeWidth={2.5} />
          {/* 귀 */}
          <Path d="M57 36 l2.5 -9 l7 6 z" fill={color} />
          <Path d="M72 33 l2 -9 l7.5 5 z" fill={color} />
          {/* 감은 눈 */}
          <Path d="M62 47 q3 3 6 0" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M72 47 q3 3 6 0" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
          {/* 코+입 */}
          <Path d="M68 52 q1.5 2 3 0" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Zzz delay={0} left={size * 0.84} top={size * 0.1} size={13} />
      <Zzz delay={700} left={size * 0.92} top={size * 0.02} size={11} />
      <Zzz delay={1400} left={size * 0.99} top={-size * 0.05} size={9} />
    </View>
  );
}

const styles = StyleSheet.create({
  z: { position: "absolute", fontWeight: "800", color: "#9AA3B2" },
});
