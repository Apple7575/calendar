// Builds the focus-noise loops in assets/sounds/noise (S1-22).
// Usage: node scripts/build-focus-noise.mjs <source folder>
//   The source folder holds the downloaded originals (Ethan's _downloads/alarm-noise). When the original
//   Freesound WAV files are there, they are used instead of the preview mp3 with the same id.
// Each loop: mono 44.1 kHz, the end crossfaded into the start so the loop has no seam,
// 10 ms fades at both ends (no click if the player leaves a tiny gap), -30 LUFS with a -6 dBTP limiter, AAC 96k m4a.
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, rmSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';

const SRC = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(SRC)) throw new Error('원본 폴더를 주세요. 예: node scripts/build-focus-noise.mjs C:/Users/SSAFY/Desktop/routine-portfolio/sound-candidates/_downloads/alarm-noise');
const OUT = resolve('assets/sounds/noise'), TMP = resolve('.focus-noise-tmp');
// Team-lead pick (2026-11-07): rain-c1, noise-c2 (brown) and cafe-c3.
const ITEMS = [
  {out: 'rain', id: 242889, start: 0, len: 48, x: 2},             // Rain from Indoors - Perfect loop · samesamesame · CC0
  {out: 'white', gen: 'brown', start: 0, len: 123, x: 3},         // ffmpeg anoisesrc brown, seed 7 · no third-party work
  {out: 'cafe', id: 403066, start: 5, len: 123, x: 3},            // MS-STEREO Coffee Shop, 6 People, low chatter · AwenAudio · CC0
];
const TARGET = -30, TP = -6;
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const loud = f => {
  const o = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  return {I: +o.match(/I:\s+(-?[\d.]+) LUFS/g).pop().match(/-?[\d.]+/)[0], tp: +o.match(/Peak:\s+(-?[\d.]+) dBFS/g).pop().match(/-?[\d.]+/)[0]};
};
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], {encoding: 'utf8'}).trim();

rmSync(TMP, {recursive: true, force: true}); mkdirSync(TMP, {recursive: true}); mkdirSync(OUT, {recursive: true});
for (const it of ITEMS) {
  const base = join(TMP, `${it.out}-base.wav`);
  let source = 'ffmpeg anoisesrc';
  if (it.gen) ff(['-f', 'lavfi', '-i', `anoisesrc=color=${it.gen}:amplitude=0.5:seed=7:sample_rate=44100:duration=${it.len + 1}`, '-af', 'lowpass=f=9000', '-ac', '1', base]);
  else {
    const wav = join(SRC, `fs-${it.id}.wav`), mp3 = join(SRC, `fs-${it.id}.mp3`);
    source = existsSync(wav) ? wav : mp3;
    if (!existsSync(source)) throw new Error('없는 원본: ' + source);
    ff(['-i', source, '-ac', '1', '-ar', '44100', base]);
  }
  const L = Math.min(it.len, dur(base) - it.start - 0.05);
  const A = join(TMP, `${it.out}-A.wav`), B = join(TMP, `${it.out}-B.wav`), one = join(TMP, `${it.out}-one.wav`), lev = join(TMP, `${it.out}-lev.wav`);
  ff(['-i', base, '-af', `atrim=${it.start + it.x}:${it.start + L},asetpts=PTS-STARTPTS`, A]);
  ff(['-i', base, '-af', `atrim=${it.start}:${it.start + it.x},asetpts=PTS-STARTPTS`, B]);
  ff(['-i', A, '-i', B, '-filter_complex', `[0][1]acrossfade=d=${it.x}:c1=qsin:c2=qsin`, one]);
  const len = dur(one), lim = 10 ** ((TP - 0.7) / 20);
  let gain = TARGET - loud(one).I;
  for (let k = 0; k < 2; k++) {
    ff(['-i', one, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${lim.toFixed(4)}:attack=2:release=80:level=disabled,afade=t=in:d=0.01,afade=t=out:st=${(len - 0.01).toFixed(3)}:d=0.01`, lev]);
    gain += TARGET - loud(lev).I;
  }
  const out = join(OUT, `${it.out}.m4a`);
  ff(['-i', lev, '-c:a', 'aac', '-b:a', '96k', '-ac', '1', out]);
  const m = loud(out);
  console.log(JSON.stringify({file: `assets/sounds/noise/${it.out}.m4a`, source: source.replace(SRC, '<src>'), seconds: +dur(out).toFixed(2), lufs: m.I, peak: m.tp, bytes: statSync(out).size}));
}
rmSync(TMP, {recursive: true, force: true});
