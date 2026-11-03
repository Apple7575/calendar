import type {RoutineData} from './routineModel';
import {focusRampStatus} from './focusRamp';
import {handwritingAccess} from './handwriting';
/** The one thing the study page should ask for next. Screens derive their primary action from it. */
export type FocusFlowStage='plan'|'start'|'study'|'break'|'capture'|'submit'|'review';
export const FOCUS_FLOW_TITLES:Record<FocusFlowStage,string>={plan:'공부 시작',start:'공부 시작',study:'공부 중',break:'휴식 중',capture:'필기 제출',submit:'필기 제출',review:'필기 확인'};
/** While a timer is active the big timer is the study page; photos are opened from its button. */
export const opensTimer=(stage:FocusFlowStage)=>stage==='study'||stage==='break';
export function focusFlowStage(data:RoutineData,hasPhoto:boolean,now=Date.now(),capture=false):FocusFlowStage{
 if(data.handwritingPending)return 'review';
 if(hasPhoto)return 'submit';
 if(capture)return 'capture';
 if(focusRampStatus(data,now).needsPlan)return 'plan';
 const phase=data.bookTimer?.phase,subject=data.outputDraft?.subject;
 if(phase==='break')return 'break';
 if(phase==='focus')return 'study';
 return subject&&handwritingAccess(data,subject,now).ready?'capture':'start';
}
