import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { parseDateKey } from "../lib/dateUtils";
import { createEvent, deleteLocalEvent, EventInput, getEvent, updateEvent } from "../lib/events";
import { getAccessToken } from "../lib/googleTokens";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";
import { EventRow } from "../lib/supabase";
import { RootScreenProps } from "../navigation/types";
import { colors, fontSizes, radii, spacing } from "../theme/tokens";

const HOUR_MS = 60 * 60 * 1000;

function defaultStart(dateKey: string): Date {
  const d = parseDateKey(dateKey);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function EventEditScreen({ route, navigation }: RootScreenProps<"EventEdit">) {
  const { date, eventId } = route.params;
  const isEdit = !!eventId;

  const [row, setRow] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState<Date>(defaultStart(date));
  const [end, setEnd] = useState<Date>(new Date(defaultStart(date).getTime() + HOUR_MS));
  const [pushToGoogle, setPushToGoogle] = useState(false);
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
    };
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>제목</Text>
      <TextInput
        style={styles.input}
        placeholder="일정 제목"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>종일</Text>
        <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: colors.primary }} />
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

      <Text style={styles.label}>메모</Text>
      <TextInput
        style={[styles.input, styles.memoInput]}
        placeholder="메모 (선택)"
        placeholderTextColor={colors.textMuted}
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
            trackColor={{ true: colors.primary }}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: {
    fontSize: fontSizes.small,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  hint: { fontSize: fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  memoInput: { minHeight: 80, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttons: { marginTop: spacing.lg },
});
