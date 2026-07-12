// 인생 타임라인: 연도별 큰 사건을 세로 타임라인으로 기록·조회

import { Trash } from "phosphor-react-native/src/icons/Trash";
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
import { addLifeEvent, deleteLifeEvent, listLifeEvents } from "../lib/lifeEvents";
import { LifeEventRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const EMOJIS = ["⭐", "🎓", "💼", "🏠", "✈️", "❤️", "🏆", "🌱"] as const;

export function TimelineScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [rows, setRows] = useState<LifeEventRow[] | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [emoji, setEmoji] = useState<string>("⭐");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listLifeEvents()
      .then(setRows)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  }, []);

  const handleAdd = async () => {
    const y = Number(year);
    if (!title.trim() || !Number.isInteger(y) || y < 1900 || y > 2200) {
      Alert.alert("알림", "연도(예: 2026)와 내용을 확인해 주세요.");
      return;
    }
    // 월은 선택 — 비우거나 범위 밖이면 연 단위 사건
    const m = Number(month);
    const monthValue = Number.isInteger(m) && m >= 1 && m <= 12 ? m : null;
    setSaving(true);
    try {
      const row = await addLifeEvent(y, monthValue, emoji, title.trim());
      setRows((prev) => [row, ...(prev ?? [])]);
      setTitle("");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: LifeEventRow) => {
    Alert.alert("삭제", `"${row.title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLifeEvent(row.id);
            setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  // 연도별 그룹 (최신 연도부터, 연도 안에서는 최신 월부터)
  const byYear = useMemo(() => {
    const map = new Map<number, LifeEventRow[]>();
    for (const r of rows ?? []) {
      map.set(r.year, [...(map.get(r.year) ?? []), r]);
    }
    for (const items of map.values()) {
      items.sort((a, b) => (b.month ?? 0) - (a.month ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [rows]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 추가 폼 */}
      <View style={styles.form}>
        <View style={styles.formRow}>
          <TextInput
            style={styles.yearInput}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TextInput
            style={styles.monthInput}
            value={month}
            onChangeText={setMonth}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="월"
            placeholderTextColor={c.textMuted}
          />
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiChip, emoji === e && styles.emojiChipActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 15 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.formRow}>
          <TextInput
            style={styles.titleInput}
            placeholder="그 해의 큰 사건 (예: 첫 취업, 도쿄 여행)"
            placeholderTextColor={c.textMuted}
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, !title.trim() && { opacity: 0.4 }]}
            onPress={handleAdd}
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <ActivityIndicator size="small" color={c.white} />
            ) : (
              <Text style={styles.addText}>추가</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 타임라인 */}
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : byYear.length === 0 ? (
        <Text style={styles.empty}>
          아직 기록이 없어요.{"\n"}입학, 취업, 이사, 여행… 인생의 큰 순간들을 남겨보세요.
        </Text>
      ) : (
        byYear.map(([y, items]) => (
          <View key={y} style={styles.yearBlock}>
            <View style={styles.yearHeader}>
              <View style={styles.yearDot} />
              <Text style={styles.yearText}>{y}</Text>
            </View>
            <View style={styles.yearBody}>
              {items.map((r) => (
                <View key={r.id} style={styles.eventRow}>
                  <Text style={styles.eventEmoji}>{r.emoji}</Text>
                  {r.month ? <Text style={styles.eventMonth}>{r.month}월</Text> : null}
                  <Text style={styles.eventTitle}>{r.title}</Text>
                  <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={8}>
                    <Trash size={15} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    form: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.md,
      ...cardShadow(c.shadow),
    },
    formRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    monthInput: {
      width: 46,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingVertical: spacing.sm,
      textAlign: "center",
      fontSize: fontSizes.body,
      fontWeight: "800",
      color: c.text,
    },
    eventMonth: { fontSize: fontSizes.caption, fontWeight: "800", color: c.primary, width: 30 },
    yearInput: {
      width: 72,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingVertical: spacing.sm,
      textAlign: "center",
      fontSize: fontSizes.body,
      fontWeight: "800",
      color: c.text,
    },
    emojiRow: { flexDirection: "row", gap: 4, flex: 1, flexWrap: "wrap" },
    emojiChip: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    emojiChipActive: { borderWidth: 2, borderColor: c.primary },
    titleInput: {
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
      backgroundColor: c.primary,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
    },
    addText: { color: c.white, fontSize: fontSizes.small, fontWeight: "800" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.xl,
      lineHeight: 21,
    },
    yearBlock: { flexDirection: "row", gap: spacing.sm + 2 },
    yearHeader: { alignItems: "center", width: 56 },
    yearDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
      marginTop: 6,
    },
    yearText: { fontSize: fontSizes.body, fontWeight: "900", color: c.primary, marginTop: 2 },
    yearBody: {
      flex: 1,
      borderLeftWidth: 2,
      borderLeftColor: c.border,
      paddingLeft: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    eventRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
    },
    eventEmoji: { fontSize: 16 },
    eventTitle: { flex: 1, fontSize: fontSizes.small, color: c.text, lineHeight: 20 },
  });
