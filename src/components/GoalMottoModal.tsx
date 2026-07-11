// 앱을 열 때 목표 동기부여 문구를 팝업으로 보여준다 (JS 실행당 1회).
// 문구는 목표가 바뀔 때만 AI로 생성해 캐시 — 평소엔 즉시 뜬다.

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity } from "react-native";
import { tapLight } from "../lib/haptics";
import { getMotto, randomCloseLabel } from "../lib/mottos";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

// JS 번들 실행당 1회만 (핫리로드/탭 전환에는 다시 안 뜸)
let shownThisLaunch = false;

export function GoalMottoModal() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [motto, setMotto] = useState<string | null>(null);
  const closeLabel = useRef(randomCloseLabel()).current;

  useEffect(() => {
    if (shownThisLaunch) return;
    shownThisLaunch = true;
    getMotto().then(setMotto).catch(() => {});
  }, []);

  if (!motto) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setMotto(null)}>
      <Pressable style={styles.backdrop} onPress={() => setMotto(null)}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.badge}>🎯 오늘의 목표 한 마디</Text>
          <Text style={styles.motto}>{motto}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              tapLight();
              setMotto(null);
            }}
          >
            <Text style={styles.closeText}>{closeLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setMotto(null);
              navigation.navigate("Goals");
            }}
            hitSlop={8}
          >
            <Text style={styles.goalsLink}>목표 보러 가기</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: c.card,
      borderRadius: radii.card + 4,
      padding: spacing.lg,
      alignItems: "center",
      gap: spacing.md,
    },
    badge: { fontSize: fontSizes.caption, fontWeight: "800", color: c.textMuted },
    motto: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      textAlign: "center",
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    closeButton: {
      alignSelf: "stretch",
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingVertical: spacing.sm + 6,
      alignItems: "center",
    },
    closeText: { color: c.white, fontSize: fontSizes.body, fontWeight: "800" },
    goalsLink: { fontSize: fontSizes.caption, color: c.textMuted, fontWeight: "700" },
  });
