import {completeGoal,deleteGoal,goalBrokenLinks,goalLinkOptions,goalNextStep,goalTotals,goalWeek,isGoalLinkedStudyDay,knownSubjects,readGoals,reopenGoal,saveGoal,setGoalLinks} from '../lib/routineGoals';
import type {Goal} from '../lib/routineGoals';
import type {PrimaryGoal} from '../lib/primaryGoal';
import type {PriorityTask} from '../lib/priorityPlan';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {emptyData,emptyDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {validateStudyState} from '../lib/studyHistory';

jest.mock('../lib/supabase',()=>({supabase:{}}));

const now=new Date('2026-11-04T09:00:00+09:00'),at=now.toISOString(),uid='11111111-1111-4111-8111-111111111111',today='2026-11-04';
const input={title:'JLPT N2 합격',weeklyTargetDays:5};
const oldGoal:PrimaryGoal={id:'goal-old',title:'옛 목표',why:'이유',dueDate:'2026-12-06',weeklyTargetDays:4,createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-02T00:00:00.000Z'};
const goal=(over:Partial<Goal>={}):Goal=>({id:'g1',title:'일본어 목표',weeklyTargetDays:3,createdAt:at,updatedAt:at,links:{subjects:['일본어'],deckIds:[]},...over});
const withGoals=(...goals:Goal[]):RoutineData=>({...emptyData(),goals});
const task=(over:Partial<PriorityTask>={}):PriorityTask=>({id:'t1',subject:'일본어',action:'3쪽 풀기',preparation:'',target:'',minimum:120,...over});
const plan=(data:RoutineData,tasks:PriorityTask[],key=today):RoutineData=>({...data,priorityDays:{[key]:{day:key,createdAt:at,updatedAt:at,tasks}}});
const receipt=(over:object)=>({id:'r',imageHash:'a'.repeat(64),subject:'일본어',at,day:today,lines:['가'],languages:['ko'],units:300,duplicateUnits:0,minutes:0,policyVersion:1,...over});
const money={balance:5000,entries:[{id:'m',amount:5000}]} as unknown as RoutineData['money'];

describe('moving from primaryGoal',()=>{
 it('reads an old goal as one unlinked goal without writing anything',()=>{
  const data:RoutineData={...emptyData(),primaryGoal:oldGoal},before=JSON.stringify(data);
  expect(readGoals(data)).toEqual({goals:[{...oldGoal,links:{subjects:[],deckIds:[]}}],unreadable:0,canReplaceUnreadable:false});
  expect(JSON.stringify(data)).toBe(before);
 });
 it('keeps every old value on the first save',()=>{
  const next=setGoalLinks({...emptyData(),primaryGoal:oldGoal},oldGoal.id,{subjects:['일본어'],deckIds:[]},now);
  expect(next.goals).toEqual([{...oldGoal,links:{subjects:['일본어'],deckIds:[]},updatedAt:at}]);
 });
 it('keeps the old goal when a new one is added first',()=>{
  const next=saveGoal({...emptyData(),primaryGoal:oldGoal},input,undefined,now);
  expect(next.goals!.map(g=>g.id)).toEqual([oldGoal.id,`goal-${now.getTime()}`]);
  expect(next.primaryGoal!.id).toBe(oldGoal.id);
 });
 it('uses goals over primaryGoal once goals exist',()=>{
  expect(readGoals({...withGoals(goal()),primaryGoal:oldGoal}).goals.map(g=>g.id)).toEqual(['g1']);
 });
});

describe('primaryGoal mirror for builds 40 and 41',()=>{
 it('holds the first active goal without new fields',()=>{
  const next=saveGoal(emptyData(),input,undefined,now);
  expect(next.primaryGoal).toEqual({id:`goal-${now.getTime()}`,title:'JLPT N2 합격',weeklyTargetDays:5,createdAt:at,updatedAt:at});
 });
 it('moves to the next active goal and clears when none is active',()=>{
  const data=saveGoal(withGoals(goal(),goal({id:'g2',title:'둘째',links:{subjects:[],deckIds:[]}})),{title:'일본어 목표',weeklyTargetDays:3},'g1',now);
  const first=completeGoal(data,'g1',now);
  expect(first.primaryGoal!.id).toBe('g2');
  const none=completeGoal(first,'g2',now);
  expect(none.primaryGoal).toBeUndefined();
  expect('primaryGoal' in none).toBe(false);
 });
});

describe('broken stored values',()=>{
 const bad=[{title:''},'not-a-goal',null,{...goal(),links:'x'},{...goal(),completedAt:'x'}];
 it.each(bad)('counts a broken entry and keeps the original when saving: %j',item=>{
  const data={...emptyData(),goals:[item,goal()]} as unknown as RoutineData;
  expect(readGoals(data)).toMatchObject({unreadable:1,canReplaceUnreadable:false});
  expect(readGoals(data).goals.map(g=>g.id)).toEqual(['g1']);
  const next=setGoalLinks(data,'g1',{subjects:['영어'],deckIds:[]},now);
  expect((next.goals as unknown[])[0]).toEqual(item);
  expect(deleteGoal(next,'g1').goals).toEqual([item]);
 });
 it('falls back to primaryGoal when goals is not an array and replaces it on save',()=>{
  const data={...emptyData(),goals:'x',primaryGoal:oldGoal} as unknown as RoutineData;
  expect(readGoals(data)).toMatchObject({unreadable:1,goals:[{id:oldGoal.id}]});
  expect(data.goals).toBe('x');
  expect(Array.isArray(setGoalLinks(data,oldGoal.id,{subjects:['영어'],deckIds:[]},now).goals)).toBe(true);
 });
 it('asks to set a goal again when primaryGoal is broken and replaces it only on save',()=>{
  const data={...emptyData(),primaryGoal:{title:''}} as unknown as RoutineData;
  expect(readGoals(data)).toEqual({goals:[],unreadable:1,canReplaceUnreadable:true});
  expect(data.primaryGoal).toEqual({title:''});
  expect(saveGoal(data,input,undefined,now).primaryGoal!.title).toBe('JLPT N2 합격');
 });
 it.each(bad)('does not block load validation or backup: %j',item=>{
  const data={...emptyData(),boriStage:'growing',goals:[item]} as unknown as RoutineData;
  expect(()=>validateStudyState(data)).not.toThrow();
  const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(data,uid))),uid);
  expect(restored.data.goals).toEqual([item]);
 });
});

