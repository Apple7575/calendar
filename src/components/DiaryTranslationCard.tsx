// 일기 번역 카드: 한국어|English|日本語 탭 + (외국어 원문일 때) AI 첨삭 + TTS 듣기.
// 언어 칩을 처음 누를 때 번역을 만들고, 이후에는 캐시로 바로 보여준다.

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DiaryTranslations, getDiaryTranslations, LANG_LABELS } from "../lib/diaryLang";
import { stopSpeaking, toggleSpeak } from "../lib/tts";
import { RootStackParamList } from "../navigation/types";
import { DiaryLang, DiaryRow } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

const LANGS: DiaryLang[] = ["ko", "en", "ja"];

export function DiaryTranslationCard({ diary }: { diary: DiaryRow }) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState<DiaryLang | null>(null);
  const [translations, setTranslations] = useState<DiaryTranslations | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // 화면을 떠나면 읽기 중단
  useEffect(() => stopSpeaking, []);

  /** 선택한 언어의 번역(없으면 원문)을 그 언어 목소리로 읽어준다 */
  const handleSpeak = async () => {
    const text =
      selected && translations ? translations.byLang[selected] : diary.content;
    const lang = selected && translations ? selected : null;
    setSpeaking(await toggleSpeak(text, lang, () => setSpeaking(false)));
  };

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
        <TouchableOpacity
          style={[styles.speakButton, speaking && styles.speakButtonActive]}
          onPress={handleSpeak}
          hitSlop={6}
        >
          <Ionicons
            name={speaking ? "stop" : "volume-high-outline"}
            size={15}
            color={speaking ? c.white : c.primary}
          />
        </TouchableOpacity>
        {/* 배속·구간·쉐도잉 플레이어 — 보고 있는 텍스트(번역 또는 원문)로 */}
        <TouchableOpacity
          style={styles.speakButton}
          onPress={() => {
            stopSpeaking();
            setSpeaking(false);
            navigation.navigate("DiaryListen", {
              text: selected && translations ? translations.byLang[selected] : diary.content,
            });
          }}
          hitSlop={6}
        >
          <Ionicons name="headset-outline" size={15} color={c.primary} />
        </TouchableOpacity>
      </View>

      {selected && loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={styles.loadingText}>자연스러운 번역을 만드는 중…</Text>
        </View>
      ) : null}

      {selected && translations ? (
        <>
          <Text style={styles.body} selectable>
            {translations.byLang[selected]}
          </Text>
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
    speakButton: {
      marginLeft: "auto",
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    speakButtonActive: { backgroundColor: c.primary, borderColor: c.primary },
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
