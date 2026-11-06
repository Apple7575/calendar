import {routineStreak} from './routineActivity';
import {getDay,studyProgress,type RoutineData} from './routineModel';
import {eveningSteps} from './dailyPlan';
import {priorityPlan,priorityTaskProgress} from './priorityPlan';
import {penaltyMinutesOnDay} from './focusPenalty';
import {streakMilestone} from './celebration';
import type {BoriGrowthStage} from './boriGrowth';

/**
 * 축하할 순간 판정(design-plan.md G7·G12·G14·G15·G18). 기록을 읽기만 하고 보상·저장과 관계없다.
 * 오늘 4개 항목은 오늘 탭의 '루틴과 학습'과 같은 기준이다.
 */
export type Achievements={streak:number|null;dayComplete:boolean;comeback:boolean;priorityAll:boolean;stage:BoriGrowthStage};
const previous=(key:string)=>{const d=new Date(key+'T12:00:00');d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)};

export function achievements(data:RoutineData,dayKey:string,now=Date.now()):Achievements{
 const streak=routineStreak(data,dayKey),day=getDay(data,dayKey),evening=eveningSteps(data,dayKey);
 const dayComplete=day.paid.morning>0&&studyProgress(day).full&&day.paid.gym>0&&evening.length>0&&evening.every((_,i)=>day.evening?.[i]);
 const yesterday=previous(dayKey),hadBefore=streak.completedDays.some(k=>k<yesterday);
 const comeback=streak.todayDone&&(penaltyMinutesOnDay(data,yesterday)>0||(hadBefore&&!streak.completedDays.includes(yesterday)));
 const plan=priorityPlan(data,dayKey),priorityAll=!!plan&&plan.tasks.length>0&&plan.tasks.every(t=>priorityTaskProgress(data,t,now).complete);
 return {streak:streakMilestone(streak.current,streak.todayDone),dayComplete,comeback,priorityAll,stage:data.boriStage??'sprout'};
}

export type AchievedShown={day:string;kinds:string[];stage?:BoriGrowthStage}|null;
const RANK:Record<BoriGrowthStage,number>={sprout:0,growing:1,blooming:2} as Record<BoriGrowthStage,number>;
/** 아직 보여 주지 않은 축하. 성장 단계는 처음 본 단계를 기억만 하고, 오를 때만 고른다. */
export function newAchievements(now:Achievements,shown:AchievedShown,dayKey:string):{kinds:('streak'|'dayComplete'|'comeback'|'priorityAll'|'growth')[];shown:NonNullable<AchievedShown>}{
 const today=shown&&shown.day===dayKey?shown.kinds:[],kinds:('streak'|'dayComplete'|'comeback'|'priorityAll'|'growth')[]=[];
 if(now.streak&&!today.includes('streak'))kinds.push('streak');
 if(now.comeback&&!today.includes('comeback'))kinds.push('comeback');
 if(now.dayComplete&&!today.includes('dayComplete'))kinds.push('dayComplete');
 if(now.priorityAll&&!today.includes('priorityAll'))kinds.push('priorityAll');
 if(shown?.stage&&(RANK[now.stage]??0)>(RANK[shown.stage]??0))kinds.push('growth');
 return {kinds,shown:{day:dayKey,kinds:[...today,...kinds.filter(k=>k!=='growth')],stage:now.stage}};
}

/** 날짜마다 다른 것을 고른다(같은 날은 같다). 기존 축하 화면의 친구 동작을 날마다 바꾸는 데 쓴다. */
export function dailyPick<T>(list:readonly T[],dayKey:string,salt:string):T{
 const seed=[...dayKey+salt].reduce((s,ch)=>(s*31+ch.charCodeAt(0))|0,7)>>>0;
 return list[seed%list.length];
}