describe('backup',()=>{
 it('round trips goals',()=>{
  const data=setGoalLinks(saveGoal(emptyData(),input,undefined,now),`goal-${now.getTime()}`,{subjects:['일본어'],deckIds:['d']},now);
  const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(data,uid))),uid);
  expect(restored.data.goals).toEqual(data.goals);
  expect(restored.data.primaryGoal).toEqual(data.primaryGoal);
 });
 it('restores an old backup that has only primaryGoal',()=>{
  const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup({...emptyData(),primaryGoal:oldGoal},uid))),uid);
  expect(readGoals(restored.data).goals[0]).toMatchObject({id:oldGoal.id,title:'옛 목표'});
 });
});

describe('saving',()=>{
 it('validates input without changing data',()=>{
  const data=emptyData();
  expect(()=>saveGoal(data,{...input,title:'  '},undefined,now)).toThrow();
  expect(()=>saveGoal(data,{...input,weeklyTargetDays:0},undefined,now)).toThrow();
  expect(data.goals).toBeUndefined();
 });
 it('editing keeps id, createdAt, links and can remove optional values',()=>{
  const later=new Date('2026-11-05T09:00:00+09:00');
  const edited=saveGoal(withGoals(goal({why:'이유',dueDate:'2026-12-06'})),{title:'새 이름',weeklyTargetDays:2},'g1',later).goals![0];
  expect(edited).toEqual({id:'g1',title:'새 이름',weeklyTargetDays:2,createdAt:at,updatedAt:later.toISOString(),links:{subjects:['일본어'],deckIds:[]}});
 });
 it('allows three active goals and blocks a fourth, ignoring finished ones',()=>{
  const three=withGoals(goal(),goal({id:'g2'}),goal({id:'g3'}));
  expect(()=>saveGoal(three,input,undefined,now)).toThrow('3개까지');
  expect(saveGoal(completeGoal(three,'g1',now),input,undefined,now).goals).toHaveLength(4);
 });
 it('blocks reopening when it would make a fourth active goal',()=>{
  const data=withGoals(goal({completedAt:at}),goal({id:'g2',links:{subjects:[],deckIds:[]}}),goal({id:'g3',links:{subjects:[],deckIds:[]}}),goal({id:'g4',links:{subjects:[],deckIds:[]}}));
  expect(()=>reopenGoal(data,'g1',now)).toThrow('3개까지');
  expect(reopenGoal(deleteGoal(data,'g4'),'g1',now).goals![0].completedAt).toBeUndefined();
 });
 it('links a subject or deck to only one active goal',()=>{
  const data=withGoals(goal(),goal({id:'g2',title:'둘째',links:{subjects:[],deckIds:['d']}}));
  expect(()=>setGoalLinks(data,'g2',{subjects:['일본어'],deckIds:[]},now)).toThrow("'일본어 목표'");
  expect(()=>setGoalLinks(data,'g1',{subjects:[],deckIds:['d']},now)).toThrow("'둘째'");
  const freed=completeGoal(data,'g1',now);
  expect(setGoalLinks(freed,'g2',{subjects:['일본어'],deckIds:[]},now).goals![1].links.subjects).toEqual(['일본어']);
  const taken=setGoalLinks(freed,'g2',{subjects:['일본어'],deckIds:[]},now);
  expect(()=>reopenGoal(taken,'g1',now)).toThrow("'둘째'");
 });
 it('deleting removes only the goal',()=>{
  const data=plan(withGoals(goal(),goal({id:'g2'})),[task({completedAt:at})]);
  const {goals,primaryGoal:_mirror,...rest}=deleteGoal(data,'g1');
  const {goals:_before,...expected}=data;
  expect(goals!.map(g=>g.id)).toEqual(['g2']);
  expect(rest).toEqual(expected);
 });
 it('changes only goal fields, leaving money, rewards and records untouched',()=>{
  const data:RoutineData={...emptyData(),money,boriStage:'growing',newLimit:7,days:{[today]:{...emptyDay(),paid:{morning:10,words:20,gym:0}}},bookSessions:[]};
  const results=[saveGoal(data,input,undefined,now)];
  const id=results[0].goals![0].id;
  results.push(setGoalLinks(results[0],id,{subjects:['일본어'],deckIds:[]},now),completeGoal(results[0],id,now),reopenGoal(completeGoal(results[0],id,now),id,now),deleteGoal(results[0],id));
  for(const next of results){
   const {goals:_goals,primaryGoal:_primary,...rest}=next;
   expect(rest).toEqual(data);
   expect(rest.money).toBe(money);
  }
 });
});

