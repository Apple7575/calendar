import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { signInWithGoogle } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { colors, fontSizes, spacing } from "../theme/tokens";

export function LoginScreen() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.emoji}>🗓️</Text>
        <Text style={styles.title}>나의 캘린더</Text>
        <Text style={styles.subtitle}>
          구글 캘린더 일정과 함께{"\n"}매일의 할 일과 일기를 한곳에서.
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryButton title="구글로 시작하기" onPress={handleSignIn} loading={loading} />
        <Text style={styles.hint}>
          로그인하면 구글 캘린더 읽기·쓰기 권한을 요청해요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  emoji: { fontSize: 64, marginBottom: spacing.md },
  title: { fontSize: fontSizes.hero, fontWeight: "800", color: colors.text },
  subtitle: {
    fontSize: fontSizes.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  footer: { padding: spacing.lg },
  hint: {
    fontSize: fontSizes.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
