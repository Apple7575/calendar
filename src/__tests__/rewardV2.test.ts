import {emptyData,getDay,routineDay,withDay} from '../lib/routineModel';
import {beginPriorityTask,savePriorityDay} from '../lib/priorityPlan';
import {claimFocusPlan,focusRampStatus,focusRunCredit,focusSecondsForSubject} from '../lib/focusRamp';
import {bookDisplaySeconds} from '../lib/bookTimerTime';
import {acceptHandwriting,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {acceptDeclaredFinish,finishFocusRun,pauseBookTimer,resumeBookTimer,saveBookNote,skipBookBreak,startBookBreak,startBookTimer,stopBookTimer} from '../lib/bookStudy';
import {canDeclareFinish,focusFlowStage} from '../lib/focusFlow';
import {focusLockUntil,focusQuitPenalty,penaltyMinutesOnDay,rewardSyncExtras} from '../lib/focusPenalty';
import {PROPOSED_MONEY_RATES,moneySummary,reconcileMoneyRewards,startMoneyRewards} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import type {RoutineData} from '../lib/routineModel';
jest.mock('../lib/supabase',()=>({supabase:{}}));
// This suite pins a cycle started before rounds (2026-11-06): its ramp has no round, so it keeps the old stage lengths and
// tables until it ends. Rounds themselves are covered in focusRounds.test.ts and breakReward.test.ts.
jest.mock('../lib/focusRamp',()=>{const actual=jest.requireActual('../lib/focusRamp');return {...actual,claimFocusPlan:(...args:unknown[])=>{const d=actual.claimFocusPlan(...args);if(!d?.focusRamp)return d;const {round:_round,...ramp}=d.focusRamp;return {...d,focusRamp:ramp};}};});
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,min=60000,user='00000000-0000-4000-8000-000000000000',key=routineDay(new Date(at));
const text=(n:number,seed='가')=>Array.from({length:n},(_,i)=>String.fromCharCode(seed.charCodeAt(0)+i)).join('');
const analysis=(chars=50,seed='가')=>({lines:[text(chars,seed)],languages:['ko' as const],quality:'readable' as const,message:''});
const hash=(id:string)=>id.charCodeAt(id.length-1).toString(16).padStart(2,'0').repeat(32);
const planned=(money=false)=>{const base=money?startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at)):emptyData();return claimFocusPlan(base,'plan',subject,'기출 1번',at);};
const running=(money=false)=>startBookTimer(planned(money),'run',subject,at,120,'output');
const photo=(d:RoutineData,seconds:number,id='p1',chars=50,seed='가')=>{const when=at+seconds*sec;return reconcileMoneyRewards(d,settleHandwritingRewards(acceptHandwriting(d,id,hash(id),subject,analysis(chars,seed),new Date(when)),when),key,new Date(when));};
const bonus=(d:RoutineData)=>getDay(d,key).bonus?.handwriting??0;
/** 계속 공부: the next stage at this moment, as the choice screen starts it. */
const keepGoing=(d:RoutineData,seconds:number,id='next')=>startBookTimer(d,id,subject,at+seconds*sec,focusRampStatus(d,at+seconds*sec).required,'output');

