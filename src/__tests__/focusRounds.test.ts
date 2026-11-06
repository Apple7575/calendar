import {earned,emptyData,getDay,routineDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {claimFocusPlan,focusRampStatus,focusRoundProgress,focusRunCredit} from '../lib/focusRamp';
import {acceptHandwriting,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {finishFocusRun,skipBookBreak,startBookTimer,stopBookTimer,takeEarnedBreak} from '../lib/bookStudy';
import {focusBreakPayouts} from '../lib/focusBreakReward';
import {PROPOSED_MONEY_RATES,moneySummary,reconcileMoneyRewards,startMoneyRewards,validateMoneyState} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,user='00000000-0000-4000-8000-000000000000';
const key=routineDay(new Date(at));
const text=(n:number)=>Array.from({length:n},(_,i)=>String.fromCharCode('가'.charCodeAt(0)+i)).join('');
const analysis=(n=100)=>({lines:[text(n)],languages:['ko' as const],quality:'readable' as const,message:''});
const hash=(id:string)=>id.charCodeAt(id.length-1).toString(16).padStart(2,'0').repeat(32);
const planned=(when=at)=>claimFocusPlan(startMoneyRewards(emptyData(),routineDay(new Date(when)),'w',PROPOSED_MONEY_RATES,new Date(when)),'plan',subject,'기출 1번',when);
const valid=(d:RoutineData)=>{validateHandwritingState(d);validateMoneyState(d);validateBackup(makeBackup(d,user),user);};
const level=(d:RoutineData,s:number)=>focusRampStatus(d,s).level;
let ids=0;
/** Studies the current stage exactly and rests, then comes straight back. Returns the data and the clock. */
function restStage(d:RoutineData,s:number):[RoutineData,number]{
 const need=focusRampStatus(d,s).required,t=d.bookTimer;
 const running=t?.phase==='focus'?d:startBookTimer(d,'run'+(++ids),subject,s,need,'output');
 const end=s+need*sec-(running.bookTimer!.carrySeconds??0)*sec;
 const rested=takeEarnedBreak(running,end);
 expect(rested.bookTimer?.phase).toBe('break');
 return [skipBookBreak(rested,rested.bookTimer!.id,'back'+(++ids),end+sec),end+sec];
}
/** A whole round by rests: stages 1 to 5. */
function round(d:RoutineData,s:number):[RoutineData,number]{
 let next=d,clock=s;
 for(let i=0;i<5;i++)[next,clock]=restStage(next,clock);
 return [next,clock];
}

describe('rounds: the stages start over (user decision 2026-11-06, A안)',()=>{
 test('after the 25-minute stage is paid by a rest, the next stage is the 2-minute one again',()=>{
  const [d,s]=round(planned(),at);
  expect(focusBreakPayouts(d).map(p=>p.stage)).toEqual([1,2,3,4,5]);
  expect(level(d,s)).toBe(1);
  valid(d);
 });
 test('two rounds in a row pay the five stages twice, and the plan once',()=>{
  const [one,s]=round(planned(),at),[two]=round(one,s);
  expect(focusBreakPayouts(two).map(p=>p.stage)).toEqual([1,2,3,4,5,1,2,3,4,5]);
  expect(focusBreakPayouts(two).map(p=>p.planMinutes)).toEqual([1,0,0,0,0,0,0,0,0,0]);
  valid(two);
 });
 test('a rest in the middle of a round does not start it over',()=>{
  const [d,s]=restStage(planned(),at),[e,s2]=restStage(d,s);
  expect(level(d,s)).toBe(2);expect(level(e,s2)).toBe(3);
 });
 test('the 25-minute photo, then 계속 공부, starts the next round at 2 minutes',()=>{
  let [d,s]=[planned(),at];
  for(let i=0;i<4;i++)[d,s]=restStage(d,s);
  const need=focusRampStatus(d,s).required,end=s+need*sec;
  const photo=reconcileMoneyRewards(d,settleHandwritingRewards(acceptHandwriting(d,'p25',hash('p25'),subject,analysis(),new Date(end)),end),routineDay(new Date(end)),new Date(end));
  expect(photo.handwritingReceipts![0]).toMatchObject({focusStage:5});
  expect(photo.bookTimer?.awaitingChoice).toBe(true);
  expect(level(photo,end+sec)).toBe(1);
  const again=startBookTimer(photo,'again',subject,end+sec,focusRampStatus(photo,end+sec).required,'output');
  expect(again.bookTimer?.duration).toBe(120);
  valid(again);
 });
 test('finishing a run starts the next study at 2 minutes',()=>{
  const [d,s]=restStage(planned(),at),[e,s2]=restStage(d,s);
  const ended=finishFocusRun(e,s2+10*sec);
  expect(level(ended,s2+20*sec)).toBe(1);
  valid(ended);
 });
 test('the same study time is never paid twice: a new round needs new study',()=>{
  const [d,s]=round(planned(),at);
  const fresh=d;
  expect(focusRampStatus(fresh,s).required).toBe(120);
  expect(takeEarnedBreak(fresh,s+60*sec)).toBe(fresh);
  expect(takeEarnedBreak(fresh,s+120*sec).bookTimer?.phase).toBe('break');
 });
 test('within one round the same stage is never paid twice',()=>{
  const [d,s]=restStage(planned(),at);
  const resumed=d.bookTimer?.phase==='focus'?d:startBookTimer(d,'r',subject,s,focusRampStatus(d,s).required,'output');
  expect(takeEarnedBreak(resumed,s+10*sec)).toBe(resumed);
  expect(focusBreakPayouts(resumed).filter(p=>p.stage===1)).toHaveLength(1);
 });
 test('04:00 in the middle of a round: each stage lands on the day it was paid, the round goes on',()=>{
  const late=new Date(2026,10,2,3,55).getTime();
  const [d,s]=restStage(planned(late),late),[e]=restStage(d,s);
  const days=focusBreakPayouts(e).map(p=>p.day);
  expect(days).toEqual(['2026-11-01','2026-11-02']);
  expect(earned(getDay(e,'2026-11-01'))+earned(getDay(e,'2026-11-02'))).toBeGreaterThan(0);
  valid(e);
 });
});

describe('saved data',()=>{
 test('a ramp saved before rounds (no round) still loads and climbs as before',()=>{
  const [d,s]=restStage(planned(),at),{round:_none,...old}=d.focusRamp!;
  const legacy={...d,focusRamp:old,focusBreakPayouts:focusBreakPayouts(d).map(({round:_r,...p})=>p)} as RoutineData;
  valid(legacy);
  expect(level(legacy,s)).toBe(2);
  const [next]=restStage(legacy,s);
  valid(next);
 });
 test('a tampered level fails the load check',()=>{
  const [d]=restStage(planned(),at);
  expect(()=>validateHandwritingState({...d,focusRamp:{...d.focusRamp!,level:4}})).toThrow();
 });
 test('a tampered round on a payout fails the load check',()=>{
  const [d]=restStage(planned(),at);
  expect(()=>validateHandwritingState({...d,focusBreakPayouts:focusBreakPayouts(d).map(p=>({...p,round:'other'}))})).toThrow();
 });
});

describe('money for a round follows the money table',()=>{
 test('every stage adds its money at 100원 a unit, plus the plan once',()=>{
  const [d]=round(planned(),at);
  const units=focusBreakPayouts(d).reduce((n,p)=>n+p.moneyMinutes+p.planMinutes,0);
  expect(moneySummary(d).balance).toBe(units*100);
 });
});

describe('what a round pays (A안 numbers)',()=>{
 const timeOf=(d:RoutineData)=>Object.keys(d.days).reduce((n,k)=>n+earned(getDay(d,k)),0);
 test('one round by rests: 1·1·2·2·4 = 10 minutes and 1·1·2·4·7 = 15 units (1,500원), plus the plan once',()=>{
  const [d]=round(planned(),at);
  expect(focusBreakPayouts(d).map(p=>p.stageMinutes)).toEqual([1,1,2,2,4]);
  expect(focusBreakPayouts(d).map(p=>p.moneyMinutes)).toEqual([1,1,2,4,7]);
  expect(timeOf(d)).toBe(10+1);
  expect(moneySummary(d).balance).toBe(1500+100);
 });
 test('a round is 25 minutes of study: the stages close at 2, 5, 10, 15 and 25 minutes',()=>{
  let [d,s]=[planned(),at];const ends:number[]=[];
  for(let i=0;i<5;i++){[d,s]=restStage(d,s);ends.push(focusBreakPayouts(d).reduce((n,p)=>n+p.seconds,0)/60);}
  expect(ends).toEqual([2,5,10,15,25]);
 });
 test('skipping the rests loses nothing: one rest at 25 minutes pays all five stages',()=>{
  const d=startBookTimer(planned(),'long',subject,at,120,'output'),paid=takeEarnedBreak(d,at+1500*sec);
  expect(focusBreakPayouts(paid)).toEqual([expect.objectContaining({fromStage:1,stage:5,seconds:1500,stageMinutes:10,moneyMinutes:15,planMinutes:1})]);
  expect(level(paid,at+1501*sec)).toBe(1);
  valid(paid);
 });
 test('skipping one rest: a rest at 10 minutes pays the 2-, 5- and 10-minute stages together',()=>{
  const d=startBookTimer(planned(),'long',subject,at,120,'output'),paid=takeEarnedBreak(d,at+600*sec);
  expect(focusBreakPayouts(paid)[0]).toMatchObject({fromStage:1,stage:3,stageMinutes:4,moneyMinutes:4});
  expect(level(paid,at+601*sec)).toBe(4);
 });
 test('about two hours a day: four rounds pay 40 minutes and 6,000원, plus the plan once',()=>{
  let [d,s]=[planned(),at];
  for(let i=0;i<4;i++)[d,s]=round(d,s);
  expect(timeOf(d)).toBe(40+1);
  expect(moneySummary(d).balance).toBe(6000+100);
  valid(d);
 });
});

describe('leaving and starting again (build 52: a new start is always 0, a rest return is the only carry-on)',()=>{
 const credit=(d:RoutineData,s:number)=>focusRoundProgress(d,focusRunCredit(d,s),s);
 const fresh=(d:RoutineData,s:number,id='new')=>startBookTimer(d,id,subject,s,focusRampStatus(d,s).required,'output');
 test('공부 마치기 after 4 minutes: the met 2-minute stage is paid at finish, and the next start is 00:00 at the 2-minute stage',()=>{
  const d=startBookTimer(planned(),'run',subject,at,120,'output');
  const ended=finishFocusRun(d,at+240*sec);
  expect(focusBreakPayouts(ended).map(p=>[p.fromStage,p.stage])).toEqual([[1,1]]);
  const next=fresh(ended,at+300*sec);
  expect(next.bookTimer).toMatchObject({duration:120,remaining:120});
  expect(next.bookTimer?.carrySeconds).toBeUndefined();
  expect(credit(next,at+300*sec)).toEqual({studied:0,required:120});
  valid(next);
 });
 test('7 minutes then a new start: stages 2 and 5 are paid, the 2 minutes past them are dropped, the study time stays on record',()=>{
  const d=stopBookTimer(startBookTimer(planned(),'run',subject,at,120,'output'),at+420*sec);
  const next=fresh(d,at+500*sec);
  expect(focusBreakPayouts(next).map(p=>[p.fromStage,p.stage,p.seconds])).toEqual([[1,2,300]]);
  expect(credit(next,at+500*sec).studied).toBe(0);
  expect(next.bookSessions!.find(s=>s.id==='run')?.seconds).toBe(420);
  valid(next);
 });
 test('the device state that showed 06:00: 6 unpaid minutes are settled on the next start, which begins at 00:00',()=>{
  const d=stopBookTimer(startBookTimer(planned(),'run',subject,at,120,'output'),at+360*sec);
  const next=fresh(d,at+400*sec);
  expect(focusBreakPayouts(next)[0]).toMatchObject({fromStage:1,stage:2});
  expect(credit(next,at+400*sec)).toEqual({studied:0,required:120});
 });
 test('a stage not met: finishing still charges as before, nothing is paid, and the next start is 0',()=>{
  const d=startBookTimer(planned(),'run',subject,at,120,'output');
  const ended=finishFocusRun(d,at+90*sec);
  expect(ended.focusPenalties?.length).toBe(1);
  expect(focusBreakPayouts(ended)).toEqual([]);
  expect(credit(fresh(ended,at+100*sec),at+100*sec).studied).toBe(0);
 });
 test('a rest return carries on the round and its surplus, as before',()=>{
  const [d,s]=restStage(planned(),at);
  expect(level(d,s)).toBe(2);
  expect(credit(d,s).studied).toBe(120);
 });
 test('계속 공부 after the 25-minute photo starts a new round with nothing carried',()=>{
  let [d,s]=[planned(),at];
  for(let i=0;i<4;i++)[d,s]=restStage(d,s);
  const end=s+(focusRampStatus(d,s).required+30)*sec;
  const photo=settleHandwritingRewards(acceptHandwriting(d,'p25',hash('p25'),subject,analysis(),new Date(end)),end);
  const again=fresh(photo,end+sec);
  expect(again.bookTimer?.carrySeconds).toBeUndefined();
  expect(credit(again,end+sec)).toEqual({studied:0,required:120});
 });
 test('a cycle saved before rounds: the next start settles it the old way and moves to rounds',()=>{
  const base=startBookTimer(planned(),'run',subject,at,120,'output'),{round:_r,...old}=base.focusRamp!;
  const legacy=stopBookTimer({...base,focusRamp:old} as RoutineData,at+400*sec);
  const next=fresh(legacy,at+500*sec);
  expect(focusBreakPayouts(next)[0]).toMatchObject({stage:2,seconds:300});
  expect(next.focusRamp?.round).toBeDefined();
  expect(credit(next,at+500*sec)).toEqual({studied:0,required:120});
  valid(next);
 });
});
