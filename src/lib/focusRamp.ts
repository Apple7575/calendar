import type {RoutineData} from './routineModel';
import {routineDay,withDay} from './routineModel';
import {bookFocusSeconds} from './bookTimerTime';
export const FOCUS_STEPS=[0,120,300,600,900,1500] as const;
/** Reward table (user decision 2026-11-05, about 10 minutes for 25 of study): what each stage pays, and the plan's one minute on the first payout. */
export const FOCUS_STAGE_MINUTES=[0,1,2,4,6,10] as const;
/** What each stage pays in money, in units of 100 won. It stayed here when screen time came down (user decision 2026-11-05). */
export const FOCUS_MONEY_MINUTES=[0,1,2,4,7,15] as const;
/** Every table a saved payout may have used. Saved payouts keep what they paid. */
export const FOCUS_STAGE_TABLES:readonly (readonly number[])[]=[FOCUS_STAGE_MINUTES,FOCUS_MONEY_MINUTES];
export const FOCUS_PLAN_MINUTES=1;
export const FOCUS_RESET_MS=2*60*60*1000;
export type FocusLevel=1|2|3|4|5;
export type FocusRamp={version:1;cycleId:string;startedAt:string;lastActivityAt:string;level:FocusLevel;baseline:Record<string,number>;consumed:Record<string,number>};
export type FocusPlan={id:string;cycleId:string;subject:string;text:string;at:string;day:string;minutes:5|0};
const own=(map:Record<string,number>,key:string)=>Object.prototype.hasOwnProperty.call(map,key)?map[key]:0;
export function focusSecondsForSubject(data:RoutineData,subject:string,now=Date.now()){
 let seconds=(data.bookSessions??[]).filter(s=>s.rewardMode==='output'&&s.subject===subject).reduce((n,s)=>n+s.seconds,0);
 const t=data.bookTimer;if(t?.rewardMode==='output'&&t.phase==='focus'&&t.subject===subject&&!(data.bookSessions??[]).some(s=>s.id===t.id))seconds+=bookFocusSeconds(t,now);
 return seconds;
}
export function focusRampStatus(data:RoutineData,now=Date.now()){
 const ramp=data.focusRamp;
 if(!ramp)return {needsPlan:true,expired:false,level:0,required:0,lastActivityAt:null as string|null,plan:undefined as FocusPlan|undefined};
 let last=Date.parse(ramp.lastActivityAt);const start=Date.parse(ramp.startedAt),t=data.bookTimer;
 if(t?.rewardMode==='output'&&t.phase==='focus'){
  const at=t.running?now:t.focusResumedAt??Date.parse(t.startedAt);
  if(at>=start&&bookFocusSeconds(t,now)>0)last=Math.max(last,at);
 }
 for(const session of data.bookSessions??[]){if(session.rewardMode!=='output'||session.seconds<=0)continue;const at=Date.parse(session.completedAt);if(at>=start&&at<=now)last=Math.max(last,at);}
 const expired=now-last>=FOCUS_RESET_MS,level=expired?0:ramp.level;
 return {needsPlan:expired,expired,level,required:FOCUS_STEPS[level],lastActivityAt:new Date(last).toISOString(),plan:data.focusPlans?.find(p=>p.cycleId===ramp.cycleId)};
}
export function focusRampAccess(data:RoutineData,subject:string,now=Date.now()){
 const status=focusRampStatus(data,now),ramp=data.focusRamp;
 const seconds=ramp&&!status.needsPlan?Math.max(0,focusSecondsForSubject(data,subject,now)-own(ramp.baseline,subject)-own(ramp.consumed,subject)):0;
 return {...status,seconds,ready:!status.needsPlan&&seconds>=status.required,remaining:Math.max(0,status.required-seconds),submissions:status.required?Math.floor(seconds/status.required):0};
}
const storedSeconds=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=86400?n:0;
/** Real study seconds of the current timer's run, whether it is still running or already recorded. */
export function focusRunSeconds(data:RoutineData,now=Date.now()){
 const t=data.bookTimer;if(!t)return 0;
 return t.phase==='focus'?bookFocusSeconds(t,now):data.bookSessions?.find(s=>s.id===t.id)?.seconds??0;
}
/** Time this run counts toward the current stage: surplus carried in plus study since the last payout. */
export function focusRunCredit(data:RoutineData,now=Date.now()){
 const t=data.bookTimer;if(!t)return 0;
 return storedSeconds(t.carrySeconds)+Math.max(0,focusRunSeconds(data,now)-storedSeconds(t.creditMark));
}
/**
 * A rest opens the apps, so it has to be earned (user decision 2026-11-05): the same time the photo rule and the
 * clock count must reach the current stage. Before a plan there is no stage, so no rest. A saved timer outside
 * the stages keeps its rest: new study always starts with a stage, and that timer has no stage to meet.
 * Credit a rest already used cannot open another (user decision 2026-11-05): the stage is studied again after each
 * rest. Only this button reads restedCredit. The photo, the clock and the penalty keep counting all the credit.
 */
