// 연간 보기 하단 "올해의 기록": 일기 수·최다 기분 + ♥ 사진(기억에 남는 순간) + 연간 리포트.

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DiaryEntry } from "../lib/diary";
import { GalleryPhoto, galleryPhotoToViewer, listLikedPhotos } from "../lib/gallery";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function YearMemories({ year, entries }: { year: number; entries: DiaryEntry[] }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [liked, setLiked] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;
    listLikedPhotos()
      .then((all) => {
        if (!cancelled) setLiked(all.filter((p) => p.date.startsWith(String(year))));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [year]);

  const diaryCount = entries.length;
  const topMood = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) if (e.mood) counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1);
    let best: string | null = null;
    let max = 0;
    for (const [mood, n] of counts) if (n > max) [best, max] = [mood, n];
    return best;
  }, [entries]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{year}년의 기록</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{diaryCount}</Text>
          <Text style={styles.statLabel}>일기</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{topMood ?? "–"}</Text>
          <Text style={styles.statLabel}>올해 최다 기분</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{liked.length}</Text>
          <Text style={styles.statLabel}>♥ 순간</Text>
        </View>
      </View>

      {liked.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>기억에 남는 순간</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoRow}>
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
          </ScrollView>
        </>
      ) : (
        <Text style={styles.emptyText}>
          일기를 쓰고 사진에 ♥를 누르면 올해의 순간이 여기에 쌓여요.
        </Text>
      )}

      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => navigation.navigate("Recap", { periodKey: String(year) })}
      >
        <Text style={styles.reportButtonText}>🎁 {year}년 리캡 카드 보기</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() =>
          // 리포트 탭으로 이동 (탭 네비게이터 형제 화면)
          (navigation as unknown as { navigate: (name: string) => void }).navigate("Report")
        }
      >
        <Text style={styles.reportButtonText}>✨ 연간 AI 리포트에서 한 해 돌아보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    title: { fontSize: fontSizes.emphasis, fontWeight: "900", color: c.text },
    statsRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xs },
    statBox: { flex: 1, alignItems: "center" },
    statValue: { fontSize: fontSizes.title, fontWeight: "900", color: c.primary },
    statLabel: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 2 },
    divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: c.border },
    sectionLabel: { fontSize: fontSizes.caption, fontWeight: "800", color: c.textMuted },
    photoRow: { flexDirection: "row", gap: spacing.sm },
    photo: { width: 76, height: 76, borderRadius: radii.button, backgroundColor: c.surface },
    emptyText: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      paddingVertical: spacing.sm,
      lineHeight: 18,
    },
    reportButton: {
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingVertical: spacing.sm + 2,
      alignItems: "center",
      marginTop: spacing.xs,
    },
    reportButtonText: { color: c.primary, fontSize: fontSizes.small, fontWeight: "800" },
  });
