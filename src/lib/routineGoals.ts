import {addDays,weekStartOf} from './dateUtils';
import {SUBJECTS} from './bookStudy';
import {OUTPUT_POLICY,outputUnitsOnDay} from './handwriting';
import {PrimaryGoal,PrimaryGoalInput,primaryGoalError,readPrimaryGoal} from './primaryGoal';
import {priorityPlan,priorityTaskProgress} from './priorityPlan';
import {routineDay,studyDeckProgress} from './routineModel';
import type {RoutineData} from './routineModel';

export type GoalLinks={subjects:string[];deckIds:string[]};
export type Goal=PrimaryGoal&{links:GoalLinks;completedAt?:string};
export const MAX_ACTIVE_GOALS=3;
const NO_LINKS:GoalLinks={subjects:[],deckIds:[]};

const validLinkList=(list:unknown)=>Array.isArray(list)&&list.length<=50&&list.every(item=>typeof item==='string'&&!!item&&item.length<=100);
export function goalError(value:unknown):string|null{
 const base=primaryGoalError(value);if(base)return base;
 const goal=value as Goal;
 if(!goal.links||!validLinkList(goal.links.subjects)||!validLinkList(goal.links.deckIds))return '연결한 공부를 확인해 주세요.';
 if(goal.completedAt!==undefined&&!Number.isFinite(Date.parse(goal.completedAt)))return '목표 정보를 확인해 주세요.';
 return null;
}

/**
 * goals가 배열이면 그것을 쓰고, 아니면 primaryGoal을 연결 없는 목표 1개로 해석한다. 읽기만 하며 저장하지 않는다.
 * 읽지 못한 값은 숫자로만 알리고 새로 저장하기 전까지 원본을 그대로 둔다.
 */
export function readGoals(data:RoutineData):{goals:Goal[];unreadable:number;canReplaceUnreadable:boolean}{
 const raw=data.goals as unknown;
 if(Array.isArray(raw)){
  const goals=raw.filter(item=>!goalError(item)) as Goal[];
  return {goals,unreadable:raw.length-goals.length,canReplaceUnreadable:false};
 }
 const primary=readPrimaryGoal(data),broken=raw!==undefined?1:0;
 if(primary.status==='ok')return {goals:[{...primary.goal,links:NO_LINKS}],unreadable:broken,canReplaceUnreadable:false};
 const unreadable=broken+(primary.status==='invalid'?1:0);
 return {goals:[],unreadable,canReplaceUnreadable:unreadable>0};
}
export const activeGoals=(goals:Goal[])=>goals.filter(goal=>!goal.completedAt);

/** 저장 경로는 여기 하나다. 읽지 못한 항목을 보존하고, 옛 빌드가 읽는 primaryGoal을 첫 진행 중 목표로 맞춘다. */
function writeGoals(data:RoutineData,change:(items:unknown[])=>unknown[]):RoutineData{
 const raw=data.goals as unknown,items=change(Array.isArray(raw)?raw:readGoals(data).goals);
 const first=items.find(item=>!goalError(item)&&!(item as Goal).completedAt) as Goal|undefined;
 const {primaryGoal:_old,...rest}=data;
 if(!first)return {...rest,goals:items as Goal[]};
 const {links:_links,completedAt:_done,...primaryGoal}=first;
 return {...rest,goals:items as Goal[],primaryGoal};
}
const isGoal=(item:unknown,id:string)=>!goalError(item)&&(item as Goal).id===id;
function requireGoal(data:RoutineData,id:string){
 const goal=readGoals(data).goals.find(item=>item.id===id);
 if(!goal)throw new Error('목표를 찾지 못했어요.');
 return goal;
}
function replaceGoal(data:RoutineData,goal:Goal){
 const error=goalError(goal);if(error)throw new Error(error);
 return writeGoals(data,items=>items.map(item=>isGoal(item,goal.id)?goal:item));
}
function assertActiveRoom(data:RoutineData){
 if(activeGoals(readGoals(data).goals).length>=MAX_ACTIVE_GOALS)throw new Error(`진행 중인 목표는 ${MAX_ACTIVE_GOALS}개까지 둘 수 있어요.`);
}
function assertLinksFree(data:RoutineData,id:string,links:GoalLinks){
 for(const other of activeGoals(readGoals(data).goals))if(other.id!==id){
  const taken=links.subjects.some(item=>other.links.subjects.includes(item))||links.deckIds.some(item=>other.links.deckIds.includes(item));
  if(taken)throw new Error(`이미 '${other.title}' 목표에 연결된 공부가 있어요.`);
 }
}

