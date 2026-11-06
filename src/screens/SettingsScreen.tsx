import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { Section } from "../components/Section";
import { invalidateGoogleCache } from "../hooks/useGoogleEvents";
import { signInWithGoogle, signOut } from "../lib/auth";
import { exportDiariesAsMarkdown } from "../lib/exportData";
import { getAccessToken, GoogleNotLinkedError } from "../lib/googleTokens";
import {
  BriefingReminderPref,
  DiaryReminderPref,
  ensureNotificationPermission,
  getBriefingReminderPref,
  getDiaryReminderPref,
  getMomentReminderPref,
  getReviewReminderPref,
  MomentReminderPref,
  ReviewReminderPref,
  setBriefingReminder,
  setDiaryReminder,
  setMomentReminder,
  setReviewReminder,
} from "../lib/notifications";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { INTERESTS_HIDDEN_KEY, MODULE_TITLES } from "./InterestsScreen";
import { useThemeControls } from "../theme/ThemeContext";
import { THEMES, ThemeColors } from "../theme/themes";
import { fontSizes, spacing } from "../theme/tokens";

type GoogleStatus = "checking" | "connected" | "notLinked" | "error";

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, themeId, setThemeId } = useThemeControls();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const [email, setEmail] = useState<string>("");
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>("checking");
  const [reconnecting, setReconnecting] = useState(false);
  const [diaryPref, setDiaryPref] = useState<DiaryReminderPref | null>(null);
  const [briefingPref, setBriefingPref] = useState<BriefingReminderPref | null>(null);
  const [momentPref, setMomentPref] = useState<MomentReminderPref | null>(null);
  const [reviewPref, setReviewPref] = useState<ReviewReminderPref | null>(null);
  const [hiddenInterests, setHiddenInterests] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(INTERESTS_HIDDEN_KEY)
      .then((raw) => setHiddenInterests(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => {});
  }, []);

  const restoreInterest = async (id: string) => {
    const next = hiddenInterests.filter((x) => x !== id);
    setHiddenInterests(next);
    await AsyncStorage.setItem(INTERESTS_HIDDEN_KEY, JSON.stringify(next));
  };
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDiariesAsMarkdown();
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "내보내기에 실패했어요.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
    getDiaryReminderPref().then(setDiaryPref);
    getBriefingReminderPref().then(setBriefingPref);
    getMomentReminderPref().then(setMomentPref);
    getReviewReminderPref().then(setReviewPref);
  }, []);

  const applyReviewPref = async (next: ReviewReminderPref) => {
    if (next.enabled) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert("알림 권한 필요", "설정 앱에서 이 앱의 알림을 허용해 주세요.");
        return;
      }
    }
    try {
      await setReviewReminder(next);
      setReviewPref(next);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "회고 알림 설정에 실패했어요.");
    }
  };

  const applyMomentPref = async (next: MomentReminderPref) => {
    if (next.enabled) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert("알림 권한 필요", "설정 앱에서 이 앱의 알림을 허용해 주세요.");
        return;
      }
    }
    try {
      await setMomentReminder(next);
      setMomentPref(next);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "순간 찍기 알림 설정에 실패했어요.");
    }
  };

  const applyBriefingPref = async (next: BriefingReminderPref) => {
    if (next.enabled) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert("알림 권한 필요", "설정 앱에서 이 앱의 알림을 허용해 주세요.");
        return;
      }
    }
    try {
      await setBriefingReminder(next);
      setBriefingPref(next);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "브리핑 알림 설정에 실패했어요.");
    }
  };

  const applyDiaryPref = async (next: DiaryReminderPref) => {
    if (next.enabled) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        Alert.alert("알림 권한 필요", "설정 앱에서 이 앱의 알림을 허용해 주세요.");
        return;
      }
    }
    try {
      await setDiaryReminder(next);
      setDiaryPref(next);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "리마인드 설정에 실패했어요.");
    }
  };

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
      const { canceled } = await signInWithGoogle({ selectAccount: true });
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
      <ScrollView style={styles.body}>
        <Section title="루틴 · 스크린타임">
          <PrimaryButton title="스크린타임 테스트 열기" variant="secondary"
            onPress={() => navigation.navigate("ScreenTimeTest")} />
        </Section>
        <Section title="테마">
          <View style={styles.themeRow}>
            {THEMES.map((t) => {
              const selected = t.id === themeId;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.themeItem}
                  onPress={() => setThemeId(t.id)}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: t.colors.background },
                      selected && { borderColor: c.primary, borderWidth: 2.5 },
                    ]}
                  >
                    <View
                      style={[styles.swatchDot, { backgroundColor: t.colors.primary }]}
                    />
                    {selected ? (
                      <View style={[styles.swatchCheck, { backgroundColor: c.primary }]}>
                        <Ionicons name="checkmark" size={10} color={c.white} />
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.themeName,
                      selected && { color: c.primary, fontWeight: "700" },
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="계정">
          <Text style={styles.rowText}>{email || "이메일 정보 없음"}</Text>
          <PrimaryButton title="구글 계정 선택 · 변경" variant="secondary" onPress={handleReconnect} loading={reconnecting} />
        </Section>

        <Section title="아침 브리핑 알림">
          <View style={styles.statusRow}>
            <Text style={styles.rowText}>매일 아침 알림 받기</Text>
            <Switch
              value={briefingPref?.enabled ?? false}
              onValueChange={(enabled) => {
                if (briefingPref) applyBriefingPref({ ...briefingPref, enabled });
              }}
              trackColor={{ true: c.primary }}
            />
          </View>
          {briefingPref?.enabled ? (
            <View style={[styles.statusRow, { marginTop: spacing.sm }]}>
              <Text style={styles.rowText}>알림 시각</Text>
              <DateTimePicker
                value={new Date(2000, 0, 1, briefingPref.hour, briefingPref.minute)}
                mode="time"
                locale="ko-KR"
                minuteInterval={5}
                onChange={(_, d) =>
                  d &&
                  applyBriefingPref({
                    ...briefingPref,
                    hour: d.getHours(),
                    minute: d.getMinutes(),
                  })
                }
              />
            </View>
          ) : null}
          <Text style={styles.scopeHint}>
            알림을 열고 오늘 탭에 들어오면 AI 브리핑이 준비돼 있어요.
          </Text>
        </Section>

        <Section title="순간 찍기 알림">
          <View style={styles.statusRow}>
            <Text style={styles.rowText}>매일 깜짝 알림 받기</Text>
            <Switch
              value={momentPref?.enabled ?? false}
              onValueChange={(enabled) => {
                if (momentPref !== null) applyMomentPref({ enabled });
              }}
              trackColor={{ true: c.primary }}
            />
          </View>
          <Text style={styles.scopeHint}>
            매일 10시~21시 사이 랜덤한 시각에 "지금 이 순간"을 찍자고 알려드려요. 알림을
            누르면 바로 카메라가 열려요.
          </Text>
        </Section>

        <Section title="주말 회고 알림">
          <View style={styles.statusRow}>
            <Text style={styles.rowText}>일요일 저녁 8시 알림</Text>
            <Switch
              value={reviewPref?.enabled ?? false}
              onValueChange={(enabled) => {
                if (reviewPref !== null) applyReviewPref({ enabled });
              }}
              trackColor={{ true: c.primary }}
            />
          </View>
          <Text style={styles.scopeHint}>
            한 주를 돌아보고 주간 리포트와 목표를 점검할 시간을 알려드려요.
          </Text>
        </Section>

        <Section title="일기 리마인드">
          <View style={styles.statusRow}>
            <Text style={styles.rowText}>매일 알림 받기</Text>
            <Switch
              value={diaryPref?.enabled ?? false}
              onValueChange={(enabled) => {
                if (diaryPref) applyDiaryPref({ ...diaryPref, enabled });
              }}
              trackColor={{ true: c.primary }}
            />
          </View>
          {diaryPref?.enabled ? (
            <View style={[styles.statusRow, { marginTop: spacing.sm }]}>
              <Text style={styles.rowText}>알림 시각</Text>
              <DateTimePicker
                value={new Date(2000, 0, 1, diaryPref.hour, diaryPref.minute)}
                mode="time"
                locale="ko-KR"
                minuteInterval={5}
                onChange={(_, d) =>
                  d &&
                  applyDiaryPref({
                    ...diaryPref,
                    hour: d.getHours(),
                    minute: d.getMinutes(),
                  })
                }
              />
            </View>
          ) : null}
        </Section>

        <Section title="구글 캘린더">
          <View style={styles.statusRow}>
            <Text style={styles.rowText}>연결 상태</Text>
            <Text
              style={[
                styles.statusText,
                googleStatus === "connected" && { color: c.success },
                googleStatus === "notLinked" && { color: c.danger },
              ]}
            >
              {statusLabel[googleStatus]}
            </Text>
          </View>
          {googleStatus !== "checking" ? (
            <View style={{ marginTop: spacing.sm }}>
              <PrimaryButton
                title="구글 캘린더 다시 연결"
                onPress={handleReconnect}
                loading={reconnecting}
                variant="secondary"
              />
              <Text style={styles.scopeHint}>
                권한 오류(403)가 나면 다시 연결하면서 구글 동의 화면의{" "}
                <Text style={{ fontWeight: "700" }}>캘린더 접근 체크박스</Text>를 꼭 켜 주세요.
              </Text>
            </View>
          ) : null}
        </Section>

        <Section title="관심사 아카이브">
          {hiddenInterests.length === 0 ? (
            <Text style={styles.scopeHint}>
              숨긴 관심사가 없어요. 관심사 탭에서 카드의 ✕를 누르면 여기로 들어와요.
            </Text>
          ) : (
            hiddenInterests.map((id) => (
              <View key={id} style={[styles.statusRow, { marginBottom: spacing.sm }]}>
                <Text style={styles.rowText}>{MODULE_TITLES[id] ?? id}</Text>
                <TouchableOpacity onPress={() => restoreInterest(id)} hitSlop={8}>
                  <Text style={styles.restoreText}>복원</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Section>

        <Section title="데이터">
          <PrimaryButton
            title="일기 백업 내보내기 (마크다운)"
            variant="secondary"
            onPress={handleExport}
            loading={exporting}
          />
          <Text style={styles.scopeHint}>
            모든 일기(기분·에너지·수면·사람·감사 포함)를 텍스트 파일로 내보내요.
            사진은 앱과 서버에 안전하게 보관됩니다.
          </Text>
        </Section>

        <PrimaryButton title="로그아웃" onPress={handleSignOut} variant="danger" />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    body: { flex: 1, padding: spacing.md },
    rowText: { fontSize: fontSizes.body, color: c.text },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statusText: { fontSize: fontSizes.body, fontWeight: "700", color: c.textMuted },
    restoreText: { fontSize: fontSizes.small, fontWeight: "800", color: c.primary },
    scopeHint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      marginTop: spacing.sm,
      lineHeight: 17,
    },
    themeRow: { flexDirection: "row", justifyContent: "space-between" },
    themeItem: { alignItems: "center", gap: 6 },
    swatch: {
      width: 52,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    swatchDot: { width: 22, height: 22, borderRadius: 11 },
    swatchCheck: {
      position: "absolute",
      right: -3,
      top: -3,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    themeName: { fontSize: fontSizes.caption, color: c.textMuted },
  });
