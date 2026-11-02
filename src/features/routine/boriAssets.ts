export type BoriState = "blink" | "tap" | "success" | "failure" | "focus" | "encourage" | "sleepy" | "grow";
export type BoriStage = "sprout" | "growing" | "blooming";
export type MascotMood = "sleepy" | "focus" | "cheer" | "proud" | "celebrate";

export const boriStageLabels: Record<BoriStage, string> = { sprout: "새싹", growing: "봉오리", blooming: "꽃" };
export const loopingBori = (state: BoriState) => state === "blink" || state === "focus" || state === "sleepy";
export function boriForMood(mood?: MascotMood): BoriState {
  return mood === "celebrate" ? "success" : mood === "focus" ? "focus" : mood === "sleepy" ? "sleepy" : mood === "cheer" ? "encourage" : "blink";
}
export const boriLabels: Record<BoriState, string> = {
  blink: "눈을 깜빡이며 쉬는 친구", tap: "통통 튀는 친구", success: "기뻐하는 친구",
  failure: "잠시 쉬어가는 친구", focus: "차분하게 집중하는 친구",
  encourage: "응원하는 친구", sleepy: "졸린 친구", grow: "성장하는 친구",
};
