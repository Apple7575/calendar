import React, { useEffect, useRef, useState } from "react";
import LottieView from "lottie-react-native";

export type BoriAnimationProps = {
  source: React.ComponentProps<typeof LottieView>["source"]; loop: boolean; active: boolean;
  onFinish: () => void; onFailure: () => void;stillFrame?:number;resizeMode?:'contain'|'cover';
};

export function BoriAnimation({ source, loop, active, onFinish, onFailure,stillFrame,resizeMode='contain' }: BoriAnimationProps) {
  const animation = useRef<LottieView>(null),started=useRef(false),[loaded,setLoaded]=useState(false);
  const total=typeof source==='object'&&source!==null&&'op' in source?Number(source.op):120;
  const first=typeof source==='object'&&source!==null&&'ip' in source?Number(source.ip):0;
  useEffect(() => {
    if (!loaded)return;
    if (active&&stillFrame===undefined){if(started.current)animation.current?.resume();else{started.current=true;animation.current?.play(first,total);}}
    else animation.current?.pause();
  }, [active,stillFrame,loaded,first,total]);
  return <LottieView ref={animation} source={source} autoPlay={false} loop={loop} progress={stillFrame===undefined?undefined:Math.max(0,Math.min(1,(stillFrame-first)/Math.max(1,total-first)))}
    resizeMode={resizeMode} style={{ width: "100%", height: "100%" }}
    onAnimationLoaded={() =>setLoaded(true)}
    onAnimationFinish={canceled => { if (!canceled) onFinish(); }}
    onAnimationFailure={() => onFailure()} />;
}
