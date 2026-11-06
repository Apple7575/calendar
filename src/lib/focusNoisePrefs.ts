import AsyncStorage from '@react-native-async-storage/async-storage';
import {FOCUS_NOISE_KEY, FocusNoise, parseFocusNoise} from './focusNoise';

// The choice is kept on this device only (AsyncStorage), never in the routine record or backups.
let current: FocusNoise = 'off', loaded: Promise<FocusNoise> | null = null;
const listeners = new Set<(value: FocusNoise) => void>();
export const focusNoiseChoice = () => current;
export function loadFocusNoise(): Promise<FocusNoise> {
  loaded ??= AsyncStorage.getItem(FOCUS_NOISE_KEY).then(parseFocusNoise).catch(() => 'off' as FocusNoise).then(value => {
    current = value; listeners.forEach(listener => listener(value)); return value;
  });
  return loaded;
}
export async function saveFocusNoise(value: FocusNoise): Promise<void> {
  await AsyncStorage.setItem(FOCUS_NOISE_KEY, value);
  current = value; loaded = Promise.resolve(value);
  listeners.forEach(listener => listener(value));
}
export function subscribeFocusNoise(listener: (value: FocusNoise) => void): () => void {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
