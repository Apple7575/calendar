import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { addDays, todayKey } from "../lib/dateUtils";
import { DiaryEntry, listDiaryEntriesInRange } from "../lib/diary";
import { computeStreak, countInMonth } from "../lib/streaks";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

type Props = {
  monthKey: string;
  /** 해당 월의 일기 목록 (CalendarScreen이 dot용으로 이미 불러온 것) */
  entries: DiaryEntry[];
  onPressDay: (dateKey: string) => void;
};

/** 일기 스트릭 + 이번 달 작성 수 + 기분 모아보기 카드 */
export function MonthlyStats({ monthKey, entries, onPressDay }: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [streak, setStreak] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const today = todayKey();
      // 스트릭은 최근 400일 창이면 충분
      listDiaryEntriesInRange(addDays(today, -400), today)
        .then((all) => setStreak(computeStreak(all.map((e) => e.date), today)))
        .catch(() => setStreak(null));
    }, [])
  );

  const monthCount = countInMonth(entries.map((e) => e.date), monthKey);
  const moodEntries = entries.filter((e) => e.mood);

  return (
    <View style={styles.card}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>🔥 {streak ?? "–"}일</Text>
          <Text style={styles.statLabel}>연속 작성</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>✍️ {monthCount}개</Text>
          <Text style={styles.statLabel}>이번 달 일기</Text>
        </View>
      </View>
      {moodEntries.length > 0 ? (
        <View style={styles.moodGrid}>
          {moodEntries.map((e) => (
            <TouchableOpacity
              key={e.date}
              style={styles.moodCell}
              onPress={() => onPressDay(e.date)}
            >
              <Text style={styles.moodEmoji}>{e.mood}</Text>
              <Text style={styles.moodDay}>{Number(e.date.slice(8, 10))}일</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    statsRow: { flexDirection: "row", alignItems: "center" },
    statBox: { flex: 1, alignItems: "center" },
    statValue: { fontSize: fontSizes.emphasis, fontWeight: "800", color: c.text },
    statLabel: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 2 },
    divider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: c.border },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    moodCell: { alignItems: "center", width: 40 },
    moodEmoji: { fontSize: 22 },
    moodDay: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
  });
