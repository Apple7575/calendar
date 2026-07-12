import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Lightning } from "phosphor-react-native/src/icons/Lightning";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDayData } from "../hooks/useDayData";
import { useGoogleEvents } from "../hooks/useGoogleEvents";
import { formatTime, monthKeyOf } from "../lib/dateUtils";
import { toViewerPhoto } from "../lib/diary";
import { tapLight, tapSuccess } from "../lib/haptics";
import { CalendarEvent, eventsOnDate, mergeEvents } from "../lib/eventMerge";
import * as ImagePicker from "expo-image-picker";
import {
  clearImage,
  clearSticker,
  DayDecoration,
  decorationOf,
  getHighlight,
  setImageHighlight,
  setSticker,
} from "../lib/highlights";
import * as routineLib from "../lib/routines";
import * as taskLib from "../lib/tasks";
import { updateWidget } from "../lib/widget";
import { ViewerPhoto } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, minTouch, radii, spacing } from "../theme/tokens";
import { Confetti } from "./cute/Confetti";
import { Sticker } from "./cute/stickers";
import { StickerPickerModal } from "./cute/StickerPickerModal";
import { DiaryTranslationCard } from "./DiaryTranslationCard";
import { LifeLogSection } from "./LifeLogSection";
import { Section } from "./Section";

type Props = {
  dateKey: string;
  onEditEvent: (eventId?: string) => void;
  onEditDiary: () => void;
  onGoSettings?: () => void;
  onOpenPhotos?: (photos: ViewerPhoto[], index: number) => void;
  onManageRoutines?: () => void;
  /** 루틴 플레이어 시작 (오늘만) — slot: 아침/저녁 */
  onStartRoutines?: (slot?: "morning" | "evening") => void;
  /** true면 루틴/생활기록은 읽기 전용 요약 (기록은 관심사 탭에서) — 오늘 탭용 */
  compact?: boolean;
  /** compact에서 생활 기록 화면으로 이동 */
  onOpenLifeLog?: () => void;
};

function timeLabel(e: CalendarEvent): string {
  if (e.allDay) return "종일";
  return `${formatTime(e.startAt)} - ${formatTime(e.endAt)}`;
}

