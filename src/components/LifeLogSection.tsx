// 생활 기록 섹션: 식단/몸무게/걸음수/지출/학습/인바디를 그날에 기록한다.
// DayOverview 안에 들어가며 자체적으로 데이터를 관리한다.

import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
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
import {
  addLog,
  addLogsFromText,
  deleteLog,
  formatLog,
  listLogs,
  LOG_KINDS,
  logKindOf,
} from "../lib/dailyLogs";
import { tapLight, tapSuccess } from "../lib/haptics";
import { MicButton } from "./MicButton";
import { DailyLogRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";
import { Section } from "./Section";

export function LifeLogSection({ dateKey }: { dateKey: string }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [kind, setKind] = useState("meal");
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listLogs(dateKey).then(setLogs).catch(() => {});
    }, [dateKey])
  );

  const handleAdd = async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      const row = await addLog(dateKey, kind, input);
      setLogs((prev) => [...prev, row]);
      setInput("");
      tapLight();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "기록에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: DailyLogRow) => {
    Alert.alert("기록 삭제", `${logKindOf(row.kind).label} 기록을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLog(row.id);
            setLogs((prev) => prev.filter((l) => l.id !== row.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const selected = logKindOf(kind);

  // 말 한마디 → 여러 기록 자동 분류 저장
  const handleSpeech = async (text: string) => {
    try {
      const saved = await addLogsFromText(dateKey, text);
      setLogs((prev) => [...prev, ...saved]);
      tapSuccess();
      Alert.alert(
        "기록 완료",
        saved.map((r) => `${logKindOf(r.kind).emoji} ${logKindOf(r.kind).label}: ${formatLog(r)}`).join("\n")
      );
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "기록에 실패했어요.");
    }
  };

  return (
    <Section
      title="생활 기록"
      right={<MicButton size={30} onText={handleSpeech} />}
    >
      {logs.map((row) => {
        const k = logKindOf(row.kind);
        return (
          <TouchableOpacity
            key={row.id}
            style={styles.logRow}
            onLongPress={() => handleDelete(row)}
          >
            <Text style={styles.logEmoji}>{k.emoji}</Text>
            <Text style={styles.logKind}>{k.label}</Text>
            <Text style={styles.logValue} numberOfLines={2}>
              {formatLog(row)}
            </Text>
          </TouchableOpacity>
        );
      })}
      {logs.length > 0 ? (
        <Text style={styles.hint}>길게 누르면 삭제해요.</Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.kindRow}>
          {LOG_KINDS.map((k) => (
            <TouchableOpacity
              key={k.key}
              style={[styles.kindChip, kind === k.key && styles.kindChipActive]}
              onPress={() => setKind(k.key)}
            >
              <Text style={styles.kindEmoji}>{k.emoji}</Text>
              <Text style={[styles.kindLabel, kind === k.key && styles.kindLabelActive]}>
                {k.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder={selected.placeholder}
          placeholderTextColor={c.textMuted}
          value={input}
          onChangeText={setInput}
          keyboardType={selected.numeric ? "numbers-and-punctuation" : "default"}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !input.trim() && { opacity: 0.4 }]}
          onPress={handleAdd}
          disabled={saving || !input.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color={c.white} />
          ) : (
            <Text style={styles.addText}>기록</Text>
          )}
        </TouchableOpacity>
      </View>
    </Section>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    logRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs + 3,
    },
    logEmoji: { fontSize: 15 },
    logKind: { fontSize: fontSizes.small, fontWeight: "800", color: c.text, width: 56 },
    logValue: { flex: 1, fontSize: fontSizes.small, color: c.text },
    hint: { fontSize: fontSizes.caption, color: c.textMuted, marginBottom: spacing.xs },
    kindRow: { flexDirection: "row", gap: spacing.xs + 2, marginVertical: spacing.xs + 2 },
    kindChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2,
    },
    kindChipActive: { backgroundColor: c.primary },
    kindEmoji: { fontSize: 12 },
    kindLabel: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    kindLabelActive: { color: c.white },
    addRow: { flexDirection: "row", gap: spacing.sm },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      fontSize: fontSizes.small,
      color: c.text,
    },
    addButton: {
      backgroundColor: c.primary,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    addText: { color: c.white, fontSize: fontSizes.small, fontWeight: "800" },
  });
