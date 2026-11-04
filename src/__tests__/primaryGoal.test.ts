import {goalDueInfo,goalStudySummary,goalWeekProgress,isGoalStudyDay,nextGoalStep,primaryGoalError,readPrimaryGoal,savePrimaryGoal} from '../lib/primaryGoal';
import {emptyData,emptyDay,routineDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import type {PriorityTask} from '../lib/priorityPlan';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {validateStudyState} from '../lib/studyHistory';

jest.mock('../lib/supabase',()=>({supabase:{}}));

const now=new Date('2026-11-04T09:00:00+09:00');
const input={title:' JLPT N2 합격 ',why:' 일본에서 일하고 싶어서 ',dueDate:'2026-12-06',weeklyTargetDays:5};
const task=(over:Partial<PriorityTask>={}):PriorityTask=>({id:'t1',subject:'문법',action:'3쪽 풀기',preparation:'',target:'',minimum:120,...over});
const withPlan=(key:string,tasks:PriorityTask[]):RoutineData=>({...emptyData(),priorityDays:{[key]:{day:key,createdAt:now.toISOString(),updatedAt:now.toISOString(),tasks}}});
const uid='11111111-1111-4111-8111-111111111111';

describe('saving a goal',()=>{
 it('trims and stores a valid goal',()=>{
  const goal=savePrimaryGoal(emptyData(),input,now).primaryGoal!;
  expect(goal).toMatchObject({title:'JLPT N2 합격',why:'일본에서 일하고 싶어서',dueDate:'2026-12-06',weeklyTargetDays:5,createdAt:now.toISOString()});
  expect(primaryGoalError(goal)).toBeNull();
 });
 it('keeps id and createdAt when editing and allows removing optional values',()=>{
  const first=savePrimaryGoal(emptyData(),input,now);
  const later=new Date('2026-11-05T09:00:00+09:00');
  const edited=savePrimaryGoal(first,{title:'새 목표',weeklyTargetDays:3},later).primaryGoal!;
  expect(edited.id).toBe(first.primaryGoal!.id);
  expect(edited.createdAt).toBe(now.toISOString());
  expect(edited.updatedAt).toBe(later.toISOString());
  expect(edited.why).toBeUndefined();
  expect(edited.dueDate).toBeUndefined();
 });
 it.each([
  ['empty title',{...input,title:'   '}],
  ['long title',{...input,title:'가'.repeat(81)}],
  ['long reason',{...input,why:'가'.repeat(121)}],
  ['impossible date',{...input,dueDate:'2026-02-30'}],
  ['badly formatted date',{...input,dueDate:'2026.12.06'}],
  ['zero days',{...input,weeklyTargetDays:0}],
  ['eight days',{...input,weeklyTargetDays:8}],
  ['fractional days',{...input,weeklyTargetDays:2.5}],
 ])('rejects %s without changing data',(_,bad)=>{
  const data=emptyData();
  expect(()=>savePrimaryGoal(data,bad,now)).toThrow();
  expect(data.primaryGoal).toBeUndefined();
 });
 it('changes only the goal field',()=>{
  const data:RoutineData={...emptyData(),boriStage:'growing',newLimit:7,days:{'2026-11-01':{...emptyDay(),paid:{morning:10,words:0,gym:0}}},money:undefined};
  const {primaryGoal,...rest}=savePrimaryGoal(data,input,now);
  expect(primaryGoal).toBeDefined();
  expect(rest).toEqual(data);
 });
});

describe('reading stored data',()=>{
 it('treats old data without the field as no goal',()=>{
  expect(readPrimaryGoal(emptyData())).toEqual({status:'none'});
 });
 it('returns a valid goal',()=>{
  const data=savePrimaryGoal(emptyData(),input,now);
  expect(readPrimaryGoal(data)).toEqual({status:'ok',goal:data.primaryGoal});
 });
 const corrupt=[{title:''},'not-a-goal',{id:'x',title:'a',weeklyTargetDays:99,createdAt:'x',updatedAt:'x'}];
 it.each(corrupt)('reports a broken goal instead of throwing: %j',bad=>{
  expect(readPrimaryGoal({...emptyData(),primaryGoal:bad} as unknown as RoutineData)).toEqual({status:'invalid'});
 });
 it.each(corrupt)('a broken goal does not block load validation or backup restore: %j',bad=>{
  const data={...emptyData(),boriStage:'growing',primaryGoal:bad} as unknown as RoutineData;
  expect(()=>validateStudyState(data)).not.toThrow();
  const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(data,uid))),uid);
  expect(restored.data.boriStage).toBe('growing');
 });
 it('replaces a broken goal only when a new one is saved',()=>{
  const broken={...emptyData(),primaryGoal:{title:''}} as unknown as RoutineData;
  expect(readPrimaryGoal(savePrimaryGoal(broken,input,now)).status).toBe('ok');
 });
 it('survives a backup round trip',()=>{
  const data=savePrimaryGoal(emptyData(),input,now);
  const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(data,uid))),uid);
  expect(restored.data.primaryGoal).toEqual(data.primaryGoal);
 });
});

