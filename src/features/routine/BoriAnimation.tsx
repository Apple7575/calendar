import React, { useEffect, useRef } from "react";
import LottieView from "lottie-react-native";

export type BoriAnimationProps = {
  source: React.ComponentProps<typeof LottieView>["source"]; loop: boolean; active: boolean;
  onFinish: () => void; onFailure: () => void;
};

export function BoriAnimation({ source, loop, active, onFinish, onFailure }: BoriAnimationProps) {
  const animation = useRef<LottieView>(null);
  useEffect(() => {
    if (active) animation.current?.play();
    else animation.current?.pause();
  }, [active]);
  return <LottieView ref={animation} source={source} autoPlay={false} loop={loop}
    resizeMode="contain" style={{ width: "100%", height: "100%" }}
    onAnimationLoaded={() => { if (active) animation.current?.play(); }}
    onAnimationFinish={canceled => { if (!canceled) onFinish(); }}
    onAnimationFailure={() => onFailure()} />;
}
