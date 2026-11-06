import type {RoutineData} from './routineModel';
import {routineDay,withDay} from './routineModel';
import {canStartBreak,carryRunPastStage,focusPlanMinutesDue,focusStagePayout,FOCUS_MONEY_MINUTES,FOCUS_STAGE_MINUTES,FOCUS_STEPS} from './focusRamp';

/**
 * Pressing 휴식 once a stage is met pays that stage at once, without a photo (user decision 2026-11-06, B안: "처음에는 글을
 * 안써도 보상을 받게해서 허들을 낮추어야해"). It settles the stage exactly as a photo would, raising the level and spending
 * the time, so a later photo pays the next stage and its letters only, and no stage is paid twice. The plan's minute comes
 * with the first stage, not when the plan is written, so it cannot be had without study.
 */
export type FocusBreakPayout={id:string;timerId:string;subject:string;cycle:string;stage:number;seconds:number;stageMinutes:number;planMinutes:number;moneyMinutes:number;day:string;at:string};

const WON_PER_MINUTE=100;
const whole=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
/** Whether a saved row adds up from the tables. A row that does not is a tampered or broken one. */
export function validBreakPayout(p:FocusBreakPayout|null|undefined):p is FocusBreakPayout{
 if(!p||typeof p!=='object'||typeof p.id!=='string'||!p.id||typeof p.timerId!=='string'||typeof p.subject!=='string'||!p.subject.trim()||typeof p.cycle!=='string'||!p.cycle)return false;
 if(typeof p.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!Number.isFinite(Date.parse(p.at))||![1,2,3,4,5].includes(p.stage)||!whole(p.seconds)||p.seconds<=0)return false;
 const times=p.seconds/FOCUS_STEPS[p.stage];
 return Number.isInteger(times)&&(times===1||p.stage===5)&&p.stageMinutes===FOCUS_STAGE_MINUTES[p.stage]*times&&p.moneyMinutes===FOCUS_MONEY_MINUTES[p.stage]*times&&(p.planMinutes===0||p.planMinutes===1);
}
export const focusBreakPayouts=(data:RoutineData):FocusBreakPayout[]=>Array.isArray(data.focusBreakPayouts)?data.focusBreakPayouts.filter(validBreakPayout):[];
export const breakPayoutMinutes=(p:FocusBreakPayout)=>p.stageMinutes+p.planMinutes;

/** Pays the stage the running study has met. Nothing when no rest is earned, so it can never pay without study. */
export function payBreakStage(data:RoutineData,now=Date.now()):RoutineData{
 const t=data.bookTimer,ramp=data.focusRamp;
 if(!t||!ramp||t.phase!=='focus'||t.rewardMode!=='output'||!canStartBreak(data,now))return data;
 const due=focusStagePayout(data,t.subject,now);if(!due)return data;
 const id=`break:${t.id}:${due.stage}:${ramp.consumed[t.subject]??0}`;
 if(focusBreakPayouts(data).some(p=>p.id===id))return data;
 const times=due.seconds/FOCUS_STEPS[due.stage],at=new Date(now).toISOString(),day=routineDay(new Date(now));
 const row:FocusBreakPayout={id,timerId:t.id,subject:t.subject,cycle:ramp.cycleId,stage:due.stage,seconds:due.seconds,stageMinutes:due.minutes,planMinutes:focusPlanMinutesDue(data),moneyMinutes:FOCUS_MONEY_MINUTES[due.stage]*times,day,at};
 const consumed=(Object.prototype.hasOwnProperty.call(ramp.consumed,t.subject)?ramp.consumed[t.subject]:0)+due.seconds;
 let next=withDay({...data,focusBreakPayouts:[...focusBreakPayouts(data),row],focusRamp:{...ramp,level:due.level,consumed:{...ramp.consumed,[t.subject]:consumed}}},day,d=>({...d,bonus:{...d.bonus,focusBreak:(d.bonus?.focusBreak??0)+breakPayoutMinutes(row)}}));
 const won=(row.moneyMinutes+row.planMinutes)*WON_PER_MINUTE,moneyId='focus-'+id;
 if(next.money&&won>0&&!next.money.entries.some(e=>e.id===moneyId))next={...next,money:{...next.money,entries:[...next.money.entries,{id:moneyId,kind:'reward',amount:won,at,day,source:'output',note:'집중 단계 보상(휴식)'}]}};
 return carryRunPastStage(next,t.subject,due.seconds,now);
}
