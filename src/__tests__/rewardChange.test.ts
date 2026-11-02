import {emptyData,routineDay} from '../lib/routineModel';
import {saveFocusPlan,startBookTimer,settleBookTimer} from '../lib/bookStudy';
import {acceptHandwriting} from '../lib/handwriting';
import {startMoneyRewards,PROPOSED_MONEY_RATES,reconcileMoneyRewards} from '../lib/moneyRewards';
import {rewardChange} from '../lib/rewardChange';
const now=new Date(2026,10,1,8).getTime(),key=routineDay(new Date(now));
test('plan receipt reports actual 5 minutes and no cash; redisplay cannot award anything',()=>{
 const before=startMoneyRewards(emptyData(),key,'wallet',PROPOSED_MONEY_RATES,new Date(now));
 const after=saveFocusPlan(before,'plan','공부','문제 하나',now);
 expect(rewardChange(before,after,key)).toEqual({minutes:5,cash:0,cashEnabled:true});
 expect(rewardChange(after,saveFocusPlan(after,'plan','공부','문제 하나',now),key)).toEqual({minutes:0,cash:0,cashEnabled:true});
});
test('photo receipt separates this payment from earlier time and cash totals',()=>{
 const initial=startMoneyRewards(emptyData(),key,'wallet',PROPOSED_MONEY_RATES,new Date(now));
 const planned=saveFocusPlan(initial,'plan','공부','문제 하나',now);
 const before=reconcileMoneyRewards(initial,settleBookTimer(startBookTimer(planned,'timer','공부',now,120,'output'),now+120000),key);
 const after=acceptHandwriting(before,'photo','a'.repeat(64),'공부',{lines:['가'.repeat(200)],languages:['ko'],quality:'readable',message:''},new Date(now+120000),'ramp-v1');
 expect(rewardChange(before,after,key)).toEqual({minutes:5,cash:1000,cashEnabled:true});
 expect(before.handwritingReceipts).toBeUndefined();
});
