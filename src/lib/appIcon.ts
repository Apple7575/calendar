import {STREAK_ANIMALS,streakWidgetView} from './streakWidget';

/**
 * 앱 아이콘 규칙 (사용자 결정 2026-11-06, 12시 기준·B안).
 * 하루를 04~12시(오전 칸)와 12시~다음 날 04시(오후 칸)로 나눈다.
 * 오전은 그날 동물의 웃는 얼굴, 오후는 실천했으면 신난 얼굴·안 했으면 걱정 얼굴이다. 오늘 실천했으면 오전에도 신난 얼굴이다.
 * 한 칸에서 한 번만 바꾼다. 오후에 걱정 얼굴을 본 뒤 실천하면 그때만 신난 얼굴로 한 번 더 바꾼다(하루 최대 3번).
 * iOS는 앱이 열려 있을 때만 아이콘을 바꿀 수 있고 바꿀 때마다 시스템 알림창을 띄운다.
 */
export type AppIconSlot='am'|'pm';
export type AppIconFace='smile'|'worried'|'cheer';
export type AppIconLast={day:string;slot:AppIconSlot};

const FACES:AppIconFace[]=['smile','worried','cheer'];
/** 파일 `assets/app-icons/{face}-{animal}.png`와 같은 이름. */
export const APP_ICON_NAMES=FACES.flatMap(face=>STREAK_ANIMALS.map(animal=>`${face}-${animal}`));

/** "smile-otter" → "SmileOtter". app.json의 expo-alternate-app-icons 이름과 같다. */
export const nativeIconName=(name:string)=>name.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('');

export function appIconSlot(hour:number):AppIconSlot{return hour>=4&&hour<12?'am':'pm';}

/** dayKey는 04시 기준 날짜다. 동물은 연속 실천 위젯과 같은 날짜 순서를 쓴다. */
export function appIconName(dayKey:string,hour:number,todayDone:boolean):string{
 const {animal}=streakWidgetView(null,dayKey,hour);
 const face:AppIconFace=todayDone?'cheer':appIconSlot(hour)==='am'?'smile':'worried';
 return `${face}-${animal}`;
}

/** 지금 바꿀 아이콘. 바꾸지 않으면 null이다. last는 마지막으로 바꾼 칸, current는 지금 아이콘 이름이다. */
export function nextAppIcon(input:{last:AppIconLast|null;current:string|null;day:string;hour:number;todayDone:boolean}):{icon:string;last:AppIconLast}|null{
 const {last,current,day,hour,todayDone}=input;
 const icon=appIconName(day,hour,todayDone);
 if(icon===current)return null;
 const slot=appIconSlot(hour);
 if(last&&last.day===day&&last.slot===slot){
  const afterWorry=slot==='pm'&&todayDone&&current===appIconName(day,hour,false);
  return afterWorry?{icon,last}:null;
 }
 return {icon,last:{day,slot}};
}
