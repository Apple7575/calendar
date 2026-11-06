import {emptyData,earned,getDay,routineDay,withDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {moneySummary,PROPOSED_MONEY_RATES,startMoneyRewards} from '../lib/moneyRewards';
import {penaltyMinutesOnDay,rewardSyncExtras} from '../lib/focusPenalty';
import {dailyTimeline} from '../lib/dailyTimeline';
import {
 activeWeeklyRules,COMMITMENT_POLICY,dayPromise,placeWeeklyStake,reconcileCommitments,saveWeeklyReview,setTomorrowPromise,
 studyDayKeys,weekKeyOf,weeklyInterest,weeklyStake,
} from '../lib/commitments';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const min=60000;
// 2026-11-09 is a Monday.
const t=(d:number,h:number,m=0)=>new Date(2026,10,d,h,m).getTime();
const MON='2026-11-09',key=(d:number)=>`2026-11-${String(d).padStart(2,'0')}`;
const wallet=(won=0,d:RoutineData=emptyData())=>{
 let w=startMoneyRewards(d,MON,'w',PROPOSED_MONEY_RATES,new Date(t(9,5)));
 if(won)w={...w,money:{...w.money!,entries:[...w.money!.entries,{id:'seed',kind:'adjustment',amount:won,at:new Date(t(9,5)).toISOString(),note:'seed'}]}};
 return w;
};
/** A day counted as studied: a non-photo focus record with a note, the same as the calendar's 집중 공부 완료. */
const studied=(d:RoutineData,day:number)=>({...d,bookSessions:[...(d.bookSessions??[]),{id:'s'+day,subject:'수능',startedAt:new Date(t(day,9)).toISOString(),completedAt:new Date(t(day,10)).toISOString(),seconds:3600,note:'기출',next:'',rewardMode:'standard' as const}]});
const consumed=(d:RoutineData,c:Record<string,number>):RoutineData=>({...d,playLog:{rows:[],coverage:[],consumed:{...(d.playLog?.consumed??{}),...c}}});
const earnOn=(d:RoutineData,k:string,minutes:number)=>withDay(d,k,day=>({...day,bonus:{...day.bonus,book:minutes}}));

describe('weeks',()=>{
 test.each([['2026-11-09',MON],['2026-11-11',MON],['2026-11-15',MON],['2026-11-16','2026-11-16'],['2026-11-08','2026-11-02']])('%s is in the week of %s',(day,week)=>{
  expect(weekKeyOf(day)).toBe(week);
 });
 test('a Monday before 04:00 still belongs to the week before',()=>{
  expect(weekKeyOf(routineDay(new Date(t(16,3,59))))).toBe(MON);
  expect(weekKeyOf(routineDay(new Date(t(16,4))))).toBe('2026-11-16');
 });
});

describe('studied days',()=>{
 test('only days the calendar counts as 집중 공부 완료, within the week',()=>{
  let d=emptyData();for(const day of [8,9,11,15,16])d=studied(d,day);
  expect(studyDayKeys(d,MON)).toEqual([key(9),key(11),key(15)]);
 });
 test('a session without a note is not a studied day',()=>{
  const d=studied(emptyData(),9);
  expect(studyDayKeys({...d,bookSessions:d.bookSessions!.map(s=>({...s,note:' '}))},MON)).toEqual([]);
 });
});

describe('weekly stake',()=>{
 test('placing takes the money now and remembers the target',()=>{
  const d=placeWeeklyStake(wallet(20000),MON,10000,t(9,8));
  expect(moneySummary(d).balance).toBe(10000);
  expect(weeklyStake(d,MON)).toMatchObject({weekKey:MON,canPlace:false,stake:{amount:10000,targetDays:5,studyDays:0,status:'open'}});
 });
 test('only the three amounts',()=>{
  expect(()=>placeWeeklyStake(wallet(50000),MON,7000 as never,t(9,8))).toThrow();
 });
 test('not enough money: cannot place, and the reason says so',()=>{
  const d=wallet(9999);
  expect(weeklyStake(d,MON,t(9,8))).toMatchObject({canPlace:true});
  expect(()=>placeWeeklyStake(d,MON,10000,t(9,8))).toThrow(/잔액/);
  expect(weeklyStake(wallet(4999),MON,t(9,8))).toMatchObject({canPlace:false,reason:expect.stringMatching(/잔액/)});
 });
 test('exactly enough money is enough',()=>{
  expect(moneySummary(placeWeeklyStake(wallet(5000),MON,5000,t(9,8))).balance).toBe(0);
 });
 test('without the money wallet it cannot be placed',()=>{
  expect(weeklyStake(emptyData(),MON,t(9,8))).toMatchObject({canPlace:false,reason:expect.stringMatching(/돈 보상/)});
 });
 test('only on that week\'s Monday',()=>{
  expect(weeklyStake(wallet(20000),key(10),t(10,8))).toMatchObject({canPlace:false,reason:expect.stringMatching(/월요일/)});
  expect(()=>placeWeeklyStake(wallet(20000),key(10),5000,t(10,8))).toThrow(/월요일/);
  // Sunday night after midnight is still Sunday.
  expect(()=>placeWeeklyStake(wallet(20000),MON,5000,t(9,3))).toThrow(/월요일/);
 });
 test('once a week, and the same call twice is harmless',()=>{
  const d=placeWeeklyStake(wallet(20000),MON,5000,t(9,8));
  expect(placeWeeklyStake(d,MON,5000,t(9,9))).toBe(d);
  expect(()=>placeWeeklyStake(d,MON,10000,t(9,9))).toThrow(/이미/);
 });
 const week=(days:number[],amount:5000|10000|20000=10000)=>{let d=placeWeeklyStake(wallet(20000),MON,amount,t(9,8));for(const day of days)d=studied(d,day);return d};
 test('five studied days win back the stake plus 10%, after the next Monday 04:00',()=>{
  const d=week([9,10,11,12,13]);
  expect(reconcileCommitments(d,t(16,3,59))).toBe(d);
  const done=reconcileCommitments(d,t(16,4));
  expect(weeklyStake(done,MON).stake).toMatchObject({status:'won',studyDays:5,payoutWon:11000});
  expect(moneySummary(done).balance).toBe(10000+11000);
  expect(reconcileCommitments(done,t(16,5))).toBe(done);
 });
 test('four studied days lose it',()=>{
  const done=reconcileCommitments(week([9,10,11,12]),t(16,4));
  expect(weeklyStake(done,MON).stake).toMatchObject({status:'lost',studyDays:4});
  expect(moneySummary(done).balance).toBe(10000);
 });
 test('10% is rounded down to the won',()=>{
  expect(weeklyStake(reconcileCommitments(week([9,10,11,12,13],5000),t(16,4)),MON).stake?.payoutWon).toBe(5500);
 });
 test('the target follows the rule chosen in an earlier week, fixed when placed',()=>{
  let d=saveWeeklyReview(wallet(20000),'2026-11-02',{kind:'stakeDays',value:4},t(2,9));
  d=placeWeeklyStake(d,MON,5000,t(9,8));
  d=saveWeeklyReview(d,MON,{kind:'stakeDays',value:6},t(9,9));
  for(const day of [9,10,11,12])d=studied(d,day);
  expect(weeklyStake(reconcileCommitments(d,t(16,4)),MON).stake).toMatchObject({targetDays:4,status:'won'});
 });
});

describe('weekly rules',()=>{
 test('defaults',()=>{
  expect(activeWeeklyRules(emptyData(),MON)).toEqual({stakeDays:5,morningWords:10,reflectTime:2030});
 });
 test('a rule applies from the next Monday, and the latest of each kind carries on',()=>{
  let d=saveWeeklyReview(emptyData(),'2026-11-02',{kind:'morningWords',value:15},t(2,9));
  d=saveWeeklyReview(d,MON,{kind:'reflectTime',value:2050},t(9,9));
  expect(activeWeeklyRules(d,key(8))).toEqual({stakeDays:5,morningWords:10,reflectTime:2030});
  expect(activeWeeklyRules(d,MON)).toEqual({stakeDays:5,morningWords:15,reflectTime:2030});
  expect(activeWeeklyRules(d,'2026-11-16')).toEqual({stakeDays:5,morningWords:15,reflectTime:2050});
 });
 test('a review is saved once; values outside the list are refused',()=>{
  const d=saveWeeklyReview(emptyData(),MON,undefined,t(9,9));
  expect(d.weeklyReviews?.[MON]?.doneAt).toBe(new Date(t(9,9)).toISOString());
  expect(saveWeeklyReview(d,MON,{kind:'stakeDays',value:6},t(9,10))).toBe(d);
  expect(()=>saveWeeklyReview(emptyData(),MON,{kind:'stakeDays',value:7},t(9,9))).toThrow();
  expect(()=>saveWeeklyReview(emptyData(),key(10),undefined,t(10,9))).toThrow();
 });
 test('broken saved reviews are ignored, never thrown',()=>{
  const d={...emptyData(),weeklyReviews:{[MON]:{doneAt:'x',rule:{kind:'stakeDays',value:99}},bad:null}} as unknown as RoutineData;
  expect(activeWeeklyRules(d,'2026-11-16')).toEqual({stakeDays:5,morningWords:10,reflectTime:2030});
 });
});

describe('tomorrow\'s promise',()=>{
 const promised=(d:RoutineData=wallet(0),startAt='09:00')=>setTomorrowPromise(d,MON,startAt,t(9,20,30));
 const startAt=(d:RoutineData,ms:number)=>({...d,bookTimer:{id:'run'+ms,subject:'수능',startedAt:new Date(ms).toISOString(),phase:'focus' as const,endsAt:ms+120000,remaining:120,running:true,rewardMode:'output' as const}});
 test('set tonight for tomorrow, and can be changed until tomorrow starts',()=>{
  const d=promised();
  expect(dayPromise(d,key(10))).toEqual({startAt:'09:00',status:'pending'});
  expect(dayPromise(setTomorrowPromise(d,MON,'10:30',t(9,23)),key(10)).startAt).toBe('10:30');
  expect(dayPromise(emptyData(),key(10))).toEqual({status:'none'});
 });
 test('only for the day after today',()=>{
  expect(()=>setTomorrowPromise(emptyData(),MON,'09:00',t(10,8))).toThrow();
 });
 test.each(['9:00','24:00','09:60','04:14','23:46',''])('%s is refused',v=>{
  expect(()=>promised(emptyData(),v)).toThrow();
 });
 test.each([[-15,'kept'],[15,'kept'],[0,'kept'],[-16,'missed'],[16,'missed']])('starting %i minutes from the time is %s',(offset,status)=>{
  const at=t(10,9)+(offset as number)*min;
  const d=reconcileCommitments(startAt(promised(),at),Math.max(at,t(10,9,15))+min);
  expect(dayPromise(d,key(10)).status).toBe(status);
 });
 test('kept: +10 minutes and 1,000원 that day, once',()=>{
  const d=reconcileCommitments(startAt(promised(),t(10,9,5)),t(10,9,6));
  expect(getDay(d,key(10)).bonus?.promise).toBe(10);
  expect(earned(getDay(d,key(10)))).toBe(10);
  expect(moneySummary(d).balance).toBe(1000);
  expect(reconcileCommitments(d,t(10,12))).toBe(d);
 });
 test('kept is seen from a resumed run and from a finished session too',()=>{
  const resumed={...startAt(promised(),t(10,7)),bookTimer:{...startAt(promised(),t(10,7)).bookTimer!,focusResumedAt:t(10,9,10)}};
  expect(dayPromise(reconcileCommitments(resumed,t(10,9,20)),key(10)).status).toBe('kept');
  expect(dayPromise(reconcileCommitments(studied(promised(),10),t(10,11)),key(10)).status).toBe('kept');
 });
 test('still waiting until the window has closed',()=>{
  const d=promised();
  expect(reconcileCommitments(d,t(10,9,15))).toBe(d);
  expect(dayPromise(d,key(10)).status).toBe('pending');
 });
 test('missed: −10 minutes and −1,000원 on the existing penalty path',()=>{
  const d=reconcileCommitments(promised(wallet(3000)),t(10,9,16));
  expect(dayPromise(d,key(10)).status).toBe('missed');
  expect(penaltyMinutesOnDay(d,key(10))).toBe(10);
  expect(moneySummary(d).balance).toBe(2000);
  expect(dailyTimeline(d,key(10),null,t(10,10)).totals).toMatchObject({penaltyMinutes:10,penaltyWon:1000});
  expect(reconcileCommitments(d,t(10,12))).toBe(d);
 });
 test('missed with an empty wallet goes no lower than the 6,000원 debt floor',()=>{
  let d=wallet(0);d={...d,money:{...d.money!,entries:[...d.money!.entries,{id:'o',kind:'expense',amount:-5500,at:new Date(t(9,9)).toISOString(),note:'x'}]}};
  expect(moneySummary(reconcileCommitments(promised(d),t(10,10))).balance).toBe(-6000);
 });
 test('without the money wallet only the minutes count',()=>{
  const d=reconcileCommitments(promised(emptyData()),t(10,10));
  expect(penaltyMinutesOnDay(d,key(10))).toBe(10);
  expect(d.money).toBeUndefined();
 });
 test('found late, the result lands on the day it was found so the phone hears it',()=>{
  const d=reconcileCommitments(promised(),t(11,8));
  expect(penaltyMinutesOnDay(d,key(10))).toBe(0);
  expect(penaltyMinutesOnDay(d,key(11))).toBe(10);
 });
 test('the kept minutes reach the phone on a 5-minute key it already accepts',()=>{
  const d=reconcileCommitments(startAt(promised(),t(10,9)),t(10,9,1));
  expect(rewardSyncExtras(d,key(10),{supportsHandwritingRewards:true,supportsMinuteHandwriting:true,supportsSpeakingRewards:true})).toMatchObject({speaking:10});
  const missed=reconcileCommitments(promised(),t(10,10));
  expect(rewardSyncExtras(missed,key(10),{supportsHandwritingRewards:true,supportsMinuteHandwriting:true})).toMatchObject({penalty:10});
 });
});

describe('interest on unused time',()=>{
 const base=()=>wallet(0);
 test('each full 10 minutes left at 04:00 pays 300원; money only',()=>{
  let d=consumed(earnOn(base(),MON,45),{[MON]:10});
  d=reconcileCommitments(d,t(10,4));
  expect(weeklyInterest(d,MON)).toEqual({won:900,capWon:5000,days:[{dayKey:MON,unusedMinutes:35,won:900,emergency:false}]});
  expect(moneySummary(d).balance).toBe(900);
  expect(earned(getDay(d,MON))).toBe(45);
  expect(reconcileCommitments(d,t(10,5))).toBe(d);
 });
 test('not before the day has closed',()=>{
  const d=consumed(earnOn(base(),MON,45),{[MON]:10});
  expect(reconcileCommitments(d,t(10,3,59))).toBe(d);
 });
 test('no interest on a day the phone did not report use for',()=>{
  const d=earnOn(base(),MON,45);
  expect(weeklyInterest(reconcileCommitments(d,t(10,5)),MON).days).toEqual([]);
 });
 test('a day with an emergency unlock pays 0',()=>{
  let d=consumed(earnOn(base(),MON,60),{[MON]:0});
  d={...d,emergencyUnlocks:[{id:'e',at:new Date(t(9,22)).toISOString(),day:MON,until:t(9,22,15),reason:'x',minutes:30,won:0,order:1}]};
  expect(weeklyInterest(reconcileCommitments(d,t(10,5)),MON).days).toEqual([{dayKey:MON,unusedMinutes:30,won:0,emergency:true}]);
 });
 test('penalties and carried debt are not unused time',()=>{
  let d=consumed(earnOn(earnOn(base(),'2026-11-08',0),MON,50),{'2026-11-08':20,[MON]:0});
  d={...d,focusPenalties:[{id:'p',timerId:'x',at:new Date(t(9,12)).toISOString(),day:MON,minutes:10,won:0}]};
  // Sunday used 20 with nothing earned, so 20 carried in; 50 − 10 − 20 = 20 left.
  expect(weeklyInterest(reconcileCommitments(d,t(10,5)),MON).days[0]).toMatchObject({unusedMinutes:20,won:600});
 });
 test('a week stops at 5,000원 and the next week starts again at Monday 04:00',()=>{
  let d:RoutineData={...base(),interestSince:'2026-11-01'};const c:Record<string,number>={};
  for(const day of [9,10,11,12,13,14,15,16]){d=earnOn(d,key(day),100);c[key(day)]=0}
  d=reconcileCommitments(consumed(d,c),t(17,5));
  expect(weeklyInterest(d,MON)).toMatchObject({won:5000});
  expect(weeklyInterest(d,MON).days.map(x=>x.won)).toEqual([3000,2000,0,0,0,0,0]);
  expect(weeklyInterest(d,'2026-11-16').won).toBe(3000);
  expect(moneySummary(d).balance).toBe(8000);
 });
 test('the first run pays back at most the day before, not weeks of old days',()=>{
  let d=base();const c:Record<string,number>={};
  for(const day of [9,10,11,12]){d=earnOn(d,key(day),30);c[key(day)]=0}
  d=reconcileCommitments(consumed(d,c),t(13,5));
  expect(d.interestSince).toBe(key(12));
  expect(weeklyInterest(d,MON).days.map(x=>x.dayKey)).toEqual([key(12)]);
 });
 test('without the money wallet the days are kept with 0원',()=>{
  const d=reconcileCommitments(consumed(earnOn(emptyData(),MON,45),{[MON]:0}),t(10,5));
  expect(weeklyInterest(d,MON)).toMatchObject({won:0,days:[{unusedMinutes:45,won:0}]});
 });
});

describe('saved values',()=>{
 test('broken commitment fields never throw and count as nothing',()=>{
  const d={...emptyData(),weeklyStakes:{[MON]:{amount:'x'}},dayPromises:{[key(10)]:7,x:null},interestDays:{[MON]:{won:-5}}} as unknown as RoutineData;
  expect(weeklyStake(d,MON,t(9,8)).stake).toBeUndefined();
  expect(dayPromise(d,key(10))).toEqual({status:'none'});
  expect(weeklyInterest(d,MON)).toEqual({won:0,capWon:5000,days:[]});
  expect(()=>reconcileCommitments(d,t(20,5))).not.toThrow();
  expect(penaltyMinutesOnDay(d,key(10))).toBe(0);
 });
 test('policy numbers live in one place',()=>{
  expect(COMMITMENT_POLICY).toMatchObject({stake:{amounts:[5000,10000,20000],bonusRate:0.1},promise:{windowMinutes:15,minutes:10,won:1000},interest:{perMinutes:10,won:300,weeklyCapWon:5000}});
 });
});
