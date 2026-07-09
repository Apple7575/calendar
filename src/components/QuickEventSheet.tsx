// 주간 보기에서 시간대 선택 시 올라오는 일정 등록 바텀시트.
// 컴팩트: 제목 + 15분 단위 시간 조절 + 저장.
// 위로 스와이프(또는 '상세 옵션')하면 종일/반복/알림/메모까지 확장.

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { formatKoreanDate, parseDateKey, toDateKey } from "../lib/dateUtils";
import { EVENT_COLOR_KEYS, EVENT_COLORS } from "../lib/eventColors";
import { createEvent } from "../lib/events";
import { getAccessToken } from "../lib/googleTokens";
import { ensureNotificationPermission } from "../lib/notifications";
import { RepeatFreq } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";
import { PrimaryButton } from "./PrimaryButton";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const REPEAT_OPTIONS: { value: RepeatFreq | null; label: string }[] = [
  { value: null, label: "안 함" },
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
];

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "없음" },
  { value: 0, label: "정시" },
  { value: 10, label: "10분 전" },
  { value: 30, label: "30분 전" },
  { value: 60, label: "1시간 전" },
];

export type SlotSelection = { dateKey: string; startMin: number; endMin: number };

type Props = {
  selection: SlotSelection | null;
  onChangeTimes: (startMin: number, endMin: number) => void;
  onClose: () => void;
  onSaved: () => void;
};

function minLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function QuickEventSheet({ selection, onChangeTimes, onClose, onSaved }: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq | null>(null);
  const [hasUntil, setHasUntil] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState<Date>(new Date());
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [pushToGoogle, setPushToGoogle] = useState(false);
  const [saving, setSaving] = useState(false);

  // 시트가 새로 열릴 때 초기화
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selection) {
      openedFor.current = null;
      return;
    }
    if (openedFor.current !== selection.dateKey + selection.startMin) {
      openedFor.current = selection.dateKey + selection.startMin;
      setTitle("");
      setDescription("");
      setExpanded(false);
      setAllDay(false);
      setRepeatFreq(null);
      setHasUntil(false);
      setReminderMinutes(null);
      setColor(null);
      setSaving(false);
      const until = parseDateKey(selection.dateKey);
      until.setMonth(until.getMonth() + 3);
      setRepeatUntil(until);
      getAccessToken()
        .then(() => setPushToGoogle(true))
        .catch(() => setPushToGoogle(false));
    }
  }, [selection]);

  const toggleExpanded = (next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -30) toggleExpanded(true);
        else if (g.dy > 30) {
          if (expanded) toggleExpanded(false);
          else onClose();
        }
      },
    })
  ).current;

  if (!selection) return null;
  const { dateKey, startMin, endMin } = selection;

  const adjust = (which: "start" | "end", delta: number) => {
    if (which === "start") {
      const next = Math.min(Math.max(startMin + delta, 0), endMin - 15);
      onChangeTimes(next, endMin);
    } else {
      const next = Math.min(Math.max(endMin + delta, startMin + 15), 24 * 60);
      onChangeTimes(startMin, next);
    }
  };

  const handleSelectReminder = async (value: number | null) => {
    if (value !== null) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert("알림 권한 필요", "설정 앱에서 이 앱의 알림을 허용해 주세요.");
        return;
      }
    }
    setReminderMinutes(value);
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert("알림", "일정 제목을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const base = parseDateKey(dateKey);
      let startAt: Date;
      let endAt: Date;
      if (allDay) {
        startAt = new Date(base);
        startAt.setHours(0, 0, 0, 0);
        endAt = new Date(base);
        endAt.setHours(23, 59, 59, 0);
      } else {
        startAt = new Date(base.getTime() + startMin * 60000);
        endAt = new Date(base.getTime() + endMin * 60000);
      }
      const result = await createEvent(
        {
          title: trimmed,
          description: description.trim() || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          allDay,
          repeatFreq,
          repeatUntil: repeatFreq && hasUntil ? toDateKey(repeatUntil) : null,
          reminderMinutes,
          color,
        },
        pushToGoogle
      );
      if (result.googleWarning) {
        Alert.alert("안내", result.googleWarning, [{ text: "확인", onPress: onSaved }]);
      } else {
        onSaved();
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const chip = (selected: boolean) => [styles.chip, selected && styles.chipSelected];
  const chipText = (selected: boolean) => [styles.chipText, selected && styles.chipTextSelected];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, expanded && styles.sheetExpanded]}>
            {/* 핸들 (스와이프로 확장/축소/닫기) */}
            <View style={styles.handleArea} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={expanded ? { maxHeight: 520 } : undefined}
            >
              <TextInput
                style={styles.titleInput}
                placeholder="일정 제목"
                placeholderTextColor={c.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <Text style={styles.dateLabel}>{formatKoreanDate(dateKey)}</Text>

              {/* 15분 단위 시간 조절 */}
              {!allDay ? (
                <View style={styles.timeRow}>
                  <TimeAdjuster
                    label="시작"
                    value={minLabel(startMin)}
                    onMinus={() => adjust("start", -15)}
                    onPlus={() => adjust("start", 15)}
                    styles={styles}
                    c={c}
                  />
                  <Ionicons name="arrow-forward" size={14} color={c.textMuted} />
                  <TimeAdjuster
                    label="종료"
                    value={minLabel(endMin)}
                    onMinus={() => adjust("end", -15)}
                    onPlus={() => adjust("end", 15)}
                    styles={styles}
                    c={c}
                  />
                </View>
              ) : null}

              {/* 확장 영역: 새 일정 페이지의 나머지 옵션 */}
              {expanded ? (
                <View style={styles.expandedArea}>
                  <Text style={styles.label}>색상</Text>
                  <View style={styles.colorRow}>
                    {EVENT_COLOR_KEYS.map((key) => {
                      const selected = color === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.colorDot,
                            { backgroundColor: EVENT_COLORS[key].hex },
                            selected && styles.colorDotSelected,
                          ]}
                          onPress={() => setColor(selected ? null : key)}
                        >
                          {selected ? (
                            <Ionicons name="checkmark" size={13} color="#FFF" />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>종일</Text>
                    <Switch
                      value={allDay}
                      onValueChange={setAllDay}
                      trackColor={{ true: c.primary }}
                    />
                  </View>

                  <Text style={styles.label}>반복</Text>
                  <View style={styles.chipRow}>
                    {REPEAT_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={chip(repeatFreq === opt.value)}
                        onPress={() => setRepeatFreq(opt.value)}
                      >
                        <Text style={chipText(repeatFreq === opt.value)}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {repeatFreq ? (
                    <View style={styles.switchRow}>
                      <Text style={styles.label}>반복 종료일 지정</Text>
                      <Switch
                        value={hasUntil}
                        onValueChange={setHasUntil}
                        trackColor={{ true: c.primary }}
                      />
                    </View>
                  ) : null}
                  {repeatFreq && hasUntil ? (
                    <View style={{ alignItems: "flex-start" }}>
                      <DateTimePicker
                        value={repeatUntil}
                        mode="date"
                        locale="ko-KR"
                        onChange={(_, d) => d && setRepeatUntil(d)}
                      />
                    </View>
                  ) : null}

                  <Text style={styles.label}>알림</Text>
                  <View style={styles.chipRow}>
                    {REMINDER_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={chip(reminderMinutes === opt.value)}
                        onPress={() => handleSelectReminder(opt.value)}
                      >
                        <Text style={chipText(reminderMinutes === opt.value)}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>메모</Text>
                  <TextInput
                    style={styles.memoInput}
                    placeholder="메모 (선택)"
                    placeholderTextColor={c.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </View>
              ) : (
                <TouchableOpacity style={styles.moreButton} onPress={() => toggleExpanded(true)}>
                  <Ionicons name="chevron-up" size={14} color={c.textMuted} />
                  <Text style={styles.moreText}>상세 옵션 (종일·반복·알림·메모)</Text>
                </TouchableOpacity>
              )}

              <View style={styles.bottomRow}>
                <View style={styles.googleRow}>
                  <Ionicons name="sync-outline" size={14} color={c.textMuted} />
                  <Text style={styles.googleText}>구글에도 등록</Text>
                  <Switch
                    value={pushToGoogle}
                    onValueChange={setPushToGoogle}
                    trackColor={{ true: c.primary }}
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="저장" onPress={handleSave} loading={saving} />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function TimeAdjuster({
  label,
  value,
  onMinus,
  onPlus,
  styles,
  c,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  return (
    <View style={styles.adjuster}>
      <Text style={styles.adjusterLabel}>{label}</Text>
      <View style={styles.adjusterRow}>
        <TouchableOpacity onPress={onMinus} hitSlop={6}>
          <Ionicons name="remove-circle" size={26} color={c.primary} />
        </TouchableOpacity>
        <Text style={styles.adjusterValue}>{value}</Text>
        <TouchableOpacity onPress={onPlus} hitSlop={6}>
          <Ionicons name="add-circle" size={26} color={c.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdropWrap: { flex: 1, justifyContent: "flex-end" },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
    sheetExpanded: {},
    handleArea: { alignItems: "center", paddingVertical: spacing.sm + 2 },
    handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: c.border },
    titleInput: {
      fontSize: fontSizes.title,
      fontWeight: "700",
      color: c.text,
      paddingVertical: spacing.xs,
    },
    dateLabel: {
      fontSize: fontSizes.small,
      color: c.textMuted,
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.surface,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    adjuster: { alignItems: "center", gap: 2 },
    adjusterLabel: { fontSize: fontSizes.caption, color: c.textMuted },
    adjusterRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    adjusterValue: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
      minWidth: 52,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    moreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: spacing.sm + 2,
    },
    moreText: { fontSize: fontSizes.caption, color: c.textMuted },
    expandedArea: { paddingTop: spacing.xs },
    label: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
    },
    colorRow: { flexDirection: "row", gap: spacing.sm + 2 },
    colorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    colorDotSelected: { borderWidth: 2, borderColor: c.text },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
      backgroundColor: c.inputBg,
    },
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: fontSizes.caption, color: c.text, fontWeight: "600" },
    chipTextSelected: { color: c.white },
    memoInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      fontSize: fontSizes.body,
      color: c.text,
      backgroundColor: c.inputBg,
      minHeight: 60,
      textAlignVertical: "top",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    googleRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    googleText: { fontSize: fontSizes.caption, color: c.textMuted },
  });
