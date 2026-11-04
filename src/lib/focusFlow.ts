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
export function canTakeHandwritingPhoto(data:RoutineData,now=Date.now()){
 const subject=data.outputDraft?.subject;
 if(!subject||!handwritingAccess(data,subject,now).ready)return false;
 const t=data.bookTimer,required=focusRampStatus(data,now).required;
 if(!required)return true;
 if(!t||t.subject!==subject)return false;
 return focusRunCredit(data,now)>=required;
}
export function focusFlowStage(data:RoutineData,hasPhoto:boolean,now=Date.now(),capture=false):FocusFlowStage{
 if(data.handwritingPending)return 'review';
 if(hasPhoto)return 'submit';
 if(capture&&canTakeHandwritingPhoto(data,now))return 'capture';
 if(focusRampStatus(data,now).needsPlan)return 'plan';
 const timer=data.bookTimer,phase=timer?.phase;
 if(phase==='break'||(timer&&bookRestOvertime(timer,now)!==null))return 'break';
 if(phase==='focus')return 'study';
 return canTakeHandwritingPhoto(data,now)?'capture':'start';
}

/** 집중 시계가 시간 초과 화면으로 뒤집히는 때: 목표 시간을 넘긴 집중, 끝난 뒤 시간이 흐르는 휴식. */
export function focusClockInverted(phase:string,left:number,restOvertime:number|null){
 return (phase==='focus'&&left<=0)||(phase==='idle'&&restOvertime!==null);
}
