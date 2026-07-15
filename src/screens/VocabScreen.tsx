// 단어장: 일기·번역에서 만난 영어/일본어 표현을 모으고 플래시카드 퀴즈로 복습한다.

import { Ionicons } from "@expo/vector-icons";
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
import { tapSuccess } from "../lib/haptics";
import { detectTtsLang, stopSpeaking, toggleSpeak, TtsLang } from "../lib/tts";
import {
  addVocab,
  deleteVocab,
  listVocab,
  quizOrder,
  recordCorrect,
  toggleFavVocab,
  VocabWord,
} from "../lib/vocab";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const ACCENT = "#5B8DEF";
const LANG_LABELS: Record<TtsLang, string> = { en: "EN", ja: "JA", ko: "KO" };

type QuizState = {
  order: VocabWord[];
  index: number;
  revealed: boolean;
  correct: number;
};

export function VocabScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [words, setWords] = useState<VocabWord[] | null>(null);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<TtsLang | "전체">("전체");
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  useEffect(() => {
    reload();
    return stopSpeaking;
  }, []);

  const reload = () => {
    listVocab()
      .then(setWords)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  };

  const handleAdd = async () => {
    if (!word.trim() || !meaning.trim()) {
      Alert.alert("알림", "단어와 뜻을 모두 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      await addVocab({ word: word.trim(), meaning: meaning.trim() });
      setWord("");
      setMeaning("");
      tapSuccess();
      reload();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const wordMenu = (w: VocabWord) => {
    Alert.alert(w.word, w.meaning, [
      { text: "🔊 발음 듣기", onPress: () => toggleSpeak(w.word, w.lang) },
      {
        text: w.fav ? "☆ 즐겨찾기 해제" : "★ 즐겨찾기",
        onPress: () => toggleFavVocab(w).then(reload).catch(() => {}),
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          deleteVocab(w.id)
            .then(() => setWords((prev) => (prev ?? []).filter((x) => x.id !== w.id)))
            .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "실패했어요.")),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const filtered = (words ?? []).filter((w) => filter === "전체" || w.lang === filter);
  const quizPool = filtered.filter((w) => w.lang !== "ko");

  // ---------- 퀴즈 ----------

  const startQuiz = () => {
    const pool = quizPool.length > 0 ? quizPool : filtered;
    if (pool.length === 0) return;
    setQuiz({ order: quizOrder(pool), index: 0, revealed: false, correct: 0 });
  };

  const answer = (knew: boolean) => {
    if (!quiz) return;
    const w = quiz.order[quiz.index];
    if (knew) recordCorrect(w);
    setQuiz({
      ...quiz,
      index: quiz.index + 1,
      revealed: false,
      correct: quiz.correct + (knew ? 1 : 0),
    });
  };

  if (quiz) {
    const done = quiz.index >= quiz.order.length;
    const w = done ? null : quiz.order[quiz.index];
    return (
      <View style={[styles.container, styles.quizContainer]}>
        {done ? (
          <View style={styles.quizCard}>
            <Text style={styles.quizWord}>🎉</Text>
            <Text style={styles.quizMeaning}>
              {quiz.order.length}개 중 {quiz.correct}개 알고 있었어요!
            </Text>
            <TouchableOpacity style={styles.quizButton} onPress={startQuiz}>
              <Text style={styles.quizButtonText}>다시 하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setQuiz(null);
                reload();
              }}
            >
              <Text style={styles.quizExit}>단어장으로</Text>
            </TouchableOpacity>
          </View>
        ) : w ? (
          <>
            <Text style={styles.quizProgress}>
              {quiz.index + 1} / {quiz.order.length}
            </Text>
            <TouchableOpacity
              style={styles.quizCard}
              onPress={() => setQuiz({ ...quiz, revealed: !quiz.revealed })}
              activeOpacity={0.85}
            >
              <Text style={styles.quizLang}>{LANG_LABELS[w.lang]}</Text>
              <Text style={styles.quizWord}>{w.word}</Text>
              <TouchableOpacity onPress={() => toggleSpeak(w.word, w.lang)} hitSlop={8}>
                <Ionicons name="volume-high-outline" size={22} color={ACCENT} />
              </TouchableOpacity>
              {quiz.revealed ? (
                <Text style={styles.quizMeaning}>{w.meaning}</Text>
              ) : (
                <Text style={styles.quizTapHint}>카드를 누르면 뜻이 보여요</Text>
              )}
            </TouchableOpacity>
            {quiz.revealed ? (
              <View style={styles.quizAnswerRow}>
                <TouchableOpacity
                  style={[styles.quizButton, styles.quizButtonNo]}
                  onPress={() => answer(false)}
                >
                  <Text style={styles.quizButtonText}>🤔 몰랐어요</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quizButton} onPress={() => answer(true)}>
                  <Text style={styles.quizButtonText}>😎 알아요</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={() => {
                setQuiz(null);
                reload();
              }}
            >
              <Text style={styles.quizExit}>그만하기</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 추가 폼 */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="단어·표현 (예: give it a shot, 懐かしい)"
          placeholderTextColor={c.textMuted}
          value={word}
          onChangeText={setWord}
          autoCapitalize="none"
        />
        <View style={styles.formRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="뜻 (예: 한번 해보다)"
            placeholderTextColor={c.textMuted}
            value={meaning}
            onChangeText={setMeaning}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.addText}>저장</Text>
            )}
          </TouchableOpacity>
        </View>
        {word.trim() ? (
          <Text style={styles.langHint}>
            언어 자동 감지: {LANG_LABELS[detectTtsLang(word)]}
          </Text>
        ) : (
          <Text style={styles.langHint}>
            일기에서 모르는 표현을 길게 눌러 복사한 뒤 여기에 붙여 넣으세요.
          </Text>
        )}
      </View>

      {/* 필터 + 퀴즈 시작 */}
      <View style={styles.filterRow}>
        {(["전체", "en", "ja"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === "전체" ? "전체" : LANG_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
        {filtered.length > 0 ? (
          <TouchableOpacity style={styles.quizStart} onPress={startQuiz}>
            <Text style={styles.quizStartText}>🃏 퀴즈 {quizPool.length || filtered.length}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 목록 */}
      {words === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={ACCENT} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>
          아직 저장한 단어가 없어요.{"\n"}일기에서 만난 모르는 표현을 모아보세요.
        </Text>
      ) : (
        filtered.map((w) => (
          <TouchableOpacity
            key={w.id}
            style={styles.wordRow}
            onPress={() => toggleSpeak(w.word, w.lang)}
            onLongPress={() => wordMenu(w)}
          >
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{LANG_LABELS[w.lang]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wordText}>
                {w.fav ? "★ " : ""}
                {w.word}
              </Text>
              <Text style={styles.meaningText}>{w.meaning}</Text>
            </View>
            {w.correct_count > 0 ? (
              <Text style={styles.correctCount}>✓{w.correct_count}</Text>
            ) : null}
            <Ionicons name="volume-high-outline" size={16} color={c.textMuted} />
          </TouchableOpacity>
        ))
      )}
      {filtered.length > 0 ? (
        <Text style={styles.hint}>누르면 발음, 길게 누르면 즐겨찾기·삭제.</Text>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    form: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    formRow: { flexDirection: "row", gap: spacing.sm },
    input: {
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
      backgroundColor: ACCENT,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    addText: { color: "#FFFFFF", fontSize: fontSizes.small, fontWeight: "800" },
    langHint: { fontSize: fontSizes.caption, color: c.textMuted },
    filterRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
    chip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    chipActive: { backgroundColor: ACCENT },
    chipText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    chipTextActive: { color: "#FFFFFF" },
    quizStart: { marginLeft: "auto" },
    quizStartText: { fontSize: fontSizes.small, fontWeight: "800", color: ACCENT },
    wordRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.sm + 2,
    },
    langBadge: {
      width: 30,
      height: 22,
      borderRadius: 6,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    langBadgeText: { fontSize: 10, fontWeight: "800", color: c.textMuted },
    wordText: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    meaningText: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
    correctCount: { fontSize: fontSizes.caption, fontWeight: "700", color: "#3FBF77" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
      lineHeight: 21,
    },
    hint: { textAlign: "center", fontSize: fontSizes.caption, color: c.textMuted },
    // 퀴즈
    quizContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.md,
    },
    quizProgress: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    quizCard: {
      alignSelf: "stretch",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.xl,
      ...cardShadow(c.shadow),
    },
    quizLang: { fontSize: fontSizes.caption, fontWeight: "800", color: c.textMuted },
    quizWord: { fontSize: 28, fontWeight: "900", color: c.text, textAlign: "center" },
    quizMeaning: {
      fontSize: fontSizes.emphasis,
      fontWeight: "700",
      color: ACCENT,
      textAlign: "center",
    },
    quizTapHint: { fontSize: fontSizes.caption, color: c.textMuted },
    quizAnswerRow: { flexDirection: "row", gap: spacing.sm },
    quizButton: {
      backgroundColor: ACCENT,
      borderRadius: radii.button,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
    },
    quizButtonNo: { backgroundColor: "#E8637E" },
    quizButtonText: { color: "#FFFFFF", fontSize: fontSizes.small, fontWeight: "800" },
    quizExit: { fontSize: fontSizes.small, color: c.textMuted, fontWeight: "700" },
  });
