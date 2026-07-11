import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MonthGrid } from "../components/MonthGrid";
import { MonthlyStats } from "../components/MonthlyStats";
import { QuickEventSheet, SlotSelection } from "../components/QuickEventSheet";
import { WeekView } from "../components/WeekView";
import { YearGrid } from "../components/YearGrid";
import { YearMemories } from "../components/YearMemories";
import { invalidateGoogleCache, useGoogleEvents } from "../hooks/useGoogleEvents";
import {
  addDays,
  formatTime,
  monthBounds,
  monthKeyOf,
  parseDateKey,
  toDateKey,
  todayKey,
  weekStartOf,
} from "../lib/dateUtils";
import { listAnniversaries } from "../lib/anniversaries";
import { anniversaryOccurrences } from "../lib/dday";
import { buildMarkedDates, CalendarEvent, mergeEvents } from "../lib/eventMerge";
import { DiaryEntry, listDiaryEntriesInRange } from "../lib/diary";
import { listLocalEventsInRange } from "../lib/events";
import { DayDecoration, listHighlightsInRange } from "../lib/highlights";
import { AnniversaryRow } from "../lib/supabase";
import { expandEventRows } from "../lib/recurrence";
import { listTaskDatesInRange } from "../lib/tasks";
import { updateWidget } from "../lib/widget";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewMode = "month" | "week" | "year";

