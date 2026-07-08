import React, { useCallback, useState } from "react";
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
import { CalendarEvent, eventsOnDate, mergeEvents } from "../lib/eventMerge";
import * as taskLib from "../lib/tasks";
import { colors, fontSizes, minTouch, radii, spacing } from "../theme/tokens";
import { Section } from "./Section";

type Props = {
  dateKey: string;
  onEditEvent: (eventId?: string) => void;
  onEditDiary: () => void;
  onGoSettings?: () => void;
};

function timeLabel(e: CalendarEvent): string {
  if (e.allDay) return "종일";
  return `${formatTime(e.startAt)} - ${formatTime(e.endAt)}`;
}

export function DayOverview({ dateKey, onEditEvent, onEditDiary, onGoSettings }: Props) {
  const day = useDayData(dateKey);
  const google = useGoogleEvents(monthKeyOf(dateKey));
  const [refreshing, setRefreshing] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);

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

  const handleToggleTask = async (id: string, done: boolean) => {
    try {
      await taskLib.setTaskDone(id, done);
      await day.reload();
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      {day.error ? <Text style={styles.errorText}>{day.error}</Text> : null}
      {google.error ? <Text style={styles.errorText}>{google.error}</Text> : null}
      {google.notLinked ? (
        <TouchableOpacity style={styles.banner} onPress={onGoSettings}>
          <Text style={styles.bannerText}>
            구글 캘린더가 연결되어 있지 않아요.{onGoSettings ? " 설정에서 연결하기 →" : ""}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Section
        title="일정"
        right={
          <TouchableOpacity onPress={() => onEditEvent()} hitSlop={8}>
            <Text style={styles.addLink}>+ 추가</Text>
          </TouchableOpacity>
        }
      >
        {dayEvents.length === 0 ? (
          <Text style={styles.emptyText}>일정이 없어요.</Text>
        ) : (
          dayEvents.map((e) => (
            <TouchableOpacity
              key={`${e.source}-${e.id}`}
              style={styles.eventRow}
              disabled={e.source === "google"}
              onPress={() => onEditEvent(e.id)}
            >
              <View
                style={[
                  styles.eventBar,
                  { backgroundColor: e.source === "google" ? colors.dotGoogle : colors.dotEvent },
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
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Section title="할 일">
        {day.tasks.map((t) => (
          <View key={t.id} style={styles.taskRow}>
            <TouchableOpacity
              style={styles.taskToggle}
              onPress={() => handleToggleTask(t.id, !t.done)}
              hitSlop={8}
            >
              <View style={[styles.checkbox, t.done && styles.checkboxDone]}>
                {t.done ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={[styles.taskTitle, t.done && styles.taskTitleDone]} numberOfLines={2}>
                {t.title}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteTask(t.id, t.title)} hitSlop={8}>
              <Text style={styles.deleteMark}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.taskInputRow}>
          <TextInput
            style={styles.taskInput}
            placeholder="할 일 추가"
            placeholderTextColor={colors.textMuted}
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
            editable={!addingTask}
          />
          <TouchableOpacity
            style={styles.taskAddButton}
            onPress={handleAddTask}
            disabled={addingTask || !newTask.trim()}
          >
            <Text style={styles.taskAddButtonText}>추가</Text>
          </TouchableOpacity>
        </View>
      </Section>

      <Section title="일기">
        <TouchableOpacity onPress={onEditDiary} activeOpacity={0.7}>
          {day.diary.diary ? (
            <View>
              {day.diary.diary.content ? (
                <Text style={styles.diaryPreview} numberOfLines={4}>
                  {day.diary.diary.content}
                </Text>
              ) : null}
              {day.diary.photos.length > 0 ? (
                <View style={styles.photoRow}>
                  {day.diary.photos.slice(0, 4).map((p) => (
                    <Image key={p.id} source={{ uri: p.url }} style={styles.photoThumb} />
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
            <Text style={styles.emptyText}>아직 일기가 없어요. 눌러서 작성해 보세요.</Text>
          )}
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.small,
    marginBottom: spacing.sm,
  },
  banner: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.button,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.primary, fontSize: fontSizes.small, fontWeight: "600" },
  addLink: { color: colors.primary, fontSize: fontSizes.body, fontWeight: "700" },
  emptyText: { color: colors.textMuted, fontSize: fontSizes.small, paddingVertical: spacing.xs },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    minHeight: minTouch,
  },
  eventBar: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: spacing.sm + 2 },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: fontSizes.body, color: colors.text, fontWeight: "600" },
  eventTime: { fontSize: fontSizes.small, color: colors.textMuted, marginTop: 2 },
  googleBadge: {
    backgroundColor: "#E7F5EC",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  googleBadgeText: { color: colors.dotGoogle, fontSize: fontSizes.caption, fontWeight: "700" },
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
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  checkboxDone: { backgroundColor: colors.dotTask, borderColor: colors.dotTask },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "900" },
  taskTitle: { fontSize: fontSizes.body, color: colors.text, flex: 1 },
  taskTitleDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  deleteMark: { color: colors.textMuted, fontSize: fontSizes.body, padding: spacing.xs },
  taskInputRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  taskAddButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  taskAddButtonText: { color: colors.white, fontSize: fontSizes.small, fontWeight: "700" },
  diaryPreview: { fontSize: fontSizes.body, color: colors.text, lineHeight: 24 },
  photoRow: { flexDirection: "row", marginTop: spacing.sm },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  photoMore: { alignItems: "center", justifyContent: "center", backgroundColor: colors.border },
  photoMoreText: { color: colors.text, fontWeight: "700", fontSize: fontSizes.small },
});
