import {inSleepWindow} from './emergencyUnlock';
import {getTheme,nightTheme,type Theme,type ThemeId} from '../theme/themes';
import type {AnimalActionId} from '../features/routine/animalAssets';

/**
 * 밤 화면 (팀장 결정 2026-11-07, 2차 회의 아이디어 1).
 * 취침 잠금과 같은 시각(21:00~04:30)에 화면이 자동으로 밤 화면이 된다. 시각은 취침 잠금의 inSleepWindow 하나만 쓴다.
 * 보이는 것만 바꾼다: 잠금·보상·돈과 저장된 테마 선택은 그대로다.
 * - 색: 고른 테마 대신 nightTheme
 * - 축하: 작은 축하(진동)로만, 축하음 없음 (celebration.ts, celebrationAudio.ts)
 * - 오늘 탭 친구: 저녁 동작 A30
 */
export const isNightScreen=(now:number)=>inSleepWindow(now);

/** 다음에 밤↔낮이 바뀌는 시각(ms). 낮이면 오늘 21:00, 밤이면 다음 04:30. */
export function nextNightChange(now:number):number{
 const d=new Date(now),at=(dayOffset:number,h:number,m:number)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+dayOffset,h,m).getTime();
 if(!isNightScreen(now))return at(0,21,0);
 return d.getHours()>=21?at(1,4,30):at(0,4,30);
}

/** 지금 그릴 테마. 밤이면 고른 테마와 상관없이 밤 화면. */
export const screenTheme=(saved:ThemeId,night:boolean):Theme=>night?nightTheme:getTheme(saved);

/** 오늘 탭 친구(고양이 C04)의 동작. 말 걸기가 있으면 그 동작, 밤이면 저녁 동작, 낮이면 지금처럼. */
export function todayFriendAction(now:number,complete:boolean,nudgeAction?:AnimalActionId):AnimalActionId{
 if(nudgeAction)return nudgeAction;
 if(isNightScreen(now))return 'A30';
 return complete?'A23':'A31';
}