describe('days counted for a goal',()=>{
 const counts=(data:RoutineData,g=goal(),key=today)=>isGoalLinkedStudyDay(data,g,key);
 it('ignores an empty day',()=>expect(counts(emptyData())).toBe(false));
 it('counts a finished priority task of a linked subject only',()=>{
  const data=plan(emptyData(),[task({completedAt:at})]);
  expect(counts(data)).toBe(true);
  expect(counts(data,goal({links:{subjects:['영어'],deckIds:[]}}))).toBe(false);
  expect(counts(plan(emptyData(),[task()]))).toBe(false);
 });
 it('counts a focus session with a note on a linked subject',()=>{
  const session=(over:object)=>({id:'s',subject:'일본어',startedAt:at,completedAt:at,seconds:900,note:'3쪽',next:'',...over});
  const data=(s:object)=>({...emptyData(),bookSessions:[s]}) as unknown as RoutineData;
  expect(counts(data(session({})))).toBe(true);
  expect(counts(data(session({subject:'영어'})))).toBe(false);
  expect(counts(data(session({note:'  '})))).toBe(false);
  expect(counts(data(session({rewardMode:'output'})))).toBe(false);
 });
 const receipts=(...rows:object[])=>({...emptyData(),handwritingReceipts:rows}) as unknown as RoutineData;
 it('counts an earned stage receipt even below 500 units',()=>{
  expect(counts(receipts(receipt({rewardPolicy:'ramp-v1',rewardStatus:'earned'})))).toBe(true);
  expect(counts(receipts(receipt({rewardPolicy:'ramp-v1',rewardStatus:'earned',day:'2026-11-03',rewardDay:today})))).toBe(true);
 });
 it('does not count a pending stage receipt, another subject, or a small legacy receipt',()=>{
  expect(counts(receipts(receipt({rewardPolicy:'ramp-v1',rewardStatus:'pending'})))).toBe(false);
  expect(counts(receipts(receipt({rewardPolicy:'ramp-v1',rewardStatus:'earned',subject:'영어'})))).toBe(false);
  expect(counts(receipts(receipt({})))).toBe(false);
 });
 it('counts 500 written units on a linked subject',()=>expect(counts(receipts(receipt({units:500})))).toBe(true));
 const wordsData=(complete:string[]):RoutineData=>({...emptyData(),decks:[{id:'d',name:'N2',active:true},{id:'e',name:'영어',active:true}],
  words:['a','b','c','d','e'].map(id=>({id,deckId:'d'})).concat([{id:'x',deckId:'e'}]) as unknown as RoutineData['words'],
  days:{[today]:{...emptyDay(),plan:{ids:['a','b','c','d','e','x'],reviewIds:['a','b','c','d','e','x'],newLimit:0},complete}}});
 const deckGoal=goal({links:{subjects:[],deckIds:['d']}});
 it('counts a linked deck at its daily minimum only',()=>{
  expect(counts(wordsData(['a','b','c','d','e']),deckGoal)).toBe(true);
  expect(counts(wordsData(['a','b']),deckGoal)).toBe(false);
  expect(counts(wordsData(['x']),deckGoal)).toBe(false);
 });
 it('does not count old word days that have only paid amounts',()=>{
  const data:RoutineData={...emptyData(),decks:[{id:'d',name:'N2',active:true}],days:{[today]:{...emptyDay(),paid:{morning:0,words:20,gym:0}}}};
  expect(counts(data,deckGoal)).toBe(false);
 });
 it('does not count morning or gym',()=>expect(counts({...emptyData(),days:{[today]:{...emptyDay(),paid:{morning:10,words:0,gym:30}}}})).toBe(false));
 it('does not count days before the goal was set',()=>expect(counts(plan(emptyData(),[task({completedAt:at})],'2026-11-03'),goal(),'2026-11-03')).toBe(false));
 it('counts earlier records of a subject linked later',()=>{
  const data=plan(withGoals(goal({links:{subjects:[],deckIds:[]}})),[task({completedAt:at})]);
  const linked=setGoalLinks(data,'g1',{subjects:['일본어'],deckIds:[]},new Date('2026-11-06T09:00:00+09:00')).goals![0];
  expect(counts(data,linked)).toBe(true);
 });
 it('keeps two goals separate',()=>{
  const data=plan(emptyData(),[task({completedAt:at})]);
  expect(goalWeek(data,goal(),today).count).toBe(1);
  expect(goalWeek(data,goal({id:'g2',links:{subjects:['영어'],deckIds:[]}}),today).count).toBe(0);
 });
});

