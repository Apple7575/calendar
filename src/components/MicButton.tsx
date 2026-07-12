// 마이크 버튼: 누르면 녹음 시작(빨간색), 다시 누르면 텍스트를 onText로 전달.
// TestFlight/개발 빌드에서는 실시간 인식 — 말하는 동안 onPartial로 계속 텍스트를 준다.
// Expo Go에서는 녹음 → Whisper 전사 (끝나야 텍스트가 나옴).

import { Microphone } from "phosphor-react-native/src/icons/Microphone";
import { Stop } from "phosphor-react-native/src/icons/Stop";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from "react-native";
import { tapLight } from "../lib/haptics";
import {
  isLiveSttAvailable,
  startLive,
  startRecording,
  stopLive,
  stopRecordingAndTranscribe,
} from "../lib/stt";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  onText: (text: string) => void;
  /** 실시간 부분 결과 (네이티브 빌드에서만 불림) */
  onPartial?: (text: string) => void;
  /** 녹음 시작/종료 알림 */
  onListeningChange?: (listening: boolean) => void;
  size?: number;
};

export function MicButton({ onText, onPartial, onListeningChange, size = 40 }: Props) {
  const { colors: c } = useTheme();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const live = isLiveSttAvailable();

  const handlePress = async () => {
    if (busy) return;
    tapLight();
    if (!recording) {
      try {
        if (live) await startLive((t) => onPartial?.(t));
        else await startRecording();
        setRecording(true);
        onListeningChange?.(true);
      } catch (e) {
        Alert.alert("오류", e instanceof Error ? e.message : "녹음을 시작하지 못했어요.");
      }
      return;
    }
    setRecording(false);
    onListeningChange?.(false);
    setBusy(true);
    try {
      const text = live ? await stopLive() : await stopRecordingAndTranscribe();
      if (!text) throw new Error("아무 말도 알아듣지 못했어요. 다시 말해 주세요.");
      onText(text);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "전사에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft },
        recording && { backgroundColor: "#FF5A79" },
      ]}
      onPress={handlePress}
      disabled={busy}
      accessibilityLabel={recording ? "녹음 끝내기" : "음성으로 입력"}
    >
      {busy ? (
        <ActivityIndicator size="small" color={c.primary} />
      ) : recording ? (
        <Stop size={size * 0.45} weight="fill" color="#FFFFFF" />
      ) : (
        <Microphone size={size * 0.5} weight="duotone" color={c.primary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center" },
});
