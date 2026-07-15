// 리캡: 한 해/한 달을 카드로 돌아보기 (Wrapped 스타일)
// periodKey: "2026" 또는 "2026-07"

import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoodFace } from "../components/cute/MoodFace";
import { listOotd, OotdLog } from "../lib/closet";
import { GalleryPhoto, galleryPhotoToViewer, listLikedPhotos } from "../lib/gallery";
import { RootScreenProps, RootStackParamList } from "../navigation/types";
import { supabase } from "../lib/supabase";
import { dailyTotals, listExercises, listRecentRecords } from "../lib/workouts";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

type Stat = { emoji: string; label: string; value: string };

export function RecapScreen({ route }: RootScreenProps<"Recap">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { periodKey } = route.params;
  const label = periodKey.length === 4 ? `${periodKey}년` : `${Number(periodKey.slice(5))}월`;
  const [stats, setStats] = useState<Stat[]>([]);
  const [topMood, setTopMood] = useState<string | null>(null);
  const [liked, setLiked] = useState<GalleryPhoto[]>([]);
  const [ootd, setOotd] = useState<OotdLog[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: diaries }, likedAll, exercises, records, { data: logs }, ootdAll] =
        await Promise.all([
          supabase.from("diaries").select("date, mood, people").like("date", `${periodKey}%`),
          listLikedPhotos().catch(() => []),
          listExercises().catch(() => []),
          listRecentRecords().catch(() => []),
          supabase.from("daily_logs").select("date, kind, value_num").like("date", `${periodKey}%`),
          listOotd().catch(() => [] as OotdLog[]),
        ]);
      setOotd(ootdAll.filter((o) => o.date.startsWith(periodKey) && o.url).slice(0, 6));
      const dRows = (diaries ?? []) as { date: string; mood: string | null; people: string[] }[];
      // 최다 기분
      const moods = new Map<string, number>();
      for (const d of dRows) if (d.mood) moods.set(d.mood, (moods.get(d.mood) ?? 0) + 1);
      setTopMood([...moods.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
      // 최다 함께한 사람
      const ppl = new Map<string, number>();
      for (const d of dRows) for (const p of d.people ?? []) ppl.set(p, (ppl.get(p) ?? 0) + 1);
      const topPeople = [...ppl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      // 운동/장소/지출
      const logRows = (logs ?? []) as { date: string; kind: string; value_num: number | null }[];
      const workoutDays = new Set([
        ...records.filter((r) => r.date.startsWith(periodKey)).map((r) => r.date),
        ...logRows.filter((l) => l.kind === "workout").map((l) => l.date),
      ]).size;
      const spend = logRows
        .filter((l) => l.kind === "money" && l.value_num != null)
        .reduce((s, l) => s + Number(l.value_num), 0);
      // 종목 최고 성장
      let growth = "";
      for (const ex of exercises) {
        const series = dailyTotals(records, ex.id).filter((s) => s.date.startsWith(periodKey));
        if (series.length >= 2) {
          const d = series[series.length - 1].total - series[0].total;
          if (d > 0) growth = `${ex.name} +${d}${ex.unit}`;
        }
      }
      setLiked(likedAll.filter((p) => p.date.startsWith(periodKey)).slice(0, 6));
      setStats(
        [
          { emoji: "📓", label: "일기", value: `${dRows.length}개` },
          topPeople.length
            ? { emoji: "🤝", label: "가장 많이 함께", value: topPeople.map(([n]) => n).join(", ") }
            : null,
          { emoji: "💪", label: "운동한 날", value: `${workoutDays}일` },
          growth ? { emoji: "📈", label: "최고 성장", value: growth } : null,
          spend > 0
            ? { emoji: "💸", label: "기록한 지출", value: `${spend.toLocaleString()}원` }
            : null,
        ].filter((s): s is Stat => s !== null)
      );
    })();
  }, [periodKey]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>나의 {label}</Text>
      {topMood ? (
        <View style={styles.moodCard}>
          <MoodFace mood={topMood} size={64} />
          <Text style={styles.moodLabel}>{label}의 대표 기분</Text>
        </View>
      ) : null}
      {stats.map((s, i) => (
        <View key={i} style={styles.statCard}>
          <Text style={styles.statEmoji}>{s.emoji}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
          <Text style={styles.statValue}>{s.value}</Text>
        </View>
      ))}
      {liked.length > 0 ? (
        <View style={styles.photoCard}>
          <Text style={styles.statLabel}>♥ 기억에 남는 순간</Text>
          <View style={styles.photoGrid}>
            {liked.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                onPress={() =>
                  navigation.navigate("PhotoViewer", {
                    photos: liked.map(galleryPhotoToViewer),
                    index: i,
                  })
                }
              >
                <Image source={{ uri: p.url }} style={styles.photo} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      {ootd.length > 0 ? (
        <View style={styles.photoCard}>
          <Text style={styles.statLabel}>👗 {label}의 코디</Text>
          <View style={styles.photoGrid}>
            {ootd.map((o, i) => (
              <TouchableOpacity
                key={o.id}
                onPress={() =>
                  navigation.navigate("PhotoViewer", {
                    photos: ootd.map((x) => ({ url: x.url as string })),
                    index: i,
                  })
                }
              >
                <Image source={{ uri: o.url! }} style={styles.photo} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
      <Text style={styles.footer}>기록한 만큼 보이는 {label}이었어요 ✨</Text>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    title: {
      fontSize: fontSizes.hero,
      fontWeight: "900",
      color: c.text,
      textAlign: "center",
      marginVertical: spacing.sm,
    },
    moodCard: {
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      ...cardShadow(c.shadow),
    },
    moodLabel: { fontSize: fontSizes.small, color: c.textMuted, fontWeight: "700" },
    statCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: c.card,
      borderRadius: radii.card,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    statEmoji: { fontSize: 22 },
    statLabel: { flex: 1, fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    statValue: { fontSize: fontSizes.emphasis, fontWeight: "900", color: c.primary },
    photoCard: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
    photo: { width: 98, height: 98, borderRadius: radii.button, backgroundColor: c.surface },
    footer: {
      textAlign: "center",
      fontSize: fontSizes.small,
      color: c.textMuted,
      marginTop: spacing.md,
    },
  });