describe('stage table',()=>{
 test('a plan pays nothing until the first stage',()=>{
  const d=planned();
  expect(bonus(d)).toBe(0);
  expect(d.focusPlans![0].minutes).toBe(0);
  expect(()=>validateHandwritingState(d)).not.toThrow();
 });
 test.each([[120,2],[300,3],[420,3],[600,5],[900,7],[1020,7],[1500,11]])('%i seconds straight and one photo pays %i minutes with the plan',(seconds,minutes)=>{
  const d=photo(running(),seconds);
  expect(bonus(d)).toBe(minutes);
  expect(()=>validateHandwritingState(d)).not.toThrow();
 });
 test('7 minutes pays the 5-minute stage, carries 2 and moves on to the 10-minute stage',()=>{
  const d=photo(running(),420);
  expect(d.handwritingReceipts![0]).toMatchObject({rewardPolicy:'ramp-v2',focusStage:2,stageMinutes:2,planMinutes:1,letterMinutes:0,finish:'timer',minutes:3,focusSeconds:300});
  expect(d.focusRamp!.level).toBe(3);
  expect(d.bookTimer!.carrySeconds).toBe(120);
 });
 test('25 minutes moves straight to the 25-minute stage with nothing carried',()=>{
  const d=photo(running(),1500);
  expect(d.focusRamp!.level).toBe(5);
  expect(d.bookTimer!.carrySeconds).toBe(0);
 });
 test('50 minutes straight and one photo pays the 25-minute stage twice',()=>{
  const d=photo(running(),3000);
  expect(bonus(d)).toBe(21);
  expect(d.handwritingReceipts![0]).toMatchObject({focusStage:5,stageMinutes:20,focusSeconds:3000});
  expect(()=>validateHandwritingState(d)).not.toThrow();
 });
 test('five photos, one per stage, pay the whole table once: 24 minutes',()=>{
  let d=running(),clock=0;
  [120,300,600,900,1500].forEach((seconds,i)=>{clock+=seconds;d=keepGoing(photo(d,clock,'p'+(i+1),10,String.fromCharCode(0xAC00+i*200)),clock,'next'+i);});
  expect(bonus(d)).toBe(24);
  expect(()=>validateHandwritingState(d)).not.toThrow();
 });
 test('the plan minute is paid only once per plan',()=>{
  const first=photo(running(),120,'p1',10),second=photo(keepGoing(first,120),420,'p2',10,'나');
  expect(second.handwritingReceipts![1].planMinutes).toBe(0);
  expect(bonus(second)).toBe(4);
 });
});

describe('letters are a separate bonus',()=>{
 test('25 minutes and 300 new letters pay 11 plus 15',()=>{
  const d=photo(running(),1500,'p1',300);
  expect(bonus(d)).toBe(26);
  expect(d.handwritingReceipts![0]).toMatchObject({stageMinutes:10,planMinutes:1,letterMinutes:15,minutes:26});
  expect(()=>validateHandwritingState(d)).not.toThrow();
 });
 test('letter remainders carry into the next photo',()=>{
  const first=photo(running(),120,'p1',60),second=photo(keepGoing(first,120),420,'p2',60,'나');
  expect(first.handwritingReceipts![0].letterMinutes).toBe(0);
  expect(second.handwritingReceipts![1].letterMinutes).toBe(5);
 });
});

describe('money',()=>{
 test('stage minutes pay 100 won each and letters pay 500 per 100, once each',()=>{
  const d=photo(running(true),1500,'p1',300),entries=d.money!.entries;
  expect(entries.find(e=>e.id==='focus:p1')?.amount).toBe(1600);
  expect(moneySummary(d).balance).toBe(1600+1500);
 });
 test('settling the same photo again pays nothing more',()=>{
  const d=photo(running(true),1500);
  expect(moneySummary(reconcileMoneyRewards(d,settleHandwritingRewards(d,at+1500*sec),key)).balance).toBe(moneySummary(d).balance);
 });
 test('the order bonus pays 3,000 won once a day and an undo takes it back',()=>{
  const base=startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at));
  const paid=reconcileMoneyRewards(base,withDay(base,key,x=>({...x,bonus:{...x.bonus,order:60}})),key);
  expect(moneySummary(paid).balance).toBe(3000);
  expect(moneySummary(reconcileMoneyRewards(paid,paid,key)).balance).toBe(3000);
  const undone=reconcileMoneyRewards(paid,withDay(paid,key,x=>({...x,bonus:{...x.bonus,order:0}})),key);
  expect(moneySummary(undone).balance).toBe(0);
  const again=reconcileMoneyRewards(undone,withDay(undone,key,x=>({...x,bonus:{...x.bonus,order:60}})),key);
  expect(moneySummary(again).balance).toBe(3000);
 });
 test('free study pays 100 won per minute',()=>{
  const base=startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at));
  const session={id:'f',subject,startedAt:new Date(at).toISOString(),completedAt:new Date(at+1500*sec).toISOString(),seconds:1500,note:'',next:'',rewardMode:'free' as const};
  const before={...base,bookSessions:[session]},after=saveBookNote(before,'f','메모','');
  expect(moneySummary(reconcileMoneyRewards(before,after,key)).balance).toBe(500);
 });
 test('a wallet that is off gets no entries',()=>{
  expect(photo(running(),1500).money).toBeUndefined();
 });
 test('rewards earned before the wallet started are not paid later',()=>{
  const earned=photo(running(),1500),wallet=startMoneyRewards(earned,key,'w',PROPOSED_MONEY_RATES,new Date(at+1500*sec));
  expect(moneySummary(reconcileMoneyRewards(wallet,wallet,key)).balance).toBe(0);
 });
});

