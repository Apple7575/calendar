import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeartBurst } from "../components/cute/HeartBurst";
import { getOriginalUrl, setPhotoLiked } from "../lib/diary";
import { appleMapsUrl } from "../lib/location";
import { RootScreenProps, ViewerPhoto } from "../navigation/types";
import { fontSizes, spacing } from "../theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTakenAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} (${
    WEEKDAYS_KO[d.getDay()]
  }) ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function PhotoViewerScreen({ route, navigation }: RootScreenProps<"PhotoViewer">) {
  const { photos, index } = route.params;
  const [current, setCurrent] = useState(index);
  // 하트 상태 (파라미터는 고정이므로 로컬로 관리)
  const [likedById, setLikedById] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of photos) if (p.id) map[p.id] = !!p.liked;
    return map;
  });
  // 원본 보기 상태: 사진 인덱스별 원본 signed URL / 표시 여부
  const [originalUrls, setOriginalUrls] = useState<Record<number, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<number, boolean>>({});
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);

  const photo: ViewerPhoto | undefined = photos[current];
  const liked = photo?.id ? likedById[photo.id] : undefined;

  const toggleLike = async () => {
    if (!photo?.id) return;
    const next = !likedById[photo.id];
    setLikedById((prev) => ({ ...prev, [photo.id!]: next }));
    if (next) setHeartBurst((n) => n + 1);
    try {
      await setPhotoLiked(photo.id, next);
    } catch (e) {
      setLikedById((prev) => ({ ...prev, [photo.id!]: !next }));
      Alert.alert("오류", e instanceof Error ? e.message : "좋아요 저장에 실패했어요.");
    }
  };

  const toggleOriginal = async () => {
    if (!photo?.originalPath) return;
    if (showOriginal[current]) {
      setShowOriginal((prev) => ({ ...prev, [current]: false }));
      return;
    }
    if (!originalUrls[current]) {
      setLoadingOriginal(true);
      try {
        const url = await getOriginalUrl(photo.originalPath);
        setOriginalUrls((prev) => ({ ...prev, [current]: url }));
      } catch (e) {
        Alert.alert("오류", e instanceof Error ? e.message : "원본을 불러오지 못했어요.");
        return;
      } finally {
        setLoadingOriginal(false);
      }
    }
    setShowOriginal((prev) => ({ ...prev, [current]: true }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
        keyExtractor={(p, i) => `${i}-${p.url}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
        renderItem={({ item, index: i }) => (
          <View style={styles.page}>
            <Image
              source={{ uri: showOriginal[i] && originalUrls[i] ? originalUrls[i] : item.url }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}
        extraData={[showOriginal, originalUrls]}
      />

      <View style={styles.topBar} pointerEvents="box-none">
        <Text style={styles.counter}>
          {current + 1} / {photos.length}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.close}>닫기 ✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <View style={styles.metaCol}>
          {photo?.takenAt ? (
            <Text style={styles.takenAt}>{formatTakenAt(photo.takenAt)}</Text>
          ) : null}
          {photo?.lat != null && photo?.lng != null ? (
            <TouchableOpacity
              style={styles.placeRow}
              hitSlop={6}
              onPress={() =>
                Linking.openURL(appleMapsUrl(photo.lat!, photo.lng!, photo.place)).catch(() => {})
              }
            >
              <Ionicons name="location" size={12} color="#7EC8FF" />
              <Text style={styles.placeText}>{photo.place ?? "지도에서 보기"}</Text>
            </TouchableOpacity>
          ) : null}
          {showOriginal[current] ? <Text style={styles.originalBadge}>원본</Text> : null}
        </View>
        <View style={styles.actions}>
          {photo?.originalPath ? (
            <TouchableOpacity style={styles.actionButton} onPress={toggleOriginal} hitSlop={8}>
              {loadingOriginal ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={showOriginal[current] ? "time" : "time-outline"}
                  size={24}
                  color="#FFFFFF"
                />
              )}
              <Text style={styles.actionLabel}>
                {showOriginal[current] ? "시각 표시" : "원본 보기"}
              </Text>
            </TouchableOpacity>
          ) : null}
          {photo?.id ? (
            <View>
              <HeartBurst trigger={heartBurst} />
              <TouchableOpacity style={styles.actionButton} onPress={toggleLike} hitSlop={8}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={26}
                  color={liked ? "#FF5A79" : "#FFFFFF"}
                />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  page: { width: SCREEN_W, justifyContent: "center" },
  image: { width: SCREEN_W, height: "100%" },
  topBar: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  counter: { color: "#FFFFFF", fontSize: fontSizes.body, fontWeight: "700" },
  close: { color: "#FFFFFF", fontSize: fontSizes.body, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  metaCol: { gap: 4 },
  takenAt: {
    color: "#FFFFFF",
    fontSize: fontSizes.small,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 3,
  },
  originalBadge: {
    color: "#FFC94A",
    fontSize: fontSizes.caption,
    fontWeight: "800",
  },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  placeText: {
    color: "#7EC8FF",
    fontSize: fontSizes.caption,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 3,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  actionButton: { alignItems: "center", gap: 2 },
  actionLabel: { color: "#FFFFFF", fontSize: fontSizes.caption },
});
