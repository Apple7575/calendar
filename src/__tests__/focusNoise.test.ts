const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
}));
const mockSounds: any[] = [];
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(async () => {}),
    Sound: {createAsync: jest.fn(async (_source: unknown, status: any) => {
      const sound = {status: {...status}, volumes: [] as number[], playAsync: jest.fn(async () => {}), pauseAsync: jest.fn(async () => {}), unloadAsync: jest.fn(async () => {}),
        setVolumeAsync: jest.fn(async (v: number) => { sound.volumes.push(v); })};
      mockSounds.push(sound); return {sound};
    })},
  },
}));
import {Audio} from 'expo-av';
import {CELEBRATION_AUDIO_MODE, withCelebrationAudio} from '../lib/celebrationAudio';
import {FOCUS_NOISE_KEY, NOISE_DUCKED_VOLUME, NOISE_VOLUME, parseFocusNoise, playbackAudioMode, shouldPlayFocusNoise} from '../lib/focusNoise';
import {loadFocusNoise, saveFocusNoise} from '../lib/focusNoisePrefs';
import {duckFocusNoise, focusNoiseState, setFocusNoise} from '../lib/focusNoisePlayer';

const timer = (phase: 'focus' | 'break' | 'idle', running = true) => ({id: 't', subject: 's', startedAt: '', phase, endsAt: 0, remaining: 0, running});
const modes = () => (Audio.setAudioModeAsync as jest.Mock).mock.calls.map(([m]) => m);
const last = <T,>(list: T[]) => list[list.length - 1];
const DAYTIME = new Date(2026, 10, 7, 13, 0).getTime();

afterEach(async () => { await setFocusNoise('off'); jest.clearAllMocks(); mockSounds.length = 0; });

test('a mockStored choice is read back; anything unknown is off', async () => {
  expect(parseFocusNoise('rain')).toBe('rain');
  expect(parseFocusNoise('thunder')).toBe('off');
  expect(parseFocusNoise(null)).toBe('off');
  await saveFocusNoise('cafe');
  expect(mockStore.get(FOCUS_NOISE_KEY)).toBe('cafe');
  expect(await loadFocusNoise()).toBe('cafe');
});

test('plays only while a focus run is running', () => {
  expect(shouldPlayFocusNoise('rain', timer('focus') as any)).toBe(true);
  expect(shouldPlayFocusNoise('rain', timer('focus', false) as any)).toBe(false);
  expect(shouldPlayFocusNoise('rain', timer('break') as any)).toBe(false);
  expect(shouldPlayFocusNoise('rain', timer('idle') as any)).toBe(false);
  expect(shouldPlayFocusNoise('off', timer('focus') as any)).toBe(false);
  expect(shouldPlayFocusNoise('rain', undefined)).toBe(false);
});

test('starting loops the file, keeps audio alive with the screen locked, mixes with other apps and fades in', async () => {
  await setFocusNoise('rain');
  const sound = mockSounds[0];
  expect(sound.status).toMatchObject({isLooping: true, shouldPlay: false, volume: 0});
  expect(last(modes())).toMatchObject({staysActiveInBackground: true, playsInSilentModeIOS: true, interruptionModeIOS: 0});
  expect(sound.playAsync).toHaveBeenCalledTimes(1);
  expect(last(sound.volumes)).toBeCloseTo(NOISE_VOLUME);
  // No jump: each step is small.
  const steps = [0, ...sound.volumes].slice(1).map((v: number, i: number) => Math.abs(v - [0, ...sound.volumes][i]));
  expect(Math.max(...steps)).toBeLessThanOrEqual(NOISE_VOLUME / 4);
  expect(playbackAudioMode().staysActiveInBackground).toBe(true);
});

test('stopping fades out, pauses, unloads and lets the audio session sleep again', async () => {
  await setFocusNoise('white');
  const sound = mockSounds[0];
  await setFocusNoise('off');
  expect(last(sound.volumes)).toBe(0);
  expect(sound.pauseAsync).toHaveBeenCalled();
  expect(sound.unloadAsync).toHaveBeenCalled();
  expect(last(modes()).staysActiveInBackground).toBe(false);
  expect(focusNoiseState()).toMatchObject({playing: false, loadedKind: 'off'});
});

test('switching mockSounds replaces the player', async () => {
  await setFocusNoise('rain');
  await setFocusNoise('cafe');
  expect(mockSounds).toHaveLength(2);
  expect(mockSounds[0].unloadAsync).toHaveBeenCalled();
  expect(focusNoiseState()).toMatchObject({loadedKind: 'cafe', playing: true});
});

test('word audio ducks the noise and it comes back afterwards', async () => {
  await setFocusNoise('rain');
  const release = duckFocusNoise();
  await new Promise(r => setTimeout(r, 300));
  expect(last(mockSounds[0].volumes)).toBeCloseTo(NOISE_DUCKED_VOLUME);
  release(); release();
  await new Promise(r => setTimeout(r, 700));
  expect(last(mockSounds[0].volumes)).toBeCloseTo(NOISE_VOLUME);
  expect(focusNoiseState().ducks).toBe(0);
});

test('a celebration ducks the noise and remockStores the background-safe mode', async () => {
  await setFocusNoise('rain');
  (Audio.setAudioModeAsync as jest.Mock).mockClear();
  let ducked = 0;
  await withCelebrationAudio(async () => { ducked = focusNoiseState().ducks; }, DAYTIME);
  expect(ducked).toBe(1);
  expect(modes()[0]).toEqual(CELEBRATION_AUDIO_MODE);
  // iOS rejects "follow the silent switch" together with "stay active in the background".
  expect(CELEBRATION_AUDIO_MODE).toMatchObject({playsInSilentModeIOS: false, staysActiveInBackground: false});
  expect(last(modes())).toMatchObject({playsInSilentModeIOS: true, staysActiveInBackground: true});
  expect(focusNoiseState().ducks).toBe(0);
});
