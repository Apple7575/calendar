import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatTime, parseDateKey, todayKey, weekDays } from "../lib/dateUtils";
import { CalendarEvent, eventsOnDate } from "../lib/eventMerge";
import { assignLanes } from "../lib/lanes";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes } from "../theme/tokens";

const HOUR_H = 44;
const GUTTER_W = 42;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

type Props = {
  /** 주 시작(일요일) dateKey */
  weekStart: string;
  /** 그 주에 표시할 병합·전개된 이벤트 */
  events: CalendarEvent[];
  /** 빈 칸 탭으로 만든 선택 영역 (테두리 박스로 표시) */
  selection?: { dateKey: string; startMin: number; endMin: number } | null;
  onPressDay: (dateKey: string) => void;
  onPressSlot: (dateKey: string, hour: number) => void;
  onPressEvent: (event: CalendarEvent) => void;
};

/** 이벤트를 해당 날짜 내 분 단위 [start, end)로 클램프 (자정 걸침 처리) */
function minutesInDay(e: CalendarEvent, dateKey: string): { start: number; end: number } {
  const dayStart = parseDateKey(dateKey).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const s = Math.max(new Date(e.startAt).getTime(), dayStart);
  const en = Math.min(new Date(e.endAt).getTime(), dayEnd);
  return { start: (s - dayStart) / 60000, end: Math.max((en - dayStart) / 60000, (s - dayStart) / 60000 + 20) };
}

