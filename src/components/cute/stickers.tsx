// 날짜 꾸미기용 스티커 세트. 전부 고정 색상 SVG(테마 무관, 내용 자체가 장식)라
// 저장은 id 문자열 하나만 하면 되고 용량 부담이 없다.

import React from "react";
import { Image } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export type StickerId =
  | "cat"
  | "star"
  | "heart"
  | "rainbow"
  | "cake"
  | "flower"
  | "rocket"
  | "cloud";

export const STICKERS: { id: StickerId; label: string }[] = [
  { id: "cat", label: "고양이" },
  { id: "star", label: "별" },
  { id: "heart", label: "하트" },
  { id: "rainbow", label: "무지개" },
  { id: "cake", label: "케이크" },
  { id: "flower", label: "꽃" },
  { id: "rocket", label: "로켓" },
  { id: "cloud", label: "구름" },
];

function CatSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M11 10 L14 18 L20 15 Z" fill="#F3A968" />
      <Path d="M29 10 L26 18 L20 15 Z" fill="#F3A968" />
      <Circle cx={20} cy={23} r={11} fill="#F9C58D" />
      <Circle cx={15.5} cy={22} r={1.6} fill="#3A2B22" />
      <Circle cx={24.5} cy={22} r={1.6} fill="#3A2B22" />
      <Path d="M18.5 26.5 Q20 28 21.5 26.5" fill="none" stroke="#3A2B22" strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M11 24 L6 22.5 M11 26 L6 26.5 M29 24 L34 22.5 M29 26 L34 26.5" stroke="#C97F45" strokeWidth={1.1} strokeLinecap="round" />
    </Svg>
  );
}

function StarSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 4 L24.5 15 L37 16.5 L27.5 24.5 L30.5 36.5 L20 30 L9.5 36.5 L12.5 24.5 L3 16.5 L15.5 15 Z"
        fill="#FFC94A"
      />
    </Svg>
  );
}

function HeartSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 34s-14-8.7-14-18a8.6 8.6 0 0 1 14-6.4A8.6 8.6 0 0 1 34 16c0 9.3-14 18-14 18z"
        fill="#FF6B87"
      />
    </Svg>
  );
}

function RainbowSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M4 32 A16 16 0 0 1 36 32" fill="none" stroke="#FF8FA3" strokeWidth={4} strokeLinecap="round" />
      <Path d="M8 32 A12 12 0 0 1 32 32" fill="none" stroke="#FFC94A" strokeWidth={4} strokeLinecap="round" />
      <Path d="M12 32 A8 8 0 0 1 28 32" fill="none" stroke="#63D9A0" strokeWidth={4} strokeLinecap="round" />
      <Ellipse cx={7} cy={33} rx={3.5} ry={2.5} fill="#FFFFFF" opacity={0.85} />
      <Ellipse cx={33} cy={33} rx={3.5} ry={2.5} fill="#FFFFFF" opacity={0.85} />
    </Svg>
  );
}

function CakeSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M18 8 q-2 -3 0 -6 q2 3 0 6" stroke="#F3A968" strokeWidth={1.5} fill="none" />
      <Ellipse cx={18} cy={5} rx={1.6} ry={2.2} fill="#FFC94A" />
      <Path d="M8 34 L8 22 Q20 27 32 22 L32 34 Z" fill="#F9C9DE" />
      <Path d="M8 22 Q20 27 32 22 L32 26 Q20 31 8 26 Z" fill="#FF8FA3" />
      <Path d="M8 34 L32 34 L32 36 L8 36 Z" fill="#E8749A" />
    </Svg>
  );
}

function FlowerSticker({ size }: { size: number }) {
  const petals = Array.from({ length: 6 }, (_, i) => (90 * 0 + i * 60) % 360);
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {petals.map((deg, i) => (
        <Ellipse
          key={i}
          cx={20}
          cy={12}
          rx={5}
          ry={8}
          fill="#C9A6FF"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
      <Circle cx={20} cy={20} r={5.5} fill="#FFC94A" />
    </Svg>
  );
}

function RocketSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M20 4 Q28 12 27 24 L13 24 Q12 12 20 4 Z" fill="#7EC8FF" />
      <Circle cx={20} cy={16} r={3.2} fill="#EAF6FF" />
      <Path d="M13 24 L8 32 L14 29 Z" fill="#FF8FA3" />
      <Path d="M27 24 L32 32 L26 29 Z" fill="#FF8FA3" />
      <Path d="M17 26 L23 26 L20 34 Z" fill="#FFA65C" />
    </Svg>
  );
}

function CloudSticker({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={14} cy={22} r={7} fill="#EAF3FF" />
      <Circle cx={23} cy={17} r={9} fill="#EAF3FF" />
      <Circle cx={29} cy={23} r={6.5} fill="#EAF3FF" />
      <Path d="M9 26 h24 a5 5 0 0 1 0 8 h-24 a5 5 0 0 1 0 -8 Z" fill="#EAF3FF" />
      <Circle cx={14} cy={22} r={7} fill="none" stroke="#BEDCFF" strokeWidth={1} />
    </Svg>
  );
}

const RENDERERS: Record<StickerId, (size: number) => React.JSX.Element> = {
  cat: (s) => <CatSticker size={s} />,
  star: (s) => <StarSticker size={s} />,
  heart: (s) => <HeartSticker size={s} />,
  rainbow: (s) => <RainbowSticker size={s} />,
  cake: (s) => <CakeSticker size={s} />,
  flower: (s) => <FlowerSticker size={s} />,
  rocket: (s) => <RocketSticker size={s} />,
  cloud: (s) => <CloudSticker size={s} />,
};

/** id가 "img:<url>"이면 사용자가 올린 이미지 스티커를 그린다 */
export function Sticker({ id, size = 24 }: { id: string; size?: number }) {
  if (id.startsWith("img:")) {
    return (
      <Image
        source={{ uri: id.slice(4) }}
        style={{ width: size, height: size, borderRadius: size * 0.25 }}
      />
    );
  }
  const render = RENDERERS[id as StickerId];
  if (!render) return null;
  return render(size);
}