export function canStartBreak(data:RoutineData,now=Date.now()){
 const t=data.bookTimer;if(t?.phase!=='focus')return false;
 if(t.rewardMode!=='output')return true;
 const required=focusRampStatus(data,now).required;
 return required>0&&focusRunCredit(data,now)-storedSeconds(t.restedCredit)>=required;
}
/** Study still needed after a rest before the next one opens, to say why the button is gone. 0 when no rest is in the way. */
export function focusBreakWait(data:RoutineData,now=Date.now()){
 const t=data.bookTimer,rested=storedSeconds(t?.restedCredit);if(t?.phase!=='focus'||t.rewardMode!=='output'||!rested)return 0;
 const status=focusRampStatus(data,now);if(status.needsPlan||!status.required)return 0;
 return Math.max(0,status.required-Math.max(0,focusRunCredit(data,now)-rested));
}
/** What a new run keeps of it: only the part of its carried credit a rest already used. */
export const focusRestedInto=(data:RoutineData,carry:number)=>Math.min(carry,storedSeconds(data.bookTimer?.restedCredit));
/**
 * Surplus a new run starts with. A run that reached its stage hands on all its credit; a run cut short
 * adds nothing (user decision 2026-11-03) but keeps earlier surplus. Never more than the unspent reward time.
 */
export function focusCarryInto(data:RoutineData,subject:string,required:number,now=Date.now()){
 const t=data.bookTimer;if(!t||t.subject!==subject||t.rewardMode!=='output')return 0;
 const credit=focusRunCredit(data,now),kept=credit>=required?credit:storedSeconds(t.carrySeconds);
 return Math.min(kept,focusRampAccess(data,subject,now).seconds);
}
/**
 * Stages one photo finishes (user decision 2026-11-04): the current stage once its reward time is met, then every
 * further stage the unbroken run has already passed. Interrupted time pays the first stage only, as before.
 */
export function focusStagesDue(data:RoutineData,subject:string,now=Date.now()){
 const access=focusRampAccess(data,subject,now),t=data.bookTimer;
 if(!access.ready||!access.level)return {stages:[] as number[],seconds:0,level:access.level};
 const credit=t?.subject===subject&&t.rewardMode==='output'?focusRunCredit(data,now):0,stages:number[]=[access.level];
 let seconds=access.required,level=Math.min(5,access.level+1);
 while(credit>=seconds&&credit-seconds>=FOCUS_STEPS[level]&&access.seconds-seconds>=FOCUS_STEPS[level]){stages.push(level);seconds+=FOCUS_STEPS[level];level=Math.min(5,level+1);}
 return {stages,seconds,level};
}
/**
 * What one photo pays: unbroken study is matched to the highest stage it reached, and the rest carries on
 * (user decision 2026-11-04). 7 minutes pays the 5-minute stage, 17 the 15-minute stage, 25 the 25-minute stage.
 * Only the 25-minute stage repeats, so 50 minutes pays it twice. Interrupted time pays the current stage only.
 */
