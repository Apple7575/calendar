import type {RoutineData} from './routineModel';
import {getDay,planStudy,reconcileStudyExclusions,studyProgress} from './routineModel';
import {completedHabitGoal,habitOrderPolicy} from './habitOrder';
import {wordRewardBudget} from './studyRewards';
export type FreeStudyUnlock='dailyPlan'|'focusCap'|'allRewardCaps';
export const FREE_STUDY_REWARD_MINUTES=5;
export function freeStudyStatus(data:RoutineData,key:string){
 const day=getDay(data,key),sequence=day.orderProgress?.sequence??habitOrderPolicy(data).sequence;
 const wordPlan=reconcileStudyExclusions(planStudy(data,key),key),noWordTarget=studyProgress(getDay(wordPlan,key)).total===0;
 const remaining=sequence.filter(goal=>!(goal==='words'&&noWordTarget)&&!completedHabitGoal(data,key,goal));
 const mode=data.freeStudyPolicy?.unlockAfter??'dailyPlan',bookReady=(day.bonus?.book??0)>=20,budget=wordRewardBudget(data,key);
 const unlocked=mode==='dailyPlan'?remaining.length===0:mode==='focusCap'?bookReady:remaining.length===0&&bookReady;
 const reason=unlocked?'오늘 기본 실천을 마쳤어요. 이제 원하는 공부를 이어가요.':mode==='dailyPlan'?`오늘 정한 목표 ${remaining.length}개를 마치면 열려요.`:mode==='focusCap'?'기본 집중 공부 보상 20분을 받으면 열려요.':'오늘 정한 목표와 기본 집중 공부를 마치면 열려요.';
 return {unlocked,mode,remaining,earned:day.bonus?.freeStudy??0,reason};
}
