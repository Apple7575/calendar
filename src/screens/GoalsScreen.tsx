// 목표 · 갓생: 방면별(커리어/꿈/돈/집…) 목표 관리 + AI 갓생 코칭.
// 코칭은 목표 + 최근 2주 기록(수면/에너지/루틴/할일)을 근거로 쓰며 주 단위로 캐시된다.

import { CheckCircle } from "phosphor-react-native/src/icons/CheckCircle";
import { CircleDashed } from "phosphor-react-native/src/icons/CircleDashed";
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
import { PrimaryButton } from "../components/PrimaryButton";
import { generateReport, getCachedReport } from "../lib/aiReports";
import { todayKey, weekStartOf } from "../lib/dateUtils";
import {
  addGoal,
  categoryOf,
  checkinSummary,
  deleteGoal,
  GOAL_CATEGORIES,
  listGoals,
  setGoalDone,
} from "../lib/goals";
import { tapLight, tapSuccess } from "../lib/haptics";
import { GoalRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

export function GoalsScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [goals, setGoals] = useState<GoalRow[] | null>(null);
  const [category, setCategory] = useState("career");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  // 갓생 코칭
  const [coach, setCoach] = useState<string | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [checkins, setCheckins] = useState<
    Record<string, { count: number; lastNote: string; lastDate: string }>
  >({});
  const weekKey = weekStartOf(todayKey());

  useEffect(() => {
    listGoals()
      .then(setGoals)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
    getCachedReport("coach", weekKey).then(setCoach).catch(() => {});
    checkinSummary().then(setCheckins).catch(() => {});
  }, [weekKey]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const row = await addGoal(category, title.trim());
      setGoals((prev) => [...(prev ?? []), row]);
      setTitle("");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (goal: GoalRow) => {
    const done = !goal.done;
    if (done) tapSuccess();
    setGoals((prev) => (prev ?? []).map((g) => (g.id === goal.id ? { ...g, done } : g)));
    try {
      await setGoalDone(goal.id, done);
    } catch (e) {
      setGoals((prev) => (prev ?? []).map((g) => (g.id === goal.id ? { ...g, done: !done } : g)));
      Alert.alert("오류", e instanceof Error ? e.message : "상태 변경에 실패했어요.");
    }
  };

  const handleDelete = (goal: GoalRow) => {
    Alert.alert("목표 삭제", `"${goal.title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(goal.id);
            setGoals((prev) => (prev ?? []).filter((g) => g.id !== goal.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const handleCoach = async (force: boolean) => {
    setCoaching(true);
    try {
      setCoach(await generateReport("coach", weekKey, force));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "코칭 생성에 실패했어요.");
    } finally {
      setCoaching(false);
    }
  };

  const byCategory = GOAL_CATEGORIES.map((cat) => ({
    cat,
    items: (goals ?? []).filter((g) => g.category === cat.key),
  })).filter(({ items }) => items.length > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 갓생 코칭 */}
      <View style={styles.coachCard}>
        <Text style={styles.coachTitle}>🏆 갓생 코칭</Text>
        <Text style={styles.coachHint}>
          내 목표와 최근 2주 기록(수면·에너지·루틴·할일)을 탑클래스 습관과 비교해서{"\n"}
          지금 뭘 더 하면 되는지 알려줘요. 주마다 새로 받아보세요.
        </Text>
        {coaching ? (
          <View style={styles.coachLoading}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.coachHint}>기록을 분석하는 중… 수십 초 걸릴 수 있어요 ☕</Text>
          </View>
        ) : coach ? (
          <>
            <View style={styles.coachBody}>
              {coach.split("\n").map((line, i) =>
                line.startsWith("## ") ? (
                  <Text key={i} style={styles.coachHeading}>
                    {line.slice(3)}
                  </Text>
                ) : line.trim() === "" ? (
                  <View key={i} style={{ height: spacing.xs }} />
                ) : (
                  <Text key={i} style={styles.coachText}>
                    {line}
                  </Text>
                )
              )}
            </View>
            <PrimaryButton title="다시 코칭 받기" variant="secondary" onPress={() => handleCoach(true)} />
          </>
        ) : (
          <PrimaryButton title="이번 주 코칭 받기" onPress={() => handleCoach(false)} />
        )}
      </View>

      {/* 목표 추가 */}
      <View style={styles.form}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.catRow}>
            {GOAL_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, category === cat.key && styles.catChipActive]}
                onPress={() => {
                  tapLight();
                  setCategory(cat.key);
                }}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text
                  style={[styles.catLabel, category === cat.key && styles.catLabelActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder={`${categoryOf(category).label} 목표 (예: 올해 JLPT N2 합격)`}
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
              <Text style={styles.addButtonText}>추가</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 방면별 목표 목록 */}
      {goals === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : goals.length === 0 ? (
        <Text style={styles.empty}>
          아직 목표가 없어요.{"\n"}직장, 꿈, 돈, 집… 방면별로 이루고 싶은 것을 적어보세요.
        </Text>
      ) : (
        byCategory.map(({ cat, items }) => (
          <View key={cat.key} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {cat.emoji} {cat.label}
              <Text style={styles.sectionCount}>
                {"  "}
                {items.filter((g) => g.done).length}/{items.length}
              </Text>
            </Text>
            {items.map((g) => (
              <View key={g.id} style={styles.goalRow}>
                <TouchableOpacity onPress={() => handleToggle(g)} hitSlop={8}>
                  {g.done ? (
                    <CheckCircle size={22} weight="fill" color={c.success} />
                  ) : (
                    <CircleDashed size={22} weight="bold" color={c.primary} />
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalTitle, g.done && styles.goalDone]}>{g.title}</Text>
                  {checkins[g.id] ? (
                    <Text style={styles.goalProgress}>
                      진전 {checkins[g.id].count}회 · {checkins[g.id].lastDate.slice(5)}:{" "}
                      {checkins[g.id].lastNote}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => handleDelete(g)} hitSlop={8}>
                  <Trash size={16} color={c.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
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
    coachCard: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    coachTitle: { fontSize: fontSizes.emphasis, fontWeight: "900", color: c.text },
    coachHint: { fontSize: fontSizes.caption, color: c.textMuted, lineHeight: 17 },
    coachLoading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
    coachBody: { gap: 2 },
    coachHeading: {
      fontSize: fontSizes.body,
      fontWeight: "800",
      color: c.primary,
      marginTop: spacing.sm,
    },
    coachText: { fontSize: fontSizes.small, color: c.text, lineHeight: 22 },
    form: { gap: spacing.sm, marginTop: spacing.xs },
    catRow: { flexDirection: "row", gap: spacing.xs + 2 },
    catChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    catChipActive: { backgroundColor: c.primary },
    catEmoji: { fontSize: 13 },
    catLabel: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    catLabelActive: { color: c.white },
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
      backgroundColor: c.primary,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonText: { color: c.white, fontSize: fontSizes.small, fontWeight: "800" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
      lineHeight: 21,
    },
    section: { marginTop: spacing.sm },
    sectionTitle: {
      fontSize: fontSizes.body,
      fontWeight: "800",
      color: c.text,
      marginBottom: spacing.xs + 2,
    },
    sectionCount: { fontSize: fontSizes.caption, fontWeight: "600", color: c.textMuted },
    goalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 4,
      marginBottom: spacing.xs + 2,
    },
    goalTitle: { fontSize: fontSizes.small, color: c.text, lineHeight: 20 },
    goalProgress: { fontSize: fontSizes.caption, color: c.primary, marginTop: 1 },
    goalDone: { textDecorationLine: "line-through", color: c.textMuted },
  });
