export type BoriState = "blink" | "tap" | "success" | "failure" | "focus" | "encourage" | "sleepy" | "grow";
export type BoriStage = "sprout" | "growing" | "blooming";
export type MascotMood = "sleepy" | "focus" | "cheer" | "proud" | "celebrate";

// Explicit paths let Metro bundle all 24 animations for offline playback.
export const boriAnimations = {
  sprout: {
    blink: require("../../../assets/bori/eyes-04/bori_sprout_blink.json"),
    tap: require("../../../assets/bori/eyes-04/bori_sprout_tap.json"),
    success: require("../../../assets/bori/eyes-04/bori_sprout_success.json"),
    failure: require("../../../assets/bori/eyes-04/bori_sprout_failure.json"),
    focus: require("../../../assets/bori/eyes-04/bori_sprout_focus.json"),
    encourage: require("../../../assets/bori/eyes-04/bori_sprout_encourage.json"),
    sleepy: require("../../../assets/bori/eyes-04/bori_sprout_sleepy.json"),
    grow: require("../../../assets/bori/eyes-04/bori_sprout_grow.json"),
  },
  growing: {
    blink: require("../../../assets/bori/eyes-04/bori_growing_blink.json"),
    tap: require("../../../assets/bori/eyes-04/bori_growing_tap.json"),
    success: require("../../../assets/bori/eyes-04/bori_growing_success.json"),
    failure: require("../../../assets/bori/eyes-04/bori_growing_failure.json"),
    focus: require("../../../assets/bori/eyes-04/bori_growing_focus.json"),
    encourage: require("../../../assets/bori/eyes-04/bori_growing_encourage.json"),
    sleepy: require("../../../assets/bori/eyes-04/bori_growing_sleepy.json"),
    grow: require("../../../assets/bori/eyes-04/bori_growing_grow.json"),
  },
  blooming: {
    blink: require("../../../assets/bori/eyes-04/bori_blooming_blink.json"),
    tap: require("../../../assets/bori/eyes-04/bori_blooming_tap.json"),
    success: require("../../../assets/bori/eyes-04/bori_blooming_success.json"),
    failure: require("../../../assets/bori/eyes-04/bori_blooming_failure.json"),
    focus: require("../../../assets/bori/eyes-04/bori_blooming_focus.json"),
    encourage: require("../../../assets/bori/eyes-04/bori_blooming_encourage.json"),
    sleepy: require("../../../assets/bori/eyes-04/bori_blooming_sleepy.json"),
    grow: require("../../../assets/bori/eyes-04/bori_blooming_grow.json"),
  },
};
export const boriStatic = {
  sprout: require("../../../assets/bori/eyes-04/static_sprout.png"),
  growing: require("../../../assets/bori/eyes-04/static_growing.png"),
  blooming: require("../../../assets/bori/eyes-04/static_blooming.png"),
};
export const boriStageLabels: Record<BoriStage, string> = { sprout: "새싹 보리", growing: "봉오리 보리", blooming: "꽃 보리" };
export const loopingBori = (state: BoriState) => state === "blink" || state === "focus" || state === "sleepy";
export function boriForMood(mood?: MascotMood): BoriState {
  return mood === "celebrate" ? "success" : mood === "focus" ? "focus" : mood === "sleepy" ? "sleepy" : mood === "cheer" ? "encourage" : "blink";
}
export const boriLabels: Record<BoriState, string> = {
  blink: "눈을 깜빡이며 쉬는 보리", tap: "통통 튀는 보리", success: "기뻐하는 보리",
  failure: "잠시 쉬어가는 보리", focus: "차분하게 집중하는 보리",
  encourage: "응원하는 보리", sleepy: "졸린 보리", grow: "성장하는 보리",
};
