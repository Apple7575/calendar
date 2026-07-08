import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { MonthlyStats } from "../components/MonthlyStats";
import { useGoogleEvents } from "../hooks/useGoogleEvents";
import { monthBounds, toDateKey, todayKey } from "../lib/dateUtils";
import { buildMarkedDates, CalendarEvent, mergeEvents } from "../lib/eventMerge";
import { DiaryEntry, listDiaryEntriesInRange } from "../lib/diary";
import { listLocalEventsInRange } from "../lib/events";
import { expandEventRows } from "../lib/recurrence";
import { listTaskDatesInRange } from "../lib/tasks";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CalendarScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [monthKey, setMonthKey] = useState(todayKey().slice(0, 7));
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [taskDates, setTaskDates] = useState<string[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const google = useGoogleEvents(monthKey);

  const loadLocal = useCallback(async () => {
    setError(null);
    try {
      const { start, end } = monthBounds(monthKey);
      const startKey = `${monthKey}-01`;
      const endKey = toDateKey(new Date(end.getTime() - 1));
      const [rows, tDates, dEntries] = await Promise.all([
        listLocalEventsInRange(start, end),
        listTaskDatesInRange(startKey, endKey),
        listDiaryEntriesInRange(startKey, endKey),
      ]);
      setLocalEvents(expandEventRows(rows, start, end));
      setTaskDates(tDates);
      setDiaryEntries(dEntries);
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
        // 구글에 push한 일정의 구글 사본 dot이 중복되지 않도록 병합 후 사용
        events: mergeEvents(localEvents, google.events),
        taskDates,
        diaryDates: diaryEntries.map((e) => e.date),
        colors: {
          event: c.dotEvent,
          googleEvent: c.dotGoogle,
          task: c.dotTask,
          diary: c.dotDiary,
          selected: c.primary,
        },
        selectedDate: todayKey(),
      }),
    [localEvents, google.events, taskDates, diaryEntries, c]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>캘린더</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={google.refresh}
          hitSlop={8}
          disabled={google.loading}
        >
          {google.loading ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <>
              <Ionicons name="sync-outline" size={15} color={c.primary} />
              <Text style={styles.refreshText}>구글</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {google.notLinked ? (
        <Text style={styles.notice}>구글 캘린더 미연결 — 설정 탭에서 연결할 수 있어요.</Text>
      ) : null}
      {error || google.error ? (
        <Text style={styles.error}>{error ?? google.error}</Text>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        <Calendar
          key={theme.id} // 테마 변경 시 캘린더 내부 테마 재적용
          current={`${monthKey}-01`}
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={(day) => navigation.navigate("DayDetail", { date: day.dateString })}
          onMonthChange={(m) => setMonthKey(`${m.year}-${String(m.month).padStart(2, "0")}`)}
          monthFormat="yyyy년 M월"
          theme={{
            calendarBackground: c.background,
            dayTextColor: c.text,
            monthTextColor: c.text,
            textSectionTitleColor: c.textMuted,
            textDisabledColor: theme.isDark ? "#4A4F63" : "#C9CCD9",
            todayTextColor: c.primary,
            selectedDayBackgroundColor: c.primary,
            selectedDayTextColor: c.white,
            arrowColor: c.primary,
            textDayFontSize: fontSizes.body,
            textMonthFontSize: fontSizes.emphasis,
            textMonthFontWeight: "800",
            textDayHeaderFontSize: fontSizes.caption,
          }}
        />

        <View style={styles.legend}>
          <LegendDot color={c.dotEvent} label="내 일정" styles={styles} />
          <LegendDot color={c.dotGoogle} label="구글" styles={styles} />
          <LegendDot color={c.dotTask} label="할 일" styles={styles} />
          <LegendDot color={c.dotDiary} label="일기" styles={styles} />
        </View>

        <MonthlyStats
          monthKey={monthKey}
          entries={diaryEntries}
          onPressDay={(date) => navigation.navigate("DayDetail", { date })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
    },
    refreshText: { color: c.primary, fontSize: fontSizes.caption, fontWeight: "700" },
    notice: {
      color: c.textMuted,
      fontSize: fontSizes.caption,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    error: {
      color: c.danger,
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
    legendLabel: { fontSize: fontSizes.caption, color: c.textMuted },
  });
