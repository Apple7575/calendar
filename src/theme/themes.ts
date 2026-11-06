// 앱 테마 팔레트. 색은 반드시 useTheme()를 통해 쓰고 하드코딩하지 않는다.
import {colorRoles} from "./roles";

/** 라이트(routine)와 다크(dark) 두 가지다. 옛 테마(라벤더·클래식·피치·민트)는 2026-11-06 팀장 결정으로 뺐다. */
export type ThemeId = "routine" | "dark";

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

/** 라이트: 웜톤 흰색과 진한 숲색(팀장 지시). */
const routine: Theme = {
  id: "routine",
  name: "라이트",
  isDark: false,
  statusBar: "dark",
  colors: {
    background: "#F8F5EE",
    surface: "#F8F5EE",
    card: "#FFFDF9",
    border: "#E9E4D8",
    text: "#29261D",
    textMuted: "#6A6658",
    primary: "#3E6A2A",
    primarySoft: "#E9F0D9",
    danger: "#E5484D",
    success: "#3E6A2A",
    successSoft: "#E9F0D9",
    dotEvent: "#BA7B50",
    dotGoogle: "#5B7CFA",
    dotTask: "#F0A24B",
    dotDiary: "#E87BB0",
    inputBg: "#F2EEE4",
    white: "#FFFFFF",
    gradient: ["#E9F0D9", "#FFF0DF"],
    shadow: "#29261D",
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

/** 시간 초과: 검정과 연두를 뒤집어 화면 전체로 알린다. isDark가 false라 채운 버튼 글자는 white(연두)를 쓴다. */
export const overtimeTheme: Theme = {
  id: "dark",
  name: "시간 초과",
  isDark: false,
  statusBar: "dark",
  colors: {
    ...dark.colors,
    background: "#C4EA89",
    surface: "#C4EA89",
    card: "#D6F2A8",
    border: "#00000033",
    text: "#000000",
    textMuted: "#2B3A17",
    primary: "#000000",
    primarySoft: "#AFD870",
    danger: "#8A1C12",
    success: "#000000",
    successSoft: "#AFD870",
    inputBg: "#AFD870",
    white: "#C4EA89",
    shadow: "#000000",
  },
};

export const THEMES: Theme[] = [dark, routine];
export const DEFAULT_THEME_ID: ThemeId = "dark";

/** 저장된 테마 이름을 읽는다. 옛 테마(라벤더·클래식·피치·민트)나 깨진 값, 빈 값은 다크(기본)로 연다. */
export function restoreThemeId(saved: string | null | undefined, old: string | null | undefined): ThemeId {
  const id = saved || (old === "dark" ? "dark" : DEFAULT_THEME_ID);
  return THEMES.find((t) => t.id === id)?.id ?? DEFAULT_THEME_ID;
}

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? dark;
}
