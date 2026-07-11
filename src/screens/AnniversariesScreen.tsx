// D-day / 기념일 관리: 추가(이모지·제목·날짜·매년 반복) + 목록 + 삭제

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  addAnniversary,
  deleteAnniversary,
  listAnniversaries,
} from "../lib/anniversaries";
import { todayKey, toDateKey, parseDateKey } from "../lib/dateUtils";
import { ddayInfo } from "../lib/dday";
import { AnniversaryRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const EMOJIS = ["🎉", "🎂", "💍", "❤️", "✈️", "🎓", "✏️", "🏆"] as const;

export function AnniversariesScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [rows, setRows] = useState<AnniversaryRow[] | null>(null);
  const [emoji, setEmoji] = useState<string>("🎉");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayKey());
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = todayKey();

  useEffect(() => {
    listAnniversaries()
      .then(setRows)
      .catch((e) =>
        Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요.")
      );
  }, []);

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert("알림", "제목을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const row = await addAnniversary({ title: title.trim(), date, repeatYearly, emoji });
      setRows((prev) => [...(prev ?? []), row]);
      setTitle("");
      setRepeatYearly(false);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: AnniversaryRow) => {
    Alert.alert("삭제", `"${row.title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAnniversary(row.id);
            setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 추가 폼 */}
      <View style={styles.form}>
        <View style={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiChip, emoji === e && styles.emojiChipActive]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="제목 (예: JLPT 시험, 엄마 생신)"
          placeholderTextColor={c.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <View style={styles.rowBetween}>
          <Text style={styles.rowLabel}>날짜</Text>
          <DateTimePicker
            value={parseDateKey(date)}
            mode="date"
            locale="ko-KR"
            onChange={(_, d) => d && setDate(toDateKey(d))}
          />
        </View>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.rowLabel}>매년 반복</Text>
            <Text style={styles.rowHint}>생일·기념일처럼 해마다 돌아오는 날</Text>
          </View>
          <Switch
            value={repeatYearly}
            onValueChange={setRepeatYearly}
            trackColor={{ true: c.primary }}
          />
        </View>
        <PrimaryButton title="추가" onPress={handleAdd} loading={saving} />
        <Text style={styles.formHint}>
          지난 날짜를 매년 반복 없이 넣으면 "만난 지 D+n"처럼 세어줘요.
        </Text>
      </View>

      {/* 목록 */}
      {rows === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>아직 등록한 디데이가 없어요.</Text>
      ) : (
        rows
          .map((r) => ({ r, dday: ddayInfo(r.date, today, r.repeat_yearly) }))
          .sort((a, b) => {
            const ka = a.dday.days >= 0 ? a.dday.days : 100000 - a.dday.days;
            const kb = b.dday.days >= 0 ? b.dday.days : 100000 - b.dday.days;
            return ka - kb;
          })
          .map(({ r, dday }) => (
            <View key={r.id} style={styles.item}>
              <Text style={styles.itemEmoji}>{r.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{r.title}</Text>
                <Text style={styles.itemDate}>
                  {r.date}
                  {r.repeat_yearly ? " · 매년" : ""}
                </Text>
              </View>
              <Text style={[styles.itemDday, dday.label === "D-DAY" && { color: c.danger }]}>
                {dday.label}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          ))
      )}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    form: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm + 2,
      marginBottom: spacing.sm,
      ...cardShadow(c.shadow),
    },
    emojiRow: { flexDirection: "row", gap: spacing.xs + 2 },
    emojiChip: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    emojiChipActive: { borderWidth: 2, borderColor: c.primary },
    emojiText: { fontSize: 17 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowLabel: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    rowHint: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
    formHint: { fontSize: fontSizes.caption, color: c.textMuted, textAlign: "center" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    itemEmoji: { fontSize: 20 },
    itemTitle: { fontSize: fontSizes.body, fontWeight: "700", color: c.text },
    itemDate: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
    itemDday: { fontSize: fontSizes.body, fontWeight: "900", color: c.primary },
  });
