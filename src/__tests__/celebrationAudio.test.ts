import {Audio} from 'expo-av';
import {CELEBRATION_AUDIO_MODE,PLAYBACK_AUDIO_MODE,withCelebrationAudio} from '../lib/celebrationAudio';
import {claimStudyAudio,holdStudyAudio,studyAudioBusy} from '../lib/studyAudioFocus';

jest.mock('expo-av',()=>({Audio:{setAudioModeAsync:jest.fn(async()=>{})}}));
beforeEach(()=>jest.clearAllMocks());
const DAYTIME=new Date(2026,10,7,13,0).getTime(),NIGHT=new Date(2026,10,7,22,0).getTime();

// 팀장 결정(2026-11-06, B안): 무음 모드에서는 축하음을 내지 않고 진동만. 학습 음성(단어·예문)은 무음에서도 들린다.
describe('축하음은 무음 스위치를 따른다',()=>{
 test('축하음 모드는 무음 스위치를 따르고, 학습 음성 모드는 무음에서도 재생한다',()=>{
  expect(CELEBRATION_AUDIO_MODE.playsInSilentModeIOS).toBe(false);
  expect(PLAYBACK_AUDIO_MODE.playsInSilentModeIOS).toBe(true);
 });
 test('축하음을 내는 동안만 축하음 모드로 바꾸고, 끝나면 학습 음성 모드로 되돌린다',async()=>{
  const order:string[]=[];
  (Audio.setAudioModeAsync as jest.Mock).mockImplementation(async(m:{playsInSilentModeIOS:boolean})=>{order.push(m.playsInSilentModeIOS?'playback':'celebration')});
  await withCelebrationAudio(async()=>{order.push('play')},DAYTIME);
  expect(order).toEqual(['celebration','play','playback']);
 });
 test('재생이 실패해도 학습 음성 모드로 되돌린다',async()=>{
  await withCelebrationAudio(async()=>{throw new Error('x')},DAYTIME).catch(()=>{});
  const calls=(Audio.setAudioModeAsync as jest.Mock).mock.calls;
  expect(calls[calls.length-1][0].playsInSilentModeIOS).toBe(true);
 });
});

// 팀장 결정(2026-11-07): 밤 9시~4시 30분(취침 잠금 시각)에는 축하를 진동만으로. 축하음을 아예 내지 않는다.
describe('밤에는 축하음을 내지 않는다',()=>{
 test('밤이면 재생하지 않고 오디오 모드도 건드리지 않는다',async()=>{
  const play=jest.fn(async()=>{});
  await withCelebrationAudio(play,NIGHT);
  expect(play).not.toHaveBeenCalled();
  expect(Audio.setAudioModeAsync).not.toHaveBeenCalled();
 });
 test('낮에는 그대로 재생한다',async()=>{
  const play=jest.fn(async()=>{});
  await withCelebrationAudio(play,DAYTIME);
  expect(play).toHaveBeenCalledTimes(1);
 });
});

// S1-07: 축하음과 학습 음성(단어·예문)이 부딪히지 않게. 학습 음성이 먼저다.
// 축하음 모드는 무음 스위치를 따르므로, 발음이 나오는 중에 모드를 바꾸면 무음 모드에서 발음이 끊길 수 있다.
describe('축하음과 학습 음성',()=>{
 test('발음이 나오는 중이면 축하음을 내지 않고 오디오 모드도 건드리지 않는다(진동은 부르는 쪽이 낸다)',async()=>{
  const release=holdStudyAudio(Symbol('word'));
  const play=jest.fn(async()=>{});
  await withCelebrationAudio(play,DAYTIME);
  expect(play).not.toHaveBeenCalled();
  expect(Audio.setAudioModeAsync).not.toHaveBeenCalled();
  release();
  await withCelebrationAudio(play,DAYTIME);
  expect(play).toHaveBeenCalledTimes(1);
 });
 test('축하음 중에 발음이 시작되면 축하음을 멈추고 학습 음성 모드로 되돌린 뒤에 발음이 나온다',async()=>{
  const order:string[]=[];
  (Audio.setAudioModeAsync as jest.Mock).mockImplementation(async(m:{playsInSilentModeIOS:boolean})=>{order.push(m.playsInSilentModeIOS?'playback':'celebration')});
  let signal:AbortSignal|undefined;
  const running=withCelebrationAudio(s=>{signal=s;order.push('play');return new Promise(()=>{});},DAYTIME);
  await new Promise(r=>setTimeout(r,0));
  await claimStudyAudio(Symbol('word'));order.push('word');
  await running;
  expect(signal?.aborted).toBe(true);
  expect(order).toEqual(['celebration','play','playback','word']);
 });
 test('발음 쪽이 차례를 가져가면 앞서 잡고 있던 차례는 풀린다',async()=>{
  holdStudyAudio(Symbol('old-word'));
  expect(studyAudioBusy()).toBe(true);
  await claimStudyAudio(Symbol('feedback'));
  expect(studyAudioBusy()).toBe(false);
 });
});
