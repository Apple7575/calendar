import {Platform,Vibration} from 'react-native';
import {Audio} from 'expo-av';
import {playbackAudioMode} from './focusNoise';

/**
 * 휴식 끝 알람 소리 (S1-21): 반복 재생 + 진동. 무음 스위치가 켜져 있어도 울린다(playsInSilentModeIOS).
 * 앱이 켜져 있을 때만 쓴다. 앱이 뒤에 있으면 알림 소리(30초)가 대신한다.
 */
const SOURCE=require('../../assets/sounds/rest_alarm.wav');
const VIBRATION=[0,700,500];
let sound:Audio.Sound|null=null,wanted=false,queue:Promise<unknown>=Promise.resolve();

async function begin(){
 if(sound)return;
 // 앱 전체가 같은 모드를 쓴다(S1-22). playbackAudioMode는 무음 스위치를 무시한다(playsInSilentModeIOS:true).
 await Audio.setAudioModeAsync(playbackAudioMode());
 const created=await Audio.Sound.createAsync(SOURCE,{shouldPlay:false,isLooping:true,volume:1});
 if(!wanted){await created.sound.unloadAsync().catch(()=>{});return;}
 sound=created.sound;
 await sound.playAsync();
 if(Platform.OS!=='web')Vibration.vibrate(VIBRATION,true);
}
async function end(){
 Vibration.cancel();
 const s=sound;sound=null;
 if(s){await s.stopAsync().catch(()=>{});await s.unloadAsync().catch(()=>{});}
}
/** 차례로 실행해서, 켜자마자 끄면 소리가 남지 않는다. */
export function startRestAlarm(){wanted=true;queue=queue.then(begin).catch(()=>{});return queue;}
export function stopRestAlarm(){wanted=false;queue=queue.then(end).catch(()=>{});return queue;}
