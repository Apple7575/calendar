// 날짜 스티커 선택 모달: 내장 8종 그리드 + 내 사진(자동 압축)에서 고르거나 제거한다.

import { ImageSquare } from "phosphor-react-native/src/icons/ImageSquare";
import React, { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { STICKERS, Sticker } from "./stickers";
import { useTheme } from "../../theme/ThemeContext";
import { ThemeColors } from "../../theme/themes";
import { fontSizes, radii, spacing } from "../../theme/tokens";

type Props = {
  visible: boolean;
  current: string | null;
  onSelect: (id: string) => void;
  /** "내 사진" 선택 (앨범에서 골라 스티커로) */
  onPickImage: () => void;
  onClear: () => void;
  onClose: () => void;
};

export function StickerPickerModal({
  visible,
  current,
  onSelect,
  onPickImage,
  onClear,
  onClose,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>이 날 꾸미기</Text>
          <View style={styles.grid}>
            {STICKERS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.cell, current === s.id && styles.cellActive]}
                onPress={() => onSelect(s.id)}
              >
                <Sticker id={s.id} size={34} />
                <Text style={styles.cellLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cell, current?.startsWith("img:") && styles.cellActive]}
              onPress={onPickImage}
            >
              {current?.startsWith("img:") ? (
                <Sticker id={current} size={34} />
              ) : (
                <ImageSquare size={32} weight="duotone" color={c.primary} />
              )}
              <Text style={styles.cellLabel}>내 사진</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sizeHint}>
            내 사진은 자동으로 256px로 줄여 저장돼요 (용량 걱정 없음)
          </Text>
          {current ? (
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
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
