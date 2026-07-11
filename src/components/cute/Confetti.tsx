// 축하 컨페티: 화면 위에서 알록달록한 조각들이 흩날리며 떨어진다.
// visible=true가 되는 순간 1회 재생하고 onDone을 부른다.

import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const COLORS = ["#FF8FA3", "#FFC94A", "#7EC8FF", "#8B72E8", "#63D9A0", "#FFA65C"];
const PIECES = 18;

type PieceConfig = {
  x: number;
  drift: number;
  size: number;
  round: boolean;
  color: string;
  delay: number;
  duration: number;
  turns: number;
};

function Piece({ cfg, progress }: { cfg: PieceConfig; progress: Animated.Value }) {
  const { height: H } = Dimensions.get("window");
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, H * 0.85],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cfg.drift],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${cfg.turns * 360}deg`],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1, 0],
  });
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: cfg.x,
        top: 0,
        width: cfg.size,
        height: cfg.size * (cfg.round ? 1 : 0.6),
        borderRadius: cfg.round ? cfg.size / 2 : 2,
        backgroundColor: cfg.color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

export function Confetti({ visible, onDone }: { visible: boolean; onDone?: () => void }) {
  const { width: W } = Dimensions.get("window");
  const configs = useMemo<PieceConfig[]>(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: Math.random() * W,
        drift: (Math.random() - 0.5) * 130,
        size: 6 + Math.random() * 5,
        round: i % 3 === 0,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 260,
        duration: 1100 + Math.random() * 600,
        turns: 1 + Math.floor(Math.random() * 3),
      })),
    // visible이 켜질 때마다 새 배치
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, W]
  );
  // Animated.Value는 뷰가 바인딩을 유지하도록 재생성하지 않고 setValue(0)로 리셋한다
  const values = useRef(Array.from({ length: PIECES }, () => new Animated.Value(0)));

  useEffect(() => {
    if (!visible) return;
    values.current.forEach((v) => v.setValue(0));
    const anim = Animated.parallel(
      configs.map((cfg, i) =>
        Animated.sequence([
          Animated.delay(cfg.delay),
          Animated.timing(values.current[i], {
            toValue: 1,
            duration: cfg.duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    anim.start(() => onDone?.());
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {configs.map((cfg, i) => (
        <Piece key={i} cfg={cfg} progress={values.current[i]} />
      ))}
    </View>
  );
}