/** id가 없으면 새 목표, 있으면 내용만 고친다. 연결과 끝낸 상태는 유지한다. */
export function saveGoal(data:RoutineData,input:PrimaryGoalInput,id?:string,now=new Date()):RoutineData{
 const at=now.toISOString(),why=input.why?.trim(),dueDate=input.dueDate?.trim();
 const fields={title:input.title.trim(),...(why?{why}:{}),...(dueDate?{dueDate}:{}),weeklyTargetDays:input.weeklyTargetDays};
 if(id){
  const {why:_why,dueDate:_due,...old}=requireGoal(data,id);
  return replaceGoal(data,{...old,...fields,updatedAt:at});
 }
 assertActiveRoom(data);
 const goal:Goal={id:`goal-${now.getTime()}`,...fields,createdAt:at,updatedAt:at,links:NO_LINKS};
 const error=goalError(goal);if(error)throw new Error(error);
 return writeGoals(data,items=>[...items,goal]);
}
export function setGoalLinks(data:RoutineData,id:string,links:GoalLinks,now=new Date()):RoutineData{
 const clean={subjects:[...new Set(links.subjects)],deckIds:[...new Set(links.deckIds)]};
 assertLinksFree(data,id,clean);
 return replaceGoal(data,{...requireGoal(data,id),links:clean,updatedAt:now.toISOString()});
}
export function completeGoal(data:RoutineData,id:string,now=new Date()):RoutineData{
 return replaceGoal(data,{...requireGoal(data,id),completedAt:now.toISOString(),updatedAt:now.toISOString()});
}
export function reopenGoal(data:RoutineData,id:string,now=new Date()):RoutineData{
 const {completedAt:_done,...goal}=requireGoal(data,id);
 assertActiveRoom(data);
 assertLinksFree(data,id,goal.links);
 return replaceGoal(data,{...goal,updatedAt:now.toISOString()});
}
/** 목표만 지운다. 공부 기록은 건드리지 않는다. */
export function deleteGoal(data:RoutineData,id:string):RoutineData{
 requireGoal(data,id);
 return writeGoals(data,items=>items.filter(item=>!isGoal(item,id)));
}

const liveDeckIds=(data:RoutineData,goal:Goal)=>goal.links.deckIds.filter(id=>data.decks.some(deck=>deck.id===id));
/** 기록에 남아 있는 과목 이름. 계획 화면의 과목은 자유 입력이라 기록의 글자를 그대로 쓴다. */
export function knownSubjects(data:RoutineData):string[]{
 return [...new Set<string>([
  ...SUBJECTS,
  ...Object.values(data.priorityDays??{}).flatMap(day=>day.tasks.map(task=>task.subject)),
  ...(data.bookSessions??[]).map(session=>session.subject),
  ...(data.handwritingReceipts??[]).map(receipt=>receipt.subject),
 ])];
}
/** 없어진 단어장이나 이름이 바뀐 과목. 막지 않고 표시만 한다. */
export function goalBrokenLinks(data:RoutineData,goal:Goal){
 const known=knownSubjects(data);
 return {subjects:goal.links.subjects.filter(subject=>!known.includes(subject)),deckIds:goal.links.deckIds.filter(id=>!data.decks.some(deck=>deck.id===id))};
}
export const hasGoalLinks=(goal:Goal)=>goal.links.subjects.length+goal.links.deckIds.length>0;
/** 연결 고르기 후보. 진행 중인 다른 목표에 연결된 항목은 takenBy로 알려 준다. */
export function goalLinkOptions(data:RoutineData,id:string){
 const goals=readGoals(data).goals,others=activeGoals(goals).filter(goal=>goal.id!==id),own=goals.find(goal=>goal.id===id)?.links??NO_LINKS;
 return {
  subjects:[...new Set([...knownSubjects(data),...own.subjects])].map(subject=>({subject,takenBy:others.find(goal=>goal.links.subjects.includes(subject))?.title})),
  decks:data.decks.map(deck=>({id:deck.id,name:deck.name,takenBy:others.find(goal=>goal.links.deckIds.includes(deck.id))?.title})),
 };
}

