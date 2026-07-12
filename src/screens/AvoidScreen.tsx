// 하지 않기: 하지 말아야 할 것 목록. 어긴 날은 기록되어 이번 주 어김 횟수가 보인다.
// 어김 기록은 생활 기록(daily_logs, kind=avoid)과 공유 — 리포트에도 들어간다.

import { Prohibit } from "phosphor-react-native/src/icons/Prohibit";
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
import { addLog, deleteLog, listLogsByKind } from "../lib/dailyLogs";
import { addDays, todayKey, weekStartOf } from "../lib/dateUtils";
import { tapLight } from "../lib/haptics";
import { DailyLogRow, supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const ACCENT = "#D9534F";

type AvoidItem = { id: string; title: string };

export function AvoidScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [items, setItems] = useState<AvoidItem[] | null>(null);
  const [violations, setViolations] = useState<DailyLogRow[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const today = todayKey();
  const weekStart = weekStartOf(today);

  const reload = () => {
    supabase
      .from("avoid_items")
      .select("id, title")
      .order("position")
      .order("created_at")
      .then(({ data, error }) => {
        if (error) Alert.alert("오류", `불러오지 못했어요: ${error.message}`);
        else setItems((data ?? []) as AvoidItem[]);
      });
    listLogsByKind("avoid", addDays(today, -30), today)
      .then(setViolations)
      .catch(() => {});
  };
  useEffect(reload, []);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("avoid_items")
      .insert({ user_id: userData.user?.id, title })
      .select("id, title")
      .single();
    if (error) {
      Alert.alert("오류", error.code === "23505" ? "이미 있는 항목이에요." : error.message);
      return;
    }
    setItems((prev) => [...(prev ?? []), data as AvoidItem]);
    setNewTitle("");
  };

  const handleDelete = (item: AvoidItem) => {
    Alert.alert("삭제", `"${item.title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await supabase.from("avoid_items").delete().eq("id", item.id);
          setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
        },
      },
    ]);
  };

  /** 오늘 어김 토글 */
  const toggleToday = async (item: AvoidItem) => {
    tapLight();
    const existing = violations.find((v) => v.date === today && v.value_text === item.title);
    try {
      if (existing) {
        await deleteLog(existing.id);
        setViolations((prev) => prev.filter((v) => v.id !== existing.id));
      } else {
        const row = await addLog(today, "avoid", item.title);
        setViolations((prev) => [row, ...prev]);
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "기록에 실패했어요.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.introCard}>
        <Prohibit size={22} weight="duotone" color={ACCENT} />
        <Text style={styles.introText}>
          갓생은 하는 것만큼 <Text style={{ fontWeight: "900" }}>안 하는 것</Text>도 중요해요.
          {"\n"}어긴 날만 솔직하게 체크 — 리포트와 코칭에 반영돼요.
        </Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="예: 새벽 폰 보기, 야식, 충동구매"
          placeholderTextColor={c.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addText}>추가</Text>
        </TouchableOpacity>
      </View>

      {items === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>끊고 싶은 습관을 적어보세요.</Text>
      ) : (
        items.map((item) => {
          const todayViolated = violations.some(
            (v) => v.date === today && v.value_text === item.title
          );
          const weekCount = new Set(
            violations
              .filter((v) => v.date >= weekStart && v.value_text === item.title)
              .map((v) => v.date)
          ).size;
          return (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {weekCount === 0 ? "이번 주 무결점 ✨" : `이번 주 ${weekCount}번 어김`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.todayButton, todayViolated && styles.todayButtonBad]}
                onPress={() => toggleToday(item)}
              >
                <Text style={[styles.todayText, todayViolated && styles.todayTextBad]}>
                  {todayViolated ? "오늘 어김 😔" : "오늘 지킴 ✓"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                <Trash size={15} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    introCard: {
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
    introText: { flex: 1, fontSize: fontSizes.caption, color: c.textMuted, lineHeight: 18 },
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
      backgroundColor: ACCENT,
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
    },
    itemTitle: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    itemMeta: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
    todayButton: {
      backgroundColor: "#DEF5E9",
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    todayButtonBad: { backgroundColor: "#FFE3E1" },
    todayText: { fontSize: fontSizes.caption, fontWeight: "800", color: "#2FA36B" },
    todayTextBad: { color: ACCENT },
  });
