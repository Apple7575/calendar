import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { generateBriefing } from "../lib/aiHelper";
import { weekStartOf } from "../lib/dateUtils";
import { randomExpression } from "../lib/diaryLang";
import { ExpressionRow } from "../lib/supabase";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const cacheKey = (dateKey: string) => `briefing.${dateKey}`;

/** 오늘 탭 상단의 AI 아침 브리핑. 하루 1회 자동 생성 후 캐시. */
export function BriefingCard({ dateKey }: { dateKey: string }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [text, setText] = useState<string | null>(null);
  const [expression, setExpression] = useState<ExpressionRow | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(
    async (force: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        if (!force) {
          const cached = await AsyncStorage.getItem(cacheKey(dateKey));
          if (cached) {
            setText(cached);
            return;
          }
        }
        setLoading(true);
        const briefing = await generateBriefing(dateKey);
        await AsyncStorage.setItem(cacheKey(dateKey), briefing);
        setText(briefing);
        setHidden(false);
      } catch {
        // AI 미설정/실패 시 조용히 숨김 (오늘 탭을 막지 않는다)
        setHidden(true);
      } finally {
        setLoading(false);
        inFlight.current = false;
      }
    },
    [dateKey]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
      // 복습 표현 하나 (없으면 조용히 생략)
      randomExpression().then(setExpression).catch(() => {});
      // 이번 주 다짐 (주간 회고에서 저장)
      AsyncStorage.getItem(`resolution.${weekStartOf(dateKey)}`)
        .then((v) => setResolution(v))
        .catch(() => {});
    }, [load, dateKey])
  );

  if (hidden) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Ionicons name="sunny" size={15} color={c.dotTask} />
          <Text style={styles.title}>아침 브리핑</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} hitSlop={8} disabled={loading}>
          <Ionicons name="refresh" size={15} color={c.textMuted} />
        </TouchableOpacity>
      </View>
      {loading || text === null ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={styles.loadingText}>오늘 하루를 정리하는 중…</Text>
        </View>
      ) : (
        <Text style={styles.body}>{text}</Text>
      )}
      {resolution ? (
        <Text style={styles.resolution}>🌱 이번 주 다짐 — {resolution}</Text>
      ) : null}
      {expression ? (
        <TouchableOpacity
          style={styles.expressionRow}
          onPress={() => navigation.navigate("Expressions")}
          activeOpacity={0.7}
        >
          <Text style={styles.expressionFlag}>{expression.lang === "en" ? "🇺🇸" : "🇯🇵"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.expressionText} numberOfLines={1}>
              {expression.expression}
            </Text>
            <Text style={styles.expressionMeaning} numberOfLines={1}>
              {expression.meaning}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xs + 2,
    },
    titleWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
    title: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    loadingText: { fontSize: fontSizes.small, color: c.textMuted },
    body: { fontSize: fontSizes.body, color: c.text, lineHeight: 23 },
    expressionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    expressionFlag: { fontSize: 16 },
    resolution: {
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.primary,
      marginTop: spacing.sm,
    },
    expressionText: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    expressionMeaning: { fontSize: fontSizes.caption, color: c.textMuted },
  });