/**
 * 목표의 공부한 날. 목표를 정한 날 이후의 기록만 보며, 기록을 읽기만 한다.
 * 전체 기준(isGoalStudyDay)과 달리 단계 방식에서 보상을 받은 영수증(ramp-v1, earned)도 센다.
 */
export function isGoalLinkedStudyDay(data:RoutineData,goal:Goal,key:string):boolean{
 if(key<routineDay(new Date(goal.createdAt)))return false;
 const {subjects}=goal.links;
 if(priorityPlan(data,key)?.tasks.some(task=>!!task.completedAt&&subjects.includes(task.subject)))return true;
 if((data.bookSessions??[]).some(session=>subjects.includes(session.subject)&&session.rewardMode!=='output'&&!!session.note.trim()&&routineDay(new Date(session.completedAt))===key))return true;
 if((data.handwritingReceipts??[]).some(receipt=>subjects.includes(receipt.subject)&&receipt.rewardPolicy==='ramp-v1'&&receipt.rewardStatus==='earned'&&(receipt.rewardDay??receipt.day)===key))return true;
 if(subjects.some(subject=>outputUnitsOnDay(data,key,subject)>=OUTPUT_POLICY.goalUnits))return true;
 if(!data.days[key]?.plan)return false;
 return liveDeckIds(data,goal).some(id=>{const progress=studyDeckProgress(data,key,id);return progress.min||progress.full});
}

const weekdays=['월','화','수','목','금','토','일'];
/** 이번 주는 월요일부터 일요일까지이고, 하루 경계는 전달받은 dayKey(새벽 4시 기준)를 따른다. */
export function goalWeek(data:RoutineData,goal:Goal,today:string){
 const monday=weekStartOf(today);
 const days=weekdays.map((label,i)=>{
  const key=addDays(monday,i),isFuture=key>today;
  return {key,label,isToday:key===today,isFuture,counted:!isFuture&&isGoalLinkedStudyDay(data,goal,key)};
 });
 return {days,count:days.filter(day=>day.counted).length,target:goal.weeklyTargetDays};
}
/** 목표를 정한 날부터 오늘까지. */
export function goalTotals(data:RoutineData,goal:Goal,today:string){
 const startedOn=routineDay(new Date(goal.createdAt));
 let studiedDays=0;
 for(let key=startedOn;key<=today;key=addDays(key,1))if(isGoalLinkedStudyDay(data,goal,key))studiedDays++;
 return {startedOn,studiedDays};
}

export type GoalNextStep={kind:'link'}|{kind:'plan'}|{kind:'words'}|{kind:'task';subject:string;action:string}|{kind:'done'};
/** 오늘 계획을 읽기만 한다. 시작과 보상 처리는 오늘 탭이 맡는다. */
export function goalNextStep(data:RoutineData,goal:Goal,today:string,now=Date.now()):GoalNextStep{
 const {subjects}=goal.links,decks=liveDeckIds(data,goal);
 if(!subjects.length&&!decks.length)return {kind:'link'};
 const tasks=(priorityPlan(data,today)?.tasks??[]).filter(task=>subjects.includes(task.subject));
 if(!tasks.length)return subjects.length?{kind:'plan'}:{kind:'words'};
 const open=tasks.filter(task=>!priorityTaskProgress(data,task,now).complete),task=open.find(item=>item.startedAt)??open[0];
 return task?{kind:'task',subject:task.subject,action:task.nextAction||task.action}:{kind:'done'};
}
