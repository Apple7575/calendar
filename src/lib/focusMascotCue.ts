import {FOCUS_MARKS as FOCUS_STEPS} from './focusRamp';
/** Read-only snapshot of the focus timer. The cue is display only and never feeds timer or reward logic. */
export type FocusMascotFrame={timerId:string;phase:string;credit:number;elapsed:number};
export type FocusMascotCue='start'|'stage'|'break';
const FRESH_SECONDS=5,LAST_STEP=FOCUS_STEPS[FOCUS_STEPS.length-1];
const reachedStage=(from:number,to:number)=>FOCUS_STEPS.some(step=>step>0&&from<step&&to>=step)||Math.floor(to/LAST_STEP)>Math.floor(from/LAST_STEP);
/**
 * The character moves once at each of these moments and is still otherwise (user decision 2026-11-04):
 * study starting, study reaching 2·5·10·15·25 minutes (25 repeats, as its reward does), and a break starting.
 * Time carried into a new run counts as already reached, so opening a run never plays a stage.
 */
export function focusMascotCue(previous:FocusMascotFrame|null,next:FocusMascotFrame):FocusMascotCue|null{
 if(next.phase!=='focus'&&next.phase!=='break')return null;
 const entered=next.phase==='break'?'break':'start';
 if(!previous)return next.elapsed<FRESH_SECONDS?entered:null;
 if(previous.phase!==next.phase||previous.timerId!==next.timerId)return next.phase==='break'&&previous.phase==='break'?null:entered;
 return next.phase==='focus'&&reachedStage(previous.credit,next.credit)?'stage':null;
}
