// 기분 얼굴: 기본 이모지 대신 쓰는 귀여운 커스텀 SVG.
// DB에는 기존 이모지 문자열을 그대로 저장하고, 표시할 때만 매핑한다.

import React from "react";
import { Text } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

function Face({
  size,
  bg,
  children,
}: {
  size: number;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={18} fill={bg} />
      {children}
    </Svg>
  );
}

const FACES: Record<string, (size: number) => React.JSX.Element> = {
  // 😊 행복: 감은 웃는 눈 + 볼터치 + 함박웃음
  "😊": (s) => (
    <Face size={s} bg="#FFD66B">
      <Path d="M11 17 q3 -3.5 6 0" fill="none" stroke="#5B4200" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M23 17 q3 -3.5 6 0" fill="none" stroke="#5B4200" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={10.5} cy={23} r={2.6} fill="#FFA65C" opacity={0.55} />
      <Circle cx={29.5} cy={23} r={2.6} fill="#FFA65C" opacity={0.55} />
      <Path d="M13 24.5 q7 6.5 14 0" fill="none" stroke="#5B4200" strokeWidth={2.4} strokeLinecap="round" />
    </Face>
  ),
  // 🙂 무난: 점 눈 + 옅은 미소
  "🙂": (s) => (
    <Face size={s} bg="#FFE49C">
      <Circle cx={14} cy={17} r={2.1} fill="#5B4200" />
      <Circle cx={26} cy={17} r={2.1} fill="#5B4200" />
      <Path d="M14.5 25.5 q5.5 3.5 11 0" fill="none" stroke="#5B4200" strokeWidth={2.2} strokeLinecap="round" />
    </Face>
  ),
  // 😐 그저 그럼: 점 눈 + 일자 입
  "😐": (s) => (
    <Face size={s} bg="#E4E0D5">
      <Circle cx={14} cy={17} r={2.1} fill="#57534A" />
      <Circle cx={26} cy={17} r={2.1} fill="#57534A" />
      <Path d="M14.5 26 h11" stroke="#57534A" strokeWidth={2.2} strokeLinecap="round" />
    </Face>
  ),
  // 😢 슬픔: 처진 눈썹 + 눈물
  "😢": (s) => (
    <Face size={s} bg="#BBD9F5">
      <Path d="M11 15 q3 2 6 1" fill="none" stroke="#2F4A66" strokeWidth={2} strokeLinecap="round" />
      <Path d="M29 15 q-3 2 -6 1" fill="none" stroke="#2F4A66" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={14.5} cy={19.5} r={2} fill="#2F4A66" />
      <Circle cx={25.5} cy={19.5} r={2} fill="#2F4A66" />
      <Path d="M14 28 q6 -4 12 0" fill="none" stroke="#2F4A66" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M28.5 22 q2.6 3.6 0 5 q-2.6 -1.4 0 -5" fill="#5AA9F5" />
    </Face>
  ),
  // 😠 화남: 치켜뜬 눈썹 + 찡그림
  "😠": (s) => (
    <Face size={s} bg="#F5A9A0">
      <Path d="M11 14 l7 3" stroke="#66201A" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M29 14 l-7 3" stroke="#66201A" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={14.5} cy={20} r={2} fill="#66201A" />
      <Circle cx={25.5} cy={20} r={2} fill="#66201A" />
      <Path d="M14 28.5 q6 -4.5 12 0" fill="none" stroke="#66201A" strokeWidth={2.2} strokeLinecap="round" />
    </Face>
  ),
};

/** 이모지 → 커스텀 얼굴 (모르는 이모지는 그대로 텍스트로) */
export function MoodFace({ mood, size = 28 }: { mood: string; size?: number }) {
  const render = FACES[mood];
  if (!render) return <Text style={{ fontSize: size * 0.8 }}>{mood}</Text>;
  return render(size);
}
