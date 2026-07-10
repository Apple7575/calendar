import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { DiaryQuestion, generateDiaryQuestions, generateHighlight } from "../lib/aiHelper";
import { formatKoreanDate } from "../lib/dateUtils";
import {
  addPhoto,
  deletePhoto,
  DiaryPhoto,
  getDiaryWithPhotos,
  parseExifTakenAt,
  recentPeople,
  toViewerPhoto,
  upsertDiary,
} from "../lib/diary";
import { fetchSleepHours, isHealthAvailable } from "../lib/health";
import { RootScreenProps } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const THUMB = 96;
const MOODS = ["😊", "🙂", "😐", "😢", "😠"] as const;

export function DiaryEditScreen({ route, navigation }: RootScreenProps<"DiaryEdit">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { date } = route.params;
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [pending, setPending] = useState<{ uri: string; takenAt: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  // 질문-답변 모드
  const [writeMode, setWriteMode] = useState<"free" | "qa">("free");
  const [questions, setQuestions] = useState<DiaryQuestion[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [customAnswer, setCustomAnswer] = useState("");

  // 추가 기록 필드
  const [highlight, setHighlight] = useState("");
  const [generatingHighlight, setGeneratingHighlight] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [peopleInput, setPeopleInput] = useState("");
  const [peopleSuggestions, setPeopleSuggestions] = useState<string[]>([]);
  const [gratitude, setGratitude] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({ title: formatKoreanDate(date) });
  }, [navigation, date]);

  useEffect(() => {
    getDiaryWithPhotos(date)
      .then(({ diary, photos: rows }) => {
        setContent(diary?.content ?? "");
        setMood(diary?.mood ?? null);
        setHighlight(diary?.highlight ?? "");
        setEnergy(diary?.energy ?? null);
        setSleepHours(diary?.sleep_hours != null ? Number(diary.sleep_hours) : null);
        setPeople(diary?.people ?? []);
        setGratitude(diary?.gratitude ?? "");
        setPhotos(rows);
      })
      .catch((e) => {
        Alert.alert("오류", e instanceof Error ? e.message : "일기를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
    recentPeople().then(setPeopleSuggestions).catch(() => {});
  }, [date]);

  const addPerson = (name: string) => {
    const trimmed = name.trim().replace(/,$/, "");
    if (!trimmed) return;
    setPeople((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setPeopleInput("");
  };

  const handleGenerateHighlight = async () => {
    if (!content.trim()) {
      Alert.alert("알림", "일기 내용을 먼저 써 주세요.");
      return;
    }
    setGeneratingHighlight(true);
    try {
      setHighlight(await generateHighlight(content, mood));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "한 줄 요약에 실패했어요.");
    } finally {
      setGeneratingHighlight(false);
    }
  };

  const allViewerPhotos = [
    ...photos.map(toViewerPhoto),
    ...pending.map((p) => ({ url: p.uri, takenAt: p.takenAt })),
  ];

  const enterQaMode = async () => {
    setWriteMode("qa");
    if (questions !== null) return;
    setLoadingQuestions(true);
    try {
      const qs = await generateDiaryQuestions(date, mood);
      setQuestions(qs);
      setQIndex(0);
    } catch (e) {
      setWriteMode("free");
      Alert.alert(
        "오류",
        e instanceof Error ? e.message : "질문을 만들지 못했어요. 자유 작성으로 써 주세요."
      );
    } finally {
      setLoadingQuestions(false);
    }
  };

  const appendAnswer = (question: string, answer: string) => {
    const block = `Q. ${question}\n${answer.trim()}\n\n`;
    setContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${block}` : block));
    setCustomAnswer("");
    if (questions && qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      setWriteMode("free");
    }
  };

  const skipQuestion = () => {
    if (questions && qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      setWriteMode("free");
    }
  };

  const openViewer = (index: number) => {
    navigation.navigate("PhotoViewer", { photos: allViewerPhotos, index });
  };

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
      exif: true,
    });
    if (result.canceled) return;
    setPending((prev) => [
      ...prev,
      ...result.assets.map((a) => ({ uri: a.uri, takenAt: parseExifTakenAt(a.exif) })),
    ]);
  };

  const removePending = (uri: string) => {
    setPending((prev) => prev.filter((p) => p.uri !== uri));
  };

  const removeSaved = (photo: DiaryPhoto) => {
    Alert.alert("사진 삭제", "이 사진을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhoto(photo);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "사진 삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!content.trim() && photos.length === 0 && pending.length === 0 && !mood) {
      Alert.alert("알림", "내용, 사진, 기분 중 하나 이상을 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      // 한 줄이 비어 있으면 AI로 자동 추출 (실패해도 저장은 진행)
      let finalHighlight = highlight.trim();
      if (!finalHighlight && content.trim()) {
        try {
          finalHighlight = await generateHighlight(content, mood);
          setHighlight(finalHighlight);
        } catch {
          // AI 미설정/실패 시 하이라이트 없이 저장
        }
      }
      const diary = await upsertDiary(date, {
        content: content.trim(),
        mood,
        highlight: finalHighlight || null,
        energy,
        sleepHours,
        people,
        gratitude: gratitude.trim() || null,
      });
      let position = photos.length;
      const failed: { uri: string; takenAt: string | null }[] = [];
      for (const p of pending) {
        try {
          await addPhoto(diary, p.uri, position++, { takenAt: p.takenAt });
        } catch {
          failed.push(p);
        }
      }
      if (failed.length > 0) {
        setPending(failed);
        Alert.alert("안내", `사진 ${failed.length}장은 업로드하지 못했어요. 다시 저장해 보세요.`);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "일기 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.moodRow}>
          <Text style={styles.moodLabel}>오늘 기분</Text>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodChip, mood === m && styles.moodChipSelected]}
              onPress={() => setMood(mood === m ? null : m)}
            >
              <Text style={styles.moodEmoji}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 에너지 / 수면 */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>에너지</Text>
            <View style={styles.energyRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setEnergy(energy === v ? null : v)}
                  hitSlop={4}
                >
                  <Ionicons
                    name="flash"
                    size={22}
                    color={energy !== null && v <= energy ? c.dotTask : c.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.sleepLabelRow}>
              <Text style={styles.metaLabel}>수면</Text>
              {isHealthAvailable() ? (
                <TouchableOpacity
                  hitSlop={6}
                  onPress={async () => {
                    try {
                      const hours = await fetchSleepHours(date);
                      if (hours === null) {
                        Alert.alert("알림", "건강 앱에 그날 수면 기록이 없어요.");
                      } else {
                        setSleepHours(hours);
                      }
                    } catch (e) {
                      Alert.alert(
                        "오류",
                        e instanceof Error ? e.message : "건강 데이터를 읽지 못했어요."
                      );
                    }
                  }}
                >
                  <Ionicons name="heart-circle" size={18} color={c.danger} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.sleepRow}>
              <TouchableOpacity
                onPress={() =>
                  setSleepHours(sleepHours === null ? 7 : Math.max(0, sleepHours - 0.5))
                }
                hitSlop={6}
              >
                <Ionicons name="remove-circle-outline" size={22} color={c.primary} />
              </TouchableOpacity>
              <Text style={styles.sleepText}>
                {sleepHours === null ? "기록 안 함" : `${sleepHours}시간`}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSleepHours(sleepHours === null ? 7 : Math.min(24, sleepHours + 0.5))
                }
                hitSlop={6}
              >
                <Ionicons name="add-circle-outline" size={22} color={c.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 작성 모드 토글 */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeChip, writeMode === "free" && styles.modeChipActive]}
            onPress={() => setWriteMode("free")}
          >
            <Ionicons
              name="create-outline"
              size={13}
              color={writeMode === "free" ? c.white : c.textMuted}
            />
            <Text style={[styles.modeChipText, writeMode === "free" && styles.modeChipTextActive]}>
              자유 작성
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, writeMode === "qa" && styles.modeChipActive]}
            onPress={enterQaMode}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={13}
              color={writeMode === "qa" ? c.white : c.textMuted}
            />
            <Text style={[styles.modeChipText, writeMode === "qa" && styles.modeChipTextActive]}>
              질문으로 쓰기
            </Text>
          </TouchableOpacity>
        </View>

        {/* 질문-답변 카드 */}
        {writeMode === "qa" ? (
          <View style={styles.qaCard}>
            {loadingQuestions || !questions ? (
              <View style={styles.qaLoading}>
                <ActivityIndicator color={c.primary} />
                <Text style={styles.qaLoadingText}>오늘에 맞는 질문을 만드는 중…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.qaProgress}>
                  질문 {qIndex + 1} / {questions.length}
                </Text>
                <Text style={styles.qaQuestion}>{questions[qIndex].question}</Text>
                <View style={styles.qaOptions}>
                  {questions[qIndex].options.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.qaOption}
                      onPress={() => appendAnswer(questions[qIndex].question, opt)}
                    >
                      <Text style={styles.qaOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.qaCustomRow}>
                  <TextInput
                    style={styles.qaCustomInput}
                    placeholder="직접 답하기"
                    placeholderTextColor={c.textMuted}
                    value={customAnswer}
                    onChangeText={setCustomAnswer}
                    onSubmitEditing={() =>
                      customAnswer.trim() &&
                      appendAnswer(questions[qIndex].question, customAnswer)
                    }
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.qaCustomSend, !customAnswer.trim() && { opacity: 0.4 }]}
                    disabled={!customAnswer.trim()}
                    onPress={() => appendAnswer(questions[qIndex].question, customAnswer)}
                  >
                    <Ionicons name="arrow-up" size={16} color={c.white} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={skipQuestion} hitSlop={8}>
                  <Text style={styles.qaSkip}>
                    {qIndex + 1 < questions.length ? "건너뛰기" : "질문 끝내기"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        <TextInput
          style={styles.diaryInput}
          placeholder={
            writeMode === "qa"
              ? "답변을 고르면 여기에 일기가 쌓여요."
              : "오늘 하루는 어땠나요?"
          }
          placeholderTextColor={c.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
        />

        {/* 오늘의 한 줄 */}
        <Text style={styles.fieldLabel}>
          오늘의 한 줄 <Text style={styles.fieldHint}>(비워두면 저장할 때 AI가 뽑아줘요)</Text>
        </Text>
        <View style={styles.highlightRow}>
          <TextInput
            style={styles.fieldInput}
            placeholder="오늘을 한 줄로 남긴다면?"
            placeholderTextColor={c.textMuted}
            value={highlight}
            onChangeText={setHighlight}
          />
          <TouchableOpacity
            style={styles.highlightButton}
            onPress={handleGenerateHighlight}
            disabled={generatingHighlight}
          >
            {generatingHighlight ? (
              <ActivityIndicator size="small" color={c.white} />
            ) : (
              <Ionicons name="sparkles" size={16} color={c.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* 감사 한 가지 */}
        <Text style={styles.fieldLabel}>감사 한 가지</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="오늘 고마웠던 것 하나"
          placeholderTextColor={c.textMuted}
          value={gratitude}
          onChangeText={setGratitude}
        />

        {/* 함께한 사람 */}
        <Text style={styles.fieldLabel}>함께한 사람</Text>
        <View style={styles.peopleWrap}>
          {people.map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.personChip}
              onPress={() => setPeople((prev) => prev.filter((x) => x !== p))}
            >
              <Text style={styles.personChipText}>{p}</Text>
              <Ionicons name="close" size={12} color={c.primary} />
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.personInput}
            placeholder={people.length === 0 ? "이름 입력 후 엔터" : "+ 추가"}
            placeholderTextColor={c.textMuted}
            value={peopleInput}
            onChangeText={(t) => {
              if (t.endsWith(",") || t.endsWith(" ")) addPerson(t);
              else setPeopleInput(t);
            }}
            onSubmitEditing={() => addPerson(peopleInput)}
            returnKeyType="done"
          />
        </View>
        {peopleSuggestions.filter((s) => !people.includes(s)).length > 0 ? (
          <View style={styles.peopleSuggestRow}>
            {peopleSuggestions
              .filter((s) => !people.includes(s))
              .slice(0, 6)
              .map((s) => (
                <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => addPerson(s)}>
                  <Text style={styles.suggestChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
          </View>
        ) : null}

        <View style={styles.photoGrid}>
          {photos.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => openViewer(i)}
              onLongPress={() => removeSaved(p)}
            >
              <Image source={{ uri: p.url }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
          {pending.map((p, i) => (
            <TouchableOpacity
              key={p.uri}
              onPress={() => openViewer(photos.length + i)}
              onLongPress={() => removePending(p.uri)}
            >
              <Image source={{ uri: p.uri }} style={[styles.thumb, styles.thumbPending]} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addThumb} onPress={pickPhotos}>
            <Ionicons name="camera-outline" size={26} color={c.textMuted} />
            <Text style={styles.addThumbLabel}>사진</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 || pending.length > 0 ? (
          <Text style={styles.hint}>사진을 누르면 크게 보고, 길게 누르면 삭제해요.</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="저장" onPress={handleSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    content: { padding: spacing.md },
    moodRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
    moodLabel: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginRight: spacing.sm,
    },
    moodChip: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.xs,
    },
    moodChipSelected: {
      backgroundColor: c.primarySoft,
      borderWidth: 2,
      borderColor: c.primary,
    },
    moodEmoji: { fontSize: 24 },
    metaRow: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.button,
      padding: spacing.sm + 2,
    },
    metaCol: { flex: 1, gap: 4 },
    metaLabel: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    energyRow: { flexDirection: "row", gap: 2 },
    sleepLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    sleepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    sleepText: { fontSize: fontSizes.small, fontWeight: "700", color: c.text, minWidth: 66, textAlign: "center" },
    fieldLabel: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    fieldHint: { fontWeight: "400", fontSize: fontSizes.caption, color: c.textMuted },
    fieldInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    highlightRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    highlightButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    peopleWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.xs + 2,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
    },
    personChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
    },
    personChipText: { fontSize: fontSizes.small, color: c.primary, fontWeight: "600" },
    personInput: {
      minWidth: 110,
      flex: 1,
      fontSize: fontSizes.small,
      color: c.text,
      paddingVertical: 4,
    },
    peopleSuggestRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, marginTop: spacing.xs + 2 },
    suggestChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
    },
    suggestChipText: { fontSize: fontSizes.caption, color: c.textMuted },
    modeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    modeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
      backgroundColor: c.surface,
    },
    modeChipActive: { backgroundColor: c.primary },
    modeChipText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    modeChipTextActive: { color: c.white },
    qaCard: {
      backgroundColor: c.surface,
      borderRadius: radii.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    qaLoading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    qaLoadingText: { color: c.textMuted, fontSize: fontSizes.small },
    qaProgress: { fontSize: fontSizes.caption, fontWeight: "700", color: c.primary },
    qaQuestion: {
      fontSize: fontSizes.emphasis,
      fontWeight: "700",
      color: c.text,
      lineHeight: 25,
    },
    qaOptions: { gap: spacing.xs + 2 },
    qaOption: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
    },
    qaOptionText: { fontSize: fontSizes.body, color: c.text },
    qaCustomRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    qaCustomInput: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      fontSize: fontSizes.body,
      color: c.text,
    },
    qaCustomSend: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    qaSkip: {
      fontSize: fontSizes.small,
      color: c.textMuted,
      textAlign: "center",
      paddingVertical: 2,
    },
    diaryInput: {
      minHeight: 180,
      fontSize: fontSizes.body,
      color: c.text,
      lineHeight: 26,
      textAlignVertical: "top",
      padding: spacing.sm,
    },
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radii.button,
      backgroundColor: c.surface,
    },
    thumbPending: { opacity: 0.85 },
    addThumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radii.button,
      borderWidth: 2,
      borderColor: c.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    addThumbLabel: { fontSize: fontSizes.caption, color: c.textMuted },
    hint: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: spacing.sm },
    footer: {
      padding: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
  });
