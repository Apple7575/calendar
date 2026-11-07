import {Audio} from 'expo-av';
import {isNightScreen} from './nightScreen';
import {playbackAudioMode} from './focusNoise';
import {duckFocusNoise} from './focusNoisePlayer';
import {registerStudyAudio,studyAudioBusy} from './studyAudioFocus';

/**
 * 축하음과 학습 음성의 소리 모드 (팀장 결정 2026-11-06, B안).
 * iOS의 소리 모드는 앱 전체에 하나라서, 축하음을 내는 동안만 무음 스위치를 따르는 모드로 바꾸고 끝나면 되돌린다.
 * - 축하음(complete·milestone): 무음 모드면 소리 없이 진동만.
 * - 학습 음성(단어·예문 발음): 지금처럼 무음 모드에서도 들린다.
 * - 밤(21:00~04:30, 취침 잠금과 같은 시각)에는 축하음을 아예 내지 않는다(팀장 결정 2026-11-07). 진동은 부르는 쪽에서 그대로 낸다.
 */
export const PLAYBACK_AUDIO_MODE={allowsRecordingIOS:false,playsInSilentModeIOS:true,staysActiveInBackground:false,shouldDuckAndroid:true} as const;
// iOS refuses a mode that follows the silent switch and also stays active in the background, so the celebration mode turns that off for its 1–2 s.
export const CELEBRATION_AUDIO_MODE={...PLAYBACK_AUDIO_MODE,playsInSilentModeIOS:false,staysActiveInBackground:false} as const;

let chain:Promise<void>=Promise.resolve();
/**
 * play는 소리가 끝날 때 끝나는 약속을 돌려준다. 실패해도 학습 음성 모드로 되돌린다.
 * 학습 음성이 먼저다(S1-07): 발음이 나오는 중이면 축하음을 건너뛰고(진동은 부르는 쪽이 낸다),
 * 축하음 중에 발음이 시작되면(claimStudyAudio) signal로 축하음을 멈추고 학습 음성 모드로 되돌린 뒤에 발음이 나온다.
 */
export function withCelebrationAudio(play:(signal:AbortSignal)=>Promise<void>,now=Date.now()):Promise<void>{
 if(isNightScreen(now)||studyAudioBusy())return Promise.resolve();
 const run=chain.catch(()=>{}).then(async()=>{
  if(studyAudioBusy())return;
  const controller=new AbortController(),owner=Symbol('celebration');
  let interrupted!:()=>void;const aborted=new Promise<void>(resolve=>{interrupted=resolve;});
  let finished:Promise<void>=Promise.resolve();
  const unregister=registerStudyAudio(owner,()=>{controller.abort();interrupted();return finished;});
  const release=duckFocusNoise();
  finished=(async()=>{
   try{await Audio.setAudioModeAsync(CELEBRATION_AUDIO_MODE);if(!controller.signal.aborted)await Promise.race([play(controller.signal),aborted]);}
   finally{unregister();await Audio.setAudioModeAsync(playbackAudioMode()).catch(()=>{});release();}
  })();
  await finished;
 });
 chain=run.catch(()=>{});
 return run;
}

/** 소리가 끝나거나 멈추면(최대 maxMs) 끝나는 약속. 상태를 알 수 없는 소리(테스트의 가짜 소리)는 바로 끝낸다. */
export function untilFinished(sound:Audio.Sound,maxMs=3500):Promise<void>{
 const listen=(sound as Partial<Audio.Sound>).setOnPlaybackStatusUpdate?.bind(sound);
 if(!listen)return Promise.resolve();
 return new Promise(resolve=>{
  const done=()=>{clearTimeout(timer);listen(null);resolve();};
  const timer=setTimeout(done,maxMs);
  listen(s=>{if(!s.isLoaded||s.didJustFinish)done();});
 });
}
