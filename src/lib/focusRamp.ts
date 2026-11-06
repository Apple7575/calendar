import type {RoutineData} from './routineModel';
import {routineDay,withDay} from './routineModel';
import {bookFocusSeconds} from './bookTimerTime';
/**
 * Rounds (user decision 2026-11-06, A안): the stages are the marks 2, 5, 10, 15 and 25 minutes into one 25-minute round, and
 * they start over every round. FOCUS_MARKS are those marks; FOCUS_STEPS is how long each stage is (2, 3, 5, 5, 10 minutes).
 */
export const FOCUS_MARKS=[0,120,300,600,900,1500] as const;
export const FOCUS_STEPS=[0,120,180,300,300,600] as const;
/** Screen time per stage: 1, 1, 2, 2, 4 minutes, so a round of 25 minutes pays 10 ("25분 공부에 10분"). */
export const FOCUS_STAGE_MINUTES=[0,1,1,2,2,4] as const;
/** Money per stage in units of 100 won: 1, 1, 2, 4, 7, so a round pays 1,500 won as before. */
export const FOCUS_MONEY_MINUTES=[0,1,1,2,4,7] as const;
/** Before rounds a stage was the whole mark long and paid these. Saved payouts keep what they paid and are checked with them. */
export const LEGACY_FOCUS_STEPS=FOCUS_MARKS;
export const LEGACY_STAGE_TABLES:readonly (readonly number[])[]=[[0,1,2,4,6,10],[0,1,2,4,7,15]];
/** Every table a saved payout may have used. */
export const FOCUS_STAGE_TABLES:readonly (readonly number[])[]=[FOCUS_STAGE_MINUTES,FOCUS_MONEY_MINUTES,...LEGACY_STAGE_TABLES];
const sumStages=(table:readonly number[],from:number,to:number)=>table.slice(from,to+1).reduce((n,v)=>n+v,0);
/**
 * A cycle started before rounds has no round id. It keeps its old stage lengths and tables until it ends (two hours
 * without study, or finishing study), so a run in progress at the update is paid the way it started.
 */
export const isLegacyRamp=(ramp:{round?:string}|undefined)=>!!ramp&&ramp.round===undefined;
export const stageStepsOf=(ramp:{round?:string}|undefined):readonly number[]=>isLegacyRamp(ramp)?LEGACY_FOCUS_STEPS:FOCUS_STEPS;
export const stageTimeOf=(ramp:{round?:string}|undefined):readonly number[]=>isLegacyRamp(ramp)?LEGACY_STAGE_TABLES[0]:FOCUS_STAGE_MINUTES;
/** What stages from..to pay together, in time, money units and study seconds. */
export const stageSpan=(from:number,to:number)=>({minutes:sumStages(FOCUS_STAGE_MINUTES,from,to),money:sumStages(FOCUS_MONEY_MINUTES,from,to),seconds:sumStages(FOCUS_STEPS,from,to)});
export const FOCUS_PLAN_MINUTES=1;
export const FOCUS_RESET_MS=2*60*60*1000;
export type FocusLevel=1|2|3|4|5;
export type FocusRamp={version:1;cycleId:string;startedAt:string;lastActivityAt:string;level:FocusLevel;baseline:Record<string,number>;consumed:Record<string,number>;round?:string};
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
 return {needsPlan:expired,expired,level,required:stageStepsOf(ramp)[level],lastActivityAt:new Date(last).toISOString(),plan:data.focusPlans?.find(p=>p.cycleId===ramp.cycleId)};
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
 while(credit>=seconds&&credit-seconds>=LEGACY_FOCUS_STEPS[level]&&access.seconds-seconds>=LEGACY_FOCUS_STEPS[level]){stages.push(level);seconds+=LEGACY_FOCUS_STEPS[level];level=Math.min(5,level+1);}
 return {stages,seconds,level};
}
/**
 * What one payout (a rest or a photo) settles: every stage of this round the unbroken study has passed, from the current
 * one up, so skipping a rest loses nothing. Interrupted time pays the current stage only. The round ends at the
 * 25-minute stage, so the next payout starts at 2 minutes again (level 1).
 */
