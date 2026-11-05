import {FOCUS_STEPS} from './focusRamp';

const LAST=FOCUS_STEPS[FOCUS_STEPS.length-1];
const clock=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export const clockLabel=clock;
export type FocusJourney={studied:number;next:number|null;progress:number;ticks:{seconds:number;at:number;done:boolean}[]};
/**
 * The focus clock as one lap of 25 minutes (user decision 2026-11-05). studied is the time the next photo counts.
 * A stage below the current one was already paid, so its mark stays lit. Display only: rewards do not read this.
 */
export function focusJourney(credit:number,required:number):FocusJourney{
 const studied=Number.isFinite(credit)?Math.max(0,Math.floor(credit)):0;
 const next=studied<required?required:FOCUS_STEPS.find(s=>s>studied)??null;
 return {studied,next,progress:Math.min(1,studied/LAST),ticks:FOCUS_STEPS.filter(s=>s>0).map(seconds=>({seconds,at:seconds/LAST,done:seconds<required||studied>=seconds}))};
}
export const journeyGoal=(j:FocusJourney)=>j.next===null?'25분 달성 · 계속 쌓여요':'다음 '+j.next/60+'분까지 '+clock(j.next-j.studied);