export function WeekView({
  weekStart,
  events,
  selection,
  onPressDay,
  onPressSlot,
  onPressEvent,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const today = todayKey();

  const timedByDay = useMemo(
    () =>
      days.map((d) =>
        assignLanes(
          eventsOnDate(events, d).filter((e) => !e.allDay),
          (e) => minutesInDay(e, d).start,
          (e) => minutesInDay(e, d).end
        )
      ),
    [days, events]
  );
  const allDayByDay = useMemo(
    () => days.map((d) => eventsOnDate(events, d).filter((e) => e.allDay)),
    [days, events]
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <View style={styles.container}>
      {/* 날짜 헤더 */}
      <View style={styles.headerRow}>
        <View style={{ width: GUTTER_W }} />
        {days.map((d, i) => {
          const isToday = d === today;
          return (
            <TouchableOpacity key={d} style={styles.headerCell} onPress={() => onPressDay(d)}>
              <Text style={[styles.headerWeekday, i === 0 && { color: c.danger }]}>
                {WEEKDAY_LABELS[i]}
              </Text>
              <View style={[styles.headerDayWrap, isToday && styles.headerToday]}>
                <Text
                  style={[
                    styles.headerDay,
                    i === 0 && { color: c.danger },
                    isToday && styles.headerTodayText,
                  ]}
                >
                  {Number(d.slice(8, 10))}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 종일 일정 스트립 */}
      {hasAllDay ? (
        <View style={styles.allDayRow}>
          <View style={{ width: GUTTER_W, alignItems: "center" }}>
            <Text style={styles.allDayLabel}>종일</Text>
          </View>
          {allDayByDay.map((list, i) => (
            <View key={days[i]} style={styles.allDayCell}>
              {list.slice(0, 2).map((e) => (
                <TouchableOpacity
                  key={`${e.source}-${e.id}-${e.startAt}`}
                  style={[
                    styles.allDayChip,
                    { backgroundColor: e.source === "google" ? c.successSoft : c.primarySoft },
                  ]}
                  onPress={() => onPressEvent(e)}
                >
                  <Text
                    style={[
                      styles.allDayChipText,
                      { color: e.source === "google" ? c.dotGoogle : c.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {e.title}
                  </Text>
                </TouchableOpacity>
              ))}
              {list.length > 2 ? (
                <Text style={styles.allDayMore}>+{list.length - 2}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* 시간 그리드 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: 7.5 * HOUR_H }}
      >
        <View style={{ flexDirection: "row", height: 24 * HOUR_H }}>
          {/* 시간 라벨 */}
          <View style={{ width: GUTTER_W }}>
            {Array.from({ length: 24 }, (_, h) => (
              <View key={h} style={{ height: HOUR_H, alignItems: "center" }}>
                <Text style={styles.hourLabel}>{h}시</Text>
              </View>
            ))}
          </View>

          {days.map((d, dayIndex) => (
            <View key={d} style={styles.dayColumn}>
              {/* 시간 칸 (빈 곳 탭 → 일정 등록) */}
              {Array.from({ length: 24 }, (_, h) => (
                <Pressable
                  key={h}
                  style={({ pressed }) => [
                    styles.hourCell,
                    pressed && { backgroundColor: c.primarySoft },
                  ]}
                  onPress={() => onPressSlot(d, h)}
                />
              ))}

              {/* 일정 블록 */}
              {timedByDay[dayIndex].map(({ item: e, lane, lanes }) => {
                const { start, end } = minutesInDay(e, d);
                const top = (start / 60) * HOUR_H;
                const height = Math.max(((end - start) / 60) * HOUR_H - 2, 18);
                const widthPct = 100 / lanes;
                const isGoogle = e.source === "google";
                return (
                  <TouchableOpacity
                    key={`${e.source}-${e.id}-${e.startAt}`}
                    style={[
                      styles.eventBlock,
                      {
                        top,
                        height,
                        left: `${lane * widthPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: isGoogle ? c.successSoft : c.primarySoft,
                        borderLeftColor: isGoogle ? c.dotGoogle : c.primary,
                      },
                    ]}
                    onPress={() => onPressEvent(e)}
                  >
                    <Text
                      style={[styles.eventTitle, { color: isGoogle ? c.dotGoogle : c.primary }]}
                      numberOfLines={height > 34 ? 2 : 1}
                    >
                      {e.title}
                    </Text>
                    {height > 46 ? (
                      <Text style={styles.eventTime}>{formatTime(e.startAt)}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              {/* 선택 영역 (구글 캘린더식 테두리 박스) */}
              {selection && selection.dateKey === d ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.selectionBox,
                    {
                      top: (selection.startMin / 60) * HOUR_H,
                      height: Math.max(
                        ((selection.endMin - selection.startMin) / 60) * HOUR_H,
                        12
                      ),
                    },
                  ]}
                />
              ) : null}

              {/* 현재 시각 표시선 */}
              {d === today ? (
                <View
                  pointerEvents="none"
                  style={[styles.nowLine, { top: (nowMinutes / 60) * HOUR_H }]}
                >
                  <View style={styles.nowDot} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerRow: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      paddingBottom: 6,
    },
    headerCell: { flex: 1, alignItems: "center", gap: 2 },
    headerWeekday: { fontSize: fontSizes.caption, color: c.textMuted },
    headerDayWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    headerToday: { backgroundColor: c.primary },
    headerDay: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    headerTodayText: { color: c.white },
    allDayRow: {
      flexDirection: "row",
      paddingVertical: 3,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    allDayLabel: { fontSize: 10, color: c.textMuted, marginTop: 3 },
    allDayCell: { flex: 1, gap: 2, paddingHorizontal: 1 },
    allDayChip: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
    allDayChipText: { fontSize: 10, fontWeight: "700" },
    allDayMore: { fontSize: 9, color: c.textMuted, textAlign: "center" },
    hourLabel: { fontSize: 10, color: c.textMuted, marginTop: -6 },
    dayColumn: {
      flex: 1,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.border,
    },
    hourCell: {
      height: HOUR_H,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    eventBlock: {
      position: "absolute",
      borderRadius: 5,
      borderLeftWidth: 3,
      paddingHorizontal: 3,
      paddingVertical: 2,
      overflow: "hidden",
    },
    eventTitle: { fontSize: 10, fontWeight: "700", lineHeight: 12 },
    eventTime: { fontSize: 9, color: c.textMuted, marginTop: 1 },
    selectionBox: {
      position: "absolute",
      left: 1,
      right: 1,
      borderWidth: 2,
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
      opacity: 0.9,
      borderRadius: 6,
      zIndex: 10,
    },
    nowLine: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: c.danger,
    },
    nowDot: {
      position: "absolute",
      left: -3,
      top: -2.5,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.danger,
    },
  });
