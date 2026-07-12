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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { todayKey } from "../lib/dateUtils";
import { tapLight } from "../lib/haptics";
import {
  addRoutine,
  deleteRoutine,
  listCheckedRoutineIds,
  listRoutines,
  routinesForDate,
  setRoutineActive,
  setRoutineChecked,
} from "../lib/routines";
import { RootStackParamList } from "../navigation/types";
import { RoutineRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const SLOTS = [
  { key: "morning", label: "🌅 아침" },
  { key: "evening", label: "🌙 저녁" },
  { key: "any", label: "기타" },
] as const;

export function slotLabel(slot: string): string {
  return SLOTS.find((s) => s.key === slot)?.label ?? "기타";
}

// 갓생 사는 사람들의 루틴 프리셋 — 한 번에 추가하고 취향대로 수정
const MORNING_PRESET = [
  "이불 정리하기", // 맥레이븐 제독 "Make Your Bed"
  "물 한 컵 마시기",
  "아침 햇빛 쬐기 5분", // 후버만 — 기상 직후 햇빛
  "스트레칭·가벼운 운동 10분",
  "찬물 샤워",
  "오늘의 최우선 3가지 적기", // 성공인들의 공통 습관
];
const EVENING_PRESET = [
  "저녁 이후 폰 방해금지 모드",
  "따뜻한 샤워",
  "내일 할 일 3개 적어두기",
  "명상 10분",
  "독서 20분",
  "감사한 일 1가지 + 일기",
];

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
  const [slot, setSlot] = useState<string>("morning");
  const [adding, setAdding] = useState(false);
  const [addingPreset, setAddingPreset] = useState(false);

  const addPreset = async (presetSlot: string, titles: string[]) => {
    setAddingPreset(true);
    try {
      const existing = new Set(routines.map((r) => r.title));
      for (const t of titles) {
        if (!existing.has(t)) await addRoutine(t, [], presetSlot);
      }
      await reload();
      Alert.alert("추가 완료", "세트가 들어갔어요. 필요 없는 건 지우고 취향대로 고치세요.");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "추가에 실패했어요.");
    } finally {
      setAddingPreset(false);
    }
  };

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const today = todayKey();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    try {
      setRoutines(await listRoutines());
      setChecked(await listCheckedRoutineIds(today));
    } catch (e) {
      setError(e instanceof Error ? e.message : "루틴을 불러오지 못했어요.");
    }
  }, [today]);

  /** 오늘 체크 토글 */
  const toggleToday = async (r: RoutineRow) => {
    const next = !checked.has(r.id);
    if (next) tapLight();
    setChecked((prev) => {
      const s = new Set(prev);
      if (next) s.add(r.id);
      else s.delete(r.id);
      return s;
    });
    try {
      await setRoutineChecked(r.id, today, next);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "체크에 실패했어요.");
    }
  };

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
      await addRoutine(trimmed, days, slot);
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

      {/* 오늘 체크 + 플레이어 */}
      <Section
        title="오늘"
        right={
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            {routinesForDate(routines, today).some((r) => r.time_slot === "morning") ? (
              <TouchableOpacity
                onPress={() => navigation.navigate("RoutinePlayer", { slot: "morning" })}
                hitSlop={8}
              >
                <Text style={styles.startLink}>🌅 아침 시작</Text>
              </TouchableOpacity>
            ) : null}
            {routinesForDate(routines, today).some((r) => r.time_slot === "evening") ? (
              <TouchableOpacity
                onPress={() => navigation.navigate("RoutinePlayer", { slot: "evening" })}
                hitSlop={8}
              >
                <Text style={styles.startLink}>🌙 저녁 시작</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      >
        {routinesForDate(routines, today).length === 0 ? (
          <Text style={styles.emptyText}>오늘 할 루틴이 없어요.</Text>
        ) : (
          routinesForDate(routines, today).map((r) => {
            const isChecked = checked.has(r.id);
            return (
              <TouchableOpacity
                key={r.id}
                style={styles.todayRow}
                onPress={() => toggleToday(r)}
              >
                <View style={[styles.todayCheck, isChecked && styles.todayCheckDone]}>
                  {isChecked ? <Ionicons name="checkmark" size={14} color={c.white} /> : null}
                </View>
                <Text style={[styles.todayTitle, isChecked && styles.todayTitleDone]}>
                  {r.title}
                </Text>
                <Text style={styles.todaySlot}>{slotLabel(r.time_slot)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </Section>

      <Section title="갓생 루틴 세트 (탭 한 번에 추가)">
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => addPreset("morning", MORNING_PRESET)}
            disabled={addingPreset}
          >
            <Text style={styles.presetText}>🌅 모닝루틴 세트</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => addPreset("evening", EVENING_PRESET)}
            disabled={addingPreset}
          >
            <Text style={styles.presetText}>🌙 나이트루틴 세트</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.presetHint}>
          이불 정리(맥레이븐)·아침 햇빛(후버만)·최우선 3가지 등 검증된 습관들이에요. 추가 후
          자유롭게 지우고 고치세요.
        </Text>
      </Section>

      <Section title="새 루틴">
        <TextInput
          style={styles.input}
          placeholder="예: 아침 운동, 영양제 먹기"
          placeholderTextColor={c.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <Text style={styles.dayLabel}>루틴 시점</Text>
        <View style={styles.dayRow}>
          {SLOTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.slotChip, slot === s.key && styles.dayChipSelected]}
              onPress={() => setSlot(s.key)}
            >
              <Text style={[styles.dayChipText, slot === s.key && styles.dayChipTextSelected]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
                <Text style={styles.routineRepeat}>
                  {slotLabel(r.time_slot)} · {repeatLabel(r.repeat_days)}
                </Text>
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
    startLink: { fontSize: fontSizes.caption, fontWeight: "800", color: c.primary },
    todayRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm,
    },
    todayCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    todayCheckDone: { backgroundColor: c.success, borderColor: c.success },
    todayTitle: { flex: 1, fontSize: fontSizes.body, color: c.text, fontWeight: "600" },
    todayTitleDone: { color: c.textMuted, textDecorationLine: "line-through" },
    todaySlot: { fontSize: fontSizes.caption, color: c.textMuted },
    presetButton: {
      flex: 1,
      backgroundColor: c.primarySoft,
      borderRadius: radii.button,
      paddingVertical: spacing.sm + 4,
      alignItems: "center",
    },
    presetText: { color: c.primary, fontSize: fontSizes.small, fontWeight: "800" },
    presetHint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      marginTop: spacing.sm,
      lineHeight: 17,
    },
    slotChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
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
