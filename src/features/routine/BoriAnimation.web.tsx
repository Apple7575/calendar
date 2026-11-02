import React, { useEffect, useRef } from "react";
import lottie, { AnimationItem } from "lottie-web";
import type { BoriAnimationProps } from "./BoriAnimation";

export function BoriAnimation({ source, loop, active, onFinish, onFailure,stillFrame,resizeMode='contain' }: BoriAnimationProps) {
  const container = useRef<HTMLDivElement>(null), animation = useRef<AnimationItem | null>(null);
  const activeRef = useRef(active),started=useRef(false);
  activeRef.current = active;
  const frameRef=useRef(stillFrame);frameRef.current=stillFrame;
  useEffect(() => {
    if (!container.current) return;
    let player: AnimationItem | undefined;
    started.current=false;
    try {
      player = lottie.loadAnimation({ container: container.current, renderer: "svg", loop, autoplay: false,
        // lottie-web completes/mutates animation data; each instance needs its own copy.
        animationData: JSON.parse(JSON.stringify(source)),
        rendererSettings: { preserveAspectRatio: resizeMode==='cover'?'xMidYMid slice':'xMidYMid meet', progressiveLoad: false } });
      animation.current = player;
      player.addEventListener("complete", onFinish);
      player.addEventListener("data_failed", onFailure);
      player.addEventListener("error", onFailure);
      player.addEventListener("DOMLoaded", () => { if(frameRef.current!==undefined)player?.goToAndStop(frameRef.current,true);else if (activeRef.current&&!started.current){started.current=true;player?.goToAndPlay(0,true);} });
    } catch { onFailure(); }
    return () => { animation.current = null; player?.destroy(); };
  }, [source, loop, onFinish, onFailure,resizeMode]);
  useEffect(() => {if(stillFrame!==undefined)animation.current?.goToAndStop(stillFrame,true);else if (active){if(!started.current&&animation.current){started.current=true;animation.current.goToAndPlay(0,true);}else animation.current?.play();} else animation.current?.pause(); }, [active,stillFrame]);
  return <div ref={container} aria-hidden="true" data-loop={String(loop)} data-active={String(active)} data-still-frame={stillFrame??''} style={{ width: "100%", height: "100%", pointerEvents: "none" }} />;
}
