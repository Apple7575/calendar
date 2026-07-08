import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { signInWithGoogle } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

export function LoginScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        "설정 필요",
        "app.json의 extra에 Supabase URL과 anon key를 입력한 뒤 다시 실행해 주세요. (SETUP.md 참고)"
      );
      return;
    }
    setLoading(true);
    try {
      const { canceled } = await signInWithGoogle();
      if (canceled) return;
      // 성공 시 onAuthStateChange가 Main으로 전환
    } catch (e) {
      Alert.alert("로그인 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={c.gradient} style={styles.hero}>
        <SafeAreaView edges={["top"]} style={styles.heroInner}>
          <View style={styles.logoCircle}>
            <Ionicons name="calendar" size={44} color={c.gradient[1]} />
          </View>
          <Text style={styles.title}>나의 캘린더</Text>
          <Text style={styles.subtitle}>
            구글 캘린더 일정과 함께{"\n"}매일의 할 일과 일기를 한곳에서
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <View style={styles.featureRow}>
          <Feature icon="sync-outline" label="구글 연동" styles={styles} c={c} />
          <Feature icon="journal-outline" label="사진 일기" styles={styles} c={c} />
          <Feature icon="checkbox-outline" label="할 일" styles={styles} c={c} />
          <Feature icon="notifications-outline" label="알림" styles={styles} c={c} />
        </View>
        <PrimaryButton title="구글로 시작하기" onPress={handleSignIn} loading={loading} />
        <Text style={styles.hint}>로그인하면 구글 캘린더 읽기·쓰기 권한을 요청해요.</Text>
      </SafeAreaView>
    </View>
  );
}

function Feature({
  icon,
  label,
  styles,
  c,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={c.primary} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    hero: {
      flex: 1,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
    },
    heroInner: { flex: 1, alignItems: "center", justifyContent: "center" },
    logoCircle: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    title: {
      fontSize: fontSizes.hero + 4,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: fontSizes.body,
      color: "rgba(255,255,255,0.85)",
      textAlign: "center",
      marginTop: spacing.sm,
      lineHeight: 24,
    },
    footer: { padding: spacing.lg, paddingTop: spacing.lg },
    featureRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: spacing.lg,
    },
    feature: { alignItems: "center", gap: 6 },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.button + 2,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    featureLabel: { fontSize: fontSizes.caption, color: c.textMuted, fontWeight: "600" },
    hint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      marginTop: spacing.sm + 2,
    },
  });
