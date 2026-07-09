import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { generateBriefing } from "../lib/aiHelper";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const cacheKey = (dateKey: string) => `briefing.${dateKey}`;

/** 오늘 탭 상단의 AI 아침 브리핑. 하루 1회 자동 생성 후 캐시. */
export function BriefingCard({ dateKey }: { dateKey: string }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [text, setText] = useState<string | null>(null);
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
    }, [load])
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
  });
