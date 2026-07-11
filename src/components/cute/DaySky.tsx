// 시간대별 하늘 장식: 낮엔 광선이 도는 해, 저녁엔 노을 해, 밤엔 달과 반짝이는 별.
// RN Animated(native driver) + react-native-svg — 가볍게 계속 움직인다.

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

function useLoop(duration: number, delay = 0): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v, duration, delay]);
  return v;
}

function SpinningSun({ size, sunset }: { size: number; sunset: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const body = sunset ? "#FF9E5C" : "#FFC94A";
  const rays = sunset ? "#FFB98A" : "#FFDD85";
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg width={size} height={size} viewBox="0 0 30 30">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <Line
                key={i}
                x1={15 + Math.cos(a) * 10}
                y1={15 + Math.sin(a) * 10}
                x2={15 + Math.cos(a) * 13.5}
                y2={15 + Math.sin(a) * 13.5}
                stroke={rays}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 30 30">
        <Circle cx={15} cy={15} r={7.5} fill={body} />
      </Svg>
    </View>
  );
}

function NightMoon({ size }: { size: number }) {
  const twinkleA = useLoop(900);
  const twinkleB = useLoop(1300, 400);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 30 30">
        <Path
          d="M22 17.5 A9.5 9.5 0 1 1 12.5 5 A8 8 0 0 0 22 17.5 Z"
          fill="#F6E7A9"
        />
      </Svg>
      <Animated.View
        style={[
          styles.star,
          { right: size * 0.05, top: size * 0.08, opacity: twinkleA },
        ]}
      >
        <Svg width={7} height={7} viewBox="0 0 10 10">
          <Path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#FFE9A8" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          styles.star,
          { right: size * 0.32, top: size * 0.42, opacity: twinkleB },
        ]}
      >
        <Svg width={5} height={5} viewBox="0 0 10 10">
          <Path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#FFE9A8" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** 지금 시각에 맞는 하늘 장식 */
export function DaySky({ size = 28 }: { size?: number }) {
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 6) return <NightMoon size={size} />;
  return <SpinningSun size={size} sunset={hour >= 17} />;
}

const styles = StyleSheet.create({
  star: { position: "absolute" },
});
