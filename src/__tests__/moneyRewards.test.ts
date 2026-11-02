import {emptyData,getDay,withDay,checkMorning,earn} from '../lib/routineModel';
import {PROPOSED_MONEY_RATES,startMoneyRewards,reconcileMoneyRewards,moneySummary,recordMoneyExpense,refundMoneyExpense,saveMoneyRates,validateMoneyState,parseWon} from '../lib/moneyRewards';
const key='2026-11-01',now=new Date(2026,10,1,9);
const active=()=>startMoneyRewards(emptyData(),key,'wallet',PROPOSED_MONEY_RATES,now);
const change=(data:ReturnType<typeof active>,fn:(d:ReturnType<typeof active>)=>ReturnType<typeof active>,day=key)=>reconcileMoneyRewards(data,fn(data),day,now);
test('explicit activation pays no old achievements and small-to-full pays only the difference',()=>{
 let d=active();d=change(d,s=>checkMorning(checkMorning(s,key,'min',0),key,'min',1));expect(moneySummary(d).available).toBe(500);
 d=change(d,s=>checkMorning(s,key,'full',2));expect(moneySummary(d).available).toBe(1000);expect(change(d,s=>checkMorning(s,key,'full',2))).toEqual(d);
 const old=earn(emptyData(),key,'gym','full'),started=startMoneyRewards(old,key,'new',PROPOSED_MONEY_RATES,now);expect(moneySummary(reconcileMoneyRewards(old,started,key,now)).available).toBe(0);
});
test('word tiers pay once, undo retracts, and regrade restores even after restart',()=>{
 let d=change(active(),s=>withDay(s,key,day=>({...day,wordRewards:{version:2,rounds:1,pendingIds:[],countedIds:[]}})));expect(moneySummary(d).available).toBe(500);
 d=JSON.parse(JSON.stringify(d));d=change(d,s=>withDay(s,key,day=>({...day,wordRewards:{...day.wordRewards!,rounds:0}})));expect(moneySummary(d).available).toBe(0);
 d=change(d,s=>withDay(s,key,day=>({...day,wordRewards:{...day.wordRewards!,rounds:1}})));expect(moneySummary(d).available).toBe(500);expect(d.money!.entries.map(e=>e.amount)).toEqual([500,-500,500]);validateMoneyState(d);
});
test('money carries across 04:00, settings change the following day, and handwriting is independent',()=>{
 let d=active();d=saveMoneyRates(d,{...PROPOSED_MONEY_RATES,wordStep:700});
 d=change(d,s=>withDay(s,key,day=>({...day,wordRewards:{version:2,rounds:1,pendingIds:[],countedIds:[]}})));expect(moneySummary(d).available).toBe(500);
 const tomorrow='2026-11-02';d=change(d,s=>({...withDay(s,tomorrow,day=>({...day,wordRewards:{version:2,rounds:1,pendingIds:[],countedIds:[]}})),handwritingReceipts:[{id:'r',imageHash:'a'.repeat(64),subject:'공부',at:now.toISOString(),day:tomorrow,lines:['가'.repeat(200)],languages:['ko'],units:200,duplicateUnits:0,minutes:0,policyVersion:1}]}),tomorrow);expect(moneySummary(d).available).toBe(2200);validateMoneyState(JSON.parse(JSON.stringify(d)));
});
test('spending and refunds are idempotent, preserve history, and undo can expose an overspend honestly',()=>{
 let d=change(active(),s=>earn(s,key,'gym','min'));d=recordMoneyExpense(d,'expense',1000,'점심',now);expect(moneySummary(d).available).toBe(0);expect(recordMoneyExpense(d,'expense',1000,'점심',now)).toBe(d);
 d=change(d,s=>withDay(s,key,day=>({...day,paid:{...day.paid,gym:0}})));expect(moneySummary(d)).toMatchObject({available:0,overspent:1000,balance:-1000});
 d=refundMoneyExpense(d,'expense',now);expect(moneySummary(d).balance).toBe(0);expect(moneySummary(d).spent).toBe(0);expect(refundMoneyExpense(d,'expense',now)).toBe(d);expect(d.money!.entries).toHaveLength(4);validateMoneyState(d);
});
test('invalid amounts and forged refunds fail validation',()=>{
 expect(parseWon('1,500')).toBe(1500);expect(()=>parseWon('1.5')).toThrow();expect(()=>recordMoneyExpense(active(),'x',0,'',now)).toThrow();
 expect(()=>saveMoneyRates(active(),{...PROPOSED_MONEY_RATES,morningFull:100})).toThrow();
 const d=recordMoneyExpense(active(),'x',100,'',now);d.money!.entries.push({id:'bad',kind:'refund',amount:500,at:now.toISOString(),note:'',reverses:'x'});expect(()=>validateMoneyState(d)).toThrow();
});
