import {emptyData,routineDay} from '../lib/routineModel';
import {startOutputStudy,handwritingAccess,acceptHandwriting,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {startBookBreak,startBookTimer,pauseBookTimer,resumeBookTimer,settleBookTimer,stopBookTimer,adjustBookTimer} from '../lib/bookStudy';
import {startMoneyRewards,PROPOSED_MONEY_RATES,reconcileMoneyRewards,moneySummary} from '../lib/moneyRewards';
const now=new Date(2026,10,1,9).getTime(),subject='수능';
const start=()=>startBookTimer(startOutputStudy(emptyData(),'draft',subject,new Date(now)),'timer',subject,now,1500,'output');
const analysis={lines:['가'.repeat(100)],languages:['ko' as const],quality:'readable' as const,message:''};
const accept=(data:ReturnType<typeof start>,id='r',time=now+1500000)=>acceptHandwriting(data,id,(id==='r'?'a':'b').repeat(64),subject,analysis,new Date(time));
test('24:59 allows photo save but defers rewards until actual 25:00',()=>{
 const d=start();expect(handwritingAccess(d,subject,now+1499000).ready).toBe(false);
 const pending=accept(d,'r',now+1499000);expect(pending.handwritingReceipts![0]).toMatchObject({rewardStatus:'pending',minutes:0});
 expect(settleHandwritingRewards(pending,now+1499000)).toBe(pending);
 expect(handwritingAccess(d,subject,now+1500000).ready).toBe(true);
 const saved=settleHandwritingRewards(pending,now+1500000);expect(saved.handwritingReceipts![0]).toMatchObject({focusSeconds:1500,rewardStatus:'earned',minutes:5});expect(handwritingAccess(saved,subject,now+1500000).ready).toBe(false);
 validateHandwritingState(saved);expect(settleHandwritingRewards(saved,now+1600000)).toBe(saved);
 expect(accept(saved)).toBe(saved);
});
test('pause and break do not count, another subject cannot use credit',()=>{
 let d=pauseBookTimer(start(),now+600000);expect(handwritingAccess(d,subject,now+9000000).seconds).toBe(600);
 d=resumeBookTimer(d,now+9000000);expect(handwritingAccess(d,subject,now+9899000).ready).toBe(false);
 d=startBookBreak(d,now+9900000);expect(d.bookTimer?.phase).toBe('break');expect(handwritingAccess(d,subject,now+15000000).seconds).toBe(1500);expect(handwritingAccess(d,'영어',now+15000000).ready).toBe(false);
});
test('early stop preserves actual elapsed, never full timer duration',()=>{
 let d=stopBookTimer(start(),now+300000);expect(d.bookSessions![0].seconds).toBe(300);expect(handwritingAccess(d,subject,now+9000000).seconds).toBe(300);
 d=startBookTimer(d,'timer2',subject,now+400000,1500,'output');expect(handwritingAccess(d,subject,now+1600000).ready).toBe(true);
});
test('reducing countdown cannot fake focus and adding minutes does not erase elapsed',()=>{
 let d=adjustBookTimer(start(),-300,now+60000);d=adjustBookTimer(d,-300,now+60000);d=adjustBookTimer(d,-300,now+60000);d=adjustBookTimer(d,-300,now+60000);d=adjustBookTimer(d,-300,now+60000);
 d=stopBookTimer(d,now+61000);expect(d.bookSessions![0].seconds).toBe(61);expect(handwritingAccess(d,subject,now+61000).ready).toBe(false);
 let longer=adjustBookTimer(start(),300,now+1200000);expect(handwritingAccess(longer,subject,now+1200000).seconds).toBe(1200);expect(handwritingAccess(longer,subject,now+1500000).ready).toBe(true);
});
test('photos submitted before 25 minutes settle together, once, and cash waits too',()=>{
 const key=routineDay(new Date(now));let d=startMoneyRewards(start(),key,'wallet',PROPOSED_MONEY_RATES,new Date(now));
 d=accept(d,'r',now+60000);d=acceptHandwriting(d,'other','d'.repeat(64),subject,{...analysis,lines:['나'.repeat(100)]},new Date(now+120000));expect(moneySummary(d).available).toBe(0);
 const released=settleHandwritingRewards(d,now+1500000),paid=reconcileMoneyRewards(d,released,key);expect(moneySummary(paid).available).toBe(1000);expect(paid.days[key].bonus?.handwriting).toBe(10);expect(handwritingAccess(paid,subject,now+1500000).seconds).toBe(0);validateHandwritingState(paid);
 expect(reconcileMoneyRewards(paid,settleHandwritingRewards(paid,now+2000000),key)).toBe(paid);
});
test('photos survive pause and 04:00, reward belongs to the day the 25-minute condition completes',()=>{
 let d=accept(start(),'r',now+300000);d=pauseBookTimer(d,now+600000);
 const tomorrow=new Date(2026,10,2,4).getTime();d=resumeBookTimer(d,tomorrow);
 const paid=settleHandwritingRewards(d,tomorrow+900000),receipt=paid.handwritingReceipts![0];
 expect(receipt.day).toBe('2026-11-01');expect(receipt.rewardDay).toBe('2026-11-02');expect(paid.days['2026-11-01'].bonus?.handwriting??0).toBe(0);expect(paid.days['2026-11-02'].bonus?.handwriting).toBe(5);validateHandwritingState(paid);
});
test('failed OCR or duplicate never consumes another study block',()=>{
 let d=settleBookTimer(start(),now+1500000);
 expect(()=>acceptHandwriting(d,'bad','c'.repeat(64),subject,{...analysis,quality:'retake'},new Date(now+1500000))).toThrow();
 expect(handwritingAccess(d,subject).ready).toBe(true);d=accept(d);
 expect(()=>accept(d,'r2')).toThrow('이미');expect(handwritingAccess(d,subject,now+1500000).seconds).toBe(0);
});
test('cash follows characters independently of minutes; carry crosses day',()=>{
 const key=routineDay(new Date(now));let before=startMoneyRewards(emptyData(),key,'wallet',PROPOSED_MONEY_RATES,new Date(now));
 const receipt=(id:string,day:string,units:number)=>({id,day,units,imageHash:id.repeat(64),subject,at:new Date(now).toISOString(),lines:['가'.repeat(units)],languages:['ko' as const],duplicateUnits:0,minutes:0,policyVersion:1 as const});
 let after=reconcileMoneyRewards(before,{...before,handwritingReceipts:[receipt('a',key,60)]},key);expect(moneySummary(after).available).toBe(0);
 before=after;after=reconcileMoneyRewards(before,{...before,handwritingReceipts:[...before.handwritingReceipts!,receipt('b','2026-11-02',140)]},'2026-11-02');expect(moneySummary(after).available).toBe(1000);
});
