import {goalDueInfo,isGoalStudyDay,primaryGoalError,readPrimaryGoal} from '../lib/primaryGoal';
import type {PrimaryGoal} from '../lib/primaryGoal';
import {emptyData,emptyDay,routineDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import type {PriorityTask} from '../lib/priorityPlan';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {validateStudyState} from '../lib/studyHistory';

jest.mock('../lib/supabase',()=>({supabase:{}}));

const now=new Date('2026-11-04T09:00:00+09:00');
const stored=(over:Partial<PrimaryGoal>={}):PrimaryGoal=>({id:'goal-1',title:'JLPT N2 합격',why:'일본에서 일하고 싶어서',dueDate:'2026-12-06',weeklyTargetDays:5,createdAt:now.toISOString(),updatedAt:now.toISOString(),...over});
const task=(over:Partial<PriorityTask>={}):PriorityTask=>({id:'t1',subject:'문법',action:'3쪽 풀기',preparation:'',target:'',minimum:120,...over});
const withPlan=(key:string,tasks:PriorityTask[]):RoutineData=>({...emptyData(),priorityDays:{[key]:{day:key,createdAt:now.toISOString(),updatedAt:now.toISOString(),tasks}}});
const uid='11111111-1111-4111-8111-111111111111';

describe('reading stored data',()=>{
 it('treats old data without the field as no goal',()=>{
  expect(readPrimaryGoal(emptyData())).toEqual({status:'none'});
 });
 it('returns a valid goal',()=>{
  const data:RoutineData={...emptyData(),primaryGoal:stored()};
  expect(primaryGoalError(data.primaryGoal)).toBeNull();
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
 it('survives a backup round trip',()=>{
  const data:RoutineData={...emptyData(),primaryGoal:stored()};
  const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(data,uid))),uid);
  expect(restored.data.primaryGoal).toEqual(data.primaryGoal);
 });
});

describe('due date',()=>{
 const goal=(dueDate?:string)=>stored({dueDate});
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