export function focusStagePayout(data:RoutineData,subject:string,now=Date.now()){
 const access=focusRampAccess(data,subject,now),t=data.bookTimer;
 if(!access.ready||!access.level)return null;
 const credit=t?.subject===subject&&t.rewardMode==='output'?focusRunCredit(data,now):0,from=access.level;
 if(isLegacyRamp(data.focusRamp)){
  // Before rounds: the highest stage reached, of the old length; only the 25-minute stage repeats.
  const [time,money]=LEGACY_STAGE_TABLES,steps=LEGACY_FOCUS_STEPS;let stage=from;
  while(stage<5&&credit>=steps[stage+1]&&access.seconds>=steps[stage+1])stage++;
  let times=1;if(stage===5)while(credit-steps[5]*times>=steps[5]&&access.seconds-steps[5]*times>=steps[5])times++;
  return {from:undefined as number|undefined,stage,seconds:steps[stage]*times,minutes:time[stage]*times,money:money[stage]*times,level:Math.min(5,stage+1) as FocusLevel,roundEnds:false};
 }
 let stage=from;
 while(stage<5&&credit>=stageSpan(from,stage+1).seconds&&access.seconds>=stageSpan(from,stage+1).seconds)stage++;
 const span=stageSpan(from,stage);
 return {from:from as number|undefined,stage,seconds:span.seconds,minutes:span.minutes,money:span.money,level:(stage===5?1:stage+1) as FocusLevel,roundEnds:stage===5};
}
/** A new round id: the cycle's own and a counter, so it cannot collide with one already used. */
export const nextRoundId=(ramp:FocusRamp,now:number)=>`${ramp.cycleId}:r${now}`;
/** The ramp after a payout: the next level, and a fresh round when the 25-minute stage closed this one. */
export function rampAfterPayout(ramp:FocusRamp,subject:string,pay:{seconds:number;level:number;roundEnds?:boolean},now:number):FocusRamp{
 const consumed=(Object.prototype.hasOwnProperty.call(ramp.consumed,subject)?ramp.consumed[subject]:0)+pay.seconds;
 return {...ramp,level:pay.level as FocusLevel,consumed:{...ramp.consumed,[subject]:consumed},...(pay.roundEnds?{round:nextRoundId(ramp,now)}:{})};
}
/** Ending study starts the next one at 2 minutes (user decision 2026-11-06). Nothing to do when the round has not moved. */
export function startNewRound(data:RoutineData,now=Date.now()):RoutineData{
 const ramp=data.focusRamp;if(!ramp||ramp.level===1)return data;
 return {...data,focusRamp:{...ramp,level:1,round:nextRoundId(ramp,now)}};
}
/** Where the clock is in the 25-minute round: the marks already paid this round plus the run's credit. */
export function focusRoundProgress(data:RoutineData,credit:number,now=Date.now()){
 const status=focusRampStatus(data,now),level=status.level||1;
 return {studied:FOCUS_MARKS[level-1]+Math.max(0,credit),required:FOCUS_MARKS[level]};
}
/** Minutes the next photo would pay for time alone, for labels: what is due now, or what the current stage pays when met. */
export function focusRewardPreview(data:RoutineData,subject:string,now=Date.now()){
 const plan=focusPlanMinutesDue(data),status=focusRampStatus(data,now);
 return {due:(focusStagePayout(data,subject,now)?.minutes??0)+plan,next:status.level?stageTimeOf(data.focusRamp)[status.level]+plan:0};
}
/** A plan's minute is paid with its first stage. Plans from before this rule already paid 5 at once. */
export function focusPlanMinutesDue(data:RoutineData){
 const cycle=data.focusRamp?.cycleId,plan=data.focusPlans?.find(p=>p.cycleId===cycle);
 if(!plan||plan.minutes!==0)return 0;
 // A rest that paid a stage (focusBreakReward.ts) also paid the plan. Read directly so the two files do not import each other.
 const rested=Array.isArray(data.focusBreakPayouts)&&data.focusBreakPayouts.some(p=>p?.cycle===cycle);
 return rested||data.handwritingReceipts?.some(r=>r.focusCycle===cycle&&r.rewardStatus==='earned'&&r.focusSeconds!==undefined)?0:FOCUS_PLAN_MINUTES;
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
 const ramp:FocusRamp={version:1,cycleId:id,round:`${id}:r${now}`,startedAt:at,lastActivityAt:at,level:1,baseline:Object.fromEntries([...subjects].map(s=>[s,focusSecondsForSubject(data,s,now)])),consumed:{}};
 const next={...data,focusRamp:ramp,focusPlans:[...(data.focusPlans??[]),{id,cycleId:id,subject:topic,text:clean,at,day,minutes:0 as const}],outputDraft:{id:'draft-'+id,subject:topic,startedAt:at},handwritingReceipts:data.handwritingReceipts?.map(r=>r.rewardStatus==='pending'?{...r,rewardPolicy:'ramp-v2' as const,focusCycle:id}:r)};
 return withDay(next,day,d=>d);
}
export function validateFocusRamp(data:RoutineData){
 const plans=data.focusPlans,ramp=data.focusRamp,validMap=(map:Record<string,number>)=>!!map&&typeof map==='object'&&!Array.isArray(map)&&Object.entries(map).every(([s,n])=>s.length>0&&s.length<=80&&Number.isSafeInteger(n)&&n>=0);
 if(plans!==undefined&&(!Array.isArray(plans)||plans.length>50000||new Set(plans.map(p=>p?.id)).size!==plans.length||new Set(plans.map(p=>p?.cycleId)).size!==plans.length||plans.some(p=>!p||p.id!==p.cycleId||typeof p.id!=='string'||!p.id||typeof p.subject!=='string'||!p.subject.trim()||p.subject.length>80||typeof p.text!=='string'||!p.text.trim()||p.text.length>2000||p.minutes!==5&&p.minutes!==0||!Number.isFinite(Date.parse(p.at))||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!data.days[p.day])))throw new Error('집중 공부 계획 기록을 확인해 주세요.');
 if(ramp&&(!plans?.some(p=>p.cycleId===ramp.cycleId)||ramp.version!==1||![1,2,3,4,5].includes(ramp.level)||!Number.isFinite(Date.parse(ramp.startedAt))||!Number.isFinite(Date.parse(ramp.lastActivityAt))||!validMap(ramp.baseline)||!validMap(ramp.consumed)))throw new Error('집중 공부 단계 기록을 확인해 주세요.');
}
