import {Audio} from 'expo-av';
import {FocusNoise, NOISE_DUCKED_VOLUME, NOISE_VOLUME, playbackAudioMode, setNoiseKeepsAudioAlive} from './focusNoise';

// One looping player for the whole app. Requests are applied one at a time, latest wins.
const files: Record<Exclude<FocusNoise, 'off'>, number> = {
  rain: require('../../assets/sounds/noise/rain.m4a'),
  white: require('../../assets/sounds/noise/white.m4a'),
  cafe: require('../../assets/sounds/noise/cafe.m4a'),
};
const FADE_MS = 400, STEPS = 8;

let sound: Audio.Sound | null = null, loadedKind: FocusNoise = 'off', playing = false, volume = 0;
let wanted: FocusNoise = 'off', ducks = 0, chain: Promise<void> = Promise.resolve();

const target = () => (ducks > 0 ? NOISE_DUCKED_VOLUME : NOISE_VOLUME);
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
// Volume moves in small steps so starting, stopping and ducking never jump.
async function rampTo(next: number, ms = FADE_MS) {
  const player = sound; if (!player) return;
  const from = volume;
  for (let i = 1; i <= STEPS; i++) {
    if (player !== sound) return;
    volume = from + (next - from) * (i / STEPS);
    await player.setVolumeAsync(volume).catch(() => {});
    if (i < STEPS) await wait(ms / STEPS);
  }
}

async function apply() {
  const kind = wanted;
  if (kind === 'off') {
    if (sound && playing) { await rampTo(0); await sound.pauseAsync().catch(() => {}); }
    playing = false;
    if (sound && loadedKind !== 'off') { const old = sound; sound = null; loadedKind = 'off'; await old.unloadAsync().catch(() => {}); }
    setNoiseKeepsAudioAlive(false);
    await Audio.setAudioModeAsync(playbackAudioMode()).catch(() => {});
    return;
  }
  if (sound && loadedKind !== kind) {
    if (playing) await rampTo(0, 250);
    const old = sound; sound = null; playing = false; loadedKind = 'off';
    await old.unloadAsync().catch(() => {});
  }
  setNoiseKeepsAudioAlive(true);
  await Audio.setAudioModeAsync(playbackAudioMode());
  if (!sound) {
    const created = await Audio.Sound.createAsync(files[kind], {shouldPlay: false, isLooping: true, volume: 0});
    sound = created.sound; loadedKind = kind; volume = 0;
  }
  if (!playing) { await sound.playAsync(); playing = true; }
  await rampTo(target());
}

function schedule() {
  chain = chain.catch(() => {}).then(async () => {
    try { await apply(); }
    catch { playing = false; setNoiseKeepsAudioAlive(false); }
  });
  return chain;
}

/** Plays `kind` (or stops for 'off'). Safe to call on every render; nothing happens when the request is unchanged. */
export function setFocusNoise(kind: FocusNoise): Promise<void> {
  if (kind === wanted) return chain;
  wanted = kind;
  return schedule();
}

/** Lowers the noise while word audio or a celebration sound plays. Call the returned function when it ends. */
export function duckFocusNoise(): () => void {
  ducks++;
  if (ducks === 1 && playing) void rampTo(NOISE_DUCKED_VOLUME, 150);
  let released = false;
  return () => {
    if (released) return; released = true;
    ducks = Math.max(0, ducks - 1);
    if (ducks === 0 && playing) void rampTo(NOISE_VOLUME, 500);
  };
}

export const focusNoiseState = () => ({wanted, loadedKind, playing, ducks, volume});
