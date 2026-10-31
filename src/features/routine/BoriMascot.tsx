import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useReducedMotion } from "./motion";
import { BoriAnimation } from "./BoriAnimation";
import { boriAnimations, boriForMood, boriLabels, boriStatic, BoriStage, BoriState, loopingBori, MascotMood } from "./boriAssets";
import { useOptionalRoutine } from "./RoutineProvider";
import { boriStageRank } from "../../lib/boriGrowth";
import {tapLight} from '../../lib/haptics';

export type BoriMascotProps = { size?: number; happy?: boolean; mood?: MascotMood; state?: BoriState; stage?: BoriStage };
export function BoriMascot({ size = 85, happy = false, mood, state, stage: previewStage }: BoriMascotProps) {
  const reduced = useReducedMotion(), focused = useIsFocused();
  const routine = useOptionalRoutine();
  const stage = previewStage ?? routine?.data.boriStage ?? "sprout";
  const previousStage = useRef(stage);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [transient, setTransient] = useState<BoriState | null>(null), [settled, setSettled] = useState(false), [failed, setFailed] = useState(false);
  const [replay,setReplay]=useState(0);
  const requested = state ?? boriForMood(mood ?? (happy ? "proud" : "cheer"));
  useEffect(() => { setTransient(null); setSettled(false); setFailed(false); }, [requested]);
  useEffect(() => {
    if (!previewStage && boriStageRank[stage] > boriStageRank[previousStage.current]) setTransient("grow");
    previousStage.current = stage;
    setFailed(false);
  }, [stage, previewStage]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", next => setForeground(next === "active"));
    return () => listener.remove();
  }, []);
  const current: BoriState = transient ?? (settled && !loopingBori(requested) && requested!=='success' ? "blink" : requested);
  const finish = useCallback(() => {
    if (transient) { setTransient(null); if (transient === "grow") setSettled(true); }
    else if (!loopingBori(current)) setSettled(true);
  }, [current, transient]);
  const fail = useCallback(() => setFailed(true), []);
  const active = focused && foreground && !reduced;
  return <Pressable accessibilityRole={reduced || failed ? "image" : "button"}
    accessibilityLabel={`보리 캐릭터 · ${reduced || failed ? "쉬고 있는 보리" : boriLabels[current]}`}
    accessibilityHint={reduced || failed ? undefined : "누르면 보리가 반응해요"}
    disabled={reduced || failed || !active}
    onPress={() => { if(requested==='success'&&settled){tapLight();setSettled(false);setReplay(n=>n+1);}else if (loopingBori(current)) {tapLight();setTransient("tap");} }}
    style={{ width: size, height: size * 1.08 }}>
    <View pointerEvents="none" style={{ width: "100%", height: "100%" }}>
      {reduced || failed ? <Image source={boriStatic[stage]} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
        : <BoriAnimation key={`${stage}-${current}-${replay}`} source={boriAnimations[stage][current]} loop={loopingBori(current)} active={active} onFinish={finish} onFailure={fail} />}
    </View>
  </Pressable>;
}