describe('declared finish',()=>{
 const finish=(d:RoutineData,seconds:number,id='p1',chars=120)=>{const when=at+seconds*sec;return reconcileMoneyRewards(d,acceptDeclaredFinish(d,id,hash(id),subject,analysis(chars),new Date(when)),key,new Date(when));};
 const atStage=(level:1|2|3|4|5,money=false)=>{const base=planned(money);return startBookTimer({...base,focusRamp:{...base.focusRamp!,level}},'run',subject,at,[0,120,300,600,900,1500][level],'output',true);};
 test('8 minutes of the 25-minute stage with 100 letters: 3 + 5',()=>{
  const d=finish(atStage(5),480);
  expect(d.handwritingReceipts![0]).toMatchObject({finish:'declared',stageMinutes:3,letterMinutes:5,focusSeconds:480});
 });
 test('8 of 10 minutes pays 3, 8 of 15 pays 3',()=>{
  expect(finish(atStage(3),480).handwritingReceipts![0].stageMinutes).toBe(3);
  expect(finish(atStage(4),480).handwritingReceipts![0].stageMinutes).toBe(3);
 });
 test('the plan minute is not reduced by the ratio',()=>{
  const d=finish(running(),60);
  expect(d.handwritingReceipts![0]).toMatchObject({stageMinutes:0,planMinutes:1,letterMinutes:5,minutes:6});
 });
 test('it stops the timer, raises the stage and spends the credit',()=>{
  const d=finish(atStage(3),480);
  expect(d.bookTimer!.phase).toBe('idle');
  // Finishing ends study, so the next one starts at the 2-minute stage (rounds, 2026-11-06).
  expect(focusRampStatus(d,at+480*sec).level).toBe(1);
  expect(canDeclareFinish(d,at+480*sec)).toBe(false);
  expect(focusQuitPenalty(d,at+481*sec)).toBeNull();
 });
 test('fewer than 100 new letters are refused and nothing is saved',()=>{
  expect(()=>finish(atStage(3),480,'p1',99)).toThrow('100자');
 });
 test('when the stage is already met it pays like a normal photo',()=>{
  expect(finish(running(),130).handwritingReceipts![0]).toMatchObject({finish:'timer',stageMinutes:1});
 });
 test('the records stay valid through a backup round trip',()=>{
  const d=finish(atStage(5),480);
  expect(()=>validateHandwritingState(d)).not.toThrow();
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
 });
 test('a tampered ratio is rejected',()=>{
  const d=finish(atStage(5),480),r=d.handwritingReceipts![0];
  expect(()=>validateHandwritingState({...d,handwritingReceipts:[{...r,stageMinutes:15,minutes:20}],days:{[key]:{...getDay(d,key),bonus:{handwriting:20}}}})).toThrow();
 });
});

