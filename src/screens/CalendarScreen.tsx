import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { useGoogleEvents } from "../hooks/useGoogleEvents";
import { monthBounds, toDateKey, todayKey } from "../lib/dateUtils";
import { buildMarkedDates, CalendarEvent } from "../lib/eventMerge";
import { listDiaryDatesInRange } from "../lib/diary";
import { listLocalEventsInRange, toCalendarEvent } from "../lib/events";
import { listTaskDatesInRange } from "../lib/tasks";
import { RootStackParamList } from "../navigation/types";
import { colors, fontSizes, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const [monthKey, setMonthKey] = useState(todayKey().slice(0, 7));
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [taskDates, setTaskDates] = useState<string[]>([]);
  const [diaryDates, setDiaryDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const google = useGoogleEvents(monthKey);

  const loadLocal = useCallback(async () => {
    setError(null);
    try {
      const { start, end } = monthBounds(monthKey);
      const startKey = `${monthKey}-01`;
      const endKey = toDateKey(new Date(end.getTime() - 1));
      const [rows, tDates, dDates] = await Promise.all([
        listLocalEventsInRange(start, end),
        listTaskDatesInRange(startKey, endKey),
        listDiaryDatesInRange(startKey, endKey),
      ]);
      setLocalEvents(rows.map(toCalendarEvent));
      setTaskDates(tDates);
      setDiaryDates(dDates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했어요.");
    }
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => {
      loadLocal();
    }, [loadLocal])
  );

  const markedDates = useMemo(
    () =>
      buildMarkedDates({
        events: [...localEvents, ...google.events],
        taskDates,
        diaryDates,
        colors: {
          event: colors.dotEvent,
          googleEvent: colors.dotGoogle,
          task: colors.dotTask,
          diary: colors.dotDiary,
          selected: colors.primary,
        },
        selectedDate: todayKey(),
      }),
    [localEvents, google.events, taskDates, diaryDates]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>캘린더</Text>
        <TouchableOpacity onPress={google.refresh} hitSlop={8} disabled={google.loading}>
          {google.loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.refreshText}>구글 새로고침</Text>
          )}
        </TouchableOpacity>
      </View>

      {google.notLinked ? (
        <Text style={styles.notice}>구글 캘린더 미연결 — 설정 탭에서 연결할 수 있어요.</Text>
      ) : null}
      {error || google.error ? (
        <Text style={styles.error}>{error ?? google.error}</Text>
      ) : null}

      <Calendar
        current={`${monthKey}-01`}
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) => navigation.navigate("DayDetail", { date: day.dateString })}
        onMonthChange={(m) => setMonthKey(`${m.year}-${String(m.month).padStart(2, "0")}`)}
        monthFormat="yyyy년 M월"
        theme={{
          todayTextColor: colors.primary,
          arrowColor: colors.primary,
          textDayFontSize: fontSizes.body,
          textMonthFontSize: fontSizes.emphasis,
          textMonthFontWeight: "700",
          textDayHeaderFontSize: fontSizes.caption,
        }}
      />

      <View style={styles.legend}>
        <LegendDot color={colors.dotEvent} label="내 일정" />
        <LegendDot color={colors.dotGoogle} label="구글" />
        <LegendDot color={colors.dotTask} label="할 일" />
        <LegendDot color={colors.dotDiary} label="일기" />
      </View>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: fontSizes.title, fontWeight: "800", color: colors.text },
  refreshText: { color: colors.primary, fontSize: fontSizes.small, fontWeight: "700" },
  notice: {
    color: colors.textMuted,
    fontSize: fontSizes.caption,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.caption,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendLabel: { fontSize: fontSizes.caption, color: colors.textMuted },
});
