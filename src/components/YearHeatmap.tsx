// 지난 1년 일기 히트맵 (GitHub 잔디 스타일).
// 색은 단일 색상(테마 primary)의 밝기 단계 — 기분 점수가 높을수록 진하게.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { addDays, todayKey, weekStartOf } from "../lib/dateUtils";
import { MOOD_SCORE } from "../lib/insights";
import { useTheme } from "../theme/ThemeContext";
import { fontSizes, spacing } from "../theme/tokens";

const CELL = 7;
const GAP = 2;
const WEEKS = 53;

type Props = {
  /** date → mood (일기가 있으면 존재, mood는 null 가능) */
  entries: Map<string, string | null>;
};

/** 기분 점수(1~5) 또는 기분 미기록 일기 → 투명도 단계 */
function opacityFor(mood: string | null): number {
  if (mood === null) return 0.35; // 일기만 있고 기분 없음
  const score = MOOD_SCORE[mood];
  if (score === undefined) return 0.35;
  return 0.2 + (score / 5) * 0.8; // 1점 0.36 … 5점 1.0
}

export function YearHeatmap({ entries }: Props) {
  const { colors: c } = useTheme();
  const [width, setWidth] = useState(0);

  const { cells, monthLabels } = useMemo(() => {
    const today = todayKey();
    // 오늘이 포함된 주의 일요일에서 52주 전부터 시작
    const start = addDays(weekStartOf(today), -(WEEKS - 1) * 7);
    const cells: { week: number; day: number; date: string; mood: string | null; has: boolean }[] =
      [];
    const monthLabels: { week: number; label: string }[] = [];
    let lastMonth = "";
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        if (date > today) continue;
        cells.push({ week: w, day: d, date, mood: entries.get(date) ?? null, has: entries.has(date) });
        if (d === 0) {
          const month = date.slice(5, 7);
          if (month !== lastMonth) {
            lastMonth = month;
            monthLabels.push({ week: w, label: `${Number(month)}월` });
          }
        }
      }
    }
    return { cells, monthLabels };
  }, [entries]);

  const step = CELL + GAP;
  const naturalW = WEEKS * step;
  const scale = width > 0 ? width / naturalW : 1;
  const height = 7 * step * scale + 16;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <View style={{ height: 14 }}>
            {monthLabels.map((m) => (
              <Text
                key={`${m.week}-${m.label}`}
                style={[
                  heatmapStyles.monthLabel,
                  { color: c.textMuted, left: m.week * step * scale },
                ]}
              >
                {m.label}
              </Text>
            ))}
          </View>
          <Svg width={width} height={7 * step * scale}>
            {cells.map((cell) => (
              <Rect
                key={cell.date}
                x={cell.week * step * scale}
                y={cell.day * step * scale}
                width={CELL * scale}
                height={CELL * scale}
                rx={2 * scale}
                fill={cell.has ? c.primary : c.border}
                opacity={cell.has ? opacityFor(cell.mood) : 0.45}
              />
            ))}
          </Svg>
          <View style={heatmapStyles.legendRow}>
            <Text style={[heatmapStyles.legendText, { color: c.textMuted }]}>적음</Text>
            {[0.2, 0.4, 0.6, 0.8, 1].map((o) => (
              <View
                key={o}
                style={[heatmapStyles.legendCell, { backgroundColor: c.primary, opacity: o }]}
              />
            ))}
            <Text style={[heatmapStyles.legendText, { color: c.textMuted }]}>좋음</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const heatmapStyles = StyleSheet.create({
  monthLabel: { position: "absolute", fontSize: 8 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: spacing.xs + 2,
  },
  legendCell: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: fontSizes.caption },
});
