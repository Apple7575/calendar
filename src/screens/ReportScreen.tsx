import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { InsightsView } from "../components/InsightsView";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  generateReport,
  getCachedReport,
  periodLabel,
  ReportType,
} from "../lib/aiReports";
import { addDays, addMonths, todayKey, weekStartOf } from "../lib/dateUtils";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

type TabType = ReportType | "metrics";

const TYPES: { value: TabType; label: string }[] = [
  { value: "metrics", label: "지표" },
  { value: "daily", label: "하루" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
  { value: "yearly", label: "연간" },
  { value: "mood", label: "기분" },
];

function defaultPeriod(type: ReportType): string {
  const today = todayKey();
  if (type === "daily") return today;
  if (type === "weekly") return weekStartOf(today);
  if (type === "monthly" || type === "mood") return today.slice(0, 7);
  return today.slice(0, 4);
}

function shiftPeriod(type: ReportType, periodKey: string, delta: number): string {
  if (type === "daily") return addDays(periodKey, delta);
  if (type === "weekly") return addDays(periodKey, delta * 7);
  if (type === "monthly" || type === "mood") return addMonths(periodKey, delta);
  return String(Number(periodKey) + delta);
}

/** '## 제목' 마크다운 소제목만 간단히 스타일링해 표시 */
function ReportBody({ content, styles }: { content: string; styles: Styles }) {
  const lines = content.split("\n");
  return (
    <View>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <Text key={i} style={styles.reportHeading}>
              {line.slice(3)}
            </Text>
          );
        }
        if (line.trim() === "") return <View key={i} style={{ height: spacing.sm }} />;
        return (
          <Text key={i} style={styles.reportText}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

export function ReportScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [type, setType] = useState<TabType>("metrics");
  const [periodKey, setPeriodKey] = useState(defaultPeriod("daily"));
  const [content, setContent] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);

  const changeType = (t: TabType) => {
    setType(t);
    if (t !== "metrics") setPeriodKey(defaultPeriod(t));
  };

  // 기간 변경 시 캐시된 리포트 확인
  const loadCached = useCallback(async () => {
    if (type === "metrics") return;
    setChecking(true);
    setContent(null);
    try {
      setContent(await getCachedReport(type, periodKey));
    } finally {
      setChecking(false);
    }
  }, [type, periodKey]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const handleGenerate = async (force: boolean) => {
    if (type === "metrics") return;
    setGenerating(true);
    try {
      setContent(await generateReport(type, periodKey, force));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "리포트 생성에 실패했어요.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 종류 선택 */}
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.typeChip, type === t.value && styles.typeChipActive]}
            onPress={() => changeType(t.value)}
          >
            <Text style={[styles.typeText, type === t.value && styles.typeTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {type === "metrics" ? (
        <View style={[styles.body, { paddingTop: spacing.md }]}>
          <InsightsView />
        </View>
      ) : (
        <>
      {/* 기간 이동 */}
      <View style={styles.periodRow}>
        <TouchableOpacity onPress={() => setPeriodKey(shiftPeriod(type, periodKey, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.primary} />
        </TouchableOpacity>
        <Text style={styles.periodText}>{periodLabel(type, periodKey)}</Text>
        <TouchableOpacity onPress={() => setPeriodKey(shiftPeriod(type, periodKey, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {checking ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
        ) : generating ? (
          <View style={styles.generating}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={styles.generatingText}>
              AI가 기록을 정리하는 중이에요…{"\n"}수십 초 정도 걸릴 수 있어요 ☕
            </Text>
          </View>
        ) : content ? (
          <View style={styles.reportCard}>
            <ReportBody content={content} styles={styles} />
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton
                title="다시 생성"
                variant="secondary"
                onPress={() => handleGenerate(true)}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="sparkles-outline" size={36} color={c.textMuted} />
            <Text style={styles.emptyText}>
              {type === "mood"
                ? "최근 3개월의 기분 기록을 분석해서\n기분 흐름과 패턴을 알려드려요."
                : `이 기간의 일정, 할 일, 루틴, 일기${
                    type === "daily" ? ", 사진" : ""
                  }을 모아\nAI가 회고 리포트를 써드려요.`}
            </Text>
            <View style={{ alignSelf: "stretch" }}>
              <PrimaryButton title="리포트 생성" onPress={() => handleGenerate(false)} />
            </View>
          </View>
        )}
      </ScrollView>
        </>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    typeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    typeChip: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: 2,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    typeText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    typeTextActive: { color: c.white },
    periodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    periodText: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
      minWidth: 140,
      textAlign: "center",
    },
    body: { flex: 1, paddingHorizontal: spacing.md },
    generating: { alignItems: "center", marginTop: spacing.xl, gap: spacing.md },
    generatingText: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      textAlign: "center",
      lineHeight: 20,
    },
    emptyWrap: { alignItems: "center", marginTop: spacing.xl, gap: spacing.md },
    emptyText: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      textAlign: "center",
      lineHeight: 20,
    },
    reportCard: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md + 2,
    },
    reportHeading: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    reportText: { fontSize: fontSizes.body, color: c.text, lineHeight: 25 },
  });
