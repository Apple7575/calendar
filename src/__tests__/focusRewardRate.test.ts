import {emptyData,getDay,routineDay} from '../lib/routineModel';
import {claimFocusPlan,focusRewardPreview,FOCUS_STAGE_MINUTES} from '../lib/focusRamp';
import {acceptHandwriting,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {startBookTimer} from '../lib/bookStudy';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,key=routineDay(new Date(at));
const running=()=>startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'run',subject,at,120,'output');
const photo=(d:RoutineData,seconds:number)=>{const when=at+seconds*sec;return settleHandwritingRewards(acceptHandwriting(d,'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(when)),when)};
/** The same payout as it was saved under an amount the row claims. */
const saved=(d:RoutineData,stageMinutes:number)=>{const r=d.handwritingReceipts![0],minutes=stageMinutes+r.planMinutes!+r.letterMinutes!;return {...d,handwritingReceipts:[{...r,stageMinutes,minutes}],days:{...d.days,[key]:{...getDay(d,key),bonus:{handwriting:minutes}}}}};

describe('25 minutes of study is worth about 10 minutes of screen time',()=>{
 test('each stage pays about 40 percent of its study time',()=>{
  expect([...FOCUS_STAGE_MINUTES]).toEqual([0,1,2,4,6,10]);
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
