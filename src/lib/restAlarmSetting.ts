import AsyncStorage from '@react-native-async-storage/async-storage';

/** 휴식 끝 알람 종 아이콘(켬/끔). 기기에만 기억한다. 보상·백업 데이터에는 넣지 않는다. 기본은 켬. */
export const REST_ALARM_SETTING_KEY='focus.restAlarm.on.v1';
let value=true,loaded=false;
const listeners=new Set<(on:boolean)=>void>();
export function restAlarmOn(){return value}
export async function loadRestAlarmSetting():Promise<boolean>{
 if(loaded)return value;
 try{const raw=await AsyncStorage.getItem(REST_ALARM_SETTING_KEY);value=raw!=='off';}catch{value=true;}
 loaded=true;listeners.forEach(f=>f(value));
 return value;
}
export async function setRestAlarmOn(on:boolean){
 value=on;loaded=true;listeners.forEach(f=>f(on));
 try{await AsyncStorage.setItem(REST_ALARM_SETTING_KEY,on?'on':'off');}catch{}
}
export function onRestAlarmSetting(f:(on:boolean)=>void){listeners.add(f);return()=>{listeners.delete(f)}}
export function resetRestAlarmSettingForTest(){value=true;loaded=false;listeners.clear();}
