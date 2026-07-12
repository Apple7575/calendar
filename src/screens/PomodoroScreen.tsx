// 뽀모도로: 집중 25분 → 휴식 5분, 4세트마다 긴 휴식 15분.
// 페이즈가 끝나면 TTS가 말을 걸고, 완료한 집중 세션은 생활 기록(학습)에 저장된다.

import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const endAt = useRef(0);

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
          // 완료한 집중 세션을 생활 기록으로
          addLog(todayKey(), "study", `뽀모도로 집중 ${focusMin}분 (🍅${n})`).catch(() => {});
          nextPhase("focus", n);
        } else {
          nextPhase(phase, tomatoes);
        }
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

      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: accent }]}
        onPress={() => setRunning((r) => !r)}
      >
        <Text style={styles.mainButtonText}>{running ? "일시정지" : "시작"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={reset} hitSlop={8}>
        <Text style={styles.resetText}>초기화</Text>
      </TouchableOpacity>

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
