import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { addMonths, todayKey } from "../lib/dateUtils";
import { GalleryMonth, listMonthPhotos } from "../lib/gallery";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLS = 3;
const GAP = 3;
const THUMB = (Dimensions.get("window").width - GAP * (COLS - 1)) / COLS;

/** 월별 일기 사진 앨범 */
export function GalleryScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [months, setMonths] = useState<GalleryMonth[]>([]);
  const [cursor, setCursor] = useState(todayKey().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(
    async (count: number) => {
      setLoading(true);
      setError(null);
      try {
        let key = cursor;
        const added: GalleryMonth[] = [];
        for (let i = 0; i < count; i++) {
          const photos = await listMonthPhotos(key);
          added.push({ monthKey: key, photos });
          key = addMonths(key, -1);
        }
        setMonths((prev) => [...prev, ...added]);
        setCursor(key);
      } catch (e) {
        setError(e instanceof Error ? e.message : "사진을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    },
    [cursor]
  );

  useEffect(() => {
    loadMore(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nonEmpty = months.filter((m) => m.photos.length > 0);
  const totalLoaded = months.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {nonEmpty.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="images-outline" size={36} color={c.textMuted} />
          <Text style={styles.emptyText}>
            아직 사진이 없어요.{"\n"}일기에 사진을 추가하면 여기에 모여요.
          </Text>
        </View>
      ) : null}

      {nonEmpty.map((m) => (
        <View key={m.monthKey} style={styles.monthSection}>
          <Text style={styles.monthTitle}>
            {Number(m.monthKey.slice(0, 4))}년 {Number(m.monthKey.slice(5, 7))}월
            <Text style={styles.monthCount}>  {m.photos.length}장</Text>
          </Text>
          <View style={styles.grid}>
            {m.photos.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                onPress={() =>
                  navigation.navigate("PhotoViewer", {
                    urls: m.photos.map((x) => x.url),
                    index: i,
                  })
                }
              >
                <Image source={{ uri: p.url }} style={styles.thumb} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {loading ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
      ) : (
        <TouchableOpacity style={styles.moreButton} onPress={() => loadMore(3)}>
          <Text style={styles.moreText}>이전 달 더 보기</Text>
        </TouchableOpacity>
      )}
      {totalLoaded > 0 ? (
        <Text style={styles.loadedHint}>최근 {totalLoaded}개월을 확인했어요</Text>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: spacing.xl },
    error: { color: c.danger, fontSize: fontSizes.small, padding: spacing.md },
    emptyWrap: { alignItems: "center", marginTop: spacing.xl * 2, gap: spacing.md },
    emptyText: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      textAlign: "center",
      lineHeight: 20,
    },
    monthSection: { marginBottom: spacing.md },
    monthTitle: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    monthCount: { fontSize: fontSizes.caption, fontWeight: "400", color: c.textMuted },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
    thumb: { width: THUMB, height: THUMB, backgroundColor: c.surface },
    moreButton: {
      alignSelf: "center",
      backgroundColor: c.surface,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      marginTop: spacing.sm,
    },
    moreText: { color: c.text, fontSize: fontSizes.small, fontWeight: "700" },
    loadedHint: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.caption,
      marginTop: spacing.sm,
    },
  });
