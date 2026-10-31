import type { AdditionalPlan,RoutineData } from './routineModel';
import { getDay,withDay } from './routineModel';
export type StudyRewardPolicy={extraEnabled:boolean;quickEnabled:boolean;wordDailyCap?:number};
export const DEFAULT_WORD_DAILY_CAP=60;
export function wordDailyCap(data:RoutineData,key?:string):number{const value=key?getDay(data,key).wordRewardCap??data.studyRewardPolicy?.wordDailyCap:data.studyRewardPolicy?.wordDailyCap;return Number.isInteger(value)&&value!>=20&&value!<=60&&value!%5===0?value!:DEFAULT_WORD_DAILY_CAP;}
/** Keep 20 minutes reserved for the full daily goal, even when extras are studied first. */
export function wordRewardBudget(data:RoutineData,key:string){const day=getDay(data,key),cap=wordDailyCap(data,key),extra=(day.bonus?.words??0)+(day.bonus?.quick??0);return {cap,earned:day.paid.words+extra,remaining:Math.max(0,cap-20-extra)};}
export function extraRewardsEnabled(data:RoutineData):boolean{return data.studyRewardPolicy?.extraEnabled!==false;}
function receipt(data:RoutineData,key:string,plan:AdditionalPlan,granted:number,withheld:number):RoutineData{
 const mark=(p:AdditionalPlan)=>p===plan?{...p,reward:{granted:(p.reward?.granted??0)+granted,withheld:(p.reward?.withheld??0)+withheld}}:p;
 return withDay(data,key,d=>({...d,additional:d.additional?mark(d.additional):undefined,additionalByDeck:d.additionalByDeck?Object.fromEntries(Object.entries(d.additionalByDeck).map(([id,p])=>[id,mark(p)])):undefined}));
}
export function applyAdditionalReward(data:RoutineData,key:string,wordId:string,selectedPlan?:AdditionalPlan):RoutineData{
 const day=getDay(data,key),policy=data.studyRewardPolicy,plan=selectedPlan??day.additional;
 if(!plan||!plan.complete.includes(wordId))return data;
 const rewarded=new Set(day.rewardedStudyIds??[]),base=new Set(day.plan?.ids??day.complete);
 if(base.has(wordId)||rewarded.has(wordId))return data;
 if(plan.kind==='quick'){
  if(!policy?.quickEnabled||(day.bonus?.quick??0)>=4||plan.ids.length!==3||plan.complete.length!==3||plan.ids.some(id=>base.has(id)||rewarded.has(id)))return data;
  const award=wordRewardBudget(data,key).remaining>=2?2:0;
  return receipt(withDay(data,key,d=>({...d,wordRewardCap:wordDailyCap(data,key),bonus:{...d.bonus,quick:(d.bonus?.quick??0)+award},rewardedStudyIds:[...rewarded,...plan.ids]})),key,plan,award,2-award);
 }
 if(!extraRewardsEnabled(data))return data;
 if(day.extraPendingIds?.includes(wordId))return data;
 const pending=[...new Set([...(day.extraPendingIds??[]),wordId])];
 if(pending.length<10)return withDay(data,key,d=>({...d,extraPendingIds:pending}));
 const award=wordRewardBudget(data,key).remaining>=5?5:0;
 return receipt(withDay(data,key,d=>({...d,wordRewardCap:wordDailyCap(data,key),bonus:{...d.bonus,words:(d.bonus?.words??0)+award},extraPendingIds:pending.slice(10),rewardedStudyIds:[...rewarded,...pending.slice(0,10)]})),key,plan,award,5-award);
}
/** Recover completed extra cards after an update, without replaying answers or paying twice. */
export function reconcileAdditionalRewards(data:RoutineData,key:string):RoutineData{
 if(!extraRewardsEnabled(data))return data;
 const day=getDay(data,key),plans=[day.additional,...Object.values(day.additionalByDeck??{})].filter((p):p is AdditionalPlan=>!!p);
 const quickIds=new Set(plans.filter(p=>p.kind==='quick').flatMap(p=>p.ids));
 const ids=[...new Set(plans.filter(p=>p.kind!=='quick').flatMap(p=>[...p.completedIds,...p.complete]))].filter(id=>!quickIds.has(id));
 const history:AdditionalPlan={kind:'review',ids,complete:ids,completedIds:ids,responses:0};
 return ids.reduce((next,id)=>applyAdditionalReward(next,key,id,history),data);
}
export function additionalRewardStatus(data:RoutineData,key:string){
 const day=getDay(data,key),minutes=day.bonus?.words??0,pending=day.extraPendingIds?.length??0;
 const budget=wordRewardBudget(data,key);
 return {enabled:extraRewardsEnabled(data),minutes,pending,untilNext:10-pending,...budget,capped:budget.remaining<5};
}
