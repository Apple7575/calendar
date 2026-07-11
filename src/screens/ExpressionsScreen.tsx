// 표현 카드: 일기 번역에서 AI가 뽑아둔 영어/일본어 표현 모아보기.
// 카드 탭 → 뜻/예문 펼침, 길게 누르면 삭제.

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SleepyCat } from "../components/cute/SleepyCat";
import { deleteExpression, listExpressions } from "../lib/diaryLang";
import { ExpressionRow } from "../lib/supabase";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

type Filter = "all" | "en" | "ja";
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExpressionsScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<ExpressionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await listExpressions(filter === "all" ? undefined : filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : "표현 카드를 불러오지 못했어요.");
    }
  }, [filter]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const remove = (row: ExpressionRow) => {
    Alert.alert("표현 삭제", `"${row.expression}" 카드를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExpression(row.id);
            setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "en", label: "🇺🇸 English" },
    { key: "ja", label: "🇯🇵 日本語" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows === null ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <SleepyCat color={c.textMuted} />
          <Text style={styles.emptyText}>
            아직 표현 카드가 없어요.{"\n"}일기를 쓰고 번역을 눌러보면{"\n"}내 일기에서 나온
            표현들이 모여요.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>일기 쓰러 가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const open = openId === item.id;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setOpenId(open ? null : item.id)}
                onLongPress={() => remove(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.flag}>{item.lang === "en" ? "🇺🇸" : "🇯🇵"}</Text>
                  <Text style={styles.expression}>{item.expression}</Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={15}
                    color={c.textMuted}
                  />
                </View>
                <Text style={styles.meaning}>{item.meaning}</Text>
                {open ? (
                  <View style={styles.detail}>
                    <Text style={styles.example}>{item.example}</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("DayDetail", { date: item.date })}
                      hitSlop={6}
                    >
                      <Text style={styles.dateLink}>
                        {item.date} 일기에서 <Ionicons name="arrow-forward" size={11} />
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    filterRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    filterChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 3,
    },
    filterChipActive: { backgroundColor: c.primary },
    filterText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    filterTextActive: { color: c.white },
    error: { color: c.danger, fontSize: fontSizes.small, paddingHorizontal: spacing.md },
    emptyWrap: { alignItems: "center", marginTop: spacing.xl * 2, gap: spacing.md },
    emptyText: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      textAlign: "center",
      lineHeight: 21,
    },
    emptyButton: {
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
    },
    emptyButtonText: { color: c.primary, fontSize: fontSizes.small, fontWeight: "700" },
    list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: 4,
      ...cardShadow(c.shadow),
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    flag: { fontSize: 15 },
    expression: {
      flex: 1,
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
    },
    meaning: { fontSize: fontSizes.small, color: c.textMuted },
    detail: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: spacing.sm,
    },
    example: { fontSize: fontSizes.small, color: c.text, lineHeight: 21 },
    dateLink: { fontSize: fontSizes.caption, color: c.primary, fontWeight: "700" },
  });
