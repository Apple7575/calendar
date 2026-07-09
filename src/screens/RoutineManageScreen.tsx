import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
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
import { Section } from "../components/Section";
import {
  addRoutine,
  deleteRoutine,
  listRoutines,
  setRoutineActive,
} from "../lib/routines";
import { RoutineRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function repeatLabel(days: number[]): string {
  if (days.length === 0 || days.length === 7) return "매일";
  return days.map((d) => WEEKDAYS[d]).join("·");
}

export function RoutineManageScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async () => {
    try {
      setRoutines(await listRoutines());
    } catch (e) {
      setError(e instanceof Error ? e.message : "루틴을 불러오지 못했어요.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert("알림", "루틴 이름을 입력해 주세요.");
      return;
    }
    setAdding(true);
    try {
      await addRoutine(trimmed, days);
      setTitle("");
      setDays([]);
      await reload();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "루틴 추가에 실패했어요.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (r: RoutineRow) => {
    Alert.alert("루틴 삭제", `"${r.title}" 루틴과 기록을 모두 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoutine(r.id);
            await reload();
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (r: RoutineRow, active: boolean) => {
    try {
      await setRoutineActive(r.id, active);
      await reload();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "변경에 실패했어요.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Section title="새 루틴">
        <TextInput
          style={styles.input}
          placeholder="예: 아침 운동, 영양제 먹기"
          placeholderTextColor={c.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <Text style={styles.dayLabel}>
          반복 요일 <Text style={styles.dayHint}>(선택 안 하면 매일)</Text>
        </Text>
        <View style={styles.dayRow}>
          {WEEKDAYS.map((label, d) => {
            const selected = days.includes(d);
            return (
              <TouchableOpacity
                key={label}
                style={[styles.dayChip, selected && styles.dayChipSelected]}
                onPress={() => toggleDay(d)}
              >
                <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <PrimaryButton title="루틴 추가" onPress={handleAdd} loading={adding} />
      </Section>

      <Section title="내 루틴">
        {routines.length === 0 ? (
          <Text style={styles.emptyText}>아직 루틴이 없어요.</Text>
        ) : (
          routines.map((r) => (
            <View key={r.id} style={styles.routineRow}>
              <View style={styles.routineBody}>
                <Text style={[styles.routineTitle, !r.active && styles.routineInactive]}>
                  {r.title}
                </Text>
                <Text style={styles.routineRepeat}>{repeatLabel(r.repeat_days)}</Text>
              </View>
              <Switch
                value={r.active}
                onValueChange={(v) => handleToggleActive(r, v)}
                trackColor={{ true: c.primary }}
              />
              <TouchableOpacity onPress={() => handleDelete(r)} hitSlop={8}>
                <Ionicons name="trash-outline" size={19} color={c.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </Section>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    error: { color: c.danger, fontSize: fontSizes.small, marginBottom: spacing.sm },
    emptyText: { color: c.textMuted, fontSize: fontSizes.small },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    dayLabel: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    dayHint: { fontWeight: "400", color: c.textMuted, fontSize: fontSizes.caption },
    dayRow: { flexDirection: "row", gap: spacing.xs + 2, marginBottom: spacing.md },
    dayChip: {
      flex: 1,
      aspectRatio: 1,
      maxWidth: 44,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.inputBg,
    },
    dayChipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    dayChipText: { fontSize: fontSizes.small, color: c.text, fontWeight: "600" },
    dayChipTextSelected: { color: c.white },
    routineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm,
    },
    routineBody: { flex: 1 },
    routineTitle: { fontSize: fontSizes.body, color: c.text, fontWeight: "600" },
    routineInactive: { color: c.textMuted, textDecorationLine: "line-through" },
    routineRepeat: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
  });
