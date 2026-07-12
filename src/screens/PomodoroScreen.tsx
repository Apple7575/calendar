// 뽀모도로: 집중 25분 → 휴식 5분, 4세트마다 긴 휴식 15분.
// 페이즈가 끝나면 TTS가 말을 걸고, 완료한 집중 세션은 생활 기록(학습)에 저장된다.

import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MicButton } from "../components/MicButton";
import { addLog } from "../lib/dailyLogs";
import { todayKey } from "../lib/dateUtils";
import { tapSuccess } from "../lib/haptics";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const TOMATO = "#E8574F";
type Phase = "focus" | "break" | "longBreak";

const FOCUS_OPTIONS = [15, 25, 50] as const;
const BREAK_OPTIONS = [5, 10] as const;

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function say(text: string) {
  try {
    Speech.stop();
    Speech.speak(text, { language: "ko-KR" });
  } catch {
    // 무시
  }
}

export function PomodoroScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [tomatoes, setTomatoes] = useState(0); // 오늘 이 화면에서 완료한 집중 세션
  const [autoNext, setAutoNext] = useState(true);
  // 방금 끝난 집중 — 무엇을 공부했는지 입력 대기
  const [pendingNote, setPendingNote] = useState<{ min: number; n: number } | null>(null);
  const [noteText, setNoteText] = useState("");
  const endAt = useRef(0);

  /** 공부 내용과 함께 기록 저장 (비우면 내용 없이) */
  const saveNote = async (text: string) => {
    if (!pendingNote) return;
    const body = text.trim();
    try {
      await addLog(
        todayKey(),
        "study",
        `뽀모도로 ${pendingNote.min}분 (🍅${pendingNote.n})${body ? `: ${body}` : ""}`
      );
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "기록 저장에 실패했어요.");
      return;
    }
    setPendingNote(null);
    setNoteText("");
  };

  /** 남은 시간 ± 조절 (진행 중에도 동작) */
  const adjust = (deltaMin: number) => {
    setRemaining((prev) => {
      const next = Math.max(10, prev + deltaMin * 60); // 최소 10초
      if (running) endAt.current = Date.now() + next * 1000;
      return next;
    });
  };

  const phaseDuration = (p: Phase) =>
    (p === "focus" ? focusMin : p === "break" ? breakMin : 15) * 60;

  // 페이즈 전환
  const nextPhase = (finished: Phase, count: number) => {
    if (finished === "focus") {
      const long = count % 4 === 0;
      const next: Phase = long ? "longBreak" : "break";
      say(
        long
          ? `${count}번째 집중 완료! 잘하고 있어요. 15분 길게 쉬어요.`
          : `집중 끝! 🍅 ${count}개째예요. ${breakMin}분 쉬어요.`
      );
      setPhase(next);
      setRemaining(phaseDuration(next));
    } else {
      say("휴식 끝! 다시 집중해 볼까요?");
      setPhase("focus");
      setRemaining(phaseDuration("focus"));
    }
  };

  // 타이머 (종료 시각 기준으로 정확하게)
  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + remaining * 1000;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(t);
        setRunning(false);
        tapSuccess();
        if (phase === "focus") {
          const n = tomatoes + 1;
          setTomatoes(n);
          // 무엇을 공부했는지 입력 대기 (말하거나 타이핑)
          setPendingNote({ min: focusMin, n });
          nextPhase("focus", n);
        } else {
          nextPhase(phase, tomatoes);
        }
        // 자동 진행: 다음 페이즈 타이머 바로 시작
        if (autoNext) setTimeout(() => setRunning(true), 400);
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(
    () => () => {
      void Speech.stop();
    },
    []
  );

  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setRemaining(focusMin * 60);
  };

  const phaseLabel =
    phase === "focus" ? "🍅 집중" : phase === "break" ? "☕ 휴식" : "🌴 긴 휴식";
  const accent = phase === "focus" ? TOMATO : "#3FBF77";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.phase, { color: accent }]}>{phaseLabel}</Text>
      <Text style={[styles.timer, { color: accent }]}>{fmt(remaining)}</Text>
      <Text style={styles.tomatoRow}>{tomatoes > 0 ? "🍅".repeat(Math.min(tomatoes, 12)) : "오늘의 첫 🍅를 만들어보세요"}</Text>

      {/* 시간 ± 조절 (진행 중에도) */}
      <View style={styles.adjustRow}>
        {[-5, -1, +1, +5].map((d) => (
          <TouchableOpacity key={d} style={styles.adjustChip} onPress={() => adjust(d)}>
            <Text style={styles.adjustText}>
              {d > 0 ? `+${d}` : d}분
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: accent }]}
        onPress={() => setRunning((r) => !r)}
      >
        <Text style={styles.mainButtonText}>{running ? "일시정지" : "시작"}</Text>
      </TouchableOpacity>
      <View style={styles.subRow}>
        <TouchableOpacity onPress={reset} hitSlop={8}>
          <Text style={styles.resetText}>초기화</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAutoNext((v) => !v)} hitSlop={8}>
          <Text style={[styles.resetText, autoNext && { color: TOMATO, fontWeight: "800" }]}>
            자동 진행 {autoNext ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 방금 끝난 집중 — 무엇을 공부했나요? */}
      {pendingNote ? (
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>
            🍅 {pendingNote.n}번째 집중 완료 — 무엇을 공부했나요?
          </Text>
          <View style={styles.noteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="예: 일본어 문법 て형, 알고리즘 DFS"
              placeholderTextColor={c.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              onSubmitEditing={() => saveNote(noteText)}
              returnKeyType="done"
            />
            <MicButton
              size={40}
              onText={(t) =>
                setNoteText((prev) => (prev.trim() ? `${prev.trimEnd()} ${t}` : t))
              }
            />
          </View>
          <View style={styles.noteButtons}>
            <TouchableOpacity
              style={[styles.noteSave, !noteText.trim() && { opacity: 0.5 }]}
              onPress={() => saveNote(noteText)}
            >
              <Text style={styles.noteSaveText}>기록 저장</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => saveNote("")} hitSlop={6}>
              <Text style={styles.noteSkip}>내용 없이 저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* 시간 설정 (정지 상태에서만) */}
      {!running ? (
        <View style={styles.settings}>
          <Text style={styles.settingLabel}>집중</Text>
          <View style={styles.chipRow}>
            {FOCUS_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, focusMin === m && { backgroundColor: TOMATO }]}
                onPress={() => {
                  setFocusMin(m);
                  if (phase === "focus") setRemaining(m * 60);
                }}
              >
                <Text style={[styles.chipText, focusMin === m && { color: "#FFF" }]}>{m}분</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.settingLabel}>휴식</Text>
          <View style={styles.chipRow}>
            {BREAK_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, breakMin === m && { backgroundColor: "#3FBF77" }]}
                onPress={() => setBreakMin(m)}
              >
                <Text style={[styles.chipText, breakMin === m && { color: "#FFF" }]}>{m}분</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          집중이 끝날 때마다 🍅가 쌓이고 생활 기록(학습)에 자동 저장돼요.{"\n"}
          4🍅마다 15분 긴 휴식 — 화면을 켜둔 상태에서 작동해요.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg, alignItems: "center", gap: spacing.md },
    phase: { fontSize: fontSizes.emphasis, fontWeight: "900" },
    timer: { fontSize: 84, fontWeight: "900", fontVariant: ["tabular-nums"] },
    tomatoRow: { fontSize: fontSizes.body, color: c.textMuted },
    mainButton: {
      alignSelf: "stretch",
      borderRadius: 999,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    mainButtonText: { color: "#FFFFFF", fontSize: fontSizes.emphasis, fontWeight: "900" },
    resetText: { color: c.textMuted, fontSize: fontSizes.small, fontWeight: "700" },
    subRow: { flexDirection: "row", gap: spacing.lg },
    adjustRow: { flexDirection: "row", gap: spacing.sm },
    adjustChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 3,
    },
    adjustText: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    noteCard: {
      alignSelf: "stretch",
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    noteTitle: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    noteRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
    noteInput: {
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
    noteButtons: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    noteSave: {
      backgroundColor: TOMATO,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    noteSaveText: { color: "#FFF", fontSize: fontSizes.small, fontWeight: "800" },
    noteSkip: { fontSize: fontSizes.caption, color: c.textMuted, fontWeight: "700" },
    settings: { alignSelf: "stretch", gap: spacing.xs },
    settingLabel: { fontSize: fontSizes.caption, fontWeight: "800", color: c.textMuted },
    chipRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
    chip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 3,
    },
    chipText: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    infoCard: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    infoText: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
  });
