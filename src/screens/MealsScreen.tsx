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
import { MagnifyingGlass } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { addDays, formatKoreanDate, todayKey } from "../lib/dateUtils";
import { FoodItem, isFoodDbConfigured, scaleNutrient, searchFood } from "../lib/foodDb";
import {
  loadSavedFoods,
  recordFood,
  removeSavedFood,
  SavedFood,
  sortedSavedFoods,
  toggleFavFood,
} from "../lib/foodFavorites";
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
  // 영양 DB 검색
  const [searchResults, setSearchResults] = useState<FoodItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  // 자주 먹는 것 (즐겨찾기 + 최근)
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);

  useEffect(() => {
    loadSavedFoods().then(setSavedFoods).catch(() => {});
  }, []);

  /** 저장된 음식 칩 → 폼 채우기 */
  const applySaved = (f: SavedFood) => {
    setTitle(f.name);
    setSelectedFood(f.per100 ? { name: f.name, maker: null, per100: f.per100 } : null);
    setGrams(f.grams != null ? String(f.grams) : "");
    setKcal(f.kcal != null ? String(f.kcal) : "");
    setSearchResults(null);
  };

  const savedFoodMenu = (f: SavedFood) => {
    Alert.alert(f.name, undefined, [
      {
        text: f.fav ? "☆ 즐겨찾기 해제" : "★ 즐겨찾기",
        onPress: () => toggleFavFood(f.name).then(setSavedFoods),
      },
      {
        text: "목록에서 삭제",
        style: "destructive",
        onPress: () => removeSavedFood(f.name).then(setSavedFoods),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const reload = (key: string) => {
    setMeals(null);
    listMeals(key)
      .then(setMeals)
      .catch((e) => Alert.alert("오류", e instanceof Error ? e.message : "불러오지 못했어요."));
  };
  useEffect(() => reload(dateKey), [dateKey]);

  const pickPhoto = () => {
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
          if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: "앨범에서 고르기",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            quality: 1,
          });
          if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      ...(photoUri
        ? [{ text: "사진 빼기", style: "destructive" as const, onPress: () => setPhotoUri(null) }]
        : []),
      { text: "취소", style: "cancel" as const },
    ]);
  };

  /** 영양 DB 검색 (식약처) */
  const handleSearch = async () => {
    if (!title.trim()) {
      Alert.alert("알림", "먼저 음식 이름을 입력해 주세요.");
      return;
    }
    setSearching(true);
    setSearchResults(null);
    try {
      setSearchResults(await searchFood(title));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  };

  /** 검색 결과 선택 → 이름 채우고 그람 수에 맞춰 칼로리 자동 계산 */
  const applyFood = (food: FoodItem) => {
    setSelectedFood(food);
    setTitle(food.name);
    setSearchResults(null);
    const g = grams.trim() ? Number(grams.replace(/,/g, "")) : null;
    const scaledKcal = scaleNutrient(food.per100.kcal, g);
    if (scaledKcal != null) setKcal(String(Math.round(scaledKcal)));
  };

  // 그람 수가 바뀌면 선택된 식품 기준으로 칼로리 재계산
  useEffect(() => {
    if (!selectedFood) return;
    const g = grams.trim() ? Number(grams.replace(/,/g, "")) : null;
    const scaledKcal = scaleNutrient(selectedFood.per100.kcal, g);
    if (scaledKcal != null) setKcal(String(Math.round(scaledKcal)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grams]);

  const handleAdd = async () => {
    if (!title.trim() && !photoUri) {
      Alert.alert("알림", "내용이나 사진 중 하나는 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      const g = grams.trim() ? Number(grams.replace(/,/g, "")) : null;
      await addMeal({
        date: dateKey,
        slot,
        title: title.trim() || "사진 기록",
        grams: g,
        kcal: kcal.trim() ? Number(kcal.replace(/,/g, "")) : null,
        carbG: selectedFood ? scaleNutrient(selectedFood.per100.carb, g) : null,
        proteinG: selectedFood ? scaleNutrient(selectedFood.per100.protein, g) : null,
        fatG: selectedFood ? scaleNutrient(selectedFood.per100.fat, g) : null,
        localUri: photoUri,
      });
      // 자주 먹는 것 목록에 반영
      recordFood({
        name: title.trim() || "사진 기록",
        per100: selectedFood?.per100 ?? null,
        grams: g,
        kcal: kcal.trim() ? Number(kcal.replace(/,/g, "")) : null,
      })
        .then(setSavedFoods)
        .catch(() => {});
      setTitle("");
      setGrams("");
      setKcal("");
      setPhotoUri(null);
      setSelectedFood(null);
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
        {/* 자주 먹는 것: ★ 즐겨찾기 먼저, 최근순. 탭하면 채워지고 길게 누르면 관리 */}
        {savedFoods.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={styles.savedRow}>
              {sortedSavedFoods(savedFoods).map((f) => (
                <TouchableOpacity
                  key={f.name}
                  style={[styles.savedChip, f.fav && styles.savedChipFav]}
                  onPress={() => applySaved(f)}
                  onLongPress={() => savedFoodMenu(f)}
                >
                  <Text style={[styles.savedText, f.fav && styles.savedTextFav]} numberOfLines={1}>
                    {f.fav ? "★ " : ""}
                    {f.name}
                    {f.kcal != null ? ` ${Math.round(f.kcal)}kcal` : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : null}

        <View style={styles.numRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="먹은 것 (예: 닭가슴살 샐러드)"
            placeholderTextColor={c.textMuted}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setSelectedFood(null);
            }}
            onSubmitEditing={isFoodDbConfigured() ? handleSearch : undefined}
            returnKeyType={isFoodDbConfigured() ? "search" : "done"}
          />
          {isFoodDbConfigured() ? (
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searching}>
              {searching ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MagnifyingGlass size={16} weight="bold" color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 영양 DB 검색 결과 */}
        {searchResults ? (
          searchResults.length === 0 ? (
            <Text style={styles.searchEmpty}>검색 결과가 없어요. 다른 이름으로 찾아보세요.</Text>
          ) : (
            searchResults.slice(0, 8).map((f, i) => (
              <TouchableOpacity key={i} style={styles.foodRow} onPress={() => applyFood(f)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text style={styles.foodMeta} numberOfLines={1}>
                    {[f.maker, "100g당"].filter(Boolean).join(" · ")} 탄{" "}
                    {f.per100.carb ?? "–"} · 단 {f.per100.protein ?? "–"} · 지{" "}
                    {f.per100.fat ?? "–"}
                  </Text>
                </View>
                <Text style={styles.foodKcal}>{f.per100.kcal ?? "–"} kcal</Text>
              </TouchableOpacity>
            ))
          )
        ) : null}
        {selectedFood ? (
          <Text style={styles.selectedFoodHint}>
            ✓ {selectedFood.name} — g을 입력하면 칼로리가 자동 계산돼요
          </Text>
        ) : null}
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
                        m.carb_g != null || m.protein_g != null || m.fat_g != null
                          ? `탄 ${m.carb_g ?? "–"} · 단 ${m.protein_g ?? "–"} · 지 ${m.fat_g ?? "–"}`
                          : null,
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
    searchButton: {
      width: 40,
      backgroundColor: ACCENT,
      borderRadius: radii.button,
      alignItems: "center",
      justifyContent: "center",
    },
    searchEmpty: { fontSize: fontSizes.caption, color: c.textMuted },
    savedRow: { flexDirection: "row", gap: spacing.xs + 2 },
    savedChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2,
      maxWidth: 180,
    },
    savedChipFav: { backgroundColor: "#FFF1D6" },
    savedText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.text },
    savedTextFav: { color: "#B8720A" },
    foodRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 3,
    },
    foodName: { fontSize: fontSizes.caption, fontWeight: "700", color: c.text },
    foodMeta: { fontSize: 10, color: c.textMuted, marginTop: 1 },
    foodKcal: { fontSize: fontSizes.caption, fontWeight: "900", color: ACCENT },
    selectedFoodHint: { fontSize: fontSizes.caption, color: ACCENT, fontWeight: "700" },
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