describe('week and totals',()=>{
 const g=goal({createdAt:'2026-10-20T01:00:00.000Z'});
 const done=(...keys:string[])=>({...emptyData(),priorityDays:Object.fromEntries(keys.map(key=>[key,{day:key,createdAt:at,updatedAt:at,tasks:[task({completedAt:at})]}]))}) as RoutineData;
 it('runs Monday to Sunday and counts up to today',()=>{
  const week=goalWeek(done('2026-11-01','2026-11-02','2026-11-04','2026-11-05'),g,today);
  expect(week.days.map(d=>d.key)[0]).toBe('2026-11-02');
  expect(week.days.map(d=>d.label)).toEqual(['월','화','수','목','금','토','일']);
  expect(week.days.filter(d=>d.counted).map(d=>d.key)).toEqual(['2026-11-02','2026-11-04']);
  expect(week.target).toBe(3);
 });
 it('totals across weeks from the start day',()=>{
  expect(goalTotals(done('2026-10-19','2026-10-20','2026-11-02','2026-11-04','2026-11-05'),g,today)).toEqual({startedOn:'2026-10-20',studiedDays:3});
 });
 it('uses the 4am boundary for the start day',()=>{
  expect(goalTotals(emptyData(),goal({createdAt:'2026-11-04T17:00:00.000Z'}),'2026-11-05').startedOn).toBe('2026-11-04');
 });
 it('returns zero when the start day is after today',()=>expect(goalTotals(done(today),goal(),'2026-11-01').studiedDays).toBe(0));
});

