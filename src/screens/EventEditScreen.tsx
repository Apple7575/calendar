import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { parseDateKey, toDateKey } from "../lib/dateUtils";
import { EVENT_COLOR_KEYS, EVENT_COLORS } from "../lib/eventColors";
import { createEvent, deleteLocalEvent, EventInput, getEvent, updateEvent } from "../lib/events";
import { getAccessToken } from "../lib/googleTokens";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";
import { ensureNotificationPermission } from "../lib/notifications";
import { EventRow, RepeatFreq } from "../lib/supabase";
import { RootScreenProps } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const HOUR_MS = 60 * 60 * 1000;

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

function defaultStart(dateKey: string, hour = 9): Date {
  const d = parseDateKey(dateKey);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function EventEditScreen({ route, navigation }: RootScreenProps<"EventEdit">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { date, eventId, hour, prefill } = route.params;
  const isEdit = !!eventId;

  const [row, setRow] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(prefill?.allDay ?? false);
  const [start, setStart] = useState<Date>(
    prefill ? new Date(prefill.startISO) : defaultStart(date, hour)
  );
  const [end, setEnd] = useState<Date>(
    prefill ? new Date(prefill.endISO) : new Date(defaultStart(date, hour).getTime() + HOUR_MS)
  );
  const [pushToGoogle, setPushToGoogle] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq | null>(prefill?.repeatFreq ?? null);
  const [hasUntil, setHasUntil] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState<Date>(() => {
    const d = parseDateKey(date);
    d.setMonth(d.getMonth() + 3);
    return d;
  });
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(
    prefill?.reminderMinutes ?? null
  );
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? "일정 수정" : "새 일정" });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (!eventId) {
      // 구글이 연결돼 있으면 "구글에도 등록"을 기본 켬
      getAccessToken()
        .then(() => setPushToGoogle(true))
        .catch(() => {});
      return;
    }
    getEvent(eventId)
      .then((r) => {
        setRow(r);
        setTitle(r.title);
        setDescription(r.description ?? "");
        setAllDay(r.all_day);
        setStart(new Date(r.start_at));
        setEnd(new Date(r.end_at));
        setRepeatFreq(r.repeat_freq);
        setHasUntil(!!r.repeat_until);
        if (r.repeat_until) setRepeatUntil(parseDateKey(r.repeat_until));
        setReminderMinutes(r.reminder_minutes);
        setColor(r.color);
      })
      .catch((e) => {
        Alert.alert("오류", e instanceof Error ? e.message : "일정을 불러오지 못했어요.", [
          { text: "확인", onPress: () => navigation.goBack() },
        ]);
      })
      .finally(() => setLoading(false));
  }, [eventId, navigation]);

  const handleStartChange = (next: Date) => {
    setStart(next);
    if (end.getTime() <= next.getTime()) {
      setEnd(new Date(next.getTime() + HOUR_MS));
    }
  };

  const buildInput = (): EventInput | null => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert("알림", "일정 제목을 입력해 주세요.");
      return null;
    }
    let startAt: Date;
    let endAt: Date;
    if (allDay) {
      startAt = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
      const endBase = end.getTime() < start.getTime() ? start : end;
      endAt = new Date(
        endBase.getFullYear(),
        endBase.getMonth(),
        endBase.getDate(),
        23,
        59,
        59
      );
    } else {
      if (end.getTime() <= start.getTime()) {
        Alert.alert("알림", "종료 시간이 시작 시간보다 빨라요.");
        return null;
      }
      startAt = start;
      endAt = end;
    }
    return {
      title: trimmed,
      description: description.trim() || null,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay,
      repeatFreq,
      repeatUntil: repeatFreq && hasUntil ? toDateKey(repeatUntil) : null,
      reminderMinutes,
      color,
    };
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
    const input = buildInput();
    if (!input) return;
    setSaving(true);
    try {
      const result = row
        ? await updateEvent(row, input)
        : await createEvent(input, pushToGoogle);
      invalidateGoogleCache();
      if (result.googleWarning) {
        Alert.alert("안내", result.googleWarning, [
          { text: "확인", onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!row) return;
    Alert.alert("일정 삭제", `"${row.title}" 일정을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            const { googleWarning } = await deleteLocalEvent(row);
            invalidateGoogleCache();
            if (googleWarning) {
              Alert.alert("안내", googleWarning, [
                { text: "확인", onPress: () => navigation.goBack() },
              ]);
            } else {
              navigation.goBack();
            }
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const chip = (selected: boolean) => [styles.chip, selected && styles.chipSelected];
  const chipText = (selected: boolean) => [styles.chipText, selected && styles.chipTextSelected];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>제목</Text>
      <TextInput
        style={styles.input}
        placeholder="일정 제목"
        placeholderTextColor={c.textMuted}
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>종일</Text>
        <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: c.primary }} />
      </View>

      <Text style={styles.label}>시작</Text>
      <View style={styles.pickerRow}>
        <DateTimePicker
          value={start}
          mode="date"
          locale="ko-KR"
          onChange={(_, d) => d && handleStartChange(mergeDate(start, d))}
        />
        {!allDay && (
          <DateTimePicker
            value={start}
            mode="time"
            locale="ko-KR"
            minuteInterval={5}
            onChange={(_, d) => d && handleStartChange(mergeTime(start, d))}
          />
        )}
      </View>

      <Text style={styles.label}>종료</Text>
      <View style={styles.pickerRow}>
        <DateTimePicker
          value={end}
          mode="date"
          locale="ko-KR"
          onChange={(_, d) => d && setEnd(mergeDate(end, d))}
        />
        {!allDay && (
          <DateTimePicker
            value={end}
            mode="time"
            locale="ko-KR"
            minuteInterval={5}
            onChange={(_, d) => d && setEnd(mergeTime(end, d))}
          />
        )}
      </View>

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
              {selected ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
            </TouchableOpacity>
          );
        })}
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
        <>
          <View style={styles.switchRow}>
            <Text style={styles.label}>반복 종료일 지정</Text>
            <Switch
              value={hasUntil}
              onValueChange={setHasUntil}
              trackColor={{ true: c.primary }}
            />
          </View>
          {hasUntil ? (
            <View style={styles.pickerRow}>
              <DateTimePicker
                value={repeatUntil}
                mode="date"
                locale="ko-KR"
                onChange={(_, d) => d && setRepeatUntil(d)}
              />
            </View>
          ) : null}
          {isEdit ? (
            <Text style={styles.hint}>반복 일정은 시리즈 전체가 수정/삭제돼요.</Text>
          ) : null}
        </>
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
        style={[styles.input, styles.memoInput]}
        placeholder="메모 (선택)"
        placeholderTextColor={c.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {!isEdit ? (
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>구글 캘린더에도 등록</Text>
            <Text style={styles.hint}>구글 캘린더 primary에 함께 저장돼요.</Text>
          </View>
          <Switch
            value={pushToGoogle}
            onValueChange={setPushToGoogle}
            trackColor={{ true: c.primary }}
          />
        </View>
      ) : row?.google_event_id ? (
        <Text style={styles.hint}>이 일정은 구글 캘린더에 연결되어 있어 함께 수정돼요.</Text>
      ) : null}

      <View style={styles.buttons}>
        <PrimaryButton title="저장" onPress={handleSave} loading={saving} />
        {isEdit ? (
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton title="삭제" onPress={handleDelete} variant="danger" disabled={saving} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function mergeDate(base: Date, datePart: Date): Date {
  const next = new Date(base);
  next.setFullYear(datePart.getFullYear(), datePart.getMonth(), datePart.getDate());
  return next;
}

function mergeTime(base: Date, timePart: Date): Date {
  const next = new Date(base);
  next.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return next;
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    label: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    hint: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 2 },
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
    memoInput: { minHeight: 80, textAlignVertical: "top" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
    },
    pickerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    colorRow: { flexDirection: "row", gap: spacing.sm + 2 },
    colorDot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    colorDotSelected: { borderWidth: 2, borderColor: c.text },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.inputBg,
    },
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: fontSizes.small, color: c.text, fontWeight: "600" },
    chipTextSelected: { color: c.white },
    buttons: { marginTop: spacing.lg },
  });
