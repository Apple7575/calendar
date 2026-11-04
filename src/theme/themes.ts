// 앱 테마 팔레트. 색은 반드시 useTheme()를 통해 쓰고 하드코딩하지 않는다.
import {colorRoles} from "./roles";

export type ThemeId = "routine" | "lavender" | "classic" | "peach" | "mint" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  danger: string;
  success: string;
  successSoft: string;
  dotEvent: string;
  dotGoogle: string;
  dotTask: string;
  dotDiary: string;
  inputBg: string;
  white: string;
  /** 로그인 히어로/포인트용 그라데이션 */
  gradient: [string, string];
  /** 카드 그림자 색 (다크에선 거의 안 보이게) */
  shadow: string;
};

export type Theme = {
  id: ThemeId;
  name: string;
  isDark: boolean;
  statusBar: "light" | "dark";
  colors: ThemeColors;
};

const lavender: Theme = {
  id: "lavender",
  name: "라벤더",
  isDark: false,
  statusBar: "dark",
  colors: {
    background: "#FDFCFF",
    surface: "#F4F1FB",
    card: "#FFFFFF",
    border: "#EAE4F6",
    text: "#2A2438",
    textMuted: "#8A82A0",
    primary: "#8B72E8",
    primarySoft: "#F0EAFF",
    danger: "#E5484D",
    success: "#3AAE8C",
    successSoft: "#E4F5EF",
    dotEvent: "#8B72E8",
    dotGoogle: "#3AAE8C",
    dotTask: "#F0A24B",
    dotDiary: "#E87BB0",
    inputBg: "#F4F1FB",
    white: "#FFFFFF",
    gradient: ["#A78BFA", "#7C6BE8"],
    shadow: "#8B72E8",
  },
};

const classic: Theme = {
  id: "classic",
  name: "클래식 블루",
  isDark: false,
  statusBar: "dark",
  colors: {
    background: "#FFFFFF",
    surface: "#F5F7FB",
    card: "#FFFFFF",
    border: "#E8EAF1",
    text: "#1F2430",
    textMuted: "#7A8194",
    primary: "#4A6CF7",
    primarySoft: "#EBF0FF",
    danger: "#E5484D",
    success: "#2FA36B",
    successSoft: "#E7F5EC",
    dotEvent: "#4A6CF7",
    dotGoogle: "#2FA36B",
    dotTask: "#F5A623",
    dotDiary: "#E86FA7",
    inputBg: "#F5F7FB",
    white: "#FFFFFF",
    gradient: ["#5B8CFF", "#4A6CF7"],
    shadow: "#4A6CF7",
  },
};

const peach: Theme = {
  id: "peach",
  name: "피치",
  isDark: false,
  statusBar: "dark",
  colors: {
    background: "#FFFDFB",
    surface: "#FBF2ED",
    card: "#FFFFFF",
    border: "#F4E2D9",
    text: "#392E2B",
    textMuted: "#A08D86",
    primary: "#EF7B6B",
    primarySoft: "#FFEBE5",
    danger: "#D9364C",
    success: "#43A57C",
    successSoft: "#E5F4ED",
    dotEvent: "#EF7B6B",
    dotGoogle: "#43A57C",
    dotTask: "#E8A23D",
    dotDiary: "#D96BA8",
    inputBg: "#FBF2ED",
    white: "#FFFFFF",
    gradient: ["#FFA98F", "#EF736B"],
    shadow: "#EF7B6B",
  },
};

const mint: Theme = {
  id: "mint",
  name: "민트",
  isDark: false,
  statusBar: "dark",
  colors: {
    background: "#FBFEFD",
    surface: "#EEF7F3",
    card: "#FFFFFF",
    border: "#DCEDE5",
    text: "#22332C",
    textMuted: "#7F9890",
    primary: "#2FA98C",
    primarySoft: "#E0F4ED",
    danger: "#E5484D",
    success: "#2FA98C",
    successSoft: "#E0F4ED",
    dotEvent: "#2FA98C",
    dotGoogle: "#5B7CFA",
    dotTask: "#F0A24B",
    dotDiary: "#E87BB0",
    inputBg: "#EEF7F3",
    white: "#FFFFFF",
    gradient: ["#4AC3A3", "#2E9E86"],
    shadow: "#2FA98C",
  },
};

const routine: Theme = {
  ...mint, id: "routine", name: "친구들의 정원", colors: {
    ...mint.colors, background: "#F8F5EE", surface: "#F8F5EE", card: "#FFFDF9",
    text: "#29261D", textMuted: "#6A6658", border: "#E9E4D8",
    primary: "#3E6A2A", primarySoft: "#E9F0D9", success: "#3E6A2A",
    successSoft: "#E9F0D9", inputBg: "#F2EEE4", dotEvent: "#BA7B50",
    shadow: "#29261D", gradient: ["#E9F0D9", "#FFF0DF"],
  },
};

/** 홈·계획 화면의 이름표. 공통 색은 현재 테마에서 받고, 캐릭터 무대의 따뜻한 색만 따로 둔다. */
export function priorityVisuals(theme:Theme){const c=theme.colors,stage=theme.isDark?{stage:'#161A10',stageLine:'#3A4530',stageDot:'#27331A',stageInk:'#D7E7B8'}:{stage:'#FFF1E2',stageLine:'#DEC9B5',stageDot:'#F5D7B7',stageInk:'#855D41'},role=colorRoles(theme);return {
 ...stage,brand:c.primary,brandDeep:role.primary.edge,onBrand:role.primary.on,brandSoft:c.primarySoft,brandInk:role.primary.ink,paper:c.card,mutedSurface:c.inputBg,success:role.success.ink,successSoft:c.successSoft,line:c.border,ink:c.text,muted:c.textMuted,
};}

const dark: Theme = {
  id: "dark",
  name: "다크",
  isDark: true,
  statusBar: "light",
  colors: {
    background: "#000000",
    surface: "#000000",
    card: "#161616",
    border: "#2C2C2C",
    text: "#F5F5F2",
    textMuted: "#A3A3A3",
    primary: "#C4EA89",
    primarySoft: "#27331A",
    danger: "#FF8A80",
    success: "#C4EA89",
    successSoft: "#27331A",
    dotEvent: "#C4EA89",
    dotGoogle: "#7FD1AE",
    dotTask: "#F5B04B",
    dotDiary: "#F07BB4",
    inputBg: "#1E1E1E",
    white: "#FFFFFF",
    gradient: ["#C4EA89", "#9BC265"],
    shadow: "#000000",
  },
};

/** 집중 공부 흐름은 사용자 테마와 상관없이 다크 팔레트로 그린다. 설정의 테마 목록에는 넣지 않는다. */
export const focusTheme: Theme = { ...dark, name: "집중" };

export const THEMES: Theme[] = [routine, dark, lavender, classic, peach, mint];
export const DEFAULT_THEME_ID: ThemeId = "dark";

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? dark;
}
