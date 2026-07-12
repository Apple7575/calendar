// 식단 기록 (인아웃 스타일): 끼니별로 사진·내용·그람·칼로리를 남기고 하루 총 칼로리를 본다.

import * as ImagePicker from "expo-image-picker";
import { Camera } from "phosphor-react-native/src/icons/Camera";
import { CaretLeft } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { addDays, formatKoreanDate, todayKey } from "../lib/dateUtils";
import { tapSuccess } from "../lib/haptics";
import { addMeal, deleteMeal, listMeals, Meal, MEAL_SLOTS, MealSlot } from "../lib/meals";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const ACCENT = "#3FBF77";

export function MealsScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [dateKey, setDateKey] = useState(todayKey());
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [slot, setSlot] = useState<MealSlot>("아침");
  const [title, setTitle] = useState("");
  const [grams, setGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = (key: string) => {
    setMeals(null);
    listMeals(key)
      .then(setMeals)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  };
  useEffect(() => reload(dateKey), [dateKey]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleAdd = async () => {
    if (!title.trim() && !photoUri) {
      Alert.alert("알림", "내용이나 사진 중 하나는 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      await addMeal({
        date: dateKey,
        slot,
        title: title.trim() || "사진 기록",
        grams: grams.trim() ? Number(grams.replace(/,/g, "")) : null,
        kcal: kcal.trim() ? Number(kcal.replace(/,/g, "")) : null,
        localUri: photoUri,
      });
      setTitle("");
      setGrams("");
      setKcal("");
      setPhotoUri(null);
      tapSuccess();
      reload(dateKey);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (meal: Meal) => {
    Alert.alert("삭제", `"${meal.title}" 기록을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () =>
          deleteMeal(meal)
            .then(() => setMeals((prev) => (prev ?? []).filter((m) => m.id !== meal.id)))
            .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "실패했어요.")),
      },
    ]);
  };

  const totalKcal = (meals ?? []).reduce((sum, m) => sum + (m.kcal ?? 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 날짜 이동 + 총 칼로리 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setDateKey(addDays(dateKey, -1))} hitSlop={8}>
          <CaretLeft size={18} weight="bold" color={ACCENT} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDateKey(todayKey())}>
          <Text style={styles.headerDate}>{formatKoreanDate(dateKey)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDateKey(addDays(dateKey, 1))} hitSlop={8}>
          <CaretRight size={18} weight="bold" color={ACCENT} />
        </TouchableOpacity>
      </View>
      {totalKcal > 0 ? (
        <Text style={styles.totalKcal}>
          오늘 총 <Text style={styles.totalNum}>{totalKcal.toLocaleString()}</Text> kcal
        </Text>
      ) : null}

      {/* 추가 폼 */}
      <View style={styles.form}>
        <View style={styles.slotRow}>
          {MEAL_SLOTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.slotChip, slot === s && styles.slotChipActive]}
              onPress={() => setSlot(s)}
            >
              <Text style={[styles.slotText, slot === s && styles.slotTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.photoPick} onPress={pickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <Camera size={18} weight="duotone" color={ACCENT} />
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder="먹은 것 (예: 닭가슴살 샐러드)"
          placeholderTextColor={c.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <View style={styles.numRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="g (선택)"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            value={grams}
            onChangeText={setGrams}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="kcal (선택)"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            value={kcal}
            onChangeText={setKcal}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.addText}>기록</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 끼니별 목록 */}
      {meals === null ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        MEAL_SLOTS.map((s) => {
          const items = meals.filter((m) => m.slot === s);
          if (items.length === 0) return null;
          const slotKcal = items.reduce((sum, m) => sum + (m.kcal ?? 0), 0);
          return (
            <View key={s} style={styles.slotSection}>
              <Text style={styles.slotTitle}>
                {s}
                {slotKcal > 0 ? (
                  <Text style={styles.slotKcal}>  {slotKcal.toLocaleString()} kcal</Text>
                ) : null}
              </Text>
              {items.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.mealRow}
                  onLongPress={() => handleDelete(m)}
                >
                  {m.url ? <Image source={{ uri: m.url }} style={styles.mealPhoto} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealTitle}>{m.title}</Text>
                    <Text style={styles.mealMeta}>
                      {[
                        m.grams != null ? `${m.grams}g` : null,
                        m.kcal != null ? `${m.kcal} kcal` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "  "}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })
      )}
      {meals !== null && meals.length === 0 ? (
        <Text style={styles.empty}>
          아직 기록이 없어요.{"\n"}먹은 것을 사진과 함께 남겨보세요.
        </Text>
      ) : null}
      {meals !== null && meals.length > 0 ? (
        <Text style={styles.hint}>길게 누르면 삭제해요.</Text>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
    },
    headerDate: { fontSize: fontSizes.body, fontWeight: "800", color: c.text },
    totalKcal: { textAlign: "center", fontSize: fontSizes.small, color: c.textMuted },
    totalNum: { fontSize: fontSizes.emphasis, fontWeight: "900", color: ACCENT },
    form: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    slotRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
    slotChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 3,
    },
    slotChipActive: { backgroundColor: ACCENT },
    slotText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    slotTextActive: { color: "#FFFFFF" },
    photoPick: {
      marginLeft: "auto",
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: ACCENT,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    photoPreview: { width: 36, height: 36 },
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
    numRow: { flexDirection: "row", gap: spacing.sm },
    addButton: {
      backgroundColor: ACCENT,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    addText: { color: "#FFFFFF", fontSize: fontSizes.small, fontWeight: "800" },
    slotSection: { marginTop: spacing.xs },
    slotTitle: {
      fontSize: fontSizes.body,
      fontWeight: "800",
      color: c.text,
      marginBottom: spacing.xs,
    },
    slotKcal: { fontSize: fontSizes.caption, fontWeight: "700", color: ACCENT },
    mealRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    mealPhoto: { width: 52, height: 52, borderRadius: 8, backgroundColor: c.surface },
    mealTitle: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    mealMeta: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 1 },
    empty: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
      lineHeight: 21,
    },
    hint: { textAlign: "center", fontSize: fontSizes.caption, color: c.textMuted },
  });
