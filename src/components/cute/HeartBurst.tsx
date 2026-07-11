// 하트 버스트: 좋아요를 누르는 순간 작은 하트들이 위로 날아오르며 사라진다.
// trigger 값이 바뀔 때마다(0 제외) 1회 재생. 버튼을 감싸는 위치에 두면 된다.

import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const HEART = "M12 21s-8-5.3-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.7-8 11-8 11z";
const COUNT = 6;

export function HeartBurst({ trigger }: { trigger: number }) {
  const configs = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        dx: (i - (COUNT - 1) / 2) * 11 + (Math.random() - 0.5) * 8,
        dy: -(34 + Math.random() * 26),
        delay: Math.random() * 120,
        size: 9 + Math.random() * 5,
      })),
    // trigger마다 새 배치
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger]
  );
  // Animated.Value는 뷰가 바인딩을 유지하도록 재생성하지 않고 setValue(0)로 리셋한다
  const values = useRef(Array.from({ length: COUNT }, () => new Animated.Value(0)));

  useEffect(() => {
    if (trigger === 0) return;
    values.current.forEach((v) => v.setValue(0));
    const anim = Animated.parallel(
      configs.map((cfg, i) =>
        Animated.sequence([
          Animated.delay(cfg.delay),
          Animated.timing(values.current[i], {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (trigger === 0) return null;
  return (
    <View style={styles.wrap} pointerEvents="none">
      {configs.map((cfg, i) => {
        const p = values.current[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dx] }) },
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.dy] }) },
                { scale: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1, 0.85] }) },
              ],
            }}
          >
            <Svg width={cfg.size} height={cfg.size} viewBox="0 0 24 24">
              <Path d={HEART} fill="#FF5A79" />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
