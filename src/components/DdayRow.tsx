// 오늘 탭 상단의 D-day 칩 가로 스크롤. 칩을 누르면 관리 화면으로.

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { listAnniversaries } from "../lib/anniversaries";
import { ddayInfo } from "../lib/dday";
import { AnniversaryRow } from "../lib/supabase";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DdayRow({ todayKey }: { todayKey: string }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<AnniversaryRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      listAnniversaries().then(setRows).catch(() => setRows([]));
    }, [])
  );

  if (rows === null) return null;

  const items = rows
    .map((r) => ({ row: r, dday: ddayInfo(r.date, todayKey, r.repeat_yearly) }))
    .sort((a, b) => {
      // D-DAY → 다가오는 순 → 카운트업(D+)은 뒤로
      const ka = a.dday.days >= 0 ? a.dday.days : 100000 - a.dday.days;
      const kb = b.dday.days >= 0 ? b.dday.days : 100000 - b.dday.days;
      return ka - kb;
    });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {items.map(({ row, dday }) => {
        const isToday = dday.label === "D-DAY";
        return (
          <TouchableOpacity
            key={row.id}
            style={[styles.chip, isToday && styles.chipToday]}
            onPress={() => navigation.navigate("Anniversaries")}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{row.emoji}</Text>
            <Text style={[styles.title, isToday && styles.titleToday]} numberOfLines={1}>
              {row.title}
            </Text>
            <Text style={[styles.label, isToday && styles.labelToday]}>{dday.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={[styles.chip, styles.addChip]}
        onPress={() => navigation.navigate("Anniversaries")}
        activeOpacity={0.7}
      >
        <Text style={styles.addText}>{items.length === 0 ? "+ 디데이 추가" : "+"}</Text>
      </TouchableOpacity>
      <View style={{ width: spacing.md }} />
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { flexGrow: 0, marginBottom: spacing.sm },
    content: { paddingHorizontal: spacing.md, gap: spacing.sm },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
      maxWidth: 190,
    },
    chipToday: { backgroundColor: c.primary, borderColor: c.primary },
    emoji: { fontSize: 13 },
    title: { fontSize: fontSizes.caption, fontWeight: "700", color: c.text, flexShrink: 1 },
    titleToday: { color: c.white },
    label: { fontSize: fontSizes.caption, fontWeight: "900", color: c.primary },
    labelToday: { color: c.white },
    addChip: { borderStyle: "dashed", backgroundColor: "transparent" },
    addText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
  });
