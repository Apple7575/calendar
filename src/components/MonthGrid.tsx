import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatTime, monthWeeks, todayKey } from "../lib/dateUtils";
import { CalendarEvent, eventsOnDate, MarkedDates } from "../lib/eventMerge";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type Props = {
  monthKey: string;
  /** buildMarkedDates 결과 (dot 표시용) */
  markedDates: MarkedDates;
  /** 주차 요약에 쓸 병합·전개된 이벤트 */
  events: CalendarEvent[];
  taskDates: string[];
  diaryDates: string[];
  /** 펼쳐진 주차 index (null = 없음) */
  expandedWeek: number | null;
  onToggleWeek: (index: number) => void;
  onPressDay: (dateKey: string) => void;
};

/**
 * 자체 월간 그리드.
 * 왼쪽에 주차(W1~) 바가 있고, 주차를 누르면 그 주의 요약이 해당 행 아래로 펼쳐진다.
 */
export function MonthGrid({
  monthKey,
  markedDates,
  events,
  taskDates,
  diaryDates,
  expandedWeek,
  onToggleWeek,
  onPressDay,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const weeks = useMemo(() => monthWeeks(monthKey), [monthKey]);
  const today = todayKey();
  const taskSet = useMemo(() => new Set(taskDates), [taskDates]);
  const diarySet = useMemo(() => new Set(diaryDates), [diaryDates]);

  return (
    <View style={styles.container}>
      {/* 요일 헤더 */}
      <View style={styles.row}>
        <View style={styles.weekBarSpacer} />
        {WEEKDAY_LABELS.map((w, i) => (
          <View key={w} style={styles.dayCell}>
            <Text style={[styles.weekdayLabel, i === 0 && { color: c.danger }]}>{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => {
        const expanded = expandedWeek === wi;
        return (
          <View key={week[0]}>
            <View style={styles.row}>
              {/* 주차 바 */}
              <TouchableOpacity
                style={[styles.weekBar, expanded && styles.weekBarActive]}
                onPress={() => onToggleWeek(wi)}
              >
                <Text style={[styles.weekBarText, expanded && styles.weekBarTextActive]}>
                  W{wi + 1}
                </Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={10}
                  color={expanded ? c.white : c.textMuted}
                />
              </TouchableOpacity>

              {/* 날짜 셀 */}
              {week.map((dateKey, di) => {
                const inMonth = dateKey.startsWith(monthKey);
                const isToday = dateKey === today;
                const dots = markedDates[dateKey]?.dots ?? [];
                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={styles.dayCell}
                    onPress={() => onPressDay(dateKey)}
                  >
                    <View style={[styles.dayNumWrap, isToday && styles.todayWrap]}>
                      <Text
                        style={[
                          styles.dayNum,
                          di === 0 && { color: c.danger },
                          !inMonth && styles.dayNumMuted,
                          isToday && styles.todayText,
                        ]}
                      >
                        {Number(dateKey.slice(8, 10))}
                      </Text>
                    </View>
                    <View style={styles.dotRow}>
                      {dots.slice(0, 4).map((d) => (
                        <View key={d.key} style={[styles.dot, { backgroundColor: d.color }]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 주차 아코디언 */}
            {expanded ? (
              <View style={styles.accordion}>
                <WeekSummary
                  week={week}
                  monthKey={monthKey}
                  events={events}
                  taskSet={taskSet}
                  diarySet={diarySet}
                  onPressDay={onPressDay}
                  styles={styles}
                  c={c}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function WeekSummary({
  week,
  monthKey,
  events,
  taskSet,
  diarySet,
  onPressDay,
  styles,
  c,
}: {
  week: string[];
  monthKey: string;
  events: CalendarEvent[];
  taskSet: Set<string>;
  diarySet: Set<string>;
  onPressDay: (dateKey: string) => void;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  const daysWithContent = week
    .map((dateKey, i) => ({
      dateKey,
      weekday: WEEKDAY_LABELS[i],
      events: eventsOnDate(events, dateKey),
      hasTask: taskSet.has(dateKey),
      hasDiary: diarySet.has(dateKey),
    }))
    .filter((d) => d.events.length > 0 || d.hasTask || d.hasDiary);

  if (daysWithContent.length === 0) {
    return <Text style={styles.accordionEmpty}>이번 주는 아직 비어 있어요.</Text>;
  }

  return (
    <>
      {daysWithContent.map((d) => (
        <TouchableOpacity
          key={d.dateKey}
          style={styles.summaryDay}
          onPress={() => onPressDay(d.dateKey)}
        >
          <View style={styles.summaryDateCol}>
            <Text
              style={[
                styles.summaryDate,
                !d.dateKey.startsWith(monthKey) && { color: c.textMuted },
              ]}
            >
              {Number(d.dateKey.slice(8, 10))}일 ({d.weekday})
            </Text>
            <View style={styles.summaryBadges}>
              {d.hasTask ? <Ionicons name="checkbox-outline" size={12} color={c.dotTask} /> : null}
              {d.hasDiary ? <Ionicons name="book-outline" size={12} color={c.dotDiary} /> : null}
            </View>
          </View>
          <View style={styles.summaryEvents}>
            {d.events.slice(0, 3).map((e) => (
              <View key={`${e.source}-${e.id}-${e.startAt}`} style={styles.summaryEventRow}>
                <View
                  style={[
                    styles.summaryEventDot,
                    {
                      backgroundColor:
                        e.colorHex ?? (e.source === "google" ? c.dotGoogle : c.dotEvent),
                    },
                  ]}
                />
                <Text style={styles.summaryEventTitle} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={styles.summaryEventTime}>
                  {e.allDay ? "종일" : formatTime(e.startAt)}
                </Text>
              </View>
            ))}
            {d.events.length > 3 ? (
              <Text style={styles.summaryMore}>외 {d.events.length - 3}개</Text>
            ) : null}
            {d.events.length === 0 ? (
              <Text style={styles.summaryMore}>일정 없음</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
        </TouchableOpacity>
      ))}
    </>
  );
}

const WEEK_BAR_W = 30;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { paddingHorizontal: spacing.sm },
    row: { flexDirection: "row", alignItems: "stretch" },
    weekBarSpacer: { width: WEEK_BAR_W },
    weekBar: {
      width: WEEK_BAR_W - 4,
      marginRight: 4,
      marginVertical: 3,
      borderRadius: 8,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
    },
    weekBarActive: { backgroundColor: c.primary },
    weekBarText: { fontSize: 10, fontWeight: "800", color: c.textMuted },
    weekBarTextActive: { color: c.white },
    weekdayLabel: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      paddingVertical: 4,
    },
    dayCell: { flex: 1, alignItems: "center", paddingVertical: 5, minHeight: 52 },
    dayNumWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    todayWrap: { backgroundColor: c.primary },
    dayNum: { fontSize: fontSizes.body, color: c.text },
    dayNumMuted: { color: c.textMuted, opacity: 0.45 },
    todayText: { color: c.white, fontWeight: "800" },
    dotRow: { flexDirection: "row", gap: 3, marginTop: 3, height: 6 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    accordion: {
      marginLeft: WEEK_BAR_W,
      marginRight: spacing.xs,
      marginBottom: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
    },
    accordionEmpty: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      paddingVertical: spacing.sm,
    },
    summaryDay: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    summaryDateCol: { width: 64 },
    summaryDate: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    summaryBadges: { flexDirection: "row", gap: 3, marginTop: 2 },
    summaryEvents: { flex: 1, gap: 2 },
    summaryEventRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    summaryEventDot: { width: 5, height: 5, borderRadius: 3 },
    summaryEventTitle: { flex: 1, fontSize: fontSizes.small, color: c.text },
    summaryEventTime: { fontSize: fontSizes.caption, color: c.textMuted },
    summaryMore: { fontSize: fontSizes.caption, color: c.textMuted },
  });
