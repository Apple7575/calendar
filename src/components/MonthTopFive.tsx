// 캘린더 탭 상단 "이달의 TOP 5": 직접 고른 사진 5장 + 한 줄 설명.
// 빈 칸을 누르면 앨범에서 골라 설명을 붙이고, 사진을 누르면 설명 수정/삭제.

import * as ImagePicker from "expo-image-picker";
import { Plus } from "phosphor-react-native/src/icons/Plus";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addMonthTop,
  listMonthTop,
  MONTH_TOP_LIMIT,
  MonthTopItem,
  removeMonthTop,
  saveMonthTopOrder,
  updateMonthTopCaption,
} from "../lib/monthHighlights";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

export function MonthTopFive({ monthKey }: { monthKey: string }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [items, setItems] = useState<MonthTopItem[]>([]);

  useEffect(() => {
    listMonthTop(monthKey).then(setItems).catch(() => setItems([]));
  }, [monthKey]);

  const handleAdd = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    Alert.prompt(
      "한 줄 설명",
      "이 순간을 한 줄로 남긴다면?",
      async (caption) => {
        try {
          await addMonthTop(monthKey, uri, (caption ?? "").trim(), items.length);
          setItems(await listMonthTop(monthKey));
        } catch (e) {
          Alert.alert("오류", e instanceof Error ? e.message : "추가에 실패했어요.");
        }
      },
      "plain-text"
    );
  };

  const move = async (item: MonthTopItem, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === item.id);
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
    try {
      await saveMonthTopOrder(next);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "순위 저장에 실패했어요.");
    }
  };

  const handlePressItem = (item: MonthTopItem) => {
    Alert.alert(item.caption || "TOP 5 사진", undefined, [
      { text: "◀ 순위 올리기", onPress: () => move(item, -1) },
      { text: "▶ 순위 내리기", onPress: () => move(item, 1) },
      {
        text: "설명 수정",
        onPress: () =>
          Alert.prompt(
            "한 줄 설명",
            undefined,
            async (caption) => {
              try {
                await updateMonthTopCaption(item.id, (caption ?? "").trim());
                setItems((prev) =>
                  prev.map((i) =>
                    i.id === item.id ? { ...i, caption: (caption ?? "").trim() } : i
                  )
                );
              } catch (e) {
                Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
              }
            },
            "plain-text",
            item.caption
          ),
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMonthTop(item);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했어요.");
          }
        },
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={styles.row}
    >
      {items.map((item, i) => (
        <TouchableOpacity key={item.id} style={styles.card} onPress={() => handlePressItem(item)}>
          <View>
            <Image source={{ uri: item.url }} style={styles.photo} />
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{i + 1}</Text>
            </View>
          </View>
          <Text style={styles.caption} numberOfLines={1}>
            {item.caption || " "}
          </Text>
        </TouchableOpacity>
      ))}
      {items.length < MONTH_TOP_LIMIT ? (
        <TouchableOpacity style={styles.addCard} onPress={handleAdd}>
          <Plus size={18} weight="bold" color={c.textMuted} />
        </TouchableOpacity>
      ) : null}
      <View style={{ width: spacing.md }} />
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    emptyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: spacing.xs + 2,
    },
    emptyText: { fontSize: fontSizes.caption, color: c.textMuted, fontWeight: "700" },
    row: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.xs },
    card: { width: 92 },
    photo: {
      width: 92,
      height: 92,
      borderRadius: radii.button,
      backgroundColor: c.surface,
    },
    rankBadge: {
      position: "absolute",
      top: 4,
      left: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    rankText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
    caption: {
      fontSize: fontSizes.caption,
      color: c.text,
      marginTop: 3,
      textAlign: "center",
    },
    addCard: {
      width: 92,
      height: 92,
      borderRadius: radii.button,
      borderWidth: 2,
      borderColor: c.border,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
  });