describe('quit penalty',()=>{
 const planDay=(d:RoutineData)=>savePriorityDay(d,key,[{id:'t',subject:'영어',action:'1번',preparation:'',target:'',minimum:120 as const}],new Date(at));
 test('short of the stage after a minute costs 10 minutes and 1,000 won',()=>{
  const d=finishFocusRun(running(true),at+90*sec);
  expect(penaltyMinutesOnDay(d,key)).toBe(10);
  expect(moneySummary(d).balance).toBe(-1000);
  expect(d.money!.entries[0]).toMatchObject({id:'penalty:run',kind:'adjustment',amount:-1000});
  expect(d.bookTimer!.phase).toBe('idle');
 });
 test('cancelling within a minute is free',()=>{
  const d=finishFocusRun(running(true),at+60*sec);
  expect(penaltyMinutesOnDay(d,key)).toBe(0);
  expect(moneySummary(d).balance).toBe(0);
 });
 test('paused time does not stretch the free minute',()=>{
  expect(focusQuitPenalty({...running(),bookTimer:{...running().bookTimer!,running:false,focusElapsed:40,remaining:80}},at+10*min)).toBeNull();
 });
 test('a met stage is free',()=>{
  expect(focusQuitPenalty(running(),at+120*sec)).toBeNull();
 });
 test('a break does not avoid it',()=>{
  const d=startBookBreak(running(true),at+90*sec);
  expect(focusQuitPenalty(d,at+95*sec)).toMatchObject({minutes:10,won:1000});
 });
 test('the same timer is charged once',()=>{
  const once=finishFocusRun(running(true),at+90*sec);
  expect(moneySummary(finishFocusRun(once,at+95*sec)).balance).toBe(-1000);
  expect(once.focusPenalties).toHaveLength(1);
 });
 test('a two-hour-old plan is free',()=>{
  const idle=stopBookTimer(running(),at+90*sec);
  expect(focusQuitPenalty(idle,at+90*sec+2*60*min)).toBeNull();
 });
 test('only reward study is charged',()=>{
  expect(focusQuitPenalty(startBookTimer(emptyData(),'plain',subject,at,1500,'standard'),at+10*min)).toBeNull();
 });
 test('starting another subject from home is charged',()=>{
  const d=beginPriorityTask(planDay(running(true)),key,'t',at+90*sec);
  expect(penaltyMinutesOnDay(d,key)).toBe(10);
  expect(d.bookTimer!.subject).toBe('영어');
 });
 test('time and money stop at their caps',()=>{
  const full={...running(),focusPenalties:Array.from({length:5},(_,i)=>({id:'penalty:o'+i,timerId:'o'+i,at:new Date(at).toISOString(),day:key,minutes:10,won:0})).concat({id:'penalty:x',timerId:'x',at:new Date(at).toISOString(),day:key,minutes:8,won:0})};
  expect(focusQuitPenalty(full,at+90*sec)).toMatchObject({minutes:2});
  const base=running(true),poor={...base,money:{...base.money!,entries:[{id:'e',kind:'expense' as const,amount:-5500,at:new Date(at).toISOString(),note:'지출'}]}};
  expect(focusQuitPenalty(poor,at+90*sec)).toMatchObject({won:500});
 });
 test('a broken saved penalty neither blocks loading nor counts',()=>{
  const d={...running(),focusPenalties:[{id:'x',minutes:'lots'},null] as unknown as RoutineData['focusPenalties']};
  expect(penaltyMinutesOnDay(d,key)).toBe(0);
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
 });
});

