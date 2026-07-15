// 코디: 내 옷장(옷·신발·헤어·향수 아카이브) + OOTD 사진 기록

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "phosphor-react-native/src/icons/Camera";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addClosetItem,
  addOotd,
  CLOSET_CATEGORIES,
  ClosetCategory,
  ClosetItem,
  deleteClosetItem,
  deleteOotd,
  listClosetItems,
  listOotd,
  OotdLog,
  toggleFavClosetItem,
} from "../lib/closet";
import { todayKey } from "../lib/dateUtils";
import { tapSuccess } from "../lib/haptics";
import { getCurrentWeather, Weather } from "../lib/weather";
import { RootStackParamList, ViewerPhoto } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const ACCENT = "#E85D9E";
const ACCENT_BG = "#FFE4F1";

const CATEGORY_EMOJI: Record<ClosetCategory, string> = {
  옷: "👕",
  신발: "👟",
  헤어: "💇",
  향수: "🫧",
  기타: "✨",
};

type Tab = "closet" | "ootd";

/** 사진 찍기/앨범 선택 공통 다이얼로그 */
function pickPhoto(current: string | null, onPicked: (uri: string | null) => void) {
  Alert.alert("사진", undefined, [
    {
      text: "📷 바로 찍기",
      onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("알림", "카메라 권한을 허용해 주세요.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
        if (!result.canceled && result.assets[0]) onPicked(result.assets[0].uri);
      },
    },
    {
      text: "앨범에서 고르기",
      onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
        });
        if (!result.canceled && result.assets[0]) onPicked(result.assets[0].uri);
      },
    },
    ...(current
      ? [{ text: "사진 빼기", style: "destructive" as const, onPress: () => onPicked(null) }]
      : []),
    { text: "취소", style: "cancel" as const },
  ]);
}