describe('due date',()=>{
 const goal=(dueDate?:string)=>savePrimaryGoal(emptyData(),{title:'a',weeklyTargetDays:1,dueDate},now).primaryGoal!;
 it('is hidden without a date',()=>expect(goalDueInfo(goal(),'2026-11-04')).toBeUndefined());
 it('counts down',()=>expect(goalDueInfo(goal('2026-11-07'),'2026-11-04')).toMatchObject({label:'D-3',passed:false}));
 it('marks today',()=>expect(goalDueInfo(goal('2026-11-04'),'2026-11-04')).toMatchObject({label:'D-DAY',passed:false}));
 it('marks a passed date',()=>expect(goalDueInfo(goal('2026-11-01'),'2026-11-04')).toMatchObject({label:'D+3',passed:true}));
});

describe('days counted as study',()=>{
 const key='2026-11-04';
 const day=(over:object):RoutineData=>({...emptyData(),days:{[key]:{...emptyDay(),...over}}});
 it('ignores an empty day',()=>expect(isGoalStudyDay(emptyData(),key)).toBe(false));
 it('counts paid word study',()=>expect(isGoalStudyDay(day({paid:{morning:0,words:20,gym:0}}),key)).toBe(true));
 const wordDay=(complete:string[])=>day({wordRewards:{version:2,countedIds:[],pendingIds:[],rounds:0},plan:{ids:['a','b','c','d','e','f'],reviewIds:['a','b','c','d','e'],newIds:['f']},complete});
 it('counts a current-format word day once the minimum is reached',()=>expect(isGoalStudyDay(wordDay(['a','b','c','d','e']),key)).toBe(true));
 it('does not count a current-format word day below the minimum',()=>expect(isGoalStudyDay(wordDay(['a','b']),key)).toBe(false));
 it('counts a finished priority task',()=>expect(isGoalStudyDay(withPlan(key,[task({completedAt:now.toISOString()})]),key)).toBe(true));
 it('does not count an unfinished priority task',()=>expect(isGoalStudyDay(withPlan(key,[task()]),key)).toBe(false));
 it('does not count morning routine or gym alone',()=>expect(isGoalStudyDay(day({paid:{morning:10,words:0,gym:30}}),key)).toBe(false));
 it('counts a focus session with a saved note',()=>{
  const data={...emptyData(),bookSessions:[{id:'s',subject:'문법',seconds:900,note:'3쪽 끝',next:'',completedAt:now.toISOString()}]} as unknown as RoutineData;
  expect(isGoalStudyDay(data,routineDay(now))).toBe(true);
 });
});