export function DayOverview({
  dateKey,
  onEditEvent,
  onEditDiary,
  onGoSettings,
  onOpenPhotos,
  onManageRoutines,
  onStartRoutines,
  compact,
  onOpenLifeLog,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const day = useDayData(dateKey);
  const google = useGoogleEvents(monthKeyOf(dateKey));
  const [refreshing, setRefreshing] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [decoration, setDecoration] = useState<DayDecoration>({
    stickerId: null,
    imageUrl: null,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getHighlight(dateKey)
        .then(decorationOf)
        .then(setDecoration)
        .catch(() => setDecoration({ stickerId: null, imageUrl: null }));
    }, [dateKey])
  );

  const handleSelectSticker = async (id: string) => {
    setDecoration((prev) => ({ ...prev, stickerId: id }));
    try {
      await setSticker(dateKey, id);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "스티커 저장에 실패했어요.");
    }
  };

  const handleClearSticker = async () => {
    setDecoration((prev) => ({ ...prev, stickerId: null }));
    try {
      await clearSticker(dateKey);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "스티커 삭제에 실패했어요.");
    }
  };

  const handleClearImage = async () => {
    setDecoration((prev) => ({ ...prev, imageUrl: null }));
    try {
      await clearImage(dateKey);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "사진 삭제에 실패했어요.");
    }
  };

  const handlePickImageSticker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const url = await setImageHighlight(dateKey, result.assets[0].uri);
      setDecoration((prev) => ({ ...prev, imageUrl: url }));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "사진 배경 저장에 실패했어요.");
    }
  };

  /** 방금의 토글로 오늘 할 일+루틴이 전부 끝났으면 컨페티 */
  const maybeCelebrate = (kind: "task" | "routine", id: string, nowDone: boolean) => {
    if (!nowDone) return;
    const tasksAllDone =
      day.tasks.length === 0 ||
      day.tasks.every((t) => (kind === "task" && t.id === id ? true : t.done));
    const routinesAllDone =
      day.routines.length === 0 ||
      day.routines.every((r) =>
        kind === "routine" && r.id === id ? true : day.checkedRoutineIds.has(r.id)
      );
    if (tasksAllDone && routinesAllDone && day.tasks.length + day.routines.length > 0) {
      tapSuccess();
      setCelebrate(true);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([day.reload(), google.refresh()]);
    setRefreshing(false);
  }, [day.reload, google.refresh]);

  const dayEvents = eventsOnDate(mergeEvents(day.localEvents, google.events), dateKey);

  const handleAddTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    setAddingTask(true);
    try {
      await taskLib.addTask(dateKey, title);
      setNewTask("");
      await day.reload();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "할 일 추가에 실패했어요.");
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleRoutine = async (routineId: string, checked: boolean) => {
    if (checked) tapLight();
    try {
      await routineLib.setRoutineChecked(routineId, dateKey, checked);
      maybeCelebrate("routine", routineId, checked);
      await day.reload();
      void updateWidget();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "루틴 체크에 실패했어요.");
    }
  };

  const handleToggleTask = async (id: string, done: boolean) => {
    if (done) tapLight();
    try {
      await taskLib.setTaskDone(id, done);
      maybeCelebrate("task", id, done);
      await day.reload();
      void updateWidget();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "할 일 상태 변경에 실패했어요.");
    }
  };

  const handleDeleteTask = (id: string, title: string) => {
    Alert.alert("할 일 삭제", `"${title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await taskLib.deleteTask(id);
            await day.reload();
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "할 일 삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }
      keyboardShouldPersistTaps="handled"
    >
      {day.error ? <Text style={styles.errorText}>{day.error}</Text> : null}
      {google.error ? <Text style={styles.errorText}>{google.error}</Text> : null}
      {google.notLinked ? (
        <TouchableOpacity style={styles.banner} onPress={onGoSettings}>
          <Ionicons name="link-outline" size={16} color={c.primary} />
          <Text style={styles.bannerText}>
            구글 캘린더가 연결되어 있지 않아요.{onGoSettings ? " 설정에서 연결하기" : ""}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.stickerRow} onPress={() => setPickerOpen(true)}>
        {decoration.stickerId || decoration.imageUrl ? (
          <>
            {decoration.imageUrl ? (
              <Image source={{ uri: decoration.imageUrl }} style={styles.decoThumb} />
            ) : null}
            {decoration.stickerId ? <Sticker id={decoration.stickerId} size={26} /> : null}
            <Text style={styles.stickerRowText}>이 날 꾸미기 · 바꾸기</Text>
          </>
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={18} color={c.textMuted} />
            <Text style={styles.stickerRowText}>이 날 꾸미기</Text>
          </>
        )}
      </TouchableOpacity>

      <Section
        title="일정"
        right={
          <TouchableOpacity style={styles.addLink} onPress={() => onEditEvent()} hitSlop={8}>
            <Ionicons name="add" size={18} color={c.primary} />
            <Text style={styles.addLinkText}>추가</Text>
          </TouchableOpacity>
        }
      >
        {dayEvents.length === 0 ? (
          <Text style={styles.emptyText}>일정이 없어요.</Text>
        ) : (
          dayEvents.map((e) => (
            <TouchableOpacity
              key={`${e.source}-${e.id}-${e.startAt}`}
              style={styles.eventRow}
              disabled={e.source === "google"}
              onPress={() => onEditEvent(e.id)}
            >
              <View
                style={[
                  styles.eventBar,
                  {
                    backgroundColor:
                      e.colorHex ?? (e.source === "google" ? c.dotGoogle : c.dotEvent),
                  },
                ]}
              />
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={styles.eventTime}>{timeLabel(e)}</Text>
              </View>
              {e.source === "google" ? (
                <View style={styles.googleBadge}>
                  <Text style={styles.googleBadgeText}>구글</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
              )}
            </TouchableOpacity>
          ))
        )}
      </Section>

      {day.routines.length > 0 || onManageRoutines ? (
        <Section
          title="루틴"
          right={
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              {!compact && onStartRoutines && day.routines.some((r) => r.time_slot === "morning") ? (
                <TouchableOpacity onPress={() => onStartRoutines("morning")} hitSlop={8}>
                  <Text style={styles.addLinkText}>🌅 아침</Text>
                </TouchableOpacity>
              ) : null}
              {!compact && onStartRoutines && day.routines.some((r) => r.time_slot === "evening") ? (
                <TouchableOpacity onPress={() => onStartRoutines("evening")} hitSlop={8}>
                  <Text style={styles.addLinkText}>🌙 저녁</Text>
                </TouchableOpacity>
              ) : null}
              {!compact &&
              onStartRoutines &&
              day.routines.length > 0 &&
              !day.routines.some((r) => r.time_slot === "morning" || r.time_slot === "evening") ? (
                <TouchableOpacity onPress={() => onStartRoutines(undefined)} hitSlop={8}>
                  <Text style={styles.addLinkText}>▶ 시작</Text>
                </TouchableOpacity>
              ) : null}
              {onManageRoutines ? (
                <TouchableOpacity onPress={onManageRoutines} hitSlop={8}>
                  <Text style={styles.addLinkText}>{compact ? "기록하러 가기 →" : "관리"}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        >
          {day.routines.length === 0 ? (
            <Text style={styles.emptyText}>루틴이 없어요. '관리'에서 만들어 보세요.</Text>
          ) : (
            day.routines.map((r) => {
              const checked = day.checkedRoutineIds.has(r.id);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.taskRow}
                  disabled={compact}
                  onPress={() => handleToggleRoutine(r.id, !checked)}
                >
                  <View style={styles.taskToggle}>
                    <View
                      style={[
                        styles.checkbox,
                        styles.routineCheckbox,
                        checked && styles.routineCheckboxDone,
                      ]}
                    >
                      {checked ? <Ionicons name="checkmark" size={15} color={c.white} /> : null}
                    </View>
                    <Text
                      style={[styles.taskTitle, checked && styles.taskTitleDone]}
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                  </View>
                  <Ionicons name="repeat" size={14} color={c.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </Section>
      ) : null}

      <Section title="할 일">
        {day.tasks.map((t) => (
          <View key={t.id} style={styles.taskRow}>
            <TouchableOpacity
              style={styles.taskToggle}
              onPress={() => handleToggleTask(t.id, !t.done)}
              hitSlop={8}
            >
              <View style={[styles.checkbox, t.done && styles.checkboxDone]}>
                {t.done ? <Ionicons name="checkmark" size={15} color={c.white} /> : null}
              </View>
              <Text style={[styles.taskTitle, t.done && styles.taskTitleDone]} numberOfLines={2}>
                {t.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteTask(t.id, t.title)} hitSlop={8}>
              <Ionicons name="close" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.taskInputRow}>
          <TextInput
            style={styles.taskInput}
            placeholder="할 일 추가"
            placeholderTextColor={c.textMuted}
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
            editable={!addingTask}
          />
          <TouchableOpacity
            style={[styles.taskAddButton, !newTask.trim() && { opacity: 0.4 }]}
            onPress={handleAddTask}
            disabled={addingTask || !newTask.trim()}
          >
            <Ionicons name="arrow-up" size={18} color={c.white} />
          </TouchableOpacity>
        </View>
      </Section>

      <LifeLogSection dateKey={dateKey} readOnly={compact} onOpen={onOpenLifeLog} />

      <Section title="일기">
        <TouchableOpacity onPress={onEditDiary} activeOpacity={0.7}>
          {day.diary.diary ? (
            <View>
              {day.diary.diary.highlight ? (
                <Text style={styles.diaryHighlight}>
                  {day.diary.diary.mood ? `${day.diary.diary.mood} ` : ""}
                  {day.diary.diary.highlight}
                </Text>
              ) : day.diary.diary.mood ? (
                <Text style={styles.diaryMood}>{day.diary.diary.mood}</Text>
              ) : null}
              {day.diary.diary.energy || day.diary.diary.sleep_hours != null ||
              day.diary.diary.people.length > 0 ? (
                <View style={styles.diaryMetaRow}>
                  {day.diary.diary.energy ? (
                    <View style={styles.energyIconRow}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Lightning
                          key={v}
                          size={12}
                          weight={v <= day.diary.diary!.energy! ? "fill" : "regular"}
                          color={v <= day.diary.diary!.energy! ? "#FFB020" : c.border}
                        />
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.diaryMeta}>
                    {[
                      day.diary.diary.sleep_hours != null
                        ? `수면 ${Number(day.diary.diary.sleep_hours)}시간`
                        : null,
                      day.diary.diary.people.length > 0
                        ? `함께: ${day.diary.diary.people.join(", ")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              ) : null}
              {day.diary.diary.content ? (
                <Text style={styles.diaryPreview} numberOfLines={4}>
                  {day.diary.diary.content}
                </Text>
              ) : null}
              {day.diary.photos.length > 0 ? (
                <View style={styles.photoRow}>
                  {day.diary.photos.slice(0, 4).map((p, i) => (
                    <TouchableOpacity
                      key={p.id}
                      disabled={!onOpenPhotos}
                      onPress={() =>
                        onOpenPhotos?.(day.diary.photos.map(toViewerPhoto), i)
                      }
                    >
                      <Image source={{ uri: p.url }} style={styles.photoThumb} />
                    </TouchableOpacity>
                  ))}
                  {day.diary.photos.length > 4 ? (
                    <View style={[styles.photoThumb, styles.photoMore]}>
                      <Text style={styles.photoMoreText}>+{day.diary.photos.length - 4}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.diaryEmpty}>
              <Ionicons name="create-outline" size={18} color={c.textMuted} />
              <Text style={styles.emptyText}>아직 일기가 없어요. 눌러서 작성해 보세요.</Text>
            </View>
          )}
        </TouchableOpacity>
        {day.diary.diary?.content?.trim() ? (
          <DiaryTranslationCard diary={day.diary.diary} />
        ) : null}
      </Section>
    </ScrollView>
    <Confetti visible={celebrate} onDone={() => setCelebrate(false)} />
    <StickerPickerModal
      visible={pickerOpen}
      sticker={decoration.stickerId}
      imageUrl={decoration.imageUrl}
      onSelect={handleSelectSticker}
      onPickImage={handlePickImageSticker}
      onClearSticker={handleClearSticker}
      onClearImage={handleClearImage}
      onClose={() => setPickerOpen(false)}
    />
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    content: { padding: spacing.md, paddingBottom: spacing.xl },
    errorText: {
      color: c.danger,
      fontSize: fontSizes.small,
      marginBottom: spacing.sm,
    },
    stickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    stickerRowText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    decoThumb: { width: 26, height: 26, borderRadius: 7 },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.primarySoft,
      borderRadius: radii.button,
      padding: spacing.sm + 4,
      marginBottom: spacing.md,
    },
    bannerText: {
      flex: 1,
      color: c.primary,
      fontSize: fontSizes.small,
      fontWeight: "600",
    },
    addLink: { flexDirection: "row", alignItems: "center" },
    addLinkText: { color: c.primary, fontSize: fontSizes.small, fontWeight: "700" },
    emptyText: { color: c.textMuted, fontSize: fontSizes.small, paddingVertical: spacing.xs },
    diaryEmpty: { flexDirection: "row", alignItems: "center", gap: 6 },
    eventRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      minHeight: minTouch,
    },
    eventBar: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: spacing.sm + 2 },
    eventBody: { flex: 1 },
    eventTitle: { fontSize: fontSizes.body, color: c.text, fontWeight: "600" },
    eventTime: { fontSize: fontSizes.small, color: c.textMuted, marginTop: 2 },
    googleBadge: {
      backgroundColor: c.successSoft,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginLeft: spacing.sm,
    },
    googleBadgeText: { color: c.dotGoogle, fontSize: fontSizes.caption, fontWeight: "700" },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.xs + 2,
      minHeight: 36,
    },
    taskToggle: { flexDirection: "row", alignItems: "center", flex: 1 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.sm + 2,
    },
    checkboxDone: { backgroundColor: c.dotTask, borderColor: c.dotTask },
    routineCheckbox: { borderRadius: 12 },
    routineCheckboxDone: { backgroundColor: c.success, borderColor: c.success },
    taskTitle: { fontSize: fontSizes.body, color: c.text, flex: 1 },
    taskTitleDone: { color: c.textMuted, textDecorationLine: "line-through" },
    taskInputRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
    taskInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    taskAddButton: {
      marginLeft: spacing.sm,
      backgroundColor: c.primary,
      borderRadius: radii.pill,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    diaryMood: { fontSize: 24, marginBottom: spacing.xs },
    diaryHighlight: {
      fontSize: fontSizes.body,
      fontWeight: "800",
      color: c.text,
      marginBottom: 2,
    },
    diaryMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, flexWrap: "wrap" },
    energyIconRow: { flexDirection: "row", gap: 1 },
    diaryMeta: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      marginBottom: spacing.xs,
    },
    diaryPreview: { fontSize: fontSizes.body, color: c.text, lineHeight: 24 },
    photoRow: { flexDirection: "row", marginTop: spacing.sm },
    photoThumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
      marginRight: spacing.sm,
      backgroundColor: c.surface,
    },
    photoMore: { alignItems: "center", justifyContent: "center", backgroundColor: c.border },
    photoMoreText: { color: c.text, fontWeight: "700", fontSize: fontSizes.small },
  });
