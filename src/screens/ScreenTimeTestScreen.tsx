import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import React, { useCallback, useState } from "react";
import { Alert, AppState, ScrollView, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Section } from "../components/Section";
import {
  getScreenTimeStatus, isScreenTimeInstalled, runScreenTimeAction,
  ScreenTimeAction, ScreenTimeStatus,
} from "../lib/screenTime";
import { useTheme } from "../theme/ThemeContext";
import { spacing } from "../theme/tokens";

export function ScreenTimeTestScreen() {
  const { colors: c } = useTheme();
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ScreenTimeAction | "notifications" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<boolean | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [next, permission] = await Promise.all([
          getScreenTimeStatus(), Notifications.getPermissionsAsync(),
        ]);
        if (active) {
          setStatus(next);
          setNotifications(permission.granted);
          setError(null);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "상태를 읽지 못했어요.");
      } finally { if (active) setLoading(false); }
    };
    void refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 15000);
    return () => { active = false; clearInterval(interval); listener.remove(); };
  }, []));

  const act = async (action: ScreenTimeAction) => {
    setBusy(action);
    try {
      await runScreenTimeAction(action);
      setStatus(await getScreenTimeStatus());
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "요청을 처리하지 못했어요.";
      setError(message);
      Alert.alert("스크린타임", message);
    } finally { setBusy(null); }
  };

  const requestNotifications = async () => {
    setBusy("notifications");
    try {
      const permission = await Notifications.requestPermissionsAsync();
      setNotifications(permission.granted);
      if (!permission.granted) Alert.alert("알림이 꺼져 있어요", "종료 2분 전 알림을 받으려면 아이폰 설정에서 알림을 허용해 주세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림 권한 요청에 실패했어요.");
    } finally { setBusy(null); }
  };

  const ready = !!status?.authorized;
  const selectionCount = status
    ? status.selectedApps + status.selectedCategories + status.selectedWebsites : 0;
  const remaining = status ? Math.max(0, status.grantedMinutes - status.consumedMinutes) : 0;
  const blocked = loading || busy !== null;
  const textStyle = { color: c.text, lineHeight: 23 };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}>
      <Section title="스크린타임 테스트">
        <Text style={textStyle}>선택한 앱에 공용 10분을 지급하고, 시간을 다 쓰면 다시 잠기는지 확인해요. 실제 루틴 보상과는 아직 연결되지 않았어요.</Text>
        {!isScreenTimeInstalled() ? (
          <Text style={textStyle}>이 빌드에는 스크린타임 기능이 없어요. 새 아이폰 빌드 설치가 필요해요.</Text>
        ) : !loading && !status && !error ? (
          <Text style={textStyle}>이 테스트는 iOS 17.4 이상에서 사용할 수 있어요.</Text>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={{ color: c.danger }}>{error}</Text> : null}
      </Section>

      <Section title="현재 상태">
        {loading ? <Text style={textStyle}>상태 확인 중…</Text> : status ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: c.primary, fontSize: 32, fontWeight: "800" }}>{remaining}분</Text>
            <Text style={textStyle}>확인된 사용량 기준 잔액 · 분 단위로 갱신돼요.</Text>
            <Text style={textStyle}>접근 권한: {ready ? "허용됨" : "허용 필요"}</Text>
            <Text style={textStyle}>선택: 앱 {status.selectedApps}개 · 카테고리 {status.selectedCategories}개 · 웹사이트 {status.selectedWebsites}개</Text>
            <Text style={textStyle}>테스트: {status.enabled ? "진행 중" : "중단됨"} · {status.locked ? "잠금 설정됨" : "잠금 해제 상태"}</Text>
            {!ready && status.enabled ? <Text style={{ color: c.danger }}>접근 권한이 없어 실제 잠금은 보장되지 않아요.</Text> : null}
            <Text style={textStyle}>아침 루틴: {status.morningComplete ? "테스트 완료" : "미완료"}</Text>
            <Text style={textStyle}>지급 {status.grantedMinutes}분 · 사용 확인 {status.consumedMinutes}분</Text>
            <Text style={textStyle}>하루 기준: {status.day} 새벽 4시부터</Text>
            <Text style={textStyle}>{status.lastEvent}</Text>
            <Text style={{ color: c.textMuted }}>마지막 동작: {new Date(status.lastEventAt).toLocaleString()}</Text>
          </View>
        ) : <Text style={textStyle}>사용 가능한 상태 정보가 없어요.</Text>}
      </Section>

      <Section title="1. 접근 허용 · 앱 선택">
        <PrimaryButton title="스크린타임 접근 허용" disabled={blocked || !status || ready}
          loading={busy === "requestAuthorization"} onPress={() => void act("requestAuthorization")} />
        <PrimaryButton title="제한할 앱 선택" variant="secondary"
          disabled={blocked || !ready || status?.enabled} loading={busy === "selectApps"}
          onPress={() => void act("selectApps")} />
        <PrimaryButton title={notifications ? "알림 허용됨" : "종료 2분 전 알림 허용"}
          variant="secondary" disabled={blocked || !status || notifications === true}
          loading={busy === "notifications"} onPress={() => void requestNotifications()} />
        <Text style={textStyle}>처음에는 인스타·유튜브처럼 확인할 앱 두 개만 선택해 주세요. 카테고리 전체 선택은 피하면 확인하기 쉬워요.</Text>
      </Section>

      <Section title="2. 잠금 · 보상 확인">
        <PrimaryButton title="잠금 테스트 시작" disabled={blocked || !ready || selectionCount === 0 || status?.enabled}
          loading={busy === "enable"} onPress={() => void act("enable")} />
        <PrimaryButton title="테스트 시간 10분 지급" variant="secondary"
          disabled={blocked || !ready || !status?.enabled || status.grantedMinutes > 0}
          loading={busy === "grantTestTime"} onPress={() => void act("grantTestTime")} />
        <PrimaryButton title="아침 루틴 완료로 처리" variant="secondary"
          disabled={blocked || !ready || !status?.enabled || status.morningComplete}
          loading={busy === "completeMorning"} onPress={() => void act("completeMorning")} />
        <Text style={textStyle}>10분을 먼저 적립해도 아침 루틴 완료 전에는 잠금이 유지돼요. 두 앱을 번갈아 쓰며 합산 8분 알림과 10분 재잠금을 확인해 주세요.</Text>
      </Section>

      <Section title="3. 초기화 · 테스트 종료">
        <Text style={textStyle}>새벽 4시에 잔액과 아침 완료 상태가 초기화돼요. 앱을 닫아 둔 상태에서도 잠기는지 확인해야 해요.</Text>
        <PrimaryButton title="테스트 중단 · 제한 해제" variant="danger"
          disabled={blocked || !isScreenTimeInstalled()} loading={busy === "disable"}
          onPress={() => Alert.alert("테스트를 중단할까요?", "선택한 앱의 테스트 잠금을 해제하고 잔액을 지워요.", [
            { text: "취소", style: "cancel" },
            { text: "중단", style: "destructive", onPress: () => void act("disable") },
          ])} />
      </Section>
    </ScrollView>
  );
}