describe('this week',()=>{
 const goal=savePrimaryGoal(emptyData(),{title:'a',weeklyTargetDays:3},now).primaryGoal!;
 const studied=(...keys:string[]):RoutineData=>({...emptyData(),days:Object.fromEntries(keys.map(k=>[k,{...emptyDay(),paid:{morning:0,words:20,gym:0}}]))});
 it('runs Monday to Sunday around today',()=>{
  const week=goalWeekProgress(emptyData(),goal,'2026-11-04');
  expect(week.days.map(d=>d.key)).toEqual(['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);
  expect(week.days.map(d=>d.label)).toEqual(['월','화','수','목','금','토','일']);
  expect(week.days[2].isToday).toBe(true);
  expect(week.days[3].isFuture).toBe(true);
 });
 it('treats Sunday and Monday as different weeks',()=>{
  expect(goalWeekProgress(emptyData(),goal,'2026-11-08').days[0].key).toBe('2026-11-02');
  expect(goalWeekProgress(emptyData(),goal,'2026-11-09').days[0].key).toBe('2026-11-09');
 });
 it('counts only studied days in this week up to today',()=>{
  const week=goalWeekProgress(studied('2026-11-01','2026-11-02','2026-11-04','2026-11-05'),goal,'2026-11-04');
  expect(week.count).toBe(2);
  expect(week.target).toBe(3);
  expect(week.days.filter(d=>d.counted).map(d=>d.key)).toEqual(['2026-11-02','2026-11-04']);
 });
});

describe('since the goal was set',()=>{
 const goal=savePrimaryGoal(emptyData(),{title:'a',weeklyTargetDays:3},now).primaryGoal!;
 const studied=(...keys:string[]):RoutineData=>({...emptyData(),days:Object.fromEntries(keys.map(k=>[k,{...emptyDay(),paid:{morning:0,words:20,gym:0}}]))});
 it('counts study days from the day it was set through today, across weeks',()=>{
  expect(goalStudySummary(studied('2026-11-03','2026-11-04','2026-11-10','2026-11-20','2026-11-21'),goal,'2026-11-20')).toEqual({startedOn:'2026-11-04',studiedDays:3});
 });
 it('uses the 4am day boundary for the start day',()=>{
  const lateNight=savePrimaryGoal(emptyData(),{title:'a',weeklyTargetDays:3},new Date('2026-11-05T02:00:00+09:00')).primaryGoal!;
  expect(goalStudySummary(emptyData(),lateNight,'2026-11-05').startedOn).toBe('2026-11-04');
 });
 it('returns zero when the start day is after today',()=>expect(goalStudySummary(studied('2026-11-04'),goal,'2026-11-01').studiedDays).toBe(0));
});

describe('next step',()=>{
 const key=routineDay(now),at=now.getTime();
 it('asks for a plan when none exists',()=>expect(nextGoalStep(emptyData(),key,at)).toEqual({kind:'plan'}));
 const started=now.toISOString(),finished=new Date(now.getTime()+1000).toISOString();
 const doneTask=(over:Partial<PriorityTask>={})=>task({startedAt:started,baseline:0,completedAt:finished,...over});
 const reading=()=>task({id:'t2',subject:'독해',action:'지문 1개'});
 it('shows the pending task',()=>expect(nextGoalStep(withPlan(key,[task()]),key,at)).toEqual({kind:'task',subject:'문법',action:'3쪽 풀기'}));
 it('prefers the next action saved for a started task',()=>expect(nextGoalStep(withPlan(key,[task({startedAt:started,baseline:0,nextAction:'4쪽부터'})]),key,at)).toMatchObject({kind:'task',action:'4쪽부터'}));
 it('moves to tomorrow when a started task is finished and not deferred',()=>expect(nextGoalStep(withPlan(key,[doneTask()]),key,at)).toEqual({kind:'done'}));
 it('moves to tomorrow when a finished task was deferred',()=>expect(nextGoalStep(withPlan(key,[doneTask({deferredAt:finished})]),key,at)).toEqual({kind:'done'}));
 it('skips a finished task and shows the next open one',()=>expect(nextGoalStep(withPlan(key,[doneTask(),reading()]),key,at)).toEqual({kind:'task',subject:'독해',action:'지문 1개'}));
 it('prefers a started open task over an earlier unstarted one',()=>expect(nextGoalStep(withPlan(key,[task(),{...reading(),startedAt:started,baseline:0}]),key,at)).toMatchObject({subject:'독해'}));
 it('does not change data',()=>{
  const data=withPlan(key,[task()]),before=JSON.stringify(data);
  nextGoalStep(data,key,at);goalWeekProgress(data,savePrimaryGoal(emptyData(),input,now).primaryGoal!,key);
  expect(JSON.stringify(data)).toBe(before);
 });
});
