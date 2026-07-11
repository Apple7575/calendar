import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
import { SleepyCat } from "../components/cute/SleepyCat";
import { addMonths, todayKey } from "../lib/dateUtils";
import {
  GalleryMonth,
  GalleryPhoto,
  galleryPhotoToViewer,
  listLikedPhotos,
  listMonthPhotos,
} from "../lib/gallery";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLS = 3;
const GAP = 3;
const THUMB = (Dimensions.get("window").width - GAP * (COLS - 1)) / COLS;

function Thumb({
  photo,
  onPress,
  styles,
}: {
  photo: GalleryPhoto;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Image source={{ uri: photo.url }} style={styles.thumb} />
      {photo.liked ? (
        <Ionicons name="heart" size={14} color="#FF5A79" style={styles.thumbHeart} />
      ) : null}
    </TouchableOpacity>
  );
}

/** 월별 일기 사진 앨범 + 좋아요 모아보기 */
export function GalleryScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<"all" | "liked">("all");
  const [months, setMonths] = useState<GalleryMonth[]>([]);
  const [cursor, setCursor] = useState(todayKey().slice(0, 7));
  const [liked, setLiked] = useState<GalleryPhoto[] | null>(null);
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

  // 좋아요 탭: 뷰어에서 하트를 바꿨을 수 있으니 포커스마다 새로 불러온다
  useFocusEffect(
    useCallback(() => {
      if (tab !== "liked") return;
      setLoading(true);
      listLikedPhotos()
        .then(setLiked)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "좋아요 사진을 불러오지 못했어요.")
        )
        .finally(() => setLoading(false));
    }, [tab])
  );

  const openViewer = (photos: GalleryPhoto[], index: number) => {
    navigation.navigate("PhotoViewer", {
      photos: photos.map(galleryPhotoToViewer),
      index,
    });
  };

  const nonEmpty = months.filter((m) => m.photos.length > 0);
  const totalLoaded = months.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabChip, tab === "all" && styles.tabChipActive]}
          onPress={() => setTab("all")}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>전체</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabChip, tab === "liked" && styles.tabChipActive]}
          onPress={() => setTab("liked")}
        >
          <Ionicons
            name="heart"
            size={13}
            color={tab === "liked" ? c.white : "#FF5A79"}
          />
          <Text style={[styles.tabText, tab === "liked" && styles.tabTextActive]}>
            좋아요
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {tab === "liked" ? (
        <>
          {liked && liked.length === 0 && !loading ? (
            <View style={styles.emptyWrap}>
              <SleepyCat color={c.textMuted} />
              <Text style={styles.emptyText}>
                아직 좋아요한 사진이 없어요.{"\n"}사진을 크게 보고 ♥를 눌러보세요.
              </Text>
            </View>
          ) : null}
          <View style={styles.grid}>
            {(liked ?? []).map((p, i) => (
              <Thumb key={p.id} photo={p} styles={styles} onPress={() => openViewer(liked ?? [], i)} />
            ))}
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
          ) : null}
        </>
      ) : (
        <>
          {nonEmpty.length === 0 && !loading ? (
            <View style={styles.emptyWrap}>
              <SleepyCat color={c.textMuted} />
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
                  <Thumb key={p.id} photo={p} styles={styles} onPress={() => openViewer(m.photos, i)} />
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
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: spacing.xl },
    tabRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    tabChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 3,
    },
    tabChipActive: { backgroundColor: c.primary },
    tabText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    tabTextActive: { color: c.white },
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
    thumbHeart: {
      position: "absolute",
      right: 5,
      bottom: 5,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowRadius: 2,
    },
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
