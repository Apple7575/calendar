// 운동 기록: 종류 칩 + 내용으로 빠르게 남기고, 히스토리와 주간/월간 횟수를 본다.
// 데이터는 생활 기록(daily_logs, kind=workout)과 공유 — 하루 정리 리포트에도 들어간다.

import { Barbell } from "phosphor-react-native/src/icons/Barbell";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { addDays, formatKoreanDate, todayKey, weekStartOf } from "../lib/dateUtils";
import { addLog, deleteLog, listLogsByKind } from "../lib/dailyLogs";
import { tapSuccess } from "../lib/haptics";
import { DailyLogRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const TYPES = ["헬스", "러닝", "수영", "자전거", "홈트", "요가", "등산", "기타"] as const;

export function WorkoutScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [rows, setRows] = useState<DailyLogRow[] | null>(null);
  const [type, setType] = useState<string>("헬스");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const today = todayKey();

  useEffect(() => {
    listLogsByKind("workout", addDays(today, -60), today)
      .then(setRows)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  }, [today]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const text = detail.trim() ? `${type} · ${detail.trim()}` : type;
      const row = await addLog(today, "workout", text);
      setRows((prev) => [row, ...(prev ?? [])]);
      setDetail("");
      tapSuccess();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "기록에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: DailyLogRow) => {
    Alert.alert("삭제", "이 운동 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLog(row.id);
            setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const weekStart = weekStartOf(today);
  const weekCount = new Set(
    (rows ?? []).filter((r) => r.date >= weekStart).map((r) => r.date)
  ).size;
  const monthCount = new Set(
    (rows ?? []).filter((r) => r.date.startsWith(today.slice(0, 7))).map((r) => r.date)
  ).size;

  // 날짜별 그룹 (최신부터)
  const byDate = useMemo(() => {
    const map = new Map<string, DailyLogRow[]>();
    for (const r of rows ?? []) map.set(r.date, [...(map.get(r.date) ?? []), r]);
    return [...map.entries()];
  }, [rows]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 통계 */}
      <View style={styles.statsCard}>
        <Barbell size={22} weight="duotone" color="#FF8A4C" />
        <Text style={styles.statsText}>
          이번 주 <Text style={styles.statsNum}>{weekCount}</Text>일 · 이번 달{" "}
          <Text style={styles.statsNum}>{monthCount}</Text>일 운동했어요
        </Text>
      </View>

      {/* 오늘 기록 추가 */}
      <View style={styles.form}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="내용 (예: 가슴+어깨 50분, 5km 30분)"
            placeholderTextColor={c.textMuted}
            value={detail}
            onChangeText={setDetail}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={c.white} />
            ) : (
              <Text style={styles.addText}>오늘 기록</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 히스토리 */}
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : byDate.length === 0 ? (
        <Text style={styles.empty}>
          아직 운동 기록이 없어요.{"\n"}오늘 한 운동부터 남겨보세요 — 하루 정리 리포트에도
          들어가요.
        </Text>
      ) : (
        byDate.map(([date, items]) => (
          <View key={date} style={styles.daySection}>
            <Text style={styles.dayTitle}>
              {date === today ? "오늘" : formatKoreanDate(date)}
            </Text>
            {items.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.itemRow}
                onLongPress={() => handleDelete(r)}
              >
                <View style={styles.itemDot} />
                <Text style={styles.itemText}>{r.value_text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
      {byDate.length > 0 ? <Text style={styles.hint}>길게 누르면 삭제해요.</Text> : null}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    statsCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    statsText: { fontSize: fontSizes.small, color: c.text, fontWeight: "600" },
    statsNum: { fontSize: fontSizes.body, fontWeight: "900", color: "#FF8A4C" },
    form: { gap: spacing.sm },
    typeRow: { flexDirection: "row", gap: spacing.xs + 2 },
    typeChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    typeChipActive: { backgroundColor: "#FF8A4C" },
    typeText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    typeTextActive: { color: "#FFFFFF" },
    addRow: { flexDirection: "row", gap: spacing.sm },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.small,
      color: c.text,
    },
    addButton: {
      backgroundColor: "#FF8A4C",
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    addText: { color: "#FFFFFF", fontSize: fontSizes.small, fontWeight: "800" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
      lineHeight: 21,
    },
    daySection: { marginTop: spacing.xs },
    dayTitle: {
      fontSize: fontSizes.small,
      fontWeight: "800",
      color: c.text,
      marginBottom: spacing.xs,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      marginBottom: spacing.xs,
    },
    itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF8A4C" },
    itemText: { flex: 1, fontSize: fontSizes.small, color: c.text },
    hint: { textAlign: "center", fontSize: fontSizes.caption, color: c.textMuted },
  });
