// 크기/간격 토큰. 색은 theme/themes.ts + useTheme()를 사용한다.
import { Platform, TextProps, TextStyle } from "react-native";

export const fontSizes = {
  caption: 12,
  small: 14,
  body: 16,
  emphasis: 18,
  title: 22,
  hero: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  /** 작은 선택 항목·아이콘 버튼 */
  chip: 12,
  /** 버튼·입력창 */
  control: 16,
  button: 16,
  /** 정보 카드·이동 카드 */
  card: 20,
  /** 학습 카드·캐릭터 무대처럼 화면의 중심이 되는 면 */
  stage: 28,
  pill: 999,
} as const;

export const minTouch = 44;

/** 화면 좌우 여백은 헤더·본문·하단 행동 영역이 모두 같은 값을 쓴다. */
export const gutter = 16;

/** 요소 사이 간격. 묶음 안 8·12, 카드 안 16, 묶음 사이 24. */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 } as const;

/** 버튼 높이. 한 줄에 놓인 버튼은 같은 높이를 쓴다. */
export const control = { large: 56, compact: 48, touch: minTouch } as const;

/** 글자 역할. 숫자 대신 역할을 고른다. 설명문은 13보다 작게 쓰지 않는다. */
export const type = {
  title: { fontSize: 24, lineHeight: 32, fontWeight: "800", letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4 },
  section: { fontSize: 17, lineHeight: 25, fontWeight: "800", letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 23, fontWeight: "500", letterSpacing: -0.2 },
  label: { fontSize: 15, lineHeight: 23, fontWeight: "700", letterSpacing: -0.2 },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: "500", letterSpacing: -0.1 },
} as const;
export type TypeRole = keyof typeof type;

/** 기존 size 숫자를 가까운 글자 단계로 맞춘다. 27 이상은 타이머·수치 같은 표시용이라 그대로 둔다. */
export function typeStep(size: number) {
  const step = size <= 13 ? type.caption : size <= 15 ? type.body : size <= 18 ? type.section : size <= 22 ? type.heading : size <= 26 ? type.title : null;
  return step ? { fontSize: step.fontSize, lineHeight: step.lineHeight, letterSpacing: step.letterSpacing } : { fontSize: size, lineHeight: Math.round(size * 1.3), letterSpacing: -0.6 };
}

/** 라이트 테마용 은은한 카드 그림자 (다크 테마에선 자동으로 티가 안 남) */
export const cardShadow = (shadowColor: string) => ({
  shadowColor,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 2,
});

/** 한글 제목이 낱말 중간에서 끊기지 않게 한다. 공백이 없는 일본어 문장에는 쓰지 않는다. */
export const koreanTitle: { props: Pick<TextProps, "lineBreakStrategyIOS">; style: TextStyle } = {
  props: { lineBreakStrategyIOS: "hangul-word" },
  style: (Platform.OS === "web" ? { wordBreak: "keep-all", overflowWrap: "anywhere" } : {}) as TextStyle,
};
