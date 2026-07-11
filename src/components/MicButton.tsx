// 마이크 버튼: 누르면 녹음 시작(빨간 펄스), 다시 누르면 전사해서 onText로 전달.

import { Microphone } from "phosphor-react-native/src/icons/Microphone";
import { Stop } from "phosphor-react-native/src/icons/Stop";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from "react-native";
import { tapLight } from "../lib/haptics";
import { startRecording, stopRecordingAndTranscribe } from "../lib/stt";
import { useTheme } from "../theme/ThemeContext";

export function MicButton({ onText, size = 40 }: { onText: (text: string) => void; size?: number }) {
  const { colors: c } = useTheme();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (busy) return;
    tapLight();
    if (!recording) {
      try {
        await startRecording();
        setRecording(true);
      } catch (e) {
        Alert.alert("오류", e instanceof Error ? e.message : "녹음을 시작하지 못했어요.");
      }
      return;
    }
    setRecording(false);
    setBusy(true);
    try {
      onText(await stopRecordingAndTranscribe());
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
