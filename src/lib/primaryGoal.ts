import {addDays,parseDateKey,toDateKey,weekStartOf} from './dateUtils';
import {ddayInfo} from './dday';
import {priorityPlan,priorityTaskProgress} from './priorityPlan';
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

/** 저장의 유일한 경로. 다른 저장 데이터는 건드리지 않는다. */
export function savePrimaryGoal(data:RoutineData,input:PrimaryGoalInput,now=new Date()):RoutineData{
 const previous=readPrimaryGoal(data),at=now.toISOString(),why=input.why?.trim(),dueDate=input.dueDate?.trim();
 const goal:PrimaryGoal={
  id:previous.status==='ok'?previous.goal.id:`goal-${now.getTime()}`,
  title:input.title.trim(),
  ...(why?{why}:{}),
  ...(dueDate?{dueDate}:{}),
  weeklyTargetDays:input.weeklyTargetDays,
  createdAt:previous.status==='ok'?previous.goal.createdAt:at,
  updatedAt:at,
 };
 const error=primaryGoalError(goal);
 if(error)throw new Error(error);
 return {...data,primaryGoal:goal};
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

/** 2026-11-03 사용자 결정: 단어·집중 공부를 완료했거나 중요한 공부를 끝낸 날만 센다. 아침·운동·저녁 루틴만 한 날은 세지 않는다. */
export function isGoalStudyDay(data:RoutineData,key:string):boolean{
 if(routineActivities(data,key).some(activity=>(activity.id==='words'||activity.id==='book')&&isActivityComplete(activity)))return true;
 return !!priorityPlan(data,key)?.tasks.some(task=>!!task.completedAt);
}

const weekdays=['월','화','수','목','금','토','일'];
/** 이번 주는 월요일부터 일요일까지이고, 하루 경계는 전달받은 dayKey(새벽 4시 기준)를 따른다. */
export function goalWeekProgress(data:RoutineData,goal:PrimaryGoal,today:string){
 const monday=weekStartOf(today);
 const days=weekdays.map((label,i)=>{
  const key=addDays(monday,i),isFuture=key>today;
  return {key,label,isToday:key===today,isFuture,counted:!isFuture&&isGoalStudyDay(data,key)};
 });
 return {days,count:days.filter(day=>day.counted).length,target:goal.weeklyTargetDays};
}

export type GoalStep={kind:'plan'}|{kind:'task';subject:string;action:string}|{kind:'done'};
/**
 * 오늘 계획을 읽기만 한다. 시작과 보상 처리는 오늘 탭의 PriorityMissionCard가 맡는다.
 * nextPriorityTask는 끝낸 공부를 "계속하기"로 돌려줄 수 있어 여기서는 쓰지 않는다. 남은 공부가 없으면 오늘 몫은 끝난 것이다.
 */
export function nextGoalStep(data:RoutineData,today:string,now=Date.now()):GoalStep{
 const plan=priorityPlan(data,today);
 if(!plan)return {kind:'plan'};
 const open=plan.tasks.filter(task=>!priorityTaskProgress(data,task,now).complete);
 const task=open.find(item=>item.startedAt)??open[0];
 return task?{kind:'task',subject:task.subject,action:task.nextAction||task.action}:{kind:'done'};
}
