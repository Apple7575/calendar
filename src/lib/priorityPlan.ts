import type {RoutineData} from './routineModel';
import {routineDay} from './routineModel';
import {focusSecondsForSubject,focusRampStatus} from './focusRamp';
import {saveFocusPlan,startBookTimer,stopBookTimer,resumeBookTimer} from './bookStudy';
import {startOutputStudy} from './handwriting';

export type PriorityTask={id:string;subject:string;action:string;preparation:string;target:string;minimum:120|300;startedAt?:string;baseline?:number;completedAt?:string;receiptId?:string;nextAction?:string;deferredAt?:string};
export type PriorityDay={day:string;createdAt:string;updatedAt:string;tasks:PriorityTask[]};
export type PriorityPolicy={enabled:boolean;from:string};
const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&routineDay(new Date(s+'T12:00:00'))===s;
export function priorityPlan(data:RoutineData,key=routineDay()){return data.priorityDays?.[key];}
export function nextPriorityTask(data:RoutineData,key=routineDay(),now=Date.now()){
 const tasks=priorityPlan(data,key)?.tasks??[];
 return tasks.find(t=>t.startedAt&&!t.deferredAt)??tasks.find(t=>!priorityTaskProgress(data,t,now).complete);
}
export function priorityTaskProgress(data:RoutineData,task:PriorityTask,now=Date.now()){
 const seconds=task.startedAt?Math.max(0,focusSecondsForSubject(data,task.subject,now)-(task.baseline??0)):0;
 const photo=task.startedAt?data.handwritingReceipts?.find(r=>r.subject===task.subject&&r.units>0&&Date.parse(r.at)>=Date.parse(task.startedAt!)):undefined;
 return {seconds,photo,complete:!!task.completedAt||seconds>=task.minimum&&!!photo,remaining:Math.max(0,task.minimum-seconds)};
}
export function priorityGate(data:RoutineData,key=routineDay(),now=Date.now()){
 const required=!!data.priorityPolicy?.enabled&&key>=data.priorityPolicy.from,plan=priorityPlan(data,key),first=plan?.tasks[0];
 const complete=!!first&&priorityTaskProgress(data,first,now).complete;
 return {required,complete,blocked:required&&!complete,plan,first,reason:!first?'오늘의 첫 공부를 정해 주세요.':`먼저 ${first.subject} ${first.minimum/60}분과 필기 사진을 확인해 주세요.`};
}
export function savePriorityDay(data:RoutineData,key:string,tasks:PriorityTask[],now=new Date()):RoutineData{
 if(!validDay(key)||key<routineDay(now))throw new Error('오늘 또는 앞으로의 계획을 선택해 주세요.');
 if(!Array.isArray(tasks)||tasks.length<1||tasks.length>3||new Set(tasks.map(t=>t.id)).size!==tasks.length||new Set(tasks.map(t=>t.subject.trim())).size!==tasks.length)throw new Error('서로 다른 과목으로 중요한 공부 1~3개를 정해 주세요.');
 const old=priorityPlan(data,key),clean=tasks.map(t=>{if(!t.id||t.id.length>100||!t.subject?.trim()||t.subject.trim().length>80||!t.action?.trim()||t.action.trim().length>300||typeof t.preparation!=='string'||t.preparation.length>300||typeof t.target!=='string'||t.target.length>300||![120,300].includes(t.minimum))throw new Error('과목과 바로 할 행동을 적어 주세요. 작은 시작은 2분 또는 5분이에요.');const previous=old?.tasks.find(p=>p.id===t.id);return previous?.startedAt?previous:{id:t.id,subject:t.subject.trim(),action:t.action.trim(),preparation:t.preparation.trim(),target:t.target.trim(),minimum:t.minimum};});
 if(old?.tasks.some((t,i)=>t.startedAt&&(clean[i]?.id!==t.id)))throw new Error('이미 시작한 공부의 순서는 오늘 유지해요. 내일 계획에서 바꿀 수 있어요.');
 const day={day:key,createdAt:old?.createdAt??now.toISOString(),updatedAt:now.toISOString(),tasks:clean};
 return {...data,priorityDays:{...data.priorityDays,[key]:day}};
}
export function setPriorityPolicy(data:RoutineData,enabled:boolean,from=routineDay()):RoutineData{
 if(!validDay(from))throw new Error('시작 날짜를 확인해 주세요.');
 return {...data,priorityPolicy:{enabled,from:enabled&&data.priorityPolicy?.enabled?data.priorityPolicy.from:from}};
}
export function reconcilePriorityPlans(data:RoutineData,key=routineDay(),now=Date.now()):RoutineData{
 const plan=priorityPlan(data,key);if(!plan)return data;let changed=false;
 const tasks=plan.tasks.map(t=>{if(t.completedAt)return t;const p=priorityTaskProgress(data,t,now);if(!p.complete||!p.photo)return t;changed=true;return {...t,completedAt:new Date(now).toISOString(),receiptId:p.photo.id};});
 return changed?{...data,priorityDays:{...data.priorityDays,[key]:{...plan,tasks,updatedAt:new Date(now).toISOString()}}}:data;
}
/** This does not pay a new reward. Existing plan/photo reward rules remain the only ledger. */
export function beginPriorityTask(data:RoutineData,key:string,id:string,now=Date.now()):RoutineData{
 if(key!==routineDay(new Date(now)))throw new Error('오늘 계획에서 시작해 주세요.');
 const plan=priorityPlan(data,key),task=plan?.tasks.find(t=>t.id===id);if(!plan||!task)throw new Error('시작할 공부를 찾지 못했어요.');
 let next=data;const timer=next.bookTimer;
 if(timer&&timer.phase!=='idle'&&(!task.startedAt||timer.phase!=='focus'||timer.subject!==task.subject))next=stopBookTimer(next,now);
 const started=task.startedAt?{...task,deferredAt:undefined}:{...task,startedAt:new Date(now).toISOString(),baseline:focusSecondsForSubject(next,task.subject,now)};
 next={...next,priorityDays:{...next.priorityDays,[key]:{...plan,tasks:plan.tasks.map(t=>t.id===id?started:t)}}};
 if(focusRampStatus(next,now).needsPlan)next=saveFocusPlan(next,'priority-plan-'+key+'-'+id+'-'+now,task.subject,task.nextAction||task.action,now);
 if(next.handwritingPending&&next.handwritingPending.subject!==task.subject)throw new Error('먼저 이전 공부의 사진을 확인하거나 결과를 버려 주세요.');
 next=startOutputStudy(next.outputDraft?.subject!==task.subject?{...next,outputDraft:undefined}:next,'priority-draft-'+id,task.subject,new Date(now));
 if(!next.bookTimer||next.bookTimer.phase==='idle')next=startBookTimer(next,'priority-timer-'+id+'-'+now,task.subject,now,task.completedAt?focusRampStatus(next,now).required:task.minimum,'output');
 else if(!next.bookTimer.running)next=resumeBookTimer(next,now);
 return next;
}
export function saveNextPriorityAction(data:RoutineData,key:string,id:string,text:string,now=new Date()):RoutineData{
 if(!text.trim()||text.trim().length>300)throw new Error('다음에 바로 할 행동을 300자 이내로 남겨 주세요.');
 const plan=priorityPlan(data,key);if(!plan?.tasks.some(t=>t.id===id))throw new Error('이어갈 공부를 찾지 못했어요.');
 return {...data,priorityDays:{...data.priorityDays,[key]:{...plan,updatedAt:now.toISOString(),tasks:plan.tasks.map(t=>t.id===id?{...t,nextAction:text.trim(),...(priorityTaskProgress(data,t,now.getTime()).complete?{deferredAt:now.toISOString()}:{})}:t)}}};
}
export function activePriorityTask(data:RoutineData,key=routineDay()){
 const tasks=priorityPlan(data,key)?.tasks??[],subject=data.bookTimer?.subject??data.outputDraft?.subject;
 return tasks.find(t=>t.subject===subject&&t.startedAt)??tasks.find(t=>!t.completedAt)??tasks[0];
}
export function validatePriorityPlans(data:RoutineData){
 const p=data.priorityPolicy;if(p&&(!validDay(p.from)||typeof p.enabled!=='boolean'))throw new Error('중요한 공부 설정을 확인해 주세요.');
 if(data.priorityDays===undefined)return;
 if(!data.priorityDays||typeof data.priorityDays!=='object'||Array.isArray(data.priorityDays)||Object.keys(data.priorityDays).length>50000)throw new Error('공부 계획 형식을 확인해 주세요.');
 for(const [key,plan]of Object.entries(data.priorityDays)){
  if(!validDay(key)||plan.day!==key||!Number.isFinite(Date.parse(plan.createdAt))||!Number.isFinite(Date.parse(plan.updatedAt))||!Array.isArray(plan.tasks)||plan.tasks.length<1||plan.tasks.length>3||new Set(plan.tasks.map(t=>t.id)).size!==plan.tasks.length||new Set(plan.tasks.map(t=>t.subject)).size!==plan.tasks.length)throw new Error('하루 공부 계획을 확인해 주세요.');
  for(const t of plan.tasks){if(!t||typeof t.id!=='string'||!t.id||typeof t.subject!=='string'||!t.subject.trim()||t.subject.length>80||typeof t.action!=='string'||!t.action.trim()||t.action.length>300||typeof t.preparation!=='string'||t.preparation.length>300||typeof t.target!=='string'||t.target.length>300||![120,300].includes(t.minimum)||t.nextAction!==undefined&&(typeof t.nextAction!=='string'||t.nextAction.length>300)||t.startedAt!==undefined&&(!Number.isFinite(Date.parse(t.startedAt))||!Number.isSafeInteger(t.baseline)||t.baseline!<0)||t.completedAt!==undefined&&(!t.startedAt||!Number.isFinite(Date.parse(t.completedAt))||!data.handwritingReceipts?.some(r=>r.id===t.receiptId&&r.subject===t.subject&&r.units>0)))throw new Error('첫 행동의 진행 기록을 확인해 주세요.');}
  for(const t of plan.tasks)if(t.id.length>100||t.deferredAt!==undefined&&(!t.startedAt||!Number.isFinite(Date.parse(t.deferredAt)))||t.completedAt&&Date.parse(t.completedAt)<Date.parse(t.startedAt!))throw new Error('공부의 저장 시각을 확인해 주세요.');
 }
}
