import type { AdditionalPlan,Day,RoutineData } from './routineModel';
import { getDay,withDay } from './routineModel';
export type StudyRewardPolicy={extraEnabled:boolean;quickEnabled:boolean;wordDailyCap?:number};
export type WordRewards={version:2;countedIds:string[];pendingIds:string[];rounds:number};
// Zero means no daily cap in the new native bridge. Old backups remain readable.
export const DEFAULT_WORD_DAILY_CAP=0;
export function wordDailyCap(_data:RoutineData,_key?:string):number{return 0;}
export function wordRewardBudget(data:RoutineData,key:string){const day=getDay(data,key);return {cap:Infinity,earned:day.paid.words+(day.bonus?.words??0)+(day.bonus?.quick??0),remaining:Infinity};}
export function extraRewardsEnabled(_data:RoutineData):boolean{return true;}
function completed(day:Day){return [...new Set([...day.complete,...(day.rewardedStudyIds??[]),...[day.additional,...Object.values(day.additionalByDeck??{})].flatMap(p=>p?[...p.completedIds,...p.complete]:[])])];}
/** Preserve existing grants and mark legacy completions as counted, never repay them. */
export function initializeWordRewards(data:RoutineData,key:string):RoutineData{
 const day=getDay(data,key);if(day.wordRewards)return data;
 const pendingIds=[...new Set(day.extraPendingIds??[])];
 return withDay(data,key,d=>({...d,wordRewards:{version:2,countedIds:[...new Set([...completed(d),...pendingIds])],pendingIds,rounds:0}}));
}
export function wordRewardStatus(data:RoutineData,key:string){
 const day=getDay(initializeWordRewards(data,key),key),state=day.wordRewards!,required=10+state.rounds*5;
 return {enabled:true,minutes:day.paid.words+(day.bonus?.words??0)+(day.bonus?.quick??0),pending:state.pendingIds.length,required,rounds:state.rounds,untilNext:required-state.pendingIds.length,...wordRewardBudget(data,key),capped:false};
}
export const additionalRewardStatus=wordRewardStatus;
/** Called only after a non-Again answer advances this card beyond the next 04:00. */
export function applyWordReward(data:RoutineData,key:string,id:string,plan?:AdditionalPlan):RoutineData{
 const initialized=initializeWordRewards(data,key),day=getDay(initialized,key),state=day.wordRewards!;
 if(state.countedIds.includes(id))return initialized;
 const pending=[...state.pendingIds,id],required=10+state.rounds*5,granted=pending.length>=required?5:0;
 return withDay(initialized,key,d=>{
  const mark=(p:AdditionalPlan)=>p===plan?{...p,reward:{granted:(p.reward?.granted??0)+granted,withheld:p.reward?.withheld??0}}:p;
  return {...d,wordRewards:{version:2,countedIds:[...state.countedIds,id],pendingIds:granted?pending.slice(required):pending,rounds:state.rounds+(granted?1:0)},
   paid:plan?d.paid:{...d.paid,words:d.paid.words+granted},bonus:plan?{...d.bonus,words:(d.bonus?.words??0)+granted}:d.bonus,
   additional:d.additional?mark(d.additional):undefined,additionalByDeck:d.additionalByDeck?Object.fromEntries(Object.entries(d.additionalByDeck).map(([deck,p])=>[deck,mark(p)])):undefined};
 });
}
export function applyAdditionalReward(data:RoutineData,key:string,id:string,plan?:AdditionalPlan){return applyWordReward(data,key,id,plan??getDay(data,key).additional);}
/** Grants are atomic with answers. Reopening the app never replays completions. */
export function reconcileAdditionalRewards(data:RoutineData,key:string){return initializeWordRewards(data,key);}
