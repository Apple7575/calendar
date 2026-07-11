// 추억 지도: 위치가 기록된 사진들을 최신순으로 모아보고, 탭하면 Apple 지도로 연다.

import { useFocusEffect } from "@react-navigation/native";
import { MapPin } from "phosphor-react-native/src/icons/MapPin";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SleepyCat } from "../components/cute/SleepyCat";
import { formatKoreanDate } from "../lib/dateUtils";
import { GalleryPhoto, listLocationPhotos } from "../lib/gallery";
import { appleMapsUrl } from "../lib/location";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

export function MemoryMapScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listLocationPhotos()
        .then(setPhotos)
        .catch((e) => setError(e instanceof Error ? e.message : "위치를 불러오지 못했어요."));
    }, [])
  );

  if (photos === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {photos.length === 0 ? (
        <View style={styles.emptyWrap}>
          <SleepyCat color={c.textMuted} />
          <Text style={styles.emptyText}>
            아직 위치가 기록된 사진이 없어요.{"\n"}카메라로 찍거나 위치 정보가 있는 사진을
            일기에 추가해 보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                item.lat != null &&
                item.lng != null &&
                Linking.openURL(appleMapsUrl(item.lat, item.lng, item.place)).catch(() => {})
              }
            >
              <Image source={{ uri: item.url }} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <View style={styles.placeRow}>
                  <MapPin size={13} weight="fill" color={c.primary} />
                  <Text style={styles.place} numberOfLines={1}>
                    {item.place ?? "위치 정보"}
                  </Text>
                </View>
                <Text style={styles.date}>{formatKoreanDate(item.date)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },
    error: { color: c.danger, fontSize: fontSizes.small, padding: spacing.md },
    emptyWrap: { alignItems: "center", marginTop: spacing.xl * 2, gap: spacing.md, paddingHorizontal: spacing.lg },
    emptyText: { color: c.textMuted, fontSize: fontSizes.small, textAlign: "center", lineHeight: 20 },
    list: { padding: spacing.md, gap: spacing.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.sm + 2,
      marginBottom: spacing.sm,
      ...cardShadow(c.shadow),
    },
    thumb: { width: 56, height: 56, borderRadius: radii.button, backgroundColor: c.surface },
    placeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    place: { fontSize: fontSizes.body, fontWeight: "700", color: c.text, flexShrink: 1 },
    date: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 2 },
  });