export function focusStagePayout(data:RoutineData,subject:string,now=Date.now()){
 const access=focusRampAccess(data,subject,now),t=data.bookTimer;
 if(!access.ready||!access.level)return null;
 const credit=t?.subject===subject&&t.rewardMode==='output'?focusRunCredit(data,now):0;
 let stage=access.level;
 while(stage<5&&credit>=FOCUS_STEPS[stage+1]&&access.seconds>=FOCUS_STEPS[stage+1])stage++;
 let seconds:number=FOCUS_STEPS[stage],minutes:number=FOCUS_STAGE_MINUTES[stage];
 if(stage===5)while(credit-seconds>=FOCUS_STEPS[5]&&access.seconds-seconds>=FOCUS_STEPS[5]){seconds+=FOCUS_STEPS[5];minutes+=FOCUS_STAGE_MINUTES[5];}
 return {stage,seconds,minutes,level:Math.min(5,stage+1) as FocusLevel};
}
/** Minutes the next photo would pay for time alone, for labels: what is due now, or what the current stage pays when met. */
export function focusRewardPreview(data:RoutineData,subject:string,now=Date.now()){
 const plan=focusPlanMinutesDue(data),status=focusRampStatus(data,now);
 return {due:(focusStagePayout(data,subject,now)?.minutes??0)+plan,next:status.level?FOCUS_STAGE_MINUTES[status.level]+plan:0};
}
/** A plan's minute is paid with its first stage. Plans from before this rule already paid 5 at once. */
export function focusPlanMinutesDue(data:RoutineData){
 const cycle=data.focusRamp?.cycleId,plan=data.focusPlans?.find(p=>p.cycleId===cycle);
 if(!plan||plan.minutes!==0)return 0;
 return data.handwritingReceipts?.some(r=>r.focusCycle===cycle&&r.rewardStatus==='earned'&&r.focusSeconds!==undefined)?0:FOCUS_PLAN_MINUTES;
}
/** After a stage is paid, spend it from the run and point the countdown at the next stage. Call with the level already raised. */
export function carryRunPastStage(data:RoutineData,subject:string,paid:number,now=Date.now()):RoutineData{
 const t=data.bookTimer;if(!t||t.subject!==subject||t.rewardMode!=='output')return data;
 const credit=focusRunCredit(data,now);if(credit<paid)return data;
 const run=focusRunSeconds(data,now),carry=credit-paid,rested=Math.max(0,storedSeconds(t.restedCredit)-paid),{restedCredit:_paidOff,...kept}=t,timer={...kept,carrySeconds:carry,creditMark:run,...(rested>0?{restedCredit:rested}:{})};
 if(t.phase!=='focus')return {...data,bookTimer:timer};
 const left=Math.max(0,focusRampStatus(data,now).required-carry);
 return {...data,bookTimer:{...timer,remaining:left,endsAt:now+left*1000,targetSeconds:run+left,...(t.running?{focusElapsed:run,focusResumedAt:now}:{})}};
}
export function claimFocusPlan(data:RoutineData,id:string,subject:string,text:string,now=Date.now()):RoutineData{
 if(data.focusPlans?.some(p=>p.id===id))return data;
 const clean=text.trim(),topic=subject.trim();if(!id||id.length>100||!topic||topic.length>80||!clean||clean.length>2000)throw new Error('공부할 내용과 계획을 한 줄 적어 주세요. 계획은 2,000자까지예요.');
 if(!focusRampStatus(data,now).needsPlan)throw new Error('이번 계획 보상은 이미 받았어요. 다음 공부 단계를 이어가 주세요.');
 const subjects=new Set((data.bookSessions??[]).map(s=>s.subject));if(data.bookTimer)subjects.add(data.bookTimer.subject);subjects.add(topic);
 const at=new Date(now).toISOString(),day=routineDay(new Date(now));
 const ramp:FocusRamp={version:1,cycleId:id,startedAt:at,lastActivityAt:at,level:1,baseline:Object.fromEntries([...subjects].map(s=>[s,focusSecondsForSubject(data,s,now)])),consumed:{}};
 const next={...data,focusRamp:ramp,focusPlans:[...(data.focusPlans??[]),{id,cycleId:id,subject:topic,text:clean,at,day,minutes:0 as const}],outputDraft:{id:'draft-'+id,subject:topic,startedAt:at},handwritingReceipts:data.handwritingReceipts?.map(r=>r.rewardStatus==='pending'?{...r,rewardPolicy:'ramp-v2' as const,focusCycle:id}:r)};
 return withDay(next,day,d=>d);
}
export function validateFocusRamp(data:RoutineData){
 const plans=data.focusPlans,ramp=data.focusRamp,validMap=(map:Record<string,number>)=>!!map&&typeof map==='object'&&!Array.isArray(map)&&Object.entries(map).every(([s,n])=>s.length>0&&s.length<=80&&Number.isSafeInteger(n)&&n>=0);
 if(plans!==undefined&&(!Array.isArray(plans)||plans.length>50000||new Set(plans.map(p=>p?.id)).size!==plans.length||new Set(plans.map(p=>p?.cycleId)).size!==plans.length||plans.some(p=>!p||p.id!==p.cycleId||typeof p.id!=='string'||!p.id||typeof p.subject!=='string'||!p.subject.trim()||p.subject.length>80||typeof p.text!=='string'||!p.text.trim()||p.text.length>2000||p.minutes!==5&&p.minutes!==0||!Number.isFinite(Date.parse(p.at))||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!data.days[p.day])))throw new Error('집중 공부 계획 기록을 확인해 주세요.');
 if(ramp&&(!plans?.some(p=>p.cycleId===ramp.cycleId)||ramp.version!==1||![1,2,3,4,5].includes(ramp.level)||!Number.isFinite(Date.parse(ramp.startedAt))||!Number.isFinite(Date.parse(ramp.lastActivityAt))||!validMap(ramp.baseline)||!validMap(ramp.consumed)))throw new Error('집중 공부 단계 기록을 확인해 주세요.');
}
