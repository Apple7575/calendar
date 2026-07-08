import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { formatKoreanDate } from "../lib/dateUtils";
import {
  addPhoto,
  deletePhoto,
  DiaryPhoto,
  getDiaryWithPhotos,
  upsertDiary,
} from "../lib/diary";
import { RootScreenProps } from "../navigation/types";
import { colors, fontSizes, radii, spacing } from "../theme/tokens";

const THUMB = 96;

export function DiaryEditScreen({ route, navigation }: RootScreenProps<"DiaryEdit">) {
  const { date } = route.params;
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [pendingUris, setPendingUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: formatKoreanDate(date) });
  }, [navigation, date]);

  useEffect(() => {
    getDiaryWithPhotos(date)
      .then(({ diary, photos: rows }) => {
        setContent(diary?.content ?? "");
        setPhotos(rows);
      })
      .catch((e) => {
        Alert.alert("오류", e instanceof Error ? e.message : "일기를 불러오지 못했어요.");
      })
      .finally(() => setLoading(false));
  }, [date]);

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPendingUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  };

  const removePending = (uri: string) => {
    setPendingUris((prev) => prev.filter((u) => u !== uri));
  };

  const removeSaved = (photo: DiaryPhoto) => {
    Alert.alert("사진 삭제", "이 사진을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhoto(photo);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "사진 삭제에 실패했어요.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!content.trim() && photos.length === 0 && pendingUris.length === 0) {
      Alert.alert("알림", "내용이나 사진을 하나 이상 넣어 주세요.");
      return;
    }
    setSaving(true);
    try {
      const diary = await upsertDiary(date, content.trim());
      let position = photos.length;
      const failed: string[] = [];
      for (const uri of pendingUris) {
        try {
          await addPhoto(diary, uri, position++);
        } catch {
          failed.push(uri);
        }
      }
      if (failed.length > 0) {
        setPendingUris(failed);
        Alert.alert("안내", `사진 ${failed.length}장은 업로드하지 못했어요. 다시 저장해 보세요.`);
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "일기 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.diaryInput}
          placeholder="오늘 하루는 어땠나요?"
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
        />

        <View style={styles.photoGrid}>
          {photos.map((p) => (
            <TouchableOpacity key={p.id} onLongPress={() => removeSaved(p)}>
              <Image source={{ uri: p.url }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
          {pendingUris.map((uri) => (
            <TouchableOpacity key={uri} onLongPress={() => removePending(uri)}>
              <Image source={{ uri }} style={[styles.thumb, styles.thumbPending]} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addThumb} onPress={pickPhotos}>
            <Text style={styles.addThumbText}>＋</Text>
            <Text style={styles.addThumbLabel}>사진</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 || pendingUris.length > 0 ? (
          <Text style={styles.hint}>사진을 길게 누르면 삭제할 수 있어요.</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="저장" onPress={handleSave} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.md },
  diaryInput: {
    minHeight: 180,
    fontSize: fontSizes.body,
    color: colors.text,
    lineHeight: 26,
    textAlignVertical: "top",
    padding: spacing.sm,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: radii.button, backgroundColor: colors.surface },
  thumbPending: { opacity: 0.85 },
  addThumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addThumbText: { fontSize: 28, color: colors.textMuted, lineHeight: 32 },
  addThumbLabel: { fontSize: fontSizes.caption, color: colors.textMuted },
  hint: { fontSize: fontSizes.caption, color: colors.textMuted, marginTop: spacing.sm },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
