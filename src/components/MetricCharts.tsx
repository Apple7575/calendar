// 지표용 소형 차트 (react-native-svg).
// 원칙: 차트당 한 지표·한 축, 얇은 마크(2px 선), 절제된 그리드, 색은 테마 토큰만.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";
import { lineSegments, MetricPoint } from "../lib/insights";
import { useTheme } from "../theme/ThemeContext";
import { fontSizes } from "../theme/tokens";

const CHART_H = 120;
const PAD_L = 30;
const PAD_R = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;

type LineChartProps = {
  points: MetricPoint[];
  color: string;
  yMin: number;
  yMax: number;
  /** y축 라벨로 보여줄 값들 */
  yTicks: number[];
  formatY?: (v: number) => string;
};

/** 시간 흐름에 따른 단일 지표 라인 차트. 기록 없는 날은 선이 끊긴다. */
export function MetricLineChart({ points, color, yMin, yMax, yTicks, formatY }: LineChartProps) {
  const { colors: c } = useTheme();
  const [width, setWidth] = useState(0);
  const plotW = Math.max(width - PAD_L - PAD_R, 1);
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const n = points.length;

  const x = (index: number) => PAD_L + (n <= 1 ? plotW / 2 : (index / (n - 1)) * plotW);
  const y = (value: number) =>
    PAD_TOP + plotH - ((Math.min(Math.max(value, yMin), yMax) - yMin) / (yMax - yMin)) * plotH;

  const segments = useMemo(() => lineSegments(points), [points]);
  const hasData = segments.length > 0;
  const showDots = n <= 45;

  // x축 라벨: 처음 / 중간 / 끝 (M/D)
  const xLabels = useMemo(() => {
    if (n === 0) return [];
    const pick = [0, Math.floor((n - 1) / 2), n - 1];
    return [...new Set(pick)].map((i) => ({
      index: i,
      label: `${Number(points[i].date.slice(5, 7))}/${Number(points[i].date.slice(8, 10))}`,
    }));
  }, [points, n]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={CHART_H}>
          {/* y 그리드 + 라벨 */}
          {yTicks.map((t) => (
            <React.Fragment key={t}>
              <Line
                x1={PAD_L}
                y1={y(t)}
                x2={width - PAD_R}
                y2={y(t)}
                stroke={c.border}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            </React.Fragment>
          ))}
          {/* 선 */}
          {segments.map((seg, si) =>
            seg.length === 1 ? (
              <Circle
                key={si}
                cx={x(seg[0].index)}
                cy={y(seg[0].value)}
                r={3}
                fill={color}
              />
            ) : (
              <Polyline
                key={si}
                points={seg.map((p) => `${x(p.index)},${y(p.value)}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
          )}
          {/* 점 */}
          {showDots &&
            segments.flat().map((p) => (
              <Circle
                key={p.index}
                cx={x(p.index)}
                cy={y(p.value)}
                r={3}
                fill={color}
                stroke={c.card}
                strokeWidth={1.5}
              />
            ))}
        </Svg>
      ) : null}
      {/* 라벨은 SVG 밖 텍스트로 (테마 폰트/색) */}
      {width > 0 ? (
        <>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {yTicks.map((t) => (
              <Text
                key={t}
                style={[
                  chartStyles.yLabel,
                  { color: c.textMuted, top: y(t) - 7, width: PAD_L - 6 },
                ]}
              >
                {formatY ? formatY(t) : String(t)}
              </Text>
            ))}
          </View>
          <View style={chartStyles.xLabelRow} pointerEvents="none">
            {xLabels.map((l) => (
              <Text
                key={l.index}
                style={[
                  chartStyles.xLabel,
                  { color: c.textMuted, left: x(l.index) - 18 },
                ]}
              >
                {l.label}
              </Text>
            ))}
          </View>
        </>
      ) : null}
      {!hasData ? (
        <View style={chartStyles.emptyOverlay} pointerEvents="none">
          <Text style={{ color: c.textMuted, fontSize: fontSizes.caption }}>
            아직 기록이 없어요
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type WeekdayBarChartProps = {
  values: (number | null)[];
  color: string;
  maxValue: number;
};

/** 요일별 평균 바 차트 */
export function WeekdayBarChart({ values, color, maxValue }: WeekdayBarChartProps) {
  const { colors: c } = useTheme();
  const [width, setWidth] = useState(0);
  const H = 96;
  const plotH = H - 22;
  const barW = width > 0 ? Math.min((width / 7) * 0.5, 22) : 0;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {values.map((v, i) => {
            const cx = (width / 7) * i + width / 14;
            if (v === null) {
              return (
                <Line
                  key={i}
                  x1={cx - barW / 2}
                  y1={plotH}
                  x2={cx + barW / 2}
                  y2={plotH}
                  stroke={c.border}
                  strokeWidth={2}
                />
              );
            }
            const h = Math.max((v / maxValue) * (plotH - 8), 3);
            return (
              <Rect
                key={i}
                x={cx - barW / 2}
                y={plotH - h}
                width={barW}
                height={h}
                rx={4}
                fill={color}
              />
            );
          })}
        </Svg>
      ) : null}
      <View style={chartStyles.weekdayRow} pointerEvents="none">
        {WEEKDAY_LABELS.map((w, i) => (
          <Text
            key={w}
            style={[
              chartStyles.weekdayLabel,
              { color: i === 0 ? c.danger : c.textMuted },
            ]}
          >
            {w}
          </Text>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  yLabel: {
    position: "absolute",
    left: 0,
    fontSize: 9,
    textAlign: "right",
  },
  xLabelRow: { height: 14, marginTop: -16 },
  xLabel: { position: "absolute", fontSize: 9, width: 36, textAlign: "center" },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    marginTop: -18,
  },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 10 },
});
