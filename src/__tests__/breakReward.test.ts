import {earned,emptyData,getDay,routineDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {claimFocusPlan,focusRampStatus,focusPlanMinutesDue} from '../lib/focusRamp';
import {acceptHandwriting,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {skipBookBreak,startBookTimer,takeEarnedBreak} from '../lib/bookStudy';
import {focusBreakPayouts} from '../lib/focusBreakReward';
import {canDeclareFinish,canTakeHandwritingPhoto} from '../lib/focusFlow';
import {rewardSyncExtras} from '../lib/focusPenalty';
import {PROPOSED_MONEY_RATES,moneySummary,reconcileMoneyRewards,startMoneyRewards,validateMoneyState} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,key=routineDay(new Date(at)),user='00000000-0000-4000-8000-000000000000';
const text=(n:number,seed='가')=>Array.from({length:n},(_,i)=>String.fromCharCode(seed.charCodeAt(0)+i)).join('');
const analysis=(chars=50,seed='가')=>({lines:[text(chars,seed)],languages:['ko' as const],quality:'readable' as const,message:''});
const hash=(id:string)=>id.charCodeAt(id.length-1).toString(16).padStart(2,'0').repeat(32);
const planned=(money=true,when=at)=>claimFocusPlan(money?startMoneyRewards(emptyData(),routineDay(new Date(when)),'w',PROPOSED_MONEY_RATES,new Date(when)):emptyData(),'plan',subject,'기출 1번',when);
const running=(money=true,when=at)=>startBookTimer(planned(money,when),'run',subject,when,120,'output');
const photo=(d:RoutineData,seconds:number,id='p1',chars=50,seed='가')=>{const when=at+seconds*sec;return reconcileMoneyRewards(d,settleHandwritingRewards(acceptHandwriting(d,id,hash(id),subject,analysis(chars,seed),new Date(when)),when),routineDay(new Date(when)),new Date(when));};
const rest=(d:RoutineData,seconds:number)=>takeEarnedBreak(d,at+seconds*sec);
const back=(d:RoutineData,seconds:number,id='run2')=>skipBookBreak(d,d.bookTimer!.id,id,at+seconds*sec);
const time=(d:RoutineData,k=key)=>earned(getDay(d,k));
const valid=(d:RoutineData)=>{validateHandwritingState(d);validateMoneyState(d);validateBackup(makeBackup(d,user),user);};

describe('a rest pays the stage it closes, without a photo',()=>{
 test('2 minutes then 휴식: 1 minute and 100원 for the stage, plus the plan minute and 100원',()=>{
  const d=rest(running(),120);
  expect(d.bookTimer?.phase).toBe('break');
  expect(time(d)).toBe(2);
  expect(moneySummary(d).balance).toBe(200);
  expect(focusBreakPayouts(d)).toEqual([expect.objectContaining({stage:1,seconds:120,stageMinutes:1,planMinutes:1,moneyMinutes:1,day:key})]);
  expect(focusRampStatus(d,at+121*sec).level).toBe(2);
  valid(d);
 });
 test('no rest, no pay: before the stage is met the button does nothing',()=>{
  const d=running();
  expect(rest(d,100)).toBe(d);
 });
 test('without the money wallet only the minutes',()=>{
  const d=rest(running(false),120);
  expect(time(d)).toBe(2);expect(d.money).toBeUndefined();
  valid(d);
 });
 test('money follows the older money table: the 25-minute stage pays 15 minutes of money, 10 of time',()=>{
  let d=startBookTimer(planned(),'run',subject,at,1500,'output');
  d={...d,focusRamp:{...d.focusRamp!,level:5}};
  const paid=rest(d,1500);
  expect(focusBreakPayouts(paid)[0]).toMatchObject({stage:5,stageMinutes:10,moneyMinutes:15,planMinutes:1});
  expect(time(paid)).toBe(11);
  expect(moneySummary(paid).balance).toBe(1600);
 });
 test('studying past a stage before resting pays the highest stage reached, like a photo',()=>{
  const d=rest(running(),420);
  expect(focusBreakPayouts(d)[0]).toMatchObject({stage:2,seconds:300,stageMinutes:2,moneyMinutes:2});
  expect(time(d)).toBe(3);
 });
});

describe('the plan minute',()=>{
 test('is paid once, with the first stage, not when the plan is written',()=>{
  expect(time(planned())).toBe(0);
  expect(moneySummary(planned()).balance).toBe(0);
  let d=rest(running(),120);
  expect(focusPlanMinutesDue(d)).toBe(0);
  d=rest(back(d,180),480);
  expect(focusBreakPayouts(d).map(p=>p.planMinutes)).toEqual([1,0]);
  expect(time(d)).toBe(1+1+2);
 });
 test('a photo after a rest never pays the plan again',()=>{
  const d=photo(back(rest(running(),120),180),480);
  const r=d.handwritingReceipts!.find(x=>x.id==='p1')!;
  expect(r.planMinutes).toBe(0);
  valid(d);
 });
});

describe('a photo after a rest pays only what is new',()=>{
 test('photo right after the rest: letters only, the stage waits for the next stage time',()=>{
  const d=photo(back(rest(running(),120),180),190,'p1',100);
  const r=d.handwritingReceipts!.find(x=>x.id==='p1')!;
  expect(r.rewardStatus).toBe('pending');
  expect(time(d)).toBe(2);
 });
 test('photo once the next stage is met: that stage and the letters, never the 2-minute stage again',()=>{
  const d=photo(back(rest(running(),120),180),480,'p1',100);
  const r=d.handwritingReceipts!.find(x=>x.id==='p1')!;
  expect(r).toMatchObject({rewardStatus:'earned',focusStage:2,stageMinutes:2,planMinutes:0,letterMinutes:5});
  expect(time(d)).toBe(2+2+5);
  expect(moneySummary(d).balance).toBe(200+200+500);
  valid(d);
 });
 test('the same stage is never paid twice: a photo at the moment of the rest finds nothing left',()=>{
  const d=rest(running(),120);
  const after=photo(d,121,'p1',50);
  expect(after.handwritingReceipts!.find(x=>x.id==='p1')!.rewardStatus).toBe('pending');
  expect(time(after)).toBe(2);
 });
 test('a photo first, then 휴식: the rest pays nothing more for that stage',()=>{
  const d=photo(running(),120,'p1');
  expect(time(d)).toBe(2);
  const resumed=startBookTimer(d,'next',subject,at+130*sec,focusRampStatus(d,at+130*sec).required,'output');
  expect(rest(resumed,140)).toBe(resumed);
 });
});

describe('rules that stay',()=>{
 test('after a rest the next stage must be met before another rest',()=>{
  const d=back(rest(running(),120),180);
  expect(rest(d,300)).toBe(d);
  const again=rest(d,480);
  expect(again.bookTimer?.phase).toBe('break');
  expect(focusBreakPayouts(again).map(p=>p.stage)).toEqual([1,2]);
 });
 test('the minutes reach the phone with the photo minutes on the handwriting key',()=>{
  const d=photo(back(rest(running(),120),180),480,'p1',100);
  expect(rewardSyncExtras(d,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true})).toMatchObject({handwriting:9});
 });
 test('a rest after 04:00 pays the new day',()=>{
  const late=new Date(2026,10,2,3,59).getTime();
  const d=takeEarnedBreak(startBookTimer(planned(true,late),'run',subject,late,120,'output'),late+120*sec);
  const day=routineDay(new Date(late+120*sec));
  expect(day).toBe('2026-11-02');
  expect(time(d,day)).toBe(2);
  expect(time(d,'2026-11-01')).toBe(0);
  valid(d);
 });
});

describe('saved values',()=>{
 test('a tampered break payout fails the same load check as a tampered photo',()=>{
  const d=rest(running(),120),rows=focusBreakPayouts(d);
  expect(()=>validateHandwritingState({...d,focusBreakPayouts:[{...rows[0],stageMinutes:9}]} as RoutineData)).toThrow();
  expect(()=>validateHandwritingState({...d,days:{...d.days,[key]:{...getDay(d,key),bonus:{...getDay(d,key).bonus,focusBreak:50}}}})).toThrow();
 });
});

describe('photos only at the 25-minute stage or when finishing early (user decision 2026-11-06)',()=>{
 const at25=(seconds:number)=>{let d=startBookTimer(planned(),'run',subject,at,1500,'output');d={...d,focusRamp:{...d.focusRamp!,level:5}};return d};
 test('the stages in between take no photo: the rest button pays them',()=>{
  expect(canTakeHandwritingPhoto(running(),at+120*sec)).toBe(false);
  expect(canTakeHandwritingPhoto(running(),at+600*sec)).toBe(false);
 });
 test('the 25-minute stage takes the photo once met',()=>{
  expect(canTakeHandwritingPhoto(at25(0),at+1499*sec)).toBe(false);
  expect(canTakeHandwritingPhoto(at25(0),at+1500*sec)).toBe(true);
 });
 test('finishing early offers the photo at any stage before 25 minutes, met or not',()=>{
  expect(canDeclareFinish(running(),at+60*sec)).toBe(true);
  expect(canDeclareFinish(running(),at+180*sec)).toBe(true);
  expect(canDeclareFinish(running(),at)).toBe(false);
 });
 test('finishing early after passing stages pays the highest unpaid stage reached, the plan and the letters',()=>{
  const when=at+420*sec,d=acceptHandwriting(running(),'p1',hash('p1'),subject,analysis(100),new Date(when),'ramp-v2',true);
  expect(d.handwritingReceipts![0]).toMatchObject({focusStage:2,stageMinutes:2,planMinutes:1,letterMinutes:5,finish:'timer'});
  valid(d);
 });
 test('finishing early after a rest pays only what the rest did not',()=>{
  const d=back(rest(running(),120),180),when=at+300*sec,done=acceptHandwriting(d,'p1',hash('p1'),subject,analysis(100),new Date(when),'ramp-v2',true);
  const r=done.handwritingReceipts![0];
  expect(r).toMatchObject({focusStage:2,planMinutes:0,letterMinutes:5,finish:'declared'});
  expect(r.stageMinutes).toBe(Math.floor(2*120/300));
  valid(done);
 });
});
