import React, { useEffect, useRef } from "react";
import lottie, { AnimationItem } from "lottie-web";
import type { BoriAnimationProps } from "./BoriAnimation";

export function BoriAnimation({ source, loop, active, onFinish, onFailure }: BoriAnimationProps) {
  const container = useRef<HTMLDivElement>(null), animation = useRef<AnimationItem | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (!container.current) return;
    let player: AnimationItem | undefined;
    try {
      player = lottie.loadAnimation({ container: container.current, renderer: "svg", loop, autoplay: false,
        // lottie-web completes/mutates animation data; each instance needs its own copy.
        animationData: JSON.parse(JSON.stringify(source)),
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false } });
      animation.current = player;
      player.addEventListener("complete", onFinish);
      player.addEventListener("data_failed", onFailure);
      player.addEventListener("error", onFailure);
      player.addEventListener("DOMLoaded", () => { if (activeRef.current) player?.play(); });
      if (activeRef.current) player.play();
    } catch { onFailure(); }
    return () => { animation.current = null; player?.destroy(); };
  }, [source, loop, onFinish, onFailure]);
  useEffect(() => { if (active) animation.current?.play(); else animation.current?.pause(); }, [active]);
  return <div ref={container} aria-hidden="true" style={{ width: "100%", height: "100%", pointerEvents: "none" }} />;
}
