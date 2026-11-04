import {parseDateKey,toDateKey} from './dateUtils';
import {ddayInfo} from './dday';
import {priorityPlan} from './priorityPlan';
import {isActivityComplete,routineActivities} from './routineActivity';
import type {RoutineData} from './routineModel';

export type PrimaryGoal={id:string;title:string;why?:string;dueDate?:string;weeklyTargetDays:number;createdAt:string;updatedAt:string};
export type PrimaryGoalInput={title:string;why?:string;dueDate?:string;weeklyTargetDays:number};
export const GOAL_TITLE_LIMIT=80,GOAL_WHY_LIMIT=120;

const validDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&toDateKey(parseDateKey(value))===value;
const validTime=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));

/** 목표 값의 유일한 검증. 문제가 없으면 null, 있으면 화면에 보여 줄 문장을 돌려준다. */
export function primaryGoalError(value:unknown):string|null{
 const goal=value as Partial<PrimaryGoal>|null;
 if(!goal||typeof goal!=='object')return '목표를 확인해 주세요.';
 if(typeof goal.title!=='string'||!goal.title.trim())return '목표 이름을 적어 주세요.';
 if(goal.title.length>GOAL_TITLE_LIMIT)return `목표 이름은 ${GOAL_TITLE_LIMIT}자까지 적을 수 있어요.`;
 if(goal.why!==undefined&&(typeof goal.why!=='string'||goal.why.length>GOAL_WHY_LIMIT))return `이유는 ${GOAL_WHY_LIMIT}자까지 적을 수 있어요.`;
 if(goal.dueDate!==undefined&&!validDate(goal.dueDate))return '날짜를 2026-12-06처럼 적어 주세요.';
 if(!Number.isInteger(goal.weeklyTargetDays)||goal.weeklyTargetDays!<1||goal.weeklyTargetDays!>7)return '일주일에 며칠 할지 골라 주세요.';
 if(typeof goal.id!=='string'||!goal.id||!validTime(goal.createdAt)||!validTime(goal.updatedAt))return '목표 정보를 확인해 주세요.';
 return null;
}

/** 잘못된 값이 있어도 앱 로드와 복구를 막지 않는다. 화면이 다시 정하도록 안내하고, 새로 저장하기 전까지 값은 그대로 둔다. */
export function readPrimaryGoal(data:RoutineData):{status:'none'}|{status:'invalid'}|{status:'ok';goal:PrimaryGoal}{
 const goal=data.primaryGoal;
 if(goal===undefined)return {status:'none'};
 return primaryGoalError(goal)?{status:'invalid'}:{status:'ok',goal};
}

export function goalDueInfo(goal:PrimaryGoal,today:string){
 if(!goal.dueDate)return undefined;
 const info=ddayInfo(goal.dueDate,today,false);
 return {...info,passed:info.days<0};
}

export const readableGoalDate=(key:string)=>{const date=parseDateKey(key);return `${date.getFullYear()}년 ${date.getMonth()+1}월 ${date.getDate()}일`};

/** 전체 기준. 목표별 집계는 routineGoals.ts의 isGoalLinkedStudyDay를 쓴다. 2026-11-03 사용자 결정: 단어·집중 공부를 완료했거나 중요한 공부를 끝낸 날만 센다. 아침·운동·저녁 루틴만 한 날은 세지 않는다. */
export function isGoalStudyDay(data:RoutineData,key:string):boolean{
 if(routineActivities(data,key).some(activity=>(activity.id==='words'||activity.id==='book')&&isActivityComplete(activity)))return true;
 return !!priorityPlan(data,key)?.tasks.some(task=>!!task.completedAt);
}
