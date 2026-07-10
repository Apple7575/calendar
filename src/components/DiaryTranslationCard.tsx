// 일기 번역 카드: 한국어|English|日本語 탭 + (외국어 원문일 때) AI 첨삭.
// 언어 칩을 처음 누를 때 번역을 만들고, 이후에는 캐시로 바로 보여준다.

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DiaryTranslations, getDiaryTranslations, LANG_LABELS } from "../lib/diaryLang";
import { DiaryLang, DiaryRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const LANGS: DiaryLang[] = ["ko", "en", "ja"];

export function DiaryTranslationCard({ diary }: { diary: DiaryRow }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [selected, setSelected] = useState<DiaryLang | null>(null);
  const [translations, setTranslations] = useState<DiaryTranslations | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);

  const selectLang = async (lang: DiaryLang) => {
    if (selected === lang) {
      setSelected(null); // 다시 누르면 접기
      return;
    }
    setSelected(lang);
    if (translations) return;
    setLoading(true);
    try {
      setTranslations(await getDiaryTranslations(diary));
    } catch (e) {
      setSelected(null);
      Alert.alert("오류", e instanceof Error ? e.message : "번역에 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  if (!diary.content.trim()) return null;

  return (
    <View style={styles.card}>
      <View style={styles.chipRow}>
        <Ionicons name="language" size={16} color={c.primary} />
        {LANGS.map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.chip, selected === lang && styles.chipActive]}
            onPress={() => selectLang(lang)}
          >
            <Text style={[styles.chipText, selected === lang && styles.chipTextActive]}>
              {LANG_LABELS[lang]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected && loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={styles.loadingText}>자연스러운 번역을 만드는 중…</Text>
        </View>
      ) : null}

      {selected && translations ? (
        <>
          <Text style={styles.body}>{translations.byLang[selected]}</Text>
          {selected === translations.detected ? (
            <Text style={styles.originalHint}>원문 ({LANG_LABELS[translations.detected]})</Text>
          ) : null}

          {translations.corrections.length > 0 ? (
            <View style={styles.correctionsBlock}>
              <TouchableOpacity
                style={styles.correctionsHeader}
                onPress={() => setShowCorrections((v) => !v)}
              >
                <Ionicons name="school-outline" size={14} color={c.primary} />
                <Text style={styles.correctionsTitle}>
                  AI 첨삭 {translations.corrections.length}개
                </Text>
                <Ionicons
                  name={showCorrections ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={c.textMuted}
                />
              </TouchableOpacity>
              {showCorrections
                ? translations.corrections.map((cr, i) => (
                    <View key={i} style={styles.correctionItem}>
                      <Text style={styles.correctionOriginal}>{cr.original}</Text>
                      <Text style={styles.correctionFixed}>→ {cr.corrected}</Text>
                      <Text style={styles.correctionNote}>{cr.note}</Text>
                    </View>
                  ))
                : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      marginTop: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.button,
      padding: spacing.sm + 2,
      gap: spacing.sm,
    },
    chipRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
    chip: {
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    chipTextActive: { color: c.white },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    loadingText: { fontSize: fontSizes.caption, color: c.textMuted },
    body: { fontSize: fontSizes.small, color: c.text, lineHeight: 22 },
    originalHint: { fontSize: fontSizes.caption, color: c.textMuted },
    correctionsBlock: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    correctionsHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
    correctionsTitle: { fontSize: fontSizes.caption, fontWeight: "800", color: c.primary },
    correctionItem: { gap: 2 },
    correctionOriginal: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textDecorationLine: "line-through",
    },
    correctionFixed: { fontSize: fontSizes.small, color: c.text, fontWeight: "600" },
    correctionNote: { fontSize: fontSizes.caption, color: c.textMuted },
  });