export function CalendarScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();

  const [mode, setMode] = useState<ViewMode>("month");
  const [monthKey, setMonthKey] = useState(todayKey().slice(0, 7));
  const [weekStart, setWeekStart] = useState(weekStartOf(todayKey()));
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selection, setSelection] = useState<SlotSelection | null>(null);

  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [taskDates, setTaskDates] = useState<string[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [highlights, setHighlights] = useState<Record<string, DayDecoration>>({});
  const [annivByDate, setAnnivByDate] = useState<Record<string, AnniversaryRow[]>>({});
  const [error, setError] = useState<string | null>(null);

  // 주간 모드에서도 그 주가 속한 달 기준으로 구글 fetch (±1개월 커버)
  const googleMonthKey = mode === "month" ? monthKey : monthKeyOf(weekStart);
  const google = useGoogleEvents(googleMonthKey);

  const loadLocal = useCallback(async () => {
    setError(null);
    try {
      // 연간 보기: 그 해의 일기 날짜만 가볍게 불러온다 (미니 달력 점 표시용)
      if (mode === "year") {
        const year = monthKey.slice(0, 4);
        setDiaryEntries(await listDiaryEntriesInRange(`${year}-01-01`, `${year}-12-31`));
        return;
      }
      let rangeStart: Date;
      let rangeEnd: Date;
      if (mode === "month") {
        const b = monthBounds(monthKey);
        rangeStart = b.start;
        rangeEnd = b.end;
      } else {
        rangeStart = parseDateKey(weekStart);
        rangeEnd = parseDateKey(addDays(weekStart, 7));
      }
      const startKey = toDateKey(rangeStart);
      const endKey = toDateKey(new Date(rangeEnd.getTime() - 1));
      const [rows, tDates, dEntries, highlightMap, annivRows] = await Promise.all([
        listLocalEventsInRange(rangeStart, rangeEnd),
        listTaskDatesInRange(startKey, endKey),
        listDiaryEntriesInRange(startKey, endKey),
        listHighlightsInRange(startKey, endKey),
        listAnniversaries().catch(() => [] as AnniversaryRow[]),
      ]);
      setLocalEvents(expandEventRows(rows, rangeStart, rangeEnd));
      setTaskDates(tDates);
      setDiaryEntries(dEntries);
      setHighlights(highlightMap);
      setAnnivByDate(anniversaryOccurrences(annivRows, startKey, endKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했어요.");
    }
  }, [mode, monthKey, weekStart]);

  useFocusEffect(
    useCallback(() => {
      loadLocal();
    }, [loadLocal])
  );

  const mergedEvents = useMemo(
    () => mergeEvents(localEvents, google.events),
    [localEvents, google.events]
  );

  const markedDates = useMemo(
    () =>
      buildMarkedDates({
        events: mergedEvents,
        taskDates,
        diaryDates: diaryEntries.map((e) => e.date),
        colors: {
          event: c.dotEvent,
          googleEvent: c.dotGoogle,
          task: c.dotTask,
          diary: c.dotDiary,
        },
      }),
    [mergedEvents, taskDates, diaryEntries, c]
  );

  const changeMonth = (delta: number) => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setExpandedWeek(null);
  };

  const changeWeek = (delta: number) => setWeekStart(addDays(weekStart, delta * 7));

  const changeYear = (delta: number) => {
    const y = Number(monthKey.slice(0, 4)) + delta;
    setMonthKey(`${y}-${monthKey.slice(5, 7)}`);
  };

  const changePeriod = (delta: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (mode === "month") changeMonth(delta);
    else if (mode === "week") changeWeek(delta);
    else changeYear(delta);
  };

  // 좌우 스와이프로 이전/다음 기간 이동 (세로 스크롤과 충돌하지 않게 가로 우세일 때만)
  const changePeriodRef = useRef(changePeriod);
  changePeriodRef.current = changePeriod;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) changePeriodRef.current(1);
        else if (g.dx > 40) changePeriodRef.current(-1);
      },
    })
  ).current;

  const goToday = () => {
    setMonthKey(todayKey().slice(0, 7));
    setWeekStart(weekStartOf(todayKey()));
    setExpandedWeek(null);
  };

  const handlePressGoogleEvent = (e: CalendarEvent) => {
    if (e.source === "local") {
      navigation.navigate("EventEdit", {
        date: toDateKey(new Date(e.startAt)),
        eventId: e.id,
      });
    } else {
      Alert.alert(
        e.title,
        `${e.allDay ? "종일" : `${formatTime(e.startAt)} - ${formatTime(e.endAt)}`}\n구글 캘린더 일정이에요. 수정은 구글 캘린더에서 해주세요.`
      );
    }
  };

  const periodLabel =
    mode === "month"
      ? `${Number(monthKey.slice(0, 4))}년 ${Number(monthKey.slice(5, 7))}월`
      : mode === "year"
        ? `${Number(monthKey.slice(0, 4))}년`
        : `${Number(weekStart.slice(5, 7))}/${Number(weekStart.slice(8, 10))} - ${Number(
            addDays(weekStart, 6).slice(5, 7)
          )}/${Number(addDays(weekStart, 6).slice(8, 10))}`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* 상단 헤더: 기간 이동 + 모드 토글 + 구글 새로고침 */}
      <View style={styles.header}>
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={() => changePeriod(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={c.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday}>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changePeriod(1)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={c.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate("QuickAdd")} hitSlop={8}>
            <Ionicons name="sparkles-outline" size={18} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.modeToggle}>
            {(["year", "month", "week"] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeButton, mode === m && styles.modeButtonActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                  {m === "month" ? "월" : m === "week" ? "주" : "년"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={google.refresh} hitSlop={8} disabled={google.loading}>
            {google.loading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Ionicons name="sync-outline" size={18} color={c.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {google.notLinked ? (
        <Text style={styles.notice}>구글 캘린더 미연결 — 관심사 탭 ⚙️ 설정에서 연결할 수 있어요.</Text>
      ) : null}
      {error || google.error ? (
        <Text style={styles.error}>{error ?? google.error}</Text>
      ) : null}

      {mode === "year" ? (
        <View style={{ flex: 1 }} {...swipe.panHandlers}>
          <YearGrid
            year={Number(monthKey.slice(0, 4))}
            diaryDates={diaryEntries.map((e) => e.date)}
            onPressMonth={(mk) => {
              setMonthKey(mk);
              setExpandedWeek(null);
              setMode("month");
            }}
            footer={
              <YearMemories year={Number(monthKey.slice(0, 4))} entries={diaryEntries} />
            }
          />
        </View>
      ) : mode === "month" ? (
        <ScrollView showsVerticalScrollIndicator={false} {...swipe.panHandlers}>
          <MonthGrid
            monthKey={monthKey}
            markedDates={markedDates}
            events={mergedEvents}
            taskDates={taskDates}
            diaryDates={diaryEntries.map((e) => e.date)}
            highlights={highlights}
            anniversaries={annivByDate}
            expandedWeek={expandedWeek}
            onToggleWeek={(i) => setExpandedWeek(expandedWeek === i ? null : i)}
            onPressDay={(date) => navigation.navigate("DayDetail", { date })}
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
      ) : (
        <WeekView
          weekStart={weekStart}
          events={mergedEvents}
          selection={selection}
          onPressDay={(date) => navigation.navigate("DayDetail", { date })}
          onPressSlot={(date, hour) =>
            setSelection({ dateKey: date, startMin: hour * 60, endMin: hour * 60 + 60 })
          }
          onPressEvent={handlePressGoogleEvent}
        />
      )}

      <QuickEventSheet
        selection={selection}
        onChangeTimes={(startMin, endMin) =>
          setSelection((prev) => (prev ? { ...prev, startMin, endMin } : prev))
        }
        onClose={() => setSelection(null)}
        onSaved={() => {
          setSelection(null);
          invalidateGoogleCache();
          loadLocal();
          google.refresh();
          void updateWidget();
        }}
      />
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
    periodNav: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    periodLabel: {
      fontSize: fontSizes.emphasis,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.4,
      minWidth: 110,
      textAlign: "center",
    },
    headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
    modeToggle: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 999,
      padding: 2,
    },
    modeButton: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 1,
      borderRadius: 999,
    },
    modeButtonActive: { backgroundColor: c.primary },
    modeText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    modeTextActive: { color: c.white },
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
