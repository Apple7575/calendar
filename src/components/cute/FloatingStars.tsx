// 로그인 히어로 위에 떠다니며 반짝이는 별들 (절대 위치 오버레이)

import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";

const SPARKLE = "M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z";

const STARS = [
  { left: "12%", top: "16%", size: 14, dur: 2600, delay: 0 },
  { left: "82%", top: "12%", size: 10, dur: 3100, delay: 500 },
  { left: "70%", top: "30%", size: 8, dur: 2300, delay: 1100 },
  { left: "20%", top: "42%", size: 9, dur: 2900, delay: 800 },
  { left: "88%", top: "48%", size: 12, dur: 3400, delay: 200 },
  { left: "8%", top: "62%", size: 8, dur: 2500, delay: 1400 },
] as const;

function Star({ left, top, size, dur, delay }: (typeof STARS)[number]) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: dur,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v, dur, delay]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Path d={SPARKLE} fill="rgba(255,255,255,0.9)" />
      </Svg>
    </Animated.View>
  );
}

export function FloatingStars() {
  return (
    <>
      {STARS.map((s, i) => (
        <Star key={i} {...s} />
      ))}
    </>
  );
}
