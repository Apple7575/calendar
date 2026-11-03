import type {RoutineData} from './routineModel';
import {focusRampStatus} from './focusRamp';
import {handwritingAccess} from './handwriting';
/** The one thing the study page should ask for next. Screens derive their primary action from it. */
export type FocusFlowStage='plan'|'start'|'study'|'break'|'capture'|'submit'|'review';
export const FOCUS_FLOW_TITLES:Record<FocusFlowStage,string>={plan:'공부 시작',start:'공부 시작',study:'공부 중',break:'휴식 중',capture:'필기 제출',submit:'필기 제출',review:'필기 확인'};
export function focusFlowStage(data:RoutineData,hasPhoto:boolean,now=Date.now()):FocusFlowStage{
 if(data.handwritingPending)return 'review';
 if(hasPhoto)return 'submit';
 if(focusRampStatus(data,now).needsPlan)return 'plan';
 const phase=data.bookTimer?.phase,subject=data.outputDraft?.subject;
 if(phase==='break')return 'break';
 if(subject&&handwritingAccess(data,subject,now).ready)return 'capture';
 return phase==='focus'?'study':'start';
}
