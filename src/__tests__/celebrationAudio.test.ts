import {Audio} from 'expo-av';
import {CELEBRATION_AUDIO_MODE,PLAYBACK_AUDIO_MODE,withCelebrationAudio} from '../lib/celebrationAudio';

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
