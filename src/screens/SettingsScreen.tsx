import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { Section } from "../components/Section";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";
import { signInWithGoogle, signOut } from "../lib/auth";
import { getAccessToken, GoogleNotLinkedError } from "../lib/googleTokens";
import { supabase } from "../lib/supabase";
import { colors, fontSizes, spacing } from "../theme/tokens";

type GoogleStatus = "checking" | "connected" | "notLinked" | "error";

export function SettingsScreen() {
  const [email, setEmail] = useState<string>("");
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>("checking");
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  const checkGoogle = useCallback(async () => {
    setGoogleStatus("checking");
    try {
      await getAccessToken();
      setGoogleStatus("connected");
    } catch (e) {
      setGoogleStatus(e instanceof GoogleNotLinkedError ? "notLinked" : "error");
    }
  }, []);

  useEffect(() => {
    checkGoogle();
  }, [checkGoogle]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const { canceled } = await signInWithGoogle();
      if (!canceled) {
        invalidateGoogleCache();
        await checkGoogle();
      }
    } catch (e) {
      Alert.alert("연결 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setReconnecting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("로그아웃", "로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            invalidateGoogleCache();
            await signOut();
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "로그아웃에 실패했어요.");
          }
        },
      },
    ]);
  };

  const statusLabel: Record<GoogleStatus, string> = {
    checking: "확인 중…",
    connected: "연결됨 ✓",
    notLinked: "연결 안 됨",
    error: "상태 확인 실패",
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>
      <View style={styles.body}>
        <Section title="계정">
          <Text style={styles.rowText}>{email || "이메일 정보 없음"}</Text>
        </Section>

        <Section title="구글 캘린더">
          <View style={styles.statusRow}>
            <Text style={styles.rowText}>연결 상태</Text>
            <Text
              style={[
                styles.statusText,
                googleStatus === "connected" && { color: colors.success },
                googleStatus === "notLinked" && { color: colors.danger },
              ]}
            >
              {statusLabel[googleStatus]}
            </Text>
          </View>
          {googleStatus !== "connected" && googleStatus !== "checking" ? (
            <View style={{ marginTop: spacing.sm }}>
              <PrimaryButton
                title="구글 캘린더 다시 연결"
                onPress={handleReconnect}
                loading={reconnecting}
                variant="secondary"
              />
            </View>
          ) : null}
        </Section>

        <PrimaryButton title="로그아웃" onPress={handleSignOut} variant="danger" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontSize: fontSizes.title, fontWeight: "800", color: colors.text },
  body: { flex: 1, padding: spacing.md },
  rowText: { fontSize: fontSizes.body, color: colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusText: { fontSize: fontSizes.body, fontWeight: "700", color: colors.textMuted },
});
