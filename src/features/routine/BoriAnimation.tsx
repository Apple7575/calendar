import React, { useEffect, useRef } from "react";
import LottieView from "lottie-react-native";

export type BoriAnimationProps = {
  source: React.ComponentProps<typeof LottieView>["source"]; loop: boolean; active: boolean;
  onFinish: () => void; onFailure: () => void;stillFrame?:number;resizeMode?:'contain'|'cover';
};

/**
 * 재생 시작은 autoPlay에 맡긴다. iOS에서는 JSON 소스의 onAnimationLoaded가 뷰를 처음 만들 때
 * 이벤트 전달 통로가 연결되기 전에 발생해 JS까지 오지 않으므로, 그 이벤트를 기다리면 재생되지 않는다.
 */
export function BoriAnimation({ source, loop, active, onFinish, onFailure,stillFrame,resizeMode='contain' }: BoriAnimationProps) {
  const animation = useRef<LottieView>(null),playing=active&&stillFrame===undefined;
  const total=typeof source==='object'&&source!==null&&'op' in source?Number(source.op):120;
  const first=typeof source==='object'&&source!==null&&'ip' in source?Number(source.ip):0;
  useEffect(() => {if(!playing)animation.current?.pause();}, [playing]);
  return <LottieView ref={animation} source={source} autoPlay={playing} loop={loop} progress={stillFrame===undefined?undefined:Math.max(0,Math.min(1,(stillFrame-first)/Math.max(1,total-first)))}
    resizeMode={resizeMode} style={{ width: "100%", height: "100%" }}
    onAnimationFinish={canceled => { if (!canceled) onFinish(); }}
    onAnimationFailure={() => onFailure()} />;
}
