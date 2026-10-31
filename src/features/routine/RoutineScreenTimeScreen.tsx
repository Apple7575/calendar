import React, { useState } from "react";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { RootScreenProps } from "../../navigation/types";
import { runScreenTimeAction, ScreenTimeAction } from "../../lib/screenTime";
import { useRoutine } from "./RoutineProvider";
import { Action, CardView, Copy, Link, Mascot, Page } from "./ui";

export function RoutineScreenTimeScreen({ navigation }: RootScreenProps<"RoutineScreenTime">) {
  const { native, refreshNative } = useRoutine();
  const [busy, setBusy] = useState(false);
  const perform = async (action: ScreenTimeAction) => {
    setBusy(true);
    try { await runScreenTimeAction(action); await refreshNative(); }
    catch (e) { Alert.alert("앱 제한 설정", e instanceof Error ? e.message : "설정을 확인해 주세요."); }
    finally { setBusy(false); }
  };
  const count = native ? native.selectedApps + native.selectedCategories + native.selectedWebsites : 0;
  return <Page title="스크린타임">
    <CardView><Mascot /><Copy size={23} weight="800">하고 싶은 일부터, 먼저.</Copy><Copy muted>루틴을 완료하면 인스타·유튜브 등에 쓸 수 있는 공용 시간이 생겨요.</Copy>
      <Copy weight="700">{native?.enabled && native.authorized && native.rewardMode ? "루틴과 앱 제한이 연결됐어요" : "아직 루틴 제한이 연결되지 않았어요"}</Copy>
      <Copy muted>아침 루틴 전 잠금 · 새벽 4시 초기화 · 잔액 이월 없음</Copy>
    </CardView>
    {!native ? <CardView><Copy>이 기능을 포함한 새 아이폰 빌드와 iOS 17.4 이상이 필요해요. 권한이 준비되기 전에는 실제로 앱을 잠그지 못해요.</Copy></CardView> : <>
      <Action label={native.authorized ? "스크린타임 접근 허용됨" : "스크린타임 접근 허용"} disabled={busy || native.authorized} onPress={() => void perform("requestAuthorization")} />
      <Action label={`제한할 앱 선택 · 현재 ${count}개`} secondary disabled={busy || !native.authorized || native.enabled} onPress={() => void perform("selectApps")} />
      <Action label={native.enabled && native.rewardMode ? "루틴 연결 완료" : "루틴 보상과 연결하기"} disabled={busy || !native.authorized || !count || native.enabled} onPress={() => void perform("enableRoutineMode")} />
      {native.enabled ? <Link label="앱 선택을 바꾸려면 제한 연결 중단" onPress={() => Alert.alert("앱 제한을 중단할까요?", "이 앱이 적용한 잠금이 해제돼요. 루틴 기록은 유지돼요.", [
        { text: "취소", style: "cancel" }, { text: "중단", style: "destructive", onPress: () => void perform("disable") },
      ])} /> : null}
      {native.enabled && !native.rewardMode ? <Copy>현재 테스트 모드예요. 테스트를 중단한 뒤 루틴 연결을 시작해 주세요.</Copy> : null}
    </>}
    <CardView><Copy weight="700">취침·집중 보호</Copy><Copy>21:00부터 04:30까지 취침 잠금</Copy><Copy>공부 25분과 휴식 5분에는 앱 잠금 유지</Copy><Copy muted size={13}>{native?.policyVersion===2?"보상을 받으면 홈에서 모은 시간 사용을 시작해요.":"이 정책은 새 아이폰 빌드에서 적용돼요. 현재 설치본의 반영 상태를 확인해 주세요."}</Copy></CardView>
    <Action secondary label="종료 2분 전 알림 허용" disabled={busy} onPress={() => {
      void Notifications.requestPermissionsAsync().then(permission => {
        if (!permission.granted) Alert.alert("알림 권한", "아이폰 설정에서 알림을 켜 주세요.");
      }).catch(e => Alert.alert("알림", e.message));
    }} />
    <Copy muted size={13}>iOS가 사용량을 전달하는 시점에 따라 표시와 잠금 반영에 지연이 있을 수 있어요. 기기 설정에서 권한을 철회하면 제한은 적용되지 않아요.</Copy>
    <Link label="개발용 잠금 테스트 열기" onPress={() => navigation.navigate("ScreenTimeTest")} />
  </Page>;
}
