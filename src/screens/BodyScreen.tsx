// 몸·습관 대시보드: 몸무게 추이, 칼로리·수면 14일, 습관 잔디(운동/일기/어김 12주)

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { listLogsByKind } from "../lib/dailyLogs";
import { addDays, todayKey, weekStartOf } from "../lib/dateUtils";
import { DailyLogRow, supabase } from "../lib/supabase";
import { listRecentRecords } from "../lib/workouts";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

function Bars({ values, color, unit }: { values: { label: string; v: number }[]; color: string; unit: string }) {
  const max = Math.max(...values.map((x) => x.v), 1);
  return (
    <View style={bars.row}>
      {values.map((x, i) => (
        <View key={i} style={bars.col}>
          <View style={[bars.bar, { height: Math.max(2, (x.v / max) * 56), backgroundColor: color }]} />
          <Text style={bars.label}>{x.label}</Text>
        </View>
      ))}
    </View>
  );
}
const bars = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 74 },
  col: { flex: 1, alignItems: "center", gap: 2 },
  bar: { width: "70%", borderRadius: 3 },
  label: { fontSize: 8, color: "#999" },
});

/** 12주 습관 잔디 (월요일 시작, 열=주) */
function Grass({ dates, color, badColor }: { dates: Set<string>; color: string; badColor?: boolean }) {
  const today = todayKey();
  const start = addDays(weekStartOf(today), -11 * 7);
  return (
    <View style={grass.row}>
      {Array.from({ length: 12 }, (_, w) => (
        <View key={w} style={grass.col}>
          {Array.from({ length: 7 }, (_, d) => {
            const key = addDays(start, w * 7 + d);
            const active = dates.has(key);
            const future = key > today;
            return (
              <View
                key={d}
                style={[
                  grass.cell,
                  { backgroundColor: future ? "transparent" : active ? color : "#00000012" },
                  badColor && active ? { backgroundColor: color } : null,
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
const grass = StyleSheet.create({
  row: { flexDirection: "row", gap: 3 },
  col: { gap: 3 },
  cell: { width: 11, height: 11, borderRadius: 3 },
});

export function BodyScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = todayKey();
  const [weights, setWeights] = useState<DailyLogRow[]>([]);
  const [kcalByDate, setKcalByDate] = useState<Map<string, number>>(new Map());
  const [sleepByDate, setSleepByDate] = useState<Map<string, number>>(new Map());
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [diaryDates, setDiaryDates] = useState<Set<string>>(new Set());
  const [avoidDates, setAvoidDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const from84 = addDays(today, -84);
    listLogsByKind("weight", addDays(today, -180), today).then(setWeights).catch(() => {});
    supabase
      .from("meals")
      .select("date, kcal")
      .gte("date", addDays(today, -13))
      .then(({ data }) => {
        const map = new Map<string, number>();
        for (const m of (data ?? []) as { date: string; kcal: number | null }[]) {
          if (m.kcal != null) map.set(m.date, (map.get(m.date) ?? 0) + Number(m.kcal));
        }
        setKcalByDate(map);
      });
    supabase
      .from("diaries")
      .select("date, sleep_hours")
      .gte("date", addDays(today, -13))
      .then(({ data }) => {
        const map = new Map<string, number>();
        for (const d of (data ?? []) as { date: string; sleep_hours: number | null }[]) {
          if (d.sleep_hours != null) map.set(d.date, Number(d.sleep_hours));
        }
        setSleepByDate(map);
      });
    supabase
      .from("diaries")
      .select("date")
      .gte("date", from84)
      .then(({ data }) =>
        setDiaryDates(new Set(((data ?? []) as { date: string }[]).map((d) => d.date)))
      );
    listRecentRecords()
      .then((rs) => setWorkoutDates(new Set(rs.map((r) => r.date))))
      .catch(() => {});
    listLogsByKind("avoid", from84, today)
      .then((rs) => setAvoidDates(new Set(rs.map((r) => r.date))))
      .catch(() => {});
    // 운동은 자유기록(daily_logs workout)도 포함
    listLogsByKind("workout", from84, today)
      .then((rs) =>
        setWorkoutDates((prev) => new Set([...prev, ...rs.map((r) => r.date)]))
      )
      .catch(() => {});
  }, [today]);

  // 몸무게: 오래된 → 최신
  const weightSeries = [...weights]
    .reverse()
    .map((w) => ({ date: w.date, v: Number(w.value_num) }))
    .filter((w) => Number.isFinite(w.v));
  const lastW = weightSeries[weightSeries.length - 1];
  const firstW = weightSeries[0];

  const days14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 몸무게 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚖️ 몸무게</Text>
        {weightSeries.length === 0 ? (
          <Text style={styles.hint}>생활 기록에서 몸무게를 남기면 추이가 보여요.</Text>
        ) : (
          <>
            <Text style={styles.bigNum}>
              {lastW.v}kg
              {firstW && firstW.date !== lastW.date ? (
                <Text style={styles.hint}>
                  {"  "}시작 {firstW.v}kg → {lastW.v - firstW.v > 0 ? "+" : ""}
                  {Math.round((lastW.v - firstW.v) * 10) / 10}kg
                </Text>
              ) : null}
            </Text>
            <Bars
              values={weightSeries.slice(-10).map((w) => ({ label: w.date.slice(8), v: w.v }))}
              color="#5B7DB1"
              unit="kg"
            />
          </>
        )}
      </View>

      {/* 칼로리 / 수면 14일 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔥 칼로리 (14일)</Text>
        <Bars
          values={days14.map((d) => ({ label: d.slice(8), v: kcalByDate.get(d) ?? 0 }))}
          color="#3FBF77"
          unit="kcal"
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>😴 수면 (14일)</Text>
        <Bars
          values={days14.map((d) => ({ label: d.slice(8), v: sleepByDate.get(d) ?? 0 }))}
          color="#9B7DE8"
          unit="시간"
        />
      </View>

      {/* 습관 잔디 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌱 습관 잔디 (최근 12주)</Text>
        <Text style={styles.grassLabel}>💪 운동한 날</Text>
        <Grass dates={workoutDates} color="#FF8A4C" />
        <Text style={styles.grassLabel}>📓 일기 쓴 날</Text>
        <Grass dates={diaryDates} color="#3FBF77" />
        <Text style={styles.grassLabel}>🚫 하지 않기를 어긴 날</Text>
        <Grass dates={avoidDates} color="#D9534F" badColor />
        <Text style={styles.hint}>왼쪽이 12주 전, 오른쪽 끝이 이번 주예요 (월~일).</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    cardTitle: { fontSize: fontSizes.body, fontWeight: "900", color: c.text },
    bigNum: { fontSize: fontSizes.title, fontWeight: "900", color: c.text },
    hint: { fontSize: fontSizes.caption, color: c.textMuted },
    grassLabel: {
      fontSize: fontSizes.caption,
      fontWeight: "800",
      color: c.textMuted,
      marginTop: spacing.xs,
    },
  });
