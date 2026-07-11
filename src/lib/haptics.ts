// 햅틱 피드백 래퍼 — 실패해도 조용히 무시 (시뮬레이터/미지원 기기)

import * as Haptics from "expo-haptics";

/** 가벼운 톡 — 달 넘기기, 체크, 좋아요 */
export function tapLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** 성공 — 전부 완료, 저장 */
export function tapSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
