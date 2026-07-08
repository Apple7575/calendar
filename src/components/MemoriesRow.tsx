import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getMemories, Memory } from "../lib/diary";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

type Props = {
  todayKey: string;
  onPressMemory: (date: string) => void;
};

/** "과거의 오늘" — 1달/3달/6달/1년/2년 전 같은 날의 일기 카드 */
export function MemoriesRow({ todayKey, onPressMemory }: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [memories, setMemories] = useState<Memory[]>([]);

  useFocusEffect(
    useCallback(() => {
      getMemories(todayKey)
        .then(setMemories)
        .catch(() => setMemories([])); // 추억 로드 실패는 조용히 숨김
    }, [todayKey])
  );

  if (memories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>그날의 기록 ✨</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {memories.map((m) => (
          <TouchableOpacity
            key={m.date}
            style={styles.card}
            onPress={() => onPressMemory(m.date)}
            activeOpacity={0.8}
          >
            {m.photoUrl ? (
              <Image source={{ uri: m.photoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]}>
                <Text style={styles.photoEmptyEmoji}>{m.mood ?? "📖"}</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.label}>
                {m.label}
                {m.mood ? ` ${m.mood}` : ""}
              </Text>
              <Text style={styles.snippet} numberOfLines={2}>
                {m.content || "사진으로 남긴 날"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    title: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
      marginBottom: spacing.sm,
      letterSpacing: -0.3,
    },
    card: {
      width: 220,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginRight: spacing.sm,
      overflow: "hidden",
      ...cardShadow(c.shadow),
    },
    photo: { width: "100%", height: 100, backgroundColor: c.surface },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    photoEmptyEmoji: { fontSize: 36 },
    cardBody: { padding: spacing.sm + 2 },
    label: { fontSize: fontSizes.caption, fontWeight: "800", color: c.primary },
    snippet: { fontSize: fontSizes.small, color: c.text, marginTop: 2, lineHeight: 19 },
  });