describe('leaving a run unfinished keeps the apps locked',()=>{
 const next4=new Date(2026,10,2,4).getTime();
 test('running and paused both hold until the next 04:00',()=>{
  const d=running();
  expect(focusLockUntil(d.bookTimer,at+10*min)).toBe(next4);
  expect(focusLockUntil({...d.bookTimer!,running:false},at+10*min)).toBe(next4);
 });
 test('a rest opens the apps while it runs, while paused and after it runs out (user decision 2026-11-05)',()=>{
  const d=startBookBreak(running(),at+90*sec);
  expect(focusLockUntil(d.bookTimer,at+100*sec)).toBe(0);
  expect(focusLockUntil({...d.bookTimer!,running:false},at+100*sec)).toBe(0);
  expect(focusLockUntil({...d.bookTimer!,phase:'idle',running:false,restEndedAt:at+390*sec},at+400*sec)).toBe(0);
 });
 test('studying again after a rest locks again',()=>{
  const d=startBookBreak(running(),at+90*sec),again=skipBookBreak(d,d.bookTimer!.id,'next',at+100*sec);
  expect(again.bookTimer!.phase).toBe('focus');
  expect(focusLockUntil(again.bookTimer,at+101*sec)).toBe(next4);
 });
 test('finishing releases at once',()=>{
  expect(focusLockUntil(finishFocusRun(running(),at+90*sec).bookTimer,at+90*sec)).toBe(0);
 });
 test('after 04:00 a forgotten run no longer holds, and it does not roll to the next day',()=>{
  expect(focusLockUntil(running().bookTimer,next4)).toBe(0);
  expect(focusLockUntil(running().bookTimer,next4+5*60*min)).toBe(0);
 });
 test('a run started between midnight and 04:00 ends the same night',()=>{
  const late=new Date(2026,10,2,1).getTime(),timer={...running().bookTimer!,startedAt:new Date(late).toISOString()};
  expect(focusLockUntil(timer,late+min)).toBe(next4);
 });
 describe('a run that crosses 04:00',()=>{
  const start=new Date(2026,10,2,3).getTime(),four=new Date(2026,10,2,4).getTime(),nextFour=new Date(2026,10,3,4).getTime();
  const paused=()=>pauseBookTimer(startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',start),'run',subject,start,120,'output'),start+50*min);
  test('resumed after 04:00 and studying: locked until the next 04:00',()=>{
   const d=resumeBookTimer(paused(),four+10*min);
   expect(d.bookTimer!.running).toBe(true);
   expect(focusLockUntil(d.bookTimer,four+11*min)).toBe(nextFour);
  });
  test('never touched again: released at 04:00',()=>{
   expect(focusLockUntil(paused().bookTimer,four-sec)).toBe(four);
   expect(focusLockUntil(paused().bookTimer,four)).toBe(0);
  });
  test('resumed after 04:00 and then forgotten: released at the following 04:00',()=>{
   const d=resumeBookTimer(paused(),four+10*min);
   expect(focusLockUntil(d.bookTimer,nextFour)).toBe(0);
  });
  test('a broken saved resume time falls back to the start',()=>{
   expect(focusLockUntil({...paused().bookTimer!,focusResumedAt:'soon' as unknown as number},four-sec)).toBe(four);
  });
 });
 test('no timer, no lock',()=>{
  expect(focusLockUntil(undefined,at)).toBe(0);
 });
});

describe('after a photo the timer stops and asks',()=>{
 const later=at+120*sec+3*60*min,next4=new Date(2026,10,2,4).getTime();
 const paid=(money=true)=>photo(running(money),120);
 test('the timer stops and waits, and no study time passes while it waits',()=>{
  const d=paid();
  expect(d.bookTimer).toMatchObject({phase:'idle',running:false,awaitingChoice:true});
  expect(d.bookSessions!.find(s=>s.id==='run')!.seconds).toBe(120);
  expect(focusRunCredit(d,later)).toBe(focusRunCredit(d,at+120*sec));
  expect(focusSecondsForSubject(d,subject,later)).toBe(120);
 });
 test('finishing long after the photo is free and releases the lock',()=>{
  const d=finishFocusRun(paid(),later);
  expect(d.focusPenalties??[]).toHaveLength(0);
  expect(moneySummary(d).balance).toBe(moneySummary(paid()).balance);
  expect(d.bookTimer!.awaitingChoice).toBeUndefined();
  expect(focusLockUntil(d.bookTimer,later)).toBe(0);
 });
 test('the wait survives leaving the app',()=>{
  const d=JSON.parse(JSON.stringify(paid()));
  expect(focusQuitPenalty(d,later)).toBeNull();
  expect(focusLockUntil(d.bookTimer,later)).toBe(next4);
 });
 test('waiting keeps the apps locked until the next 04:00',()=>{
  expect(focusLockUntil(paid().bookTimer,later)).toBe(next4);
  expect(focusLockUntil(paid().bookTimer,next4)).toBe(0);
 });
 test('a photo after 04:00 holds until the following 04:00',()=>{
  const start=new Date(2026,10,2,3,59).getTime(),base=startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',start),'run',subject,start,120,'output'),when=start+180*sec;
  const d=settleHandwritingRewards(acceptHandwriting(base,'p1',hash('p1'),subject,analysis(),new Date(when)),when);
  expect(focusLockUntil(d.bookTimer,when+min)).toBe(new Date(2026,10,3,4).getTime());
 });
 test('going on starts a fresh round with nothing carried (build 52), and the penalty rule returns',()=>{
  const seven=photo(running(true),420),balance=moneySummary(seven).balance,d=keepGoing(seven,600);
  expect(d.bookTimer).toMatchObject({phase:'focus',running:true,duration:120});
  expect(d.bookTimer!.carrySeconds).toBeUndefined();
  expect(d.bookTimer!.awaitingChoice).toBeUndefined();
  expect(bookDisplaySeconds(d.bookTimer!,at+600*sec)).toBe(120);
  expect(focusQuitPenalty(d,at+(600+60)*sec)).toBeNull();
  const quit=finishFocusRun(d,at+(600+61)*sec);
  expect(penaltyMinutesOnDay(quit,key)).toBe(10);
  expect(moneySummary(quit).balance).toBe(balance-1000);
 });
 test('going on, then meeting the stage, is free again',()=>{
  const d=keepGoing(photo(running(),120),130);
  expect(focusQuitPenalty(d,at+(130+300)*sec)).toBeNull();
 });
 test('a declared finish asks the same way',()=>{
  const when=at+90*sec,d=acceptDeclaredFinish(running(),'p1',hash('p1'),subject,analysis(120),new Date(when));
  expect(d.bookTimer).toMatchObject({phase:'idle',awaitingChoice:true});
  expect(focusQuitPenalty(d,later)).toBeNull();
  expect(focusLockUntil(d.bookTimer,later)).toBe(next4);
  expect(focusFlowStage(d,false,when)).toBe('study');
  expect(canDeclareFinish(d,when)).toBe(false);
 });
 test('the study page sends a waiting run to the timer, and a stale plan comes first',()=>{
  const d=paid();
  expect(focusFlowStage(d,false,at+121*sec)).toBe('study');
  expect(focusFlowStage(d,false,at+120*sec+2*60*min)).toBe('plan');
 });
 test('a photo during a break leaves the break running',()=>{
  const when=at+130*sec,d=settleHandwritingRewards(acceptHandwriting(startBookBreak(running(),at+125*sec),'p1',hash('p1'),subject,analysis(),new Date(when)),when);
  expect(d.bookTimer).toMatchObject({phase:'break',running:true});
  expect(d.bookTimer!.awaitingChoice).toBeUndefined();
  expect(focusQuitPenalty(d,when+sec)).toBeNull();
 });
 test('saved data without the field, or with a broken one, behaves as before',()=>{
  const live=running(),broken={...live,bookTimer:{...live.bookTimer!,phase:'idle' as const,running:false,awaitingChoice:'yes' as unknown as boolean}};
  expect(focusLockUntil(broken.bookTimer,at+min)).toBe(0);
  expect(()=>validateBackup(makeBackup(broken,user),user)).not.toThrow();
  expect(focusLockUntil(live.bookTimer,at+min)).toBe(next4);
 });
 test('a waiting run stays valid through a backup round trip',()=>{
  const d=paid();
  expect(validateBackup(JSON.parse(JSON.stringify(makeBackup(d,user))),user).data.bookTimer).toMatchObject({awaitingChoice:true});
  expect(()=>validateHandwritingState(d)).not.toThrow();
 });
});

describe('what reaches the device',()=>{
 const earned=photo(running(),120),native={supportsHandwritingRewards:true,supportsMinuteHandwriting:true};
 test('a new build gets exact minutes and the penalty',()=>{
  const d=finishFocusRun(keepGoing(earned,120),at+210*sec);
  expect(rewardSyncExtras(d,key,native)).toEqual({handwriting:2,penalty:10});
 });
 test('an older build gets whole 5-minute steps and no penalty, so its sync does not fail',()=>{
  const d=photo(running(),900);
  expect(rewardSyncExtras(finishFocusRun(d,at+2000*sec),key,{supportsHandwritingRewards:true})).toEqual({handwriting:5});
 });
 test('a build without handwriting support gets neither',()=>{
  expect(rewardSyncExtras(earned,key,{})).toEqual({});
 });
});

describe('earlier records',()=>{
 test('a plan and stage from build 42 stay valid and unchanged',()=>{
  const d=planned(),day=withDay({...d,focusPlans:[{...d.focusPlans![0],minutes:5 as const}]},key,x=>({...x,bonus:{...x.bonus,handwriting:5}}));
  expect(()=>validateHandwritingState(day)).not.toThrow();
  const timer=startBookTimer(day,'run',subject,at,120,'output'),when=at+120*sec,paid=settleHandwritingRewards(acceptHandwriting(timer,'old',hash('old'),subject,analysis(),new Date(when),'ramp-v1'),when);
  expect(paid.handwritingReceipts![0]).toMatchObject({rewardPolicy:'ramp-v1',minutes:5});
  expect(bonus(paid)).toBe(10);
  expect(()=>validateHandwritingState(paid)).not.toThrow();
 });
 test('a plan from build 42 does not pay its minute again on a new photo',()=>{
  const d=planned(),old=withDay({...d,focusPlans:[{...d.focusPlans![0],minutes:5 as const}]},key,x=>({...x,bonus:{...x.bonus,handwriting:5}}));
  const paid=photo(startBookTimer(old,'run',subject,at,120,'output'),120);
  expect(paid.handwritingReceipts![0]).toMatchObject({planMinutes:0,stageMinutes:1});
  expect(bonus(paid)).toBe(6);
  expect(()=>validateHandwritingState(paid)).not.toThrow();
 });
});
