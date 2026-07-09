// 일정 색상 팔레트 (테마와 무관한 고정 색 — 라이트/다크 모두에서 구분되는 톤)

export type EventColorKey =
  | "blue"
  | "green"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "teal";

export const EVENT_COLORS: Record<EventColorKey, { label: string; hex: string }> = {
  blue: { label: "파랑", hex: "#4A6CF7" },
  green: { label: "초록", hex: "#2FA36B" },
  orange: { label: "주황", hex: "#F5A623" },
  pink: { label: "분홍", hex: "#E86FA7" },
  purple: { label: "보라", hex: "#8B5CF6" },
  red: { label: "빨강", hex: "#E5484D" },
  teal: { label: "청록", hex: "#14B8A6" },
};

export const EVENT_COLOR_KEYS = Object.keys(EVENT_COLORS) as EventColorKey[];

/** 색 키 → hex. 없으면 null (테마 기본색 사용) */
export function eventColorHex(key: string | null | undefined): string | null {
  if (!key) return null;
  return EVENT_COLORS[key as EventColorKey]?.hex ?? null;
}
