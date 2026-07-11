// 음성 → 텍스트: expo-av로 녹음하고 Edge Function(transcribe)이 OpenAI로 전사한다.

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";

let recording: Audio.Recording | null = null;

/** 녹음 시작. 마이크 권한이 없으면 물어보고, 거부되면 throw */
export async function startRecording(): Promise<void> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error("마이크 권한이 필요해요. 설정에서 허용해 주세요.");
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
}

/** 녹음 종료 → 전사 텍스트 반환 */
export async function stopRecordingAndTranscribe(): Promise<string> {
  if (!recording) throw new Error("녹음 중이 아니에요.");
  const rec = recording;
  recording = null;
  await rec.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = rec.getURI();
  if (!uri) throw new Error("녹음 파일을 찾지 못했어요.");

  const audioBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const { data, error } = await supabase.functions.invoke<{ text: string }>("transcribe", {
    body: { audioBase64, mime: "audio/m4a" },
  });
  if (error) {
    throw new Error("전사에 실패했어요. transcribe 함수 배포와 OPENAI_API_KEY를 확인해 주세요.");
  }
  const text = data?.text?.trim();
  if (!text) throw new Error("아무 말도 알아듣지 못했어요. 다시 말해 주세요.");
  return text;
}

/** 녹음 취소 (전사 없이 버림) */
export async function cancelRecording(): Promise<void> {
  if (!recording) return;
  const rec = recording;
  recording = null;
  try {
    await rec.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch {
    // 무시
  }
}
