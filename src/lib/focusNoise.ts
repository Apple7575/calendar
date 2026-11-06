import type {BookTimer} from './bookStudy';

/**
 * Background noise while focusing (S1-22, team-lead request 2026-11-07).
 * - The choice lives on this device only. It is not part of rewards, backups or the cloud record.
 * - It plays only while a focus run is running, and stops for breaks so the end-of-break alarm is heard.
 * - Files are mono loops normalised to about -30 LUFS; word audio is about -21 LUFS.
 *   At NOISE_VOLUME the noise sits about 15 dB under the word audio, and it drops further while other sounds play.
 */
export const FOCUS_NOISES = ['off', 'rain', 'white', 'cafe'] as const;
export type FocusNoise = typeof FOCUS_NOISES[number];
export const FOCUS_NOISE_LABEL: Record<FocusNoise, string> = {off: '끄기', rain: '빗소리', white: '백색소음', cafe: '카페'};
export const FOCUS_NOISE_KEY = 'routine.focusNoise.v1';
export const NOISE_VOLUME = 0.55;
export const NOISE_DUCKED_VOLUME = 0.15;

export const parseFocusNoise = (value: unknown): FocusNoise =>
  (FOCUS_NOISES as readonly unknown[]).includes(value) ? value as FocusNoise : 'off';

export const shouldPlayFocusNoise = (choice: FocusNoise, timer: BookTimer | undefined): boolean =>
  choice !== 'off' && timer?.phase === 'focus' && timer.running === true;

/**
 * iOS has one audio mode for the whole app. While the noise plays, every sound in the app must keep
 * staysActiveInBackground on, or the noise stops when the screen locks. Everyone builds their mode from here.
 */
let backgroundWanted = false;
export const setNoiseKeepsAudioAlive = (value: boolean) => { backgroundWanted = value; };
export const playbackAudioMode = () => ({
  allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: backgroundWanted,
  interruptionModeIOS: 0 /* MixWithOthers: other apps' music keeps playing */, shouldDuckAndroid: true,
});
