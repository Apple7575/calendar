// 운동 기록 (헬스 앱 스타일): 종목별로 오늘 몇 개 했는지 기록하고,
// 지난 기록 대비 변화와 최근 추이(미니 막대)를 본다.
// 기본 종목은 탭 한 번으로 추가, 필요한 종목은 직접 만든다.

import { Barbell } from "phosphor-react-native/src/icons/Barbell";
import { CaretDown } from "phosphor-react-native/src/icons/CaretDown";
import { CaretUp } from "phosphor-react-native/src/icons/CaretUp";
import { Plus } from "phosphor-react-native/src/icons/Plus";
import { TrendUp } from "phosphor-react-native/src/icons/TrendUp";
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
import { todayKey } from "../lib/dateUtils";
import { tapSuccess } from "../lib/haptics";
import {
  addExercise,
  addRecord,
  dailyTotals,
  DEFAULT_EXERCISES,
  deleteExercise,
  deleteRecord,
  ExerciseRow,
  listExercises,
  listRecentRecords,
  WorkoutRecordRow,
} from "../lib/workouts";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const ACCENT = "#FF8A4C";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <View style={spark.row}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            spark.bar,
            {
              height: Math.max(3, (v / max) * 26),
              backgroundColor: color,
              opacity: i === values.length - 1 ? 1 : 0.45,
            },
          ]}
        />
      ))}
    </View>
  );
}
const spark = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 26 },
  bar: { width: 7, borderRadius: 2 },
});

