import type {RoutineData,Day} from './routineModel';
import {getDay,routineDay,studyProgress,withDay} from './routineModel';
import {outputUnitsOnDay,OUTPUT_POLICY} from './handwriting';
export type HabitGoal='morning'|'book'|'words'|'gym'|`focus:${string}`;
export const HABIT_GOALS:Record<string,string>={morning:'아침 루틴',book:'손글씨 공부 500자',words:'오늘 단어 전체 목표',gym:'운동'};
export const ORDER_BONUS_MINUTES=60;
export const focusSubject=(goal:HabitGoal)=>goal.startsWith('focus:')?goal.slice(6):undefined;
export const habitGoalLabel=(goal:HabitGoal)=>focusSubject(goal)?`${focusSubject(goal)} · 손글씨 500자`:HABIT_GOALS[goal];
export const isFocusGoal=(goal:HabitGoal)=>goal==='book'||!!focusSubject(goal);
export type HabitOrderPolicy={enabled:boolean;sequence:HabitGoal[]};
export type HabitOrderProgress={sequence:HabitGoal[];step:number;started:HabitGoal[];focusBasis?:'output';status:'active'|'outOfOrder'|'untracked'|'complete'|'off'};
export const DEFAULT_HABIT_ORDER:HabitGoal[]=['morning','focus:전기공사기사 실기','focus:수능','words'];
export function validHabitSequence(sequence:unknown):sequence is HabitGoal[]{return Array.isArray(sequence)&&sequence.length>=2&&sequence.length<=8&&new Set(sequence).size===sequence.length&&sequence.every(id=>typeof id==='string'&&(id in HABIT_GOALS||id.startsWith('focus:')&&id.slice(6).trim()===id.slice(6)&&id.slice(6).length>0&&id.slice(6).length<=40))&&sequence.some(isFocusGoal)&&!(sequence.includes('book')&&sequence.some(id=>id.startsWith('focus:')));}
export function habitOrderPolicy(data:RoutineData):HabitOrderPolicy{const p=data.habitOrderPolicy;return {enabled:p?.enabled!==false,sequence:validHabitSequence(p?.sequence)?p!.sequence:[...DEFAULT_HABIT_ORDER]};}
const qualifyingBook=(data:RoutineData,key:string)=>(data.bookSessions??[]).filter(s=>s.rewardMode!=='output'&&s.savedAt&&s.note.trim()&&s.seconds>=1500&&routineDay(new Date(s.completedAt))===key);
function hasEarlierPractice(data:RoutineData,key:string,day:Day){return day.morning.some(Boolean)||day.responses>0||Object.values(day.paid).some(n=>n>0)||outputUnitsOnDay(data,key)>0||!!data.outputDraft&&routineDay(new Date(data.outputDraft.startedAt))===key||(data.bookSessions??[]).some(s=>routineDay(new Date(s.completedAt))===key)||!!data.bookTimer&&data.bookTimer.phase!=='idle'&&routineDay(new Date(data.bookTimer.startedAt))===key;}
/** Snapshot the sequence once a day. Never infer the order of legacy records. */
export function initializeHabitOrder(data:RoutineData,key:string):RoutineData{
 const day=getDay(data,key);if(day.orderProgress)return data;const policy=habitOrderPolicy(data);
 return withDay(data,key,d=>({...d,orderProgress:{sequence:[...policy.sequence],step:0,started:[],focusBasis:'output',status:!policy.enabled?'off':hasEarlierPractice(data,key,day)?'untracked':'active'}}));
}
export function completedHabitGoal(data:RoutineData,key:string,goal:HabitGoal){const d=getDay(data,key);return goal==='morning'?d.paid.morning>0:isFocusGoal(goal)?outputUnitsOnDay(data,key,focusSubject(goal))>=OUTPUT_POLICY.goalUnits||d.orderProgress?.focusBasis!=='output'&&qualifyingBook(data,key).some(s=>goal==='book'||s.subject===focusSubject(goal)):goal==='words'?studyProgress(d).full:d.paid.gym>0;}
export function saveHabitOrderPolicy(data:RoutineData,key:string,policy:HabitOrderPolicy):RoutineData{
 if(!validHabitSequence(policy.sequence))throw new Error('중복 없이 2~8개 행동과 집중 공부 과목을 하나 이상 넣어 주세요.');
 let next:RoutineData={...data,habitOrderPolicy:{enabled:!!policy.enabled,sequence:[...policy.sequence]}};
 const day=getDay(data,key);if(!hasEarlierPractice(data,key,day)&&!day.orderProgress?.started.length)next=initializeHabitOrder(withDay(next,key,d=>({...d,orderProgress:undefined})),key);
 return next;
}
export function advanceHabitOrder(before:RoutineData,after:RoutineData,key:string):RoutineData{
 if(before.studyUndo&&!after.studyUndo&&after.reviewHistory?.some(e=>e.id===before.studyUndo!.eventId&&!!e.voidedAt))return after;
 const a=getDay(before,key),b=getDay(after,key);
 // An answer transaction may already have recorded this exact transition.
 if(b.orderProgress&&JSON.stringify(b.orderProgress)!==JSON.stringify(a.orderProgress))return after;
 const p=getDay(initializeHabitOrder(before,key),key).orderProgress!;
 if(p.status!=='active')return b.orderProgress?after:withDay(after,key,d=>({...d,orderProgress:p}));
 const started=new Set(p.started);let step=p.step,status:HabitOrderProgress['status']='active';
 const starts:HabitGoal[]=[];
 if(b.morning.filter(Boolean).length>a.morning.filter(Boolean).length||b.paid.morning>a.paid.morning)starts.push('morning');
 const newTimer=after.bookTimer?.phase==='focus'&&after.bookTimer.id!==before.bookTimer?.id?after.bookTimer:undefined;
 const oldNotes=new Set(qualifyingBook(before,key).map(s=>s.id)),newNotes=qualifyingBook(after,key).filter(s=>!oldNotes.has(s.id));
 const oldReceipts=new Set((before.handwritingReceipts??[]).map(r=>r.id)),newOutputs=(after.handwritingReceipts??[]).filter(r=>r.day===key&&!oldReceipts.has(r.id)),draft=after.outputDraft?.id!==before.outputDraft?.id?after.outputDraft:undefined;
 for(const goal of p.sequence)if(isFocusGoal(goal)&&(draft&&(goal==='book'||draft.subject===focusSubject(goal))||newOutputs.some(r=>goal==='book'||r.subject===focusSubject(goal))))starts.push(goal);
 for(const goal of p.sequence)if(isFocusGoal(goal)&&(newTimer&&(goal==='book'||newTimer.subject===focusSubject(goal))||newNotes.some(s=>goal==='book'||s.subject===focusSubject(goal))))starts.push(goal);
 if(b.responses>a.responses)starts.push('words');
 if(b.paid.gym>a.paid.gym)starts.push('gym');
 for(const goal of starts){const index=p.sequence.indexOf(goal);if(index<0||started.has(goal))continue;started.add(goal);if(index>step)status='outOfOrder';}
 if(status==='active'){while(step<p.sequence.length&&started.has(p.sequence[step])&&completedHabitGoal(after,key,p.sequence[step]))step++;if(step===p.sequence.length)status='complete';}
 const progress={...p,step,started:[...started],status};
 if(JSON.stringify(progress)===JSON.stringify(b.orderProgress))return after;
 return withDay(after,key,d=>({...d,orderProgress:progress,bonus:status==='complete'?{...d.bonus,order:Math.max(d.bonus?.order??0,ORDER_BONUS_MINUTES)}:d.bonus}));
}
