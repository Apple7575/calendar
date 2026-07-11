// 날짜 꾸미기 모달: 사진 배경(자동 압축)과 스티커를 같이 쓸 수 있다.
// 사진은 달력 셀 배경으로, 스티커는 그 위 배지로 올라간다.

import { ImageSquare } from "phosphor-react-native/src/icons/ImageSquare";
import React, { useMemo } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { STICKERS, Sticker } from "./stickers";
import { useTheme } from "../../theme/ThemeContext";
import { ThemeColors } from "../../theme/themes";
import { fontSizes, radii, spacing } from "../../theme/tokens";

type Props = {
  visible: boolean;
  /** 현재 스티커 id */
  sticker: string | null;
  /** 현재 사진 배경 URL */
  imageUrl: string | null;
  onSelect: (id: string) => void;
  /** 사진 배경 고르기 (앨범) */
  onPickImage: () => void;
  onClearSticker: () => void;
  onClearImage: () => void;
  onClose: () => void;
};

export function StickerPickerModal({
  visible,
  sticker,
  imageUrl,
  onSelect,
  onPickImage,
  onClearSticker,
  onClearImage,
  onClose,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>이 날 꾸미기</Text>

          {/* 사진 배경 */}
          <Text style={styles.sectionLabel}>배경 사진</Text>
          <View style={styles.imageRow}>
            <TouchableOpacity style={styles.imagePick} onPress={onPickImage}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
              ) : (
                <ImageSquare size={30} weight="duotone" color={c.primary} />
              )}
              <Text style={styles.cellLabel}>{imageUrl ? "사진 바꾸기" : "사진 고르기"}</Text>
            </TouchableOpacity>
            {imageUrl ? (
              <TouchableOpacity style={styles.clearSmall} onPress={onClearImage}>
                <Text style={styles.clearText}>사진 제거</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 스티커 (사진 위에 올라감) */}
          <Text style={styles.sectionLabel}>스티커</Text>
          <View style={styles.grid}>
            {STICKERS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.cell, sticker === s.id && styles.cellActive]}
                onPress={() => onSelect(s.id)}
              >
                <Sticker id={s.id} size={34} />
                <Text style={styles.cellLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sizeHint}>
            사진은 배경으로, 스티커는 그 위에 함께 표시돼요 (사진은 자동 압축)
          </Text>
          {sticker ? (
            <TouchableOpacity style={styles.clearButton} onPress={onClearSticker}>
              <Text style={styles.clearText}>스티커 제거</Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    sheet: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: c.card,
      borderRadius: radii.card,
      padding: spacing.md,
    },
    title: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    cell: {
      width: "23%",
      alignItems: "center",
      gap: 3,
      paddingVertical: spacing.sm,
      borderRadius: radii.button,
      marginBottom: spacing.sm,
    },
    cellActive: { backgroundColor: c.primarySoft },
    cellLabel: { fontSize: fontSizes.caption, color: c.textMuted },
    sectionLabel: {
      fontSize: fontSizes.caption,
      fontWeight: "800",
      color: c.textMuted,
      marginBottom: spacing.xs + 2,
    },
    imageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    imagePick: { alignItems: "center", gap: 3 },
    imagePreview: { width: 44, height: 44, borderRadius: 10 },
    clearSmall: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    sizeHint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 2,
    },
    clearButton: {
      alignSelf: "center",
      marginTop: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    clearText: { fontSize: fontSizes.small, color: c.danger, fontWeight: "700" },
  });