/** "YYYY-MM-DD" → "7/12" */
function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function StyleScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>("closet");

  // 옷장
  const [items, setItems] = useState<ClosetItem[] | null>(null);
  const [filter, setFilter] = useState<ClosetCategory | "전체">("전체");
  const [category, setCategory] = useState<ClosetCategory>("옷");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // OOTD
  const [ootd, setOotd] = useState<OotdLog[] | null>(null);
  const [ootdNote, setOotdNote] = useState("");
  const [ootdUri, setOotdUri] = useState<string | null>(null);
  const [ootdSaving, setOotdSaving] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    getCurrentWeather().then(setWeather).catch(() => {});
  }, []);

  const reloadCloset = () => {
    listClosetItems()
      .then(setItems)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  };
  const reloadOotd = () => {
    listOotd()
      .then(setOotd)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  };
  useEffect(() => {
    reloadCloset();
    reloadOotd();
  }, []);

  // ---------- 옷장 ----------

  const handleAddItem = async () => {
    if (!title.trim() && !photoUri) {
      Alert.alert("알림", "이름이나 사진 중 하나는 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      await addClosetItem({
        category,
        title: title.trim() || `${category} 사진`,
        note: note.trim() || null,
        localUri: photoUri,
      });
      setTitle("");
      setNote("");
      setPhotoUri(null);
      tapSuccess();
      setItems(null);
      reloadCloset();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const itemMenu = (item: ClosetItem) => {
    Alert.alert(item.title, item.note ?? undefined, [
      {
        text: item.fav ? "☆ 즐겨찾기 해제" : "★ 즐겨찾기",
        onPress: () =>
          toggleFavClosetItem(item)
            .then(reloadCloset)
            .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "실패했어요.")),
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          deleteClosetItem(item)
            .then(() => setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id)))
            .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "실패했어요.")),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  /** 사진 있는 아이템 탭 → 전체화면 뷰어 */
  const openItemPhoto = (item: ClosetItem) => {
    const withPhoto = filteredItems.filter((i) => i.url);
    const index = withPhoto.findIndex((i) => i.id === item.id);
    if (index < 0) return;
    const photos: ViewerPhoto[] = withPhoto.map((i) => ({ url: i.url as string }));
    navigation.navigate("PhotoViewer", { photos, index });
  };

  const filteredItems = (items ?? []).filter(
    (i) => filter === "전체" || i.category === filter
  );

  // ---------- OOTD ----------

  const handleAddOotd = async () => {
    if (!ootdUri) {
      Alert.alert("알림", "오늘의 코디 사진을 골라 주세요.");
      return;
    }
    setOotdSaving(true);
    try {
      await addOotd({
        date: todayKey(),
        note: ootdNote.trim() || null,
        localUri: ootdUri,
        tempC: weather?.tempC ?? null,
        weatherCode: weather?.code ?? null,
      });
      setOotdNote("");
      setOotdUri(null);
      tapSuccess();
      setOotd(null);
      reloadOotd();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setOotdSaving(false);
    }
  };

  const ootdMenu = (log: OotdLog) => {
    Alert.alert(`${shortDate(log.date)} OOTD`, log.note ?? undefined, [
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          deleteOotd(log)
            .then(() => setOotd((prev) => (prev ?? []).filter((o) => o.id !== log.id)))
            .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "실패했어요.")),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const openOotdPhoto = (log: OotdLog) => {
    const withPhoto = (ootd ?? []).filter((o) => o.url);
    const index = withPhoto.findIndex((o) => o.id === log.id);
    if (index < 0) return;
    const photos: ViewerPhoto[] = withPhoto.map((o) => ({
      url: o.url as string,
      takenAt: o.created_at,
    }));
    navigation.navigate("PhotoViewer", { photos, index });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 옷장 / OOTD 전환 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === "closet" && styles.tabButtonActive]}
          onPress={() => setTab("closet")}
        >
          <Text style={[styles.tabText, tab === "closet" && styles.tabTextActive]}>👗 옷장</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === "ootd" && styles.tabButtonActive]}
          onPress={() => setTab("ootd")}
        >
          <Text style={[styles.tabText, tab === "ootd" && styles.tabTextActive]}>📸 OOTD</Text>
        </TouchableOpacity>
      </View>

      {tab === "closet" ? (
        <>
          {/* 추가 폼 */}
          <View style={styles.form}>
            <View style={styles.chipRow}>
              {CLOSET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                    {CATEGORY_EMOJI[cat]} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formRow}>
              <TouchableOpacity
                style={styles.photoPick}
                onPress={() => pickPhoto(photoUri, setPhotoUri)}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <Camera size={20} weight="duotone" color={ACCENT} />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1, gap: spacing.xs + 2 }}>
                <TextInput
                  style={styles.input}
                  placeholder="이름 (예: 검정 가디건, 산타마리아노벨라)"
                  placeholderTextColor={c.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="메모 (선택 — 어디서 샀는지, 어울리는 조합…)"
                  placeholderTextColor={c.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddItem} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addText}>옷장에 넣기</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 카테고리 필터 */}
          <View style={styles.chipRow}>
            {(["전체", ...CLOSET_CATEGORIES] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, filter === cat && styles.chipActive]}
                onPress={() => setFilter(cat)}
              >
                <Text style={[styles.chipText, filter === cat && styles.chipTextActive]}>
                  {cat === "전체" ? "전체" : `${CATEGORY_EMOJI[cat]} ${cat}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 아이템 그리드 */}
          {items === null ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={ACCENT} />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.empty}>
              아직 비어 있어요.{"\n"}가지고 있는 옷·신발·향수를 사진과 함께 넣어보세요.
            </Text>
          ) : (
            <View style={styles.grid}>
              {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => (item.url ? openItemPhoto(item) : itemMenu(item))}
                  onLongPress={() => itemMenu(item)}
                  activeOpacity={0.8}
                >
                  {item.url ? (
                    <Image source={{ uri: item.url }} style={styles.itemPhoto} />
                  ) : (
                    <View style={[styles.itemPhoto, styles.itemPhotoEmpty]}>
                      <Text style={styles.itemEmoji}>{CATEGORY_EMOJI[item.category]}</Text>
                    </View>
                  )}
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.fav ? "★ " : ""}
                      {item.title}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      {item.category}
                      {item.note ? ` · ${item.note}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {filteredItems.length > 0 ? (
            <Text style={styles.hint}>길게 누르면 즐겨찾기·삭제 메뉴가 나와요.</Text>
          ) : null}
        </>
      ) : (
        <>
          {/* 오늘 날씨 */}
          {weather ? (
            <View style={styles.weatherCard}>
              <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
              <Text style={styles.weatherTemp}>{weather.tempC}°</Text>
              <Text style={styles.weatherDesc}>{weather.desc}</Text>
              <Text style={styles.weatherHint}>OOTD를 남기면 오늘 기온도 함께 저장돼요</Text>
            </View>
          ) : null}

          {/* 오늘의 OOTD 남기기 */}
          <View style={styles.form}>
            <View style={styles.formRow}>
              <TouchableOpacity
                style={[styles.photoPick, styles.ootdPick]}
                onPress={() => pickPhoto(ootdUri, setOotdUri)}
              >
                {ootdUri ? (
                  <Image source={{ uri: ootdUri }} style={styles.ootdPreview} />
                ) : (
                  <>
                    <Camera size={22} weight="duotone" color={ACCENT} />
                    <Text style={styles.ootdPickText}>오늘의 코디</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1, gap: spacing.xs + 2 }}>
                <TextInput
                  style={styles.input}
                  placeholder="한 줄 메모 (선택 — 데이트룩, 출근룩…)"
                  placeholderTextColor={c.textMuted}
                  value={ootdNote}
                  onChangeText={setOotdNote}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddOotd}
                  disabled={ootdSaving}
                >
                  {ootdSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.addText}>OOTD 기록</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 이 기온에 입었던 코디 (오늘 기온 ±3℃) */}
          {weather && ootd
            ? (() => {
                const similar = ootd.filter(
                  (o) =>
                    o.temp_c != null &&
                    Math.abs(o.temp_c - weather.tempC) <= 3 &&
                    o.date !== todayKey() &&
                    o.url
                );
                if (similar.length === 0) return null;
                return (
                  <View>
                    <Text style={styles.sectionTitle}>
                      {weather.tempC}° 즈음엔 이렇게 입었어요
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.similarRow}>
                        {similar.slice(0, 10).map((log) => (
                          <TouchableOpacity key={log.id} onPress={() => openOotdPhoto(log)}>
                            <Image source={{ uri: log.url! }} style={styles.similarPhoto} />
                            <Text style={styles.similarMeta}>
                              {shortDate(log.date)} · {Math.round(log.temp_c!)}°
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                );
              })()
            : null}

          {/* OOTD 그리드 */}
          {ootd === null ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={ACCENT} />
          ) : ootd.length === 0 ? (
            <Text style={styles.empty}>
              아직 OOTD가 없어요.{"\n"}오늘 입은 코디를 사진으로 남겨보세요.
            </Text>
          ) : (
            <View style={styles.ootdGrid}>
              {ootd.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.ootdCell}
                  onPress={() => openOotdPhoto(log)}
                  onLongPress={() => ootdMenu(log)}
                  activeOpacity={0.8}
                >
                  {log.url ? (
                    <Image source={{ uri: log.url }} style={styles.ootdPhoto} />
                  ) : (
                    <View style={[styles.ootdPhoto, styles.itemPhotoEmpty]} />
                  )}
                  <View style={styles.ootdBadge}>
                    <Text style={styles.ootdBadgeText}>
                      {shortDate(log.date)}
                      {log.temp_c != null ? ` · ${Math.round(log.temp_c)}°` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {(ootd ?? []).length > 0 ? (
            <Text style={styles.hint}>길게 누르면 삭제해요.</Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const GRID_GAP = spacing.sm;
const SCREEN_W = Dimensions.get("window").width;
/** 옷장 2열 카드 너비 */
const ITEM_W = (SCREEN_W - spacing.md * 2 - GRID_GAP) / 2;
/** OOTD 3열 셀 너비 */
const OOTD_W = (SCREEN_W - spacing.md * 2 - GRID_GAP * 2) / 3;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    tabRow: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: radii.button,
      padding: 3,
      gap: 3,
    },
    tabButton: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.xs + 4,
      borderRadius: radii.button - 3,
    },
    tabButtonActive: { backgroundColor: c.card, ...cardShadow(c.shadow) },
    tabText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    tabTextActive: { color: ACCENT },
    form: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
    chip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    chipActive: { backgroundColor: ACCENT },
    chipText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    chipTextActive: { color: "#FFFFFF" },
    formRow: { flexDirection: "row", gap: spacing.sm, alignItems: "stretch" },
    photoPick: {
      width: 76,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: ACCENT,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: ACCENT_BG + "55",
    },
    photoPreview: { width: 76, height: "100%" },
    ootdPick: { width: 100, minHeight: 84, gap: 2 },
    ootdPreview: { width: 100, height: "100%" },
    ootdPickText: { fontSize: fontSizes.caption, fontWeight: "700", color: ACCENT },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      backgroundColor: c.inputBg,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      fontSize: fontSizes.small,
      color: c.text,
    },
    addButton: {
      backgroundColor: ACCENT,
      borderRadius: radii.button,
      paddingVertical: spacing.sm + 2,
      alignItems: "center",
      justifyContent: "center",
    },
    addText: { color: "#FFFFFF", fontSize: fontSizes.small, fontWeight: "800" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
    itemCard: {
      width: ITEM_W,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: "hidden",
      ...cardShadow(c.shadow),
    },
    itemPhoto: { width: "100%", height: ITEM_W, backgroundColor: c.surface },
    itemPhotoEmpty: { alignItems: "center", justifyContent: "center" },
    itemEmoji: { fontSize: 34 },
    itemBody: { padding: spacing.sm },
    itemTitle: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    itemMeta: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
    weatherCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      ...cardShadow(c.shadow),
    },
    weatherEmoji: { fontSize: 24 },
    weatherTemp: { fontSize: fontSizes.title, fontWeight: "900", color: c.text },
    weatherDesc: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    weatherHint: {
      flex: 1,
      textAlign: "right",
      fontSize: fontSizes.caption,
      color: c.textMuted,
    },
    sectionTitle: {
      fontSize: fontSizes.small,
      fontWeight: "800",
      color: c.text,
      marginBottom: spacing.xs + 2,
    },
    similarRow: { flexDirection: "row", gap: spacing.sm },
    similarPhoto: {
      width: 84,
      height: 105,
      borderRadius: radii.button,
      backgroundColor: c.surface,
    },
    similarMeta: {
      fontSize: 10,
      fontWeight: "700",
      color: c.textMuted,
      textAlign: "center",
      marginTop: 2,
    },
    ootdGrid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
    ootdCell: { width: OOTD_W },
    ootdPhoto: {
      width: "100%",
      height: OOTD_W * 1.25,
      borderRadius: radii.button,
      backgroundColor: c.surface,
    },
    ootdBadge: {
      position: "absolute",
      left: 6,
      bottom: 6,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 999,
      paddingHorizontal: spacing.xs + 3,
      paddingVertical: 2,
    },
    ootdBadgeText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF" },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
      lineHeight: 21,
    },
    hint: {
      textAlign: "center",
      fontSize: fontSizes.caption,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
  });
