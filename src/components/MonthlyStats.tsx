import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { addDays, todayKey } from "../lib/dateUtils";
import { DiaryEntry, listDiaryEntriesInRange } from "../lib/diary";
import { computeStreak, countInMonth } from "../lib/streaks";
import { colors, fontSizes, radii, spacing } from "../theme/tokens";

type Props = {
  monthKey: string;
  /** 해당 월의 일기 목록 (CalendarScreen이 dot용으로 이미 불러온 것) */
  entries: DiaryEntry[];
  onPressDay: (dateKey: string) => void;
};

/** 일기 스트릭 + 이번 달 작성 수 + 기분 모아보기 카드 */
export function MonthlyStats({ monthKey, entries, onPressDay }: Props) {
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
        <Text style={styles.statText}>
          🔥 <Text style={styles.statStrong}>{streak ?? "–"}일</Text> 연속 작성
        </Text>
        <Text style={styles.statText}>
          ✍️ 이번 달 일기 <Text style={styles.statStrong}>{monthCount}개</Text>
        </Text>
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

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statText: { fontSize: fontSizes.small, color: colors.text },
  statStrong: { fontWeight: "800", color: colors.primary },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  moodCell: { alignItems: "center", width: 40 },
  moodEmoji: { fontSize: 22 },
  moodDay: { fontSize: fontSizes.caption, color: colors.textMuted, marginTop: 1 },
});
