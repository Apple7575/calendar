// 음성 → 텍스트.
// - TestFlight/개발 빌드: expo-speech-recognition으로 실시간(부분 결과) 인식
// - Expo Go: expo-av 녹음 → Edge Function(transcribe)이 OpenAI로 전사 (끝나야 표시)

import Constants from "expo-constants";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "./supabase";

// 네이티브 음성인식 모듈 — Expo Go에는 없으므로 로드 자체를 건너뛴다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let speech: any = null;
try {
  if (Constants.appOwnership !== "expo") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    speech = require("expo-speech-recognition");
  }
} catch {
  speech = null;
}

/** 실시간(부분 결과) 음성인식 가능 여부 */
export function isLiveSttAvailable(): boolean {
  return !!speech?.ExpoSpeechRecognitionModule;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let liveListeners: any[] = [];
let liveShown = "";
let liveCommitted = "";

/** 실시간 인식 시작 — 말하는 동안 onPartial로 계속 텍스트를 준다 */
export async function startLive(onPartial: (text: string) => void): Promise<void> {
  const perm = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!perm.granted) throw new Error("마이크·음성인식 권한이 필요해요. 설정에서 허용해 주세요.");
  liveShown = "";
  liveCommitted = "";
  liveListeners.push(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    speech.addSpeechRecognitionListener("result", (e: any) => {
      const t: string =
        e?.results?.map((r: { transcript?: string }) => r?.transcript ?? "").join("") ?? "";
      if (e?.isFinal) {
        liveCommitted = `${liveCommitted}${liveCommitted && t ? " " : ""}${t}`;
        liveShown = liveCommitted;
      } else {
        liveShown = `${liveCommitted}${liveCommitted && t ? " " : ""}${t}`;
      }
      onPartial(liveShown);
    })
  );
  speech.ExpoSpeechRecognitionModule.start({
    lang: "ko-KR",
    interimResults: true,
    continuous: true,
  });
}

/** 실시간 인식 종료 → 최종 텍스트 */
export async function stopLive(): Promise<string> {
  try {
    speech.ExpoSpeechRecognitionModule.stop();
  } catch {
    // 무시
  }
  for (const l of liveListeners) l?.remove?.();
  liveListeners = [];
  return liveShown.trim();
}

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
