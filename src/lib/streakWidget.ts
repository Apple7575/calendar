import {routineStreak} from './routineActivity';
import {addDays} from './dateUtils';
import type {RoutineData} from './routineModel';

/**
 * 홈 화면 연속 실천 위젯에 넘기는 값. 숫자와 오늘 함은 홈의 `routineStreak`를 그대로 쓴다.
 * day는 저장한 하루(04시 기준), nextDay는 그다음 하루다. 위젯은 날짜 계산 없이 이 둘과 현재 날짜만 비교한다.
 */
export type StreakWidgetPayload={current:number;todayDone:boolean;day:string;nextDay:string};
export type StreakWidgetState='zero'|'calm'|'worried'|'urgent'|'done';
export type StreakWidgetView={state:StreakWidgetState;days:number|null;animal:StreakAnimal;pose:1|2};

/** 그림 파일 이름의 동물 순서. `targets/widget/StreakWidget.swift`의 `streakAnimals`와 같아야 한다. */
export const STREAK_ANIMALS=['otter','cat','bear','hedgehog'] as const;
export type StreakAnimal=typeof STREAK_ANIMALS[number];

export function streakWidgetPayload(data:RoutineData,today:string):StreakWidgetPayload{
 const {current,todayDone}=routineStreak(data,today);
 return {current,todayDone,day:today,nextDay:addDays(today,1)};
}

/** 사용자 결정(2026-11-06): 04~18시 평온, 18~21시 걱정, 21~04시 다급. 21시는 취침 잠금 시각이다. */
export function hourState(hour:number):'calm'|'worried'|'urgent'{
 return hour>=4&&hour<18?'calm':hour>=18&&hour<21?'worried':'urgent';
}

const dayNumber=(key:string)=>Math.floor(Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7))-1,Number(key.slice(8,10)))/86_400_000);
const animalOn=(key:string)=>STREAK_ANIMALS[((dayNumber(key)%4)+4)%4];
const poseOn=(key:string):1|2=>Math.floor(dayNumber(key)/4)%2===0?1:2;

/**
 * 위젯이 지금 보여 줄 그림. `StreakWidget.swift`의 `streakView`와 같은 규칙이다.
 * dayKey는 04시 기준 현재 날짜, hour는 현재 시(0~23)다. 값이 없거나 깨졌으면 숫자 없이 평온한 그림이다.
 */
export function streakWidgetView(payload:StreakWidgetPayload|null,dayKey:string,hour:number):StreakWidgetView{
 const base={animal:animalOn(dayKey),pose:poseOn(dayKey)};
 if(!payload||typeof payload.current!=='number'||typeof payload.day!=='string'||typeof payload.nextDay!=='string')return {...base,state:'calm',days:null};
 const key=dayKey<payload.day?payload.day:dayKey;
 const shown={animal:animalOn(key),pose:poseOn(key)};
 if(key===payload.day){
  if(payload.todayDone)return {...shown,state:'done',days:payload.current};
  return payload.current?{...shown,state:hourState(hour),days:payload.current}:{...shown,state:'zero',days:0};
 }
 if(key===payload.nextDay&&payload.todayDone&&payload.current)return {...shown,state:hourState(hour),days:payload.current};
 return {...shown,state:'zero',days:0};
}
