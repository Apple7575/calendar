import {emptyData,getDay,routineDay} from '../lib/routineModel';
import {claimFocusPlan,focusRampStatus,FOCUS_RESET_MS,focusRampAccess} from '../lib/focusRamp';
import {startBookBreak,saveFocusPlan,startBookTimer,settleBookTimer,stopBookTimer,pauseBookTimer,resumeBookTimer,adjustBookTimer} from '../lib/bookStudy';
import {acceptHandwriting,settleHandwritingRewards,validateHandwritingState,startOutputStudy} from '../lib/handwriting';
import {PROPOSED_MONEY_RATES,startMoneyRewards,reconcileMoneyRewards,moneySummary} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';
jest.mock('../lib/supabase',()=>({supabase:{}}));
const base=new Date(2026,10,1,8).getTime(),key=routineDay(new Date(base)),subject='수능';
const planned=()=>saveFocusPlan(emptyData(),'plan',subject,'기출 한 문제 읽기',base);
const photo=(data:ReturnType<typeof emptyData>,id:string,now:number,topic=subject,text='가'.repeat(100))=>acceptHandwriting(data,id,id.charCodeAt(0).toString(16).padStart(64,'0'),topic,{lines:[text],languages:['ko'],quality:'readable',message:''},new Date(now),'ramp-v1');
test('plan grants 5 minutes with no study, is idempotent, and duplicate plans cannot farm rewards',()=>{
 const d=planned();expect(getDay(d,key).bonus?.handwriting).toBe(5);expect(focusRampStatus(d,base).required).toBe(120);expect(saveFocusPlan(d,'plan',subject,'same',base)).toBe(d);expect(()=>claimFocusPlan(d,'other',subject,'another',base+1000)).toThrow('이미');expect(d.bookSessions).toBeUndefined();validateHandwritingState(d);
});
test('2, 5, 10, 15, 25 minute steps grant exactly 5 each and stay at 25',()=>{
 let d=planned(),now=base;
 for(const [index,duration]of [120,300,600,900,1500,1500].entries()){
  expect(focusRampStatus(d,now).required).toBe(duration);d=startBookTimer(d,'t'+index,subject,now,duration,'output');
  now+=duration*1000;d=settleBookTimer(d,now);d=photo(d,String.fromCharCode(65+index),now,subject,String.fromCharCode(0xAC00+index).repeat(1000));
  expect(getDay(d,key).bonus?.handwriting).toBe(5+(index+1)*5);expect(d.handwritingReceipts!.at(-1)!.minutes).toBe(5);validateHandwritingState(d);d=stopBookTimer(d,now);now+=1000;
 }
 expect(d.focusRamp?.level).toBe(5);expect(focusRampStatus(d,now).required).toBe(1500);
});
test('an early photo waits for actual seconds; multiple photos in one stage pay only once',()=>{
 let d=startBookTimer(planned(),'t',subject,base,120,'output');d=photo(d,'a',base+60000);d=photo(d,'b',base+60000,subject,'나'.repeat(100));expect(getDay(d,key).bonus?.handwriting).toBe(5);
 expect(settleHandwritingRewards(d,base+119000)).toBe(d);d=settleHandwritingRewards(d,base+120000);expect(getDay(d,key).bonus?.handwriting).toBe(10);expect(d.focusRamp?.level).toBe(2);expect(d.handwritingReceipts!.map(r=>r.minutes)).toEqual([5,0]);validateHandwritingState(d);expect(settleHandwritingRewards(d,base+120000)).toBe(d);
});
test('pause, break and shortening the countdown do not invent study time',()=>{
 let d=pauseBookTimer(startBookTimer(planned(),'t',subject,base,120,'output'),base+60000);
 expect(focusRampAccess(d,subject,base+3600000).seconds).toBe(60);
 d=resumeBookTimer(d,base+3600000);d=adjustBookTimer(d,-300,base+3600000);d=settleBookTimer(d,base+3601000);
 expect(focusRampAccess(d,subject,base+3601000).ready).toBe(false);expect(focusRampAccess(d,subject,base+3901000).seconds).toBe(361);
});
test('exact two-hour inactivity restarts plan but opening screens does not refresh activity',()=>{
 const d=planned();expect(focusRampStatus(d,base+FOCUS_RESET_MS-1).needsPlan).toBe(false);expect(focusRampStatus(d,base+FOCUS_RESET_MS).needsPlan).toBe(true);
 const next=saveFocusPlan(d,'new',subject,'다시 한 문제',base+FOCUS_RESET_MS);expect(getDay(next,key).bonus?.handwriting).toBe(10);expect(next.focusRamp?.level).toBe(1);expect(focusRampStatus(next,base+FOCUS_RESET_MS).required).toBe(120);validateHandwritingState(next);
});
test('inactivity is measured from actual study end, not photograph submission or break end',()=>{
 let d=startBookTimer(planned(),'t',subject,base+60000,120,'output');d=startBookBreak(d,base+180000);d=photo(d,'c',base+600000);
 expect(focusRampStatus(d,base+180000+FOCUS_RESET_MS-1).needsPlan).toBe(false);expect(focusRampStatus(d,base+180000+FOCUS_RESET_MS).needsPlan).toBe(true);
});
test('an expired paused timer cannot bypass restart, and saving a new plan preserves its real end time',()=>{
 let d=pauseBookTimer(startBookTimer(planned(),'t',subject,base,120,'output'),base+60000),now=base+60000+FOCUS_RESET_MS;
 expect(()=>resumeBookTimer(d,now)).toThrow('2시간');d=saveFocusPlan(d,'again',subject,'다시 시작',now);expect(d.bookSessions![0].completedAt).toBe(new Date(base+60000).toISOString());expect(focusRampAccess(d,subject,now).seconds).toBe(0);expect(getDay(d,key).bonus?.handwriting).toBe(10);validateHandwritingState(d);
});
test('switching subjects does not reset stage or grant another plan',()=>{
 let d=startBookTimer(planned(),'t',subject,base,120,'output');d=settleBookTimer(d,base+120000);d=photo(d,'d',base+120000);d=stopBookTimer(d,base+120000);d=startOutputStudy({...d,outputDraft:undefined},'english','영어',new Date(base+121000));expect(focusRampStatus(d,base+121000).required).toBe(300);expect(focusRampAccess(d,'영어',base+121000).ready).toBe(false);expect(()=>claimFocusPlan(d,'farm','영어','plan',base+121000)).toThrow('이미');
});
test('cash stays character-based while time is a flat 5 minutes; plans pay no cash',()=>{
 let d=startMoneyRewards(emptyData(),key,'money',PROPOSED_MONEY_RATES,new Date(base)),before=d;d=saveFocusPlan(d,'plan',subject,'한 문제',base);d=reconcileMoneyRewards(before,d,key);expect(moneySummary(d).available).toBe(0);d=startBookTimer(d,'t',subject,base,120,'output');before=d;d=photo(d,'e',base+120000,subject,'가'.repeat(400));d=reconcileMoneyRewards(before,d,key);expect(moneySummary(d).available).toBe(2000);expect(getDay(d,key).bonus?.handwriting).toBe(10);validateHandwritingState(d);
});
test('pending photos and previous paid records survive reset, backup and restore',()=>{
 let d=startBookTimer(planned(),'t',subject,base,120,'output');d=photo(d,'f',base+10000);d=pauseBookTimer(d,base+60000);const now=base+60000+FOCUS_RESET_MS;d=saveFocusPlan(d,'again',subject,'새 계획',now);expect(d.handwritingReceipts![0].focusCycle).toBe('again');expect(d.handwritingReceipts![0].rewardStatus).toBe('pending');d=startBookTimer(d,'newt',subject,now,120,'output');d=settleHandwritingRewards(d,now+120000);expect(getDay(d,key).bonus?.handwriting).toBe(15);const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(d,'owner'))),'owner').data;expect(restored.focusRamp).toEqual(d.focusRamp);
});
