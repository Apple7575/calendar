import type {RoutineData} from './routineModel';
import {focusRampStatus,focusRunCredit} from './focusRamp';
import {handwritingAccess} from './handwriting';
import {bookRestOvertime} from './bookTimerTime';
/** The one thing the study page should ask for next. Screens derive their primary action from it. */
export type FocusFlowStage='plan'|'start'|'study'|'break'|'capture'|'submit'|'review';
export const FOCUS_FLOW_TITLES:Record<FocusFlowStage,string>={plan:'공부 시작',start:'공부 시작',study:'공부 중',break:'휴식 중',capture:'필기 제출',submit:'필기 제출',review:'필기 확인'};
/** While a timer is active the big timer is the study page; photos are opened from its button. */
export const opensTimer=(stage:FocusFlowStage)=>stage==='study'||stage==='break';
/**
 * Photos open when the latest run, with any carried surplus, reaches the whole stage, so a run cut short by a break restarts the wait (user decisions 2026-11-03, 2026-11-04).
 * The reward condition stays on accumulated time and must also be met; the editable countdown is not used.
 */
/** Whether the current stage's time is met. It drives the countdown, the rest button's stage and the 25-minute photo. */
export function focusStageMet(data:RoutineData,now=Date.now()){
 const subject=data.outputDraft?.subject;
 if(!subject||!handwritingAccess(data,subject,now).ready)return false;
 const t=data.bookTimer,required=focusRampStatus(data,now).required;
 if(!required)return true;
 if(!t||t.subject!==subject)return false;
 return focusRunCredit(data,now)>=required;
}
/** The 25-minute stage is the last one of a round (level 5), whatever its length. */
const PHOTO_LEVEL=5;
/**
 * Photos only at the 25-minute stage (user decision 2026-11-06: "사진은 25분 다 하면 이때만 찍자"). The stages before it are
 * paid by the rest button, and finishing early takes its photo through canDeclareFinish.
 */
export function canTakeHandwritingPhoto(data:RoutineData,now=Date.now()){
 const status=focusRampStatus(data,now);
 return focusStageMet(data,now)&&(!status.required||status.level===PHOTO_LEVEL);
}
/** "다 했어요" opens once some of this stage has been studied: before 25 minutes at any point, met or not; at 25 until it is met. */
export function canDeclareFinish(data:RoutineData,now=Date.now()){
 const subject=data.outputDraft?.subject,t=data.bookTimer,required=focusRampStatus(data,now).required;
 // A finish photo already waiting (too few letters so far) keeps it open, to add a page; any other waiting photo closes it.
 const waiting=data.handwritingPending,ownFinish=!!waiting?.declared&&waiting.subject===subject;
 if(!subject||!required||waiting&&!ownFinish||t?.subject!==subject||t.rewardMode!=='output'||t.awaitingChoice===true)return false;
 const credit=focusRunCredit(data,now);
 return credit>0&&(focusRampStatus(data,now).level<PHOTO_LEVEL||credit<required);
}
export function focusFlowStage(data:RoutineData,hasPhoto:boolean,now=Date.now(),capture=false,declare=false):FocusFlowStage{
 if(data.handwritingPending)return 'review';
 if(hasPhoto)return 'submit';
 if(capture&&(canTakeHandwritingPhoto(data,now)||declare&&canDeclareFinish(data,now)))return 'capture';
 if(focusRampStatus(data,now).needsPlan)return 'plan';
 const timer=data.bookTimer,phase=timer?.phase;
 if(timer?.awaitingChoice===true)return 'study';
 if(phase==='break'||(timer&&bookRestOvertime(timer,now)!==null))return 'break';
 if(phase==='focus')return 'study';
 return canTakeHandwritingPhoto(data,now)?'capture':'start';
}

/** 집중 공부가 목표를 넘은 순간 연두로 뒤집히는 시간(초). */
export const FOCUS_OVERTIME_FLASH_SECONDS=4;
/**
 * 시계가 연두로 뒤집히는 때. 휴식이 끝난 뒤에는 계속, 집중 공부는 목표를 넘은 직후 잠깐만 뒤집는다.
 * 저장 없이 목표를 넘긴 시간으로만 판단하므로, 앱을 다시 켜도 이미 지난 시점이면 다시 번쩍이지 않는다.
 * flashDone: 같은 타이머에서 시간을 조정해 목표를 다시 넘어도 한 번만 뒤집기 위한 값.
 */
export function focusClockInverted(phase:string,left:number,restOvertime:number|null,flashDone=false){
 // A rest is always inverted, so it never looks like study (build 53). '휴식 중' counts down, '휴식 끝' counts up with '+'.
 if(phase==='break')return true;
 if(phase==='idle')return restOvertime!==null;
 return phase==='focus'&&!flashDone&&left<=0&&left>-FOCUS_OVERTIME_FLASH_SECONDS;
}
