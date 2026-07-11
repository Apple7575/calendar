// 순간 기록 카메라: 라이브 시각 오버레이가 보이는 상태로 찍고,
// 오버레이가 구워진 합성본을 오늘 일기에 붙인다.
// 원본은 기기 사진 보관함 + 클라우드(diary_photos.original_path)에 따로 보관.

import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { todayKey } from "../lib/dateUtils";
import { addPhoto, countPhotos, ensureDiary } from "../lib/diary";
import { currentPhotoLocation } from "../lib/location";
import { RootScreenProps } from "../navigation/types";
import { fontSizes, spacing } from "../theme/tokens";

const { width: SCREEN_W } = Dimensions.get("window");
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 사진에 구워질 시각 오버레이 (라이브 뷰와 합성본이 같은 모습) */
function TimeOverlay({ at }: { at: Date }) {
  return (
    <View style={overlay.wrap} pointerEvents="none">
      <Text style={overlay.time}>
        {pad2(at.getHours())}:{pad2(at.getMinutes())}
      </Text>
      <Text style={overlay.date}>
        {at.getFullYear()}.{pad2(at.getMonth() + 1)}.{pad2(at.getDate())}{" "}
        {WEEKDAYS_KO[at.getDay()]}요일
      </Text>
    </View>
  );
}

type Captured = { uri: string; width: number; height: number; takenAt: Date };

export function CameraScreen({ navigation }: RootScreenProps<"Camera">) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [now, setNow] = useState(new Date());
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [shooting, setShooting] = useState(false);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const previewRef = useRef<View>(null);

  // 라이브 시계 (촬영 전 화면에서만)
  useEffect(() => {
    if (captured) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [captured]);

  const shoot = async () => {
    if (!cameraRef.current || shooting) return;
    setShooting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        setCaptured({
          uri: photo.uri,
          width: photo.width ?? 0,
          height: photo.height ?? 0,
          takenAt: new Date(),
        });
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "사진을 찍지 못했어요.");
    } finally {
      setShooting(false);
    }
  };

  const save = async () => {
    if (!captured || saving) return;
    setSaving(true);
    try {
      // 1) 오버레이가 구워진 합성본 만들기 (원본 해상도로)
      const hasSize = captured.width > 0 && captured.height > 0;
      const overlaidUri = await captureRef(previewRef, {
        format: "jpg",
        quality: 0.9,
        result: "tmpfile",
        ...(hasSize ? { width: captured.width, height: captured.height } : {}),
      });

      // 2) 원본을 기기 사진 보관함에 저장 (권한 거부 시 조용히 건너뜀)
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (perm.granted) await MediaLibrary.saveToLibraryAsync(captured.uri);
      } catch {
        // 앨범 저장 실패는 무시 — 클라우드 원본은 아래에서 보관
      }

      // 3) 촬영 위치 (권한 없으면 null — 흐름 안 막음)
      const location = await currentPhotoLocation();

      // 4) 오늘 일기에 첨부 (합성본 표시용 + 원본 보관)
      const date = todayKey();
      const diary = await ensureDiary(date);
      const position = await countPhotos(diary.id);
      await addPhoto(diary, overlaidUri, position, {
        takenAt: captured.takenAt.toISOString(),
        originalUri: captured.uri,
        location,
      });

      Alert.alert("저장 완료", "오늘 일기에 사진을 넣어뒀어요. 원본은 사진 보관함에 있어요.", [
        { text: "닫기", style: "cancel", onPress: () => navigation.goBack() },
        {
          text: "일기 열기",
          onPress: () => navigation.replace("DiaryEdit", { date }),
        },
      ]);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "사진 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-outline" size={40} color="#FFFFFF" />
        <Text style={styles.permissionText}>
          순간을 기록하려면 카메라 권한이 필요해요.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() =>
            permission.canAskAgain ? requestPermission() : Linking.openSettings()
          }
        >
          <Text style={styles.permissionButtonText}>
            {permission.canAskAgain ? "권한 허용하기" : "설정에서 허용하기"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.permissionClose}>닫기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ===== 촬영 후 미리보기 (이 View가 그대로 합성본이 된다) =====
  if (captured) {
    const aspect =
      captured.width > 0 && captured.height > 0 ? captured.width / captured.height : 3 / 4;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewArea}>
          <View
            ref={previewRef}
            collapsable={false}
            style={{ width: SCREEN_W, aspectRatio: aspect }}
          >
            <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} />
            <TimeOverlay at={captured.takenAt} />
          </View>
        </View>
        <View style={styles.previewBar}>
          <TouchableOpacity
            style={styles.previewSecondary}
            onPress={() => setCaptured(null)}
            disabled={saving}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.previewSecondaryText}>다시 찍기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewPrimary} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#1A1A1A" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#1A1A1A" />
                <Text style={styles.previewPrimaryText}>오늘 일기에 저장</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ===== 라이브 카메라 =====
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      <TimeOverlay at={now} />
      <SafeAreaView style={styles.cameraUi} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            hitSlop={12}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.shutter} onPress={shoot} disabled={shooting}>
            {shooting ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const overlay = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 18,
    bottom: 24,
  },
  time: {
    color: "#FFC94A",
    fontSize: 40,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  date: {
    color: "#FFE3A0",
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  permissionText: {
    color: "#FFFFFF",
    fontSize: fontSizes.body,
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  permissionButtonText: { color: "#1A1A1A", fontSize: fontSizes.body, fontWeight: "700" },
  permissionClose: { color: "#9E9E9E", fontSize: fontSizes.small, padding: spacing.sm },
  cameraUi: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  bottomBar: { alignItems: "center", paddingBottom: spacing.lg },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
  },
  previewArea: { flex: 1, justifyContent: "center" },
  previewBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  previewSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingVertical: spacing.sm + 6,
  },
  previewSecondaryText: { color: "#FFFFFF", fontSize: fontSizes.body, fontWeight: "700" },
  previewPrimary: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingVertical: spacing.sm + 6,
  },
  previewPrimaryText: { color: "#1A1A1A", fontSize: fontSizes.body, fontWeight: "700" },
});