describe('next step',()=>{
 const ms=now.getTime(),started=at,finished=new Date(ms+1000).toISOString(),doneTask=(over:Partial<PriorityTask>={})=>task({startedAt:started,baseline:0,completedAt:finished,...over});
 it('asks to link when nothing is linked',()=>expect(goalNextStep(plan(emptyData(),[task()]),goal({links:{subjects:[],deckIds:[]}}),today,ms)).toEqual({kind:'link'}));
 it('asks for a plan when today has no task for this goal',()=>{
  expect(goalNextStep(emptyData(),goal(),today,ms)).toEqual({kind:'plan'});
  expect(goalNextStep(plan(emptyData(),[task({subject:'영어'})]),goal(),today,ms)).toEqual({kind:'plan'});
 });
 it('shows only tasks of linked subjects, started first',()=>{
  const data=plan(emptyData(),[task({id:'a',subject:'영어'}),task({id:'b',action:'b행동'}),task({id:'c',subject:'일본어2',action:'c행동',startedAt:started,baseline:0})]);
  expect(goalNextStep(data,goal(),today,ms)).toEqual({kind:'task',subject:'일본어',action:'b행동'});
  expect(goalNextStep(data,goal({links:{subjects:['일본어','일본어2'],deckIds:[]}}),today,ms)).toMatchObject({action:'c행동'});
 });
 it('finishes when linked tasks are complete even if another subject is open',()=>{
  expect(goalNextStep(plan(emptyData(),[doneTask(),task({id:'x',subject:'영어'})]),goal(),today,ms)).toEqual({kind:'done'});
 });
 it('sends a deck-only goal to the study tab',()=>{
  const data={...emptyData(),decks:[{id:'d',name:'N2',active:true}]};
  expect(goalNextStep(data,goal({links:{subjects:[],deckIds:['d']}}),today,ms)).toEqual({kind:'words'});
 });
 it('asks to link again when the only linked deck is gone, without throwing',()=>{
  expect(goalNextStep(emptyData(),goal({links:{subjects:[],deckIds:['gone']}}),today,ms)).toEqual({kind:'link'});
 });
 it('does not change data',()=>{
  const data=plan(withGoals(goal()),[task()]),before=JSON.stringify(data);
  goalNextStep(data,goal(),today,ms);goalWeek(data,goal(),today);goalTotals(data,goal(),today);goalLinkOptions(data,'g1');
  expect(JSON.stringify(data)).toBe(before);
 });
});

describe('link options and broken links',()=>{
 const data=plan({...withGoals(goal(),goal({id:'g2',title:'둘째',links:{subjects:[],deckIds:['d']}})),decks:[{id:'d',name:'N2',active:true},{id:'e',name:'E',active:true}]},[task({subject:'전기기사 실기'})]);
 it('offers default and recorded subjects with exact text',()=>{
  expect(knownSubjects(data)).toEqual(expect.arrayContaining(['전기공사기사 실기','전기기사 실기','일본어','영어']));
 });
 it('marks items linked to another active goal',()=>{
  const options=goalLinkOptions(data,'g2');
  expect(options.subjects.find(o=>o.subject==='일본어')!.takenBy).toBe('일본어 목표');
  expect(options.subjects.find(o=>o.subject==='영어')!.takenBy).toBeUndefined();
  expect(goalLinkOptions(data,'g1').decks).toEqual([{id:'d',name:'N2',takenBy:'둘째'},{id:'e',name:'E',takenBy:undefined}]);
 });
 it('reports a removed deck and a renamed subject, keeps them selectable, and does not count them',()=>{
  const g=goal({links:{subjects:['옛날 과목','일본어'],deckIds:['gone','d']}});
  expect(goalBrokenLinks(data,g)).toEqual({subjects:['옛날 과목'],deckIds:['gone']});
  expect(goalLinkOptions({...data,goals:[g]},'g1').subjects.map(o=>o.subject)).toContain('옛날 과목');
  expect(()=>goalWeek(data,g,today)).not.toThrow();
 });
 it('reports nothing for healthy links',()=>expect(goalBrokenLinks(data,goal())).toEqual({subjects:[],deckIds:[]}));
});
