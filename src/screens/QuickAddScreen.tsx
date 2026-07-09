import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
import { parsedEventDates, parseEventText, ParsedEvent } from "../lib/aiHelper";
import { formatKoreanDate, formatTime, toDateKey } from "../lib/dateUtils";
import { createEvent } from "../lib/events";
import { getAccessToken } from "../lib/googleTokens";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";
import { REPEAT_LABELS } from "../lib/recurrence";
import { RootScreenProps } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const EXAMPLES = [
  "내일 오후 3시 치과",
  "다음 주 금요일 저녁 7시 친구 약속",
  "매주 월요일 아침 8시 운동, 10분 전에 알려줘",
];

export function QuickAddScreen({ navigation }: RootScreenProps<"QuickAdd">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setParsing(true);
    setParsed(null);
    try {
      setParsed(await parseEventText(trimmed));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "이해하지 못했어요. 다시 써 주세요.");
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const { start, end } = parsedEventDates(parsed);
      let pushToGoogle = false;
      try {
        await getAccessToken();
        pushToGoogle = true;
      } catch {
        // 구글 미연결이면 로컬만
      }
      const result = await createEvent(
        {
          title: parsed.title,
          description: null,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          allDay: parsed.allDay,
          repeatFreq: parsed.repeat,
          repeatUntil: null,
          reminderMinutes: parsed.reminderMinutes,
        },
        pushToGoogle
      );
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

  const handleEditDetail = () => {
    if (!parsed) return;
    const { start, end } = parsedEventDates(parsed);
    navigation.replace("EventEdit", {
      date: parsed.date,
      prefill: {
        title: parsed.title,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        allDay: parsed.allDay,
        repeatFreq: parsed.repeat,
        reminderMinutes: parsed.reminderMinutes,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>말하듯 쓰면 AI가 일정으로 만들어 드려요.</Text>
      <TextInput
        style={styles.input}
        placeholder={EXAMPLES[0]}
        placeholderTextColor={c.textMuted}
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleParse}
        returnKeyType="done"
        autoFocus
      />
      <View style={styles.exampleWrap}>
        {EXAMPLES.map((ex) => (
          <TouchableOpacity key={ex} style={styles.exampleChip} onPress={() => setText(ex)}>
            <Text style={styles.exampleText}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <PrimaryButton title="AI로 만들기" onPress={handleParse} loading={parsing} />

      {parsing ? (
        <View style={styles.parsingWrap}>
          <ActivityIndicator color={c.primary} />
          <Text style={styles.parsingText}>이해하는 중…</Text>
        </View>
      ) : null}

      {parsed ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="sparkles" size={16} color={c.primary} />
            <Text style={styles.resultTitle}>{parsed.title}</Text>
          </View>
          <ResultRow
            icon="calendar-outline"
            text={formatKoreanDate(parsed.date)}
            styles={styles}
            c={c}
          />
          <ResultRow
            icon="time-outline"
            text={
              parsed.allDay || !parsed.startTime
                ? "종일"
                : `${parsed.startTime}${
                    parsed.endTime ? ` - ${parsed.endTime}` : " (1시간)"
                  }`
            }
            styles={styles}
            c={c}
          />
          {parsed.repeat ? (
            <ResultRow
              icon="repeat"
              text={`${REPEAT_LABELS[parsed.repeat]} 반복`}
              styles={styles}
              c={c}
            />
          ) : null}
          {parsed.reminderMinutes !== null ? (
            <ResultRow
              icon="notifications-outline"
              text={
                parsed.reminderMinutes === 0 ? "정시 알림" : `${parsed.reminderMinutes}분 전 알림`
              }
              styles={styles}
              c={c}
            />
          ) : null}

          <View style={styles.resultButtons}>
            <PrimaryButton title="이대로 저장" onPress={handleSave} loading={saving} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              title="상세 수정"
              variant="secondary"
              onPress={handleEditDetail}
              disabled={saving}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ResultRow({
  icon,
  text,
  styles,
  c,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  return (
    <View style={styles.resultRow}>
      <Ionicons name={icon} size={15} color={c.textMuted} />
      <Text style={styles.resultRowText}>{text}</Text>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    lead: { fontSize: fontSizes.body, color: c.textMuted, marginBottom: spacing.md },
    input: {
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      fontSize: fontSizes.emphasis,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    exampleWrap: { gap: spacing.xs + 2, marginVertical: spacing.md },
    exampleChip: {
      alignSelf: "flex-start",
      backgroundColor: c.surface,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
    },
    exampleText: { fontSize: fontSizes.caption, color: c.textMuted },
    parsingWrap: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    parsingText: { color: c.textMuted, fontSize: fontSizes.small },
    resultCard: {
      marginTop: spacing.lg,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.xs + 2,
    },
    resultHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    resultTitle: { fontSize: fontSizes.emphasis, fontWeight: "800", color: c.text, flex: 1 },
    resultRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    resultRowText: { fontSize: fontSizes.body, color: c.text },
    resultButtons: { marginTop: spacing.md },
  });
