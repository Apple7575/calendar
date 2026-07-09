import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { addDays, todayKey } from "../lib/dateUtils";
import {
  average,
  buildDailySeries,
  DiaryMetricRow,
  moodCounts,
  recentDelta,
  weekdayAverages,
} from "../lib/insights";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";
import { MetricLineChart, WeekdayBarChart } from "./MetricCharts";

const RANGES = [
  { days: 30, label: "30일" },
  { days: 90, label: "90일" },
  { days: 365, label: "1년" },
] as const;

/** 기분/에너지/수면 변화를 그래프로 보여주는 지표 대시보드 */
export function InsightsView() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [days, setDays] = useState<number>(30);
  const [rows, setRows] = useState<DiaryMetricRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const end = todayKey();
  const start = addDays(end, -(days - 1));

  const load = useCallback(async () => {
    setError(null);
    const { data, error: qError } = await supabase
      .from("diaries")
      .select("date, mood, energy, sleep_hours")
      .gte("date", start)
      .lte("date", end)
      .order("date");
    if (qError) {
      setError(`데이터를 불러오지 못했어요: ${qError.message}`);
      return;
    }
    setRows((data ?? []) as DiaryMetricRow[]);
  }, [start, end]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const series = useMemo(() => buildDailySeries(rows, start, end), [rows, start, end]);
  const moods = useMemo(() => moodCounts(rows), [rows]);
  const maxMoodCount = Math.max(...moods.map((m) => m.count), 1);

  const metrics = [
    {
      key: "mood",
      title: "기분",
      color: c.dotDiary,
      points: series.mood,
      yMin: 1,
      yMax: 5,
      yTicks: [1, 3, 5],
      unit: "",
      formatY: (v: number) => ({ 1: "😠", 3: "😐", 5: "😊" }[v] ?? String(v)),
    },
    {
      key: "energy",
      title: "에너지",
      color: c.dotTask,
      points: series.energy,
      yMin: 1,
      yMax: 5,
      yTicks: [1, 3, 5],
      unit: "",
      formatY: undefined,
    },
    {
      key: "sleep",
      title: "수면",
      color: c.primary,
      points: series.sleep,
      yMin: 3,
      yMax: 11,
      yTicks: [4, 7, 10],
      unit: "시간",
      formatY: (v: number) => `${v}h`,
    },
  ] as const;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {/* 기간 선택 */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.days}
            style={[styles.rangeChip, days === r.days && styles.rangeChipActive]}
            onPress={() => setDays(r.days)}
          >
            <Text style={[styles.rangeText, days === r.days && styles.rangeTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {metrics.map((m) => {
        const avg = average(m.points);
        const delta = recentDelta(m.points, 7);
        return (
          <View key={m.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleWrap}>
                <View style={[styles.titleDot, { backgroundColor: m.color }]} />
                <Text style={styles.cardTitle}>{m.title}</Text>
              </View>
              <View style={styles.statWrap}>
                {avg !== null ? (
                  <Text style={styles.avgText}>
                    평균 <Text style={styles.avgStrong}>{avg.toFixed(1)}</Text>
                    {m.unit}
                  </Text>
                ) : null}
                {delta && Math.abs(delta.delta) >= 0.05 ? (
                  <View style={styles.deltaWrap}>
                    <Ionicons
                      name={delta.delta > 0 ? "trending-up" : "trending-down"}
                      size={13}
                      color={delta.delta > 0 ? c.success : c.danger}
                    />
                    <Text
                      style={[
                        styles.deltaText,
                        { color: delta.delta > 0 ? c.success : c.danger },
                      ]}
                    >
                      {delta.delta > 0 ? "+" : ""}
                      {delta.delta.toFixed(1)} (최근 7일)
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <MetricLineChart
              points={m.points}
              color={m.color}
              yMin={m.yMin}
              yMax={m.yMax}
              yTicks={[...m.yTicks]}
              formatY={m.formatY}
            />
          </View>
        );
      })}

      {/* 요일 리듬 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>요일별 리듬</Text>
        <Text style={styles.subLabel}>에너지 평균</Text>
        <WeekdayBarChart values={weekdayAverages(series.energy)} color={c.dotTask} maxValue={5} />
        <Text style={styles.subLabel}>수면 평균</Text>
        <WeekdayBarChart values={weekdayAverages(series.sleep)} color={c.primary} maxValue={11} />
      </View>

      {/* 기분 분포 */}
      {moods.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>기분 분포</Text>
          {moods.map((m) => (
            <View key={m.mood} style={styles.moodRow}>
              <Text style={styles.moodEmoji}>{m.mood}</Text>
              <View style={styles.moodBarTrack}>
                <View
                  style={[
                    styles.moodBar,
                    {
                      backgroundColor: c.dotDiary,
                      width: `${(m.count / maxMoodCount) * 100}%` as `${number}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.moodCount}>{m.count}일</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.hint}>일기에 기분·에너지·수면을 기록할수록 그래프가 풍부해져요.</Text>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    rangeRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    rangeChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    rangeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    rangeText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    rangeTextActive: { color: c.white },
    error: { color: c.danger, fontSize: fontSizes.small, marginBottom: spacing.sm },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...cardShadow(c.shadow),
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    titleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
    titleDot: { width: 8, height: 8, borderRadius: 4 },
    cardTitle: { fontSize: fontSizes.emphasis, fontWeight: "800", color: c.text },
    statWrap: { alignItems: "flex-end", gap: 1 },
    avgText: { fontSize: fontSizes.caption, color: c.textMuted },
    avgStrong: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    deltaWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
    deltaText: { fontSize: fontSizes.caption, fontWeight: "700" },
    subLabel: {
      fontSize: fontSizes.caption,
      fontWeight: "700",
      color: c.textMuted,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    moodRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    moodEmoji: { fontSize: 20, width: 26 },
    moodBarTrack: {
      flex: 1,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.surface,
      overflow: "hidden",
    },
    moodBar: { height: "100%", borderRadius: 7 },
    moodCount: { fontSize: fontSizes.caption, color: c.textMuted, width: 34, textAlign: "right" },
    hint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
    },
  });
