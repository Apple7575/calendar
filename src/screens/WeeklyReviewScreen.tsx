// 주간 회고: ① 주간 리포트 → ② 목표 진전 확인 → ③ 다음 주 다짐 한 줄.
// 다짐은 다음 주 아침 브리핑 카드에 함께 표시된다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { generateReport, getCachedReport } from "../lib/aiReports";
import { addDays, todayKey, weekStartOf } from "../lib/dateUtils";
import { checkinSummary, listGoals } from "../lib/goals";
import { tapSuccess } from "../lib/haptics";
import { GoalRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

/** 다음 주 다짐 저장 키 (다음 주 월요일 기준) */
export function resolutionKeyFor(dateKey: string): string {
  return `resolution.${weekStartOf(dateKey)}`;
}

export function WeeklyReviewScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const today = todayKey();
  const thisWeek = weekStartOf(today);
  const nextWeek = addDays(thisWeek, 7);
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [checkins, setCheckins] = useState<Record<string, { count: number; lastNote: string; lastDate: string }>>({});
  const [resolution, setResolution] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCachedReport("weekly", thisWeek).then(setReport).catch(() => {});
    listGoals().then(setGoals).catch(() => {});
    checkinSummary().then(setCheckins).catch(() => {});
    AsyncStorage.getItem(`resolution.${nextWeek}`).then((v) => v && setResolution(v));
  }, [thisWeek, nextWeek]);

  const makeReport = async () => {
    setLoadingReport(true);
    try {
      setReport(await generateReport("weekly", thisWeek, false));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "리포트 생성에 실패했어요.");
    } finally {
      setLoadingReport(false);
    }
  };

  const saveResolution = async () => {
    await AsyncStorage.setItem(`resolution.${nextWeek}`, resolution.trim());
    setSaved(true);
    tapSuccess();
    Alert.alert("저장 완료", "다음 주 아침 브리핑에서 이 다짐을 만나게 될 거예요.");
  };

  const active = goals.filter((g) => !g.done);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. 이번 주 돌아보기 */}
      <Text style={styles.step}>1 · 이번 주 돌아보기</Text>
      <View style={styles.card}>
        {report ? (
          report.split("\n").map((line, i) =>
            line.startsWith("## ") ? (
              <Text key={i} style={styles.heading}>
                {line.slice(3)}
              </Text>
            ) : line.trim() === "" ? (
              <View key={i} style={{ height: spacing.xs }} />
            ) : (
              <Text key={i} style={styles.body}>
                {line}
              </Text>
            )
          )
        ) : loadingReport ? (
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.hint}>한 주를 정리하는 중… ☕</Text>
          </View>
        ) : (
          <PrimaryButton title="주간 리포트 만들기" onPress={makeReport} />
        )}
      </View>

      {/* 2. 목표 진전 */}
      <Text style={styles.step}>2 · 목표는 얼마나 나아갔나</Text>
      <View style={styles.card}>
        {active.length === 0 ? (
          <Text style={styles.hint}>진행 중인 목표가 없어요. 관심사 탭에서 목표를 적어보세요.</Text>
        ) : (
          active.map((g) => (
            <View key={g.id} style={styles.goalRow}>
              <Text style={styles.goalTitle}>{g.title}</Text>
              <Text style={styles.goalMeta}>
                {checkins[g.id]
                  ? `진전 ${checkins[g.id].count}회 · 최근 ${checkins[g.id].lastDate.slice(5)}`
                  : "아직 기록된 진전 없음"}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* 3. 다음 주 다짐 */}
      <Text style={styles.step}>3 · 다음 주 다짐 한 줄</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="예: 자기 전 폰 대신 일본어 단어 10개"
          placeholderTextColor={c.textMuted}
          value={resolution}
          onChangeText={(t) => {
            setResolution(t);
            setSaved(false);
          }}
          multiline
        />
        <PrimaryButton
          title={saved ? "저장됨 ✓" : "다짐 저장"}
          onPress={saveResolution}
          disabled={!resolution.trim()}
        />
        <Text style={styles.hint}>다음 주 매일 아침 브리핑 카드에 이 다짐이 함께 보여요.</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    step: { fontSize: fontSizes.small, fontWeight: "900", color: c.primary, marginTop: spacing.xs },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    heading: { fontSize: fontSizes.body, fontWeight: "800", color: c.primary, marginTop: spacing.xs },
    body: { fontSize: fontSizes.small, color: c.text, lineHeight: 22 },
    hint: { fontSize: fontSizes.caption, color: c.textMuted, lineHeight: 17 },
    goalRow: { gap: 1 },
    goalTitle: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    goalMeta: { fontSize: fontSizes.caption, color: c.textMuted },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      padding: spacing.sm + 4,
      fontSize: fontSizes.body,
      color: c.text,
      minHeight: 60,
    },
  });
