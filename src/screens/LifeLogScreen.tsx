// 생활 기록 화면 (관심사 탭): 날짜를 오가며 식단/몸무게/운동 등 기록하는 곳.
// 오늘 탭에는 읽기 전용 요약만 보이고, 기록은 여기서 한다.

import { CaretLeft } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LifeLogSection } from "../components/LifeLogSection";
import { addDays, formatKoreanDate, todayKey } from "../lib/dateUtils";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, spacing } from "../theme/tokens";

export function LifeLogScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [dateKey, setDateKey] = useState(todayKey());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setDateKey(addDays(dateKey, -1))} hitSlop={8}>
          <CaretLeft size={18} weight="bold" color={c.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDateKey(todayKey())}>
          <Text style={styles.headerDate}>{formatKoreanDate(dateKey)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDateKey(addDays(dateKey, 1))} hitSlop={8}>
          <CaretRight size={18} weight="bold" color={c.primary} />
        </TouchableOpacity>
      </View>
      <LifeLogSection dateKey={dateKey} />
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    headerDate: { fontSize: fontSizes.body, fontWeight: "800", color: c.text },
  });
