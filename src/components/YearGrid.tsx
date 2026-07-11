// 연간 보기: 12개 미니 달력 (3열). 오늘은 강조, 미니 달을 누르면 그 달의 월간 보기로.

import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { monthWeeks, todayKey } from "../lib/dateUtils";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

type Props = {
  year: number;
  /** 일기 쓴 날짜들 — 미니 셀 아래 점으로 표시 */
  diaryDates?: string[];
  onPressMonth: (monthKey: string) => void;
};

function MiniMonth({
  monthKey,
  today,
  diarySet,
  onPress,
  styles,
  c,
}: {
  monthKey: string;
  today: string;
  diarySet: Set<string>;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  const weeks = useMemo(() => monthWeeks(monthKey), [monthKey]);
  const isCurrentMonth = today.startsWith(monthKey);
  return (
    <TouchableOpacity style={styles.miniMonth} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.miniTitle, isCurrentMonth && { color: c.primary }]}>
        {Number(monthKey.slice(5, 7))}월
      </Text>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.miniRow}>
          {week.map((dateKey, di) => {
            const inMonth = dateKey.startsWith(monthKey);
            const isToday = dateKey === today;
            return (
              <View key={dateKey} style={styles.miniCell}>
                {inMonth ? (
                  <View style={[styles.miniDayWrap, isToday && { backgroundColor: c.primary }]}>
                    <Text
                      style={[
                        styles.miniDay,
                        di === 0 && { color: c.danger },
                        isToday && styles.miniToday,
                      ]}
                    >
                      {Number(dateKey.slice(8, 10))}
                    </Text>
                    {diarySet.has(dateKey) && !isToday ? <View style={styles.miniDot} /> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </TouchableOpacity>
  );
}

export function YearGrid({ year, diaryDates = [], onPressMonth }: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = todayKey();
  const diarySet = useMemo(() => new Set(diaryDates), [diaryDates]);
  const monthKeys = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {monthKeys.map((mk) => (
          <MiniMonth
            key={mk}
            monthKey={mk}
            today={today}
            diarySet={diarySet}
            onPress={() => onPressMonth(mk)}
            styles={styles}
            c={c}
          />
        ))}
      </View>
      <Text style={styles.hint}>달을 누르면 그 달의 월간 보기로 이동해요.</Text>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: spacing.sm,
      rowGap: spacing.md,
    },
    miniMonth: {
      width: "33.33%",
      paddingHorizontal: spacing.xs + 2,
      borderRadius: radii.button,
    },
    miniTitle: {
      fontSize: fontSizes.small,
      fontWeight: "800",
      color: c.text,
      marginBottom: 3,
    },
    miniRow: { flexDirection: "row" },
    miniCell: { flex: 1, alignItems: "center" },
    miniDayWrap: {
      width: 15,
      height: 15,
      borderRadius: 7.5,
      alignItems: "center",
      justifyContent: "center",
    },
    miniDay: { fontSize: 9, color: c.text },
    miniToday: { color: c.white, fontWeight: "800" },
    miniDot: {
      position: "absolute",
      bottom: -1.5,
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.dotDiary,
    },
    hint: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.caption,
      marginVertical: spacing.md,
    },
  });
