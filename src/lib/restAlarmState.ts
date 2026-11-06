/** 지금 울리는 휴식 끝 알람을 화면들이 함께 본다 (S1-21). RestAlarmGate가 정하고, 큰 타이머는 링 안에 '알람 끄기'를 그린다. */
let ringing=false,stop:()=>void=()=>{};
const listeners=new Set<(on:boolean)=>void>();
export function publishRestAlarm(on:boolean,onStop:()=>void){stop=onStop;if(on===ringing)return;ringing=on;listeners.forEach(f=>f(on));}
export function restAlarmIsRinging(){return ringing}
export function stopRingingRestAlarm(){stop()}
export function onRestAlarmRinging(f:(on:boolean)=>void){listeners.add(f);return()=>{listeners.delete(f)}}
