// 크기/간격 토큰. 색은 theme/themes.ts + useTheme()를 사용한다.

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
  card: 18,
  button: 13,
  pill: 999,
} as const;

export const minTouch = 44;

/** 라이트 테마용 은은한 카드 그림자 (다크 테마에선 자동으로 티가 안 남) */
export const cardShadow = (shadowColor: string) => ({
  shadowColor,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 2,
});
