// 루틴 플레이어: 오늘의 루틴을 풀스크린으로 하나씩 진행.
// 지금 할 것 크게 + 다음 것 미리 보여주고, 단계마다 TTS로 읽어주며 시간을 잰다.
// 끝나면 총 소요시간 + 단계별 시간, STT로 소감을 남기면 생활 기록에 저장된다.

import * as Speech from "expo-speech";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MicButton } from "../components/MicButton";
import { addLog } from "../lib/dailyLogs";
import { todayKey } from "../lib/dateUtils";
import { tapSuccess } from "../lib/haptics";
import {
  listCheckedRoutineIds,
  listRoutines,
  routinesForDate,
  setRoutineChecked,
} from "../lib/routines";
import { RootScreenProps } from "../navigation/types";
import { RoutineRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function say(text: string) {
  try {
    Speech.stop();
    Speech.speak(text, { language: "ko-KR" });
  } catch {
    // TTS 실패는 무시
  }
}

export function RoutinePlayerScreen({ navigation }: RootScreenProps<"RoutinePlayer">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = todayKey();
  const [steps, setSteps] = useState<RoutineRow[] | null>(null);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0); // 현재 단계 초
  const [times, setTimes] = useState<{ title: string; sec: number }[]>([]);
  const [done, setDone] = useState(false);
  const stepStart = useRef(Date.now());

  // 오늘의 미완료 루틴 불러오기
  useEffect(() => {
    Promise.all([listRoutines(), listCheckedRoutineIds(today)])
      .then(([all, checked]) => {
        const todays = routinesForDate(all, today).filter((r) => !checked.has(r.id));
        setSteps(todays);
        if (todays.length > 0) {
          say(`루틴 시작! 첫 번째, ${todays[0].title}`);
          stepStart.current = Date.now();
        }
      })
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  }, [today]);

  // 타이머
  useEffect(() => {
    if (done) return;
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - stepStart.current) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [index, done]);

  // 화면 나갈 때 TTS 중단
  useEffect(
    () => () => {
      void Speech.stop();
    },
    []
  );

  const completeStep = async () => {
    if (!steps) return;
    const current = steps[index];
    const sec = Math.floor((Date.now() - stepStart.current) / 1000);
    setTimes((prev) => [...prev, { title: current.title, sec }]);
    tapSuccess();
    try {
      await setRoutineChecked(current.id, today, true);
    } catch {
      // 체크 실패해도 진행
    }
    if (index + 1 < steps.length) {
      const next = steps[index + 1];
      say(`${current.title} 완료, ${fmt(sec)} 걸렸어요. 다음은 ${next.title}`);
      setIndex(index + 1);
      setElapsed(0);
      stepStart.current = Date.now();
    } else {
      setDone(true);
      const total = [...times, { title: current.title, sec }].reduce((s, t) => s + t.sec, 0);
      say(`루틴 끝! 총 ${Math.max(1, Math.round(total / 60))}분 걸렸어요. 오늘도 해냈어요.`);
    }
  };

  if (steps === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.white} />
      </SafeAreaView>
    );
  }

  if (steps.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>오늘 남은 루틴이 없어요</Text>
          <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
            <Text style={styles.exitText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 완료 화면
  if (done) {
    const total = times.reduce((s, t) => s + t.sec, 0);
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.center}>
          <Text style={styles.doneEmoji}>🏆</Text>
          <Text style={styles.doneTitle}>루틴 완료! 총 {fmt(total)}</Text>
          {times.map((t, i) => (
            <View key={i} style={styles.timeRow}>
              <Text style={styles.timeTitle}>{t.title}</Text>
              <Text style={styles.timeSec}>{fmt(t.sec)}</Text>
            </View>
          ))}
          <View style={styles.noteRow}>
            <Text style={styles.noteLabel}>🎙️ 오늘 루틴 어땠는지 말로 남기기</Text>
            <MicButton
              size={48}
              onText={async (text) => {
                try {
                  await addLog(today, "study", `루틴 소감: ${text}`);
                  Alert.alert("저장 완료", "생활 기록에 남겨뒀어요.");
                } catch (e) {
                  Alert.alert("오류", e instanceof Error ? e.message : "저장 실패");
                }
              }}
            />
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
            <Text style={styles.exitText}>끝내기</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const current = steps[index];
  const next = steps[index + 1];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.progress}>
          {index + 1} / {steps.length}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.exitText}>나가기 ✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        <Text style={styles.nowLabel}>지금 할 것</Text>
        <Text style={styles.nowTitle}>{current.title}</Text>
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        {next ? (
          <Text style={styles.nextText}>다음 → {next.title}</Text>
        ) : (
          <Text style={styles.nextText}>마지막 단계예요 💪</Text>
        )}
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={completeStep}>
        <Text style={styles.doneButtonText}>완료 → 다음</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.primary },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    progress: { color: "rgba(255,255,255,0.85)", fontSize: fontSizes.body, fontWeight: "800" },
    exitText: { color: "rgba(255,255,255,0.85)", fontSize: fontSizes.small, fontWeight: "700" },
    center: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
    },
    nowLabel: { color: "rgba(255,255,255,0.7)", fontSize: fontSizes.small, fontWeight: "700" },
    nowTitle: {
      color: "#FFFFFF",
      fontSize: 34,
      fontWeight: "900",
      textAlign: "center",
      lineHeight: 44,
    },
    timer: {
      color: "#FFFFFF",
      fontSize: 52,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
      marginVertical: spacing.md,
    },
    nextText: { color: "rgba(255,255,255,0.8)", fontSize: fontSizes.body, fontWeight: "700" },
    doneButton: {
      margin: spacing.md,
      backgroundColor: "#FFFFFF",
      borderRadius: 999,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    doneButtonText: { color: c.primary, fontSize: fontSizes.emphasis, fontWeight: "900" },
    doneEmoji: { fontSize: 56 },
    doneTitle: { color: "#FFFFFF", fontSize: fontSizes.title, fontWeight: "900" },
    timeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignSelf: "stretch",
      paddingHorizontal: spacing.lg,
      paddingVertical: 3,
    },
    timeTitle: { color: "rgba(255,255,255,0.9)", fontSize: fontSizes.small },
    timeSec: {
      color: "#FFFFFF",
      fontSize: fontSizes.small,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    noteRow: { alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
    noteLabel: { color: "rgba(255,255,255,0.85)", fontSize: fontSizes.small, fontWeight: "700" },
    exitButton: {
      marginTop: spacing.lg,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 999,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 4,
    },
  });