export function WorkoutScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [exercises, setExercises] = useState<ExerciseRow[] | null>(null);
  const [records, setRecords] = useState<WorkoutRecordRow[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("개");
  const [showAdd, setShowAdd] = useState(false);
  const today = todayKey();

  const reload = () => {
    listExercises()
      .then(setExercises)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
    listRecentRecords().then(setRecords).catch(() => {});
  };
  useEffect(reload, []);

  const handleQuickAddDefault = async (name: string, unit: string) => {
    try {
      const row = await addExercise(name, unit);
      setExercises((prev) => [...(prev ?? []), row]);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "추가에 실패했어요.");
    }
  };

  const handleAddCustom = async () => {
    if (!newName.trim()) return;
    try {
      const row = await addExercise(newName, newUnit);
      setExercises((prev) => [...(prev ?? []), row]);
      setNewName("");
      setShowAdd(false);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "추가에 실패했어요.");
    }
  };

  const handleRecord = async (ex: ExerciseRow) => {
    const raw = (inputs[ex.id] ?? "").trim();
    const value = Number(raw.replace(/,/g, ""));
    if (!raw || Number.isNaN(value) || value <= 0) {
      Alert.alert("알림", `${ex.name} 기록을 숫자로 입력해 주세요.`);
      return;
    }
    try {
      const row = await addRecord(ex.id, today, value);
      setRecords((prev) => [{ ...row, value }, ...prev]);
      setInputs((prev) => ({ ...prev, [ex.id]: "" }));
      tapSuccess();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "기록에 실패했어요.");
    }
  };

  const handleDeleteExercise = (ex: ExerciseRow) => {
    Alert.alert("종목 삭제", `"${ex.name}"과(와) 그 기록 전체를 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExercise(ex.id);
            setExercises((prev) => (prev ?? []).filter((e) => e.id !== ex.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const myNames = new Set((exercises ?? []).map((e) => e.name));
  const suggestions = DEFAULT_EXERCISES.filter((d) => !myNames.has(d.name));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {exercises === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <>
          {exercises.length === 0 ? (
            <View style={styles.emptyCard}>
              <Barbell size={30} weight="duotone" color={ACCENT} />
              <Text style={styles.emptyText}>
                기록할 종목을 추가해 보세요.{"\n"}풀업 5개부터 — 숫자가 늘어나는 재미가 있어요.
              </Text>
            </View>
          ) : null}

          {/* 내 종목 카드들 */}
          {exercises.map((ex) => {
            const series = dailyTotals(records, ex.id);
            const todayTotal = series.find((s) => s.date === today)?.total ?? 0;
            const past = series.filter((s) => s.date !== today);
            const lastPast = past.length > 0 ? past[past.length - 1] : null;
            const diff = lastPast !== null && todayTotal > 0 ? todayTotal - lastPast.total : null;
            const recent = series.slice(-7).map((s) => s.total);
            const best = series.reduce((m, s) => Math.max(m, s.total), 0);
            const isOpen = expanded === ex.id;
            return (
              <View key={ex.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setExpanded(isOpen ? null : ex.id)}
                >
                  <Text style={styles.exName}>{ex.name}</Text>
                  <View style={styles.headRight}>
                    {recent.length > 1 ? <Sparkline values={recent} color={ACCENT} /> : null}
                    {isOpen ? (
                      <CaretUp size={14} weight="bold" color={c.textMuted} />
                    ) : (
                      <CaretDown size={14} weight="bold" color={c.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.statRow}>
                  <Text style={styles.statText}>
                    오늘 <Text style={styles.statNum}>{todayTotal}</Text>
                    {ex.unit}
                  </Text>
                  <Text style={styles.statText}>
                    지난 기록{" "}
                    <Text style={styles.statNum}>{lastPast ? lastPast.total : "–"}</Text>
                    {lastPast ? ex.unit : ""}
                  </Text>
                  <Text style={styles.statText}>
                    최고 <Text style={styles.statNum}>{best || "–"}</Text>
                    {best ? ex.unit : ""}
                  </Text>
                  {diff !== null && diff !== 0 ? (
                    <View style={styles.diffChip}>
                      <TrendUp
                        size={11}
                        weight="bold"
                        color={diff > 0 ? "#2FA36B" : "#E8637E"}
                      />
                      <Text
                        style={[
                          styles.diffText,
                          { color: diff > 0 ? "#2FA36B" : "#E8637E" },
                        ]}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* 빠른 기록 */}
                <View style={styles.recordRow}>
                  <TextInput
                    style={styles.recordInput}
                    placeholder={`몇 ${ex.unit}?`}
                    placeholderTextColor={c.textMuted}
                    keyboardType="numbers-and-punctuation"
                    value={inputs[ex.id] ?? ""}
                    onChangeText={(t) => setInputs((prev) => ({ ...prev, [ex.id]: t }))}
                    onSubmitEditing={() => handleRecord(ex)}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.recordButton} onPress={() => handleRecord(ex)}>
                    <Text style={styles.recordButtonText}>+ 기록</Text>
                  </TouchableOpacity>
                </View>

                {/* 펼침: 최근 기록 히스토리 */}
                {isOpen ? (
                  <View style={styles.history}>
                    {series.length === 0 ? (
                      <Text style={styles.historyEmpty}>아직 기록이 없어요.</Text>
                    ) : (
                      [...series]
                        .reverse()
                        .slice(0, 10)
                        .map((s) => (
                          <View key={s.date} style={styles.historyRow}>
                            <Text style={styles.historyDate}>{s.date.slice(5)}</Text>
                            <Text style={styles.historyValue}>
                              {s.total}
                              {ex.unit}
                            </Text>
                          </View>
                        ))
                    )}
                    <View style={styles.historyActions}>
                      <TouchableOpacity
                        onPress={() => {
                          const todayRecords = records.filter(
                            (r) => r.exercise_id === ex.id && r.date === today
                          );
                          const last = todayRecords[0];
                          if (!last) {
                            Alert.alert("알림", "오늘 기록이 없어요.");
                            return;
                          }
                          deleteRecord(last.id)
                            .then(() =>
                              setRecords((prev) => prev.filter((r) => r.id !== last.id))
                            )
                            .catch((e) =>
                              Alert.alert("오류", e instanceof Error ? e.message : "실패했어요.")
                            );
                        }}
                        hitSlop={6}
                      >
                        <Text style={styles.historyAction}>오늘 마지막 기록 취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteExercise(ex)} hitSlop={6}>
                        <Trash size={14} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* 기본 종목 제안 */}
          {suggestions.length > 0 ? (
            <>
              <Text style={styles.suggestLabel}>탭해서 종목 추가</Text>
              <View style={styles.suggestWrap}>
                {suggestions.map((d) => (
                  <TouchableOpacity
                    key={d.name}
                    style={styles.suggestChip}
                    onPress={() => handleQuickAddDefault(d.name, d.unit)}
                  >
                    <Plus size={11} weight="bold" color={ACCENT} />
                    <Text style={styles.suggestText}>
                      {d.name} ({d.unit})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          {/* 직접 추가 */}
          {showAdd ? (
            <View style={styles.addForm}>
              <TextInput
                style={[styles.recordInput, { flex: 2 }]}
                placeholder="종목 이름 (예: 딥스)"
                placeholderTextColor={c.textMuted}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={[styles.recordInput, { flex: 1 }]}
                placeholder="단위"
                placeholderTextColor={c.textMuted}
                value={newUnit}
                onChangeText={setNewUnit}
              />
              <TouchableOpacity style={styles.recordButton} onPress={handleAddCustom}>
                <Text style={styles.recordButtonText}>추가</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addToggle} onPress={() => setShowAdd(true)}>
              <Text style={styles.addToggleText}>+ 내 종목 직접 만들기</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    emptyCard: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    emptyText: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      lineHeight: 21,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    exName: { fontSize: fontSizes.body, fontWeight: "900", color: c.text },
    headRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    statRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
    statText: { fontSize: fontSizes.caption, color: c.textMuted },
    statNum: { fontSize: fontSizes.body, fontWeight: "900", color: c.text },
    diffChip: { flexDirection: "row", alignItems: "center", gap: 2 },
    diffText: { fontSize: fontSizes.caption, fontWeight: "900" },
    recordRow: { flexDirection: "row", gap: spacing.sm },
    recordInput: {
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
    recordButton: {
      backgroundColor: ACCENT,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    recordButtonText: { color: "#FFFFFF", fontSize: fontSizes.small, fontWeight: "800" },
    history: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    historyEmpty: { fontSize: fontSizes.caption, color: c.textMuted },
    historyRow: { flexDirection: "row", justifyContent: "space-between" },
    historyDate: { fontSize: fontSizes.caption, color: c.textMuted },
    historyValue: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    historyActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.xs,
    },
    historyAction: { fontSize: fontSizes.caption, color: c.danger, fontWeight: "700" },
    suggestLabel: {
      fontSize: fontSizes.caption,
      fontWeight: "800",
      color: c.textMuted,
      marginTop: spacing.sm,
    },
    suggestWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
    suggestChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    suggestText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.text },
    addForm: { flexDirection: "row", gap: spacing.sm },
    addToggle: { alignSelf: "center", padding: spacing.sm },
    addToggleText: { fontSize: fontSizes.small, color: ACCENT, fontWeight: "800" },
  });
