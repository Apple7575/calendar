import {emptyData,getDay,routineDay} from '../lib/routineModel';
import {claimFocusPlan,focusRewardPreview,FOCUS_STAGE_MINUTES,FOCUS_STEPS} from '../lib/focusRamp';
import {acceptHandwriting,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {acceptDeclaredFinish,startBookTimer} from '../lib/bookStudy';
import {PROPOSED_MONEY_RATES,reconcileMoneyRewards,startMoneyRewards} from '../lib/moneyRewards';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
// This suite pins a cycle started before rounds (2026-11-06): its ramp has no round, so it keeps the old stage lengths and
// tables until it ends. Rounds themselves are covered in focusRounds.test.ts and breakReward.test.ts.
jest.mock('../lib/focusRamp',()=>{const actual=jest.requireActual('../lib/focusRamp');return {...actual,claimFocusPlan:(...args:unknown[])=>{const d=actual.claimFocusPlan(...args);if(!d?.focusRamp)return d;const {round:_round,...ramp}=d.focusRamp;return {...d,focusRamp:ramp};}};});
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,key=routineDay(new Date(at));
const running=()=>startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'run',subject,at,120,'output');
const photo=(d:RoutineData,seconds:number)=>{const when=at+seconds*sec;return settleHandwritingRewards(acceptHandwriting(d,'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(when)),when)};
/** The same payout as it was saved under an amount the row claims. */
const saved=(d:RoutineData,stageMinutes:number)=>{const r=d.handwritingReceipts![0],minutes=stageMinutes+r.planMinutes!+r.letterMinutes!;return {...d,handwritingReceipts:[{...r,stageMinutes,minutes}],days:{...d.days,[key]:{...getDay(d,key),bonus:{handwriting:minutes}}}}};

describe('25 minutes of study is worth about 10 minutes of screen time',()=>{
 test('rounds (2026-11-06): stages of 2, 3, 5, 5 and 10 minutes pay 1, 1, 2, 2 and 4, so 25 minutes pays 10',()=>{
  expect([...FOCUS_STAGE_MINUTES]).toEqual([0,1,1,2,2,4]);
  expect([...FOCUS_STEPS]).toEqual([0,120,180,300,300,600]);
 });
 test('25 straight minutes pays 10, and 1 more for the plan on the first payout',()=>{
  const d=photo(running(),1500);
  expect(d.handwritingReceipts![0]).toMatchObject({stageMinutes:10,planMinutes:1});
  expect(getDay(d,key).bonus?.handwriting).toBe(11);
 });
 test('50 straight minutes pays 25-minute stage twice',()=>{
  expect(photo(running(),3000).handwritingReceipts![0]).toMatchObject({stageMinutes:20,focusSeconds:3000});
 });
 test('the label before the photo says the new amount',()=>{
  expect(focusRewardPreview(running(),subject,at+1500*sec).due).toBe(11);
 });
});

describe('money stays as it was when screen time came down (user decision 2026-11-05)',()=>{
 const plannedWallet=()=>claimFocusPlan(startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at)),'plan',subject,'기출 1번',at);
 const wallet=()=>startBookTimer(plannedWallet(),'run',subject,at,120,'output');
 const paidAt=(seconds:number)=>{const d=wallet();return reconcileMoneyRewards(d,photo(d,seconds),key,new Date(at+seconds*sec))};
 test.each([[120,200],[300,300],[600,500],[900,800],[1500,1600],[3000,3100]])('%i seconds pays %i won with the plan',(seconds,won)=>{
  const d=paidAt(seconds);
  expect(d.money!.entries.find(e=>e.id==='focus:p1')?.amount).toBe(won);
 });
 test('the screen time of the same payout is the lower amount',()=>{
  expect(getDay(paidAt(1500),key).bonus?.handwriting).toBe(11);
 });
 test('finishing early pays money at the share studied, by the same table',()=>{
  const start=plannedWallet(),base={...start,focusRamp:{...start.focusRamp!,level:5 as const}},timer=startBookTimer(base,'run',subject,at,1500,'output'),when=at+480*sec;
  const letters=Array.from({length:120},(_,i)=>String.fromCharCode(0xAC00+i)).join('');
  const d=reconcileMoneyRewards(timer,acceptDeclaredFinish(timer,'p1','a'.repeat(64),subject,{lines:[letters],languages:['ko'],quality:'readable',message:''},new Date(when)),key,new Date(when));
  expect(d.handwritingReceipts![0]).toMatchObject({finish:'declared',stageMinutes:3,planMinutes:1});
  expect(d.money!.entries.find(e=>e.id==='focus:p1')?.amount).toBe(500);
 });
});

describe('what was already paid stays valid',()=>{
 const d=photo(running(),1500);
 test('a saved payout from the earlier table still loads',()=>{
  expect(()=>validateHandwritingState(saved(d,15))).not.toThrow();
 });
 test('so does a saved double payout from the earlier table',()=>{
  expect(()=>validateHandwritingState(saved(photo(running(),3000),30))).not.toThrow();
 });
 test('an amount from neither table is rejected',()=>{
  expect(()=>validateHandwritingState(saved(d,12))).toThrow();
 });
});
