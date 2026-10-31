import {timeWallet} from '../lib/timeWallet';
import {emptyDay,emptyData,routineDay,getDay} from '../lib/routineModel';
import {startBookTimer,settleBookTimer,saveBookNote} from '../lib/bookStudy';
import {makeBackup} from '../lib/routineBackup';
jest.mock('../lib/supabase',()=>({supabase:{}}));
const key='2026-10-31';
const native:any={supported:true,authorized:true,enabled:true,rewardMode:true,day:key,grantedMinutes:30,consumedMinutes:7,morningComplete:true,usingRewards:true,policyVersion:2,locked:false};
test('the time wallet separates earned, available, held and spent time without double counting',()=>{
 const day=emptyDay();day.paid={morning:10,words:20,gym:0};
 expect(timeWallet(day,key,native)).toMatchObject({localEarned:30,credited:30,used:7,balance:23,available:23,held:0,pending:0});
 expect(timeWallet(day,key,{...native,usingRewards:false,locked:true})).toMatchObject({available:0,held:23,balance:23});
 expect(timeWallet(day,key,{...native,consumedMinutes:30,locked:true})).toMatchObject({available:0,held:0,balance:0});
});
test('revoked permissions and a stale native day never claim real usable time',()=>{
 const day=emptyDay();day.paid.words=20;
 expect(timeWallet(day,key,{...native,authorized:false})).toMatchObject({connected:false,available:0,pending:20});
 expect(timeWallet(day,key,{...native,day:'2026-10-30'})).toMatchObject({available:0,credited:0,used:0});
 expect(timeWallet(day,key,{...native,morningComplete:false})).toMatchObject({available:0,held:23});
});
test('sleep and focus blocks are independent of earning and morning completion',()=>{
 const day=emptyDay();day.paid.morning=5;
 expect(timeWallet(day,key,{...native,sleepLocked:true})).toMatchObject({available:0,held:23});
 expect(timeWallet(day,key,{...native,focusUntil:Date.now()+60000})).toMatchObject({available:0,held:23});
});
test('a legacy short focus records without reward; its older long-session policy is preserved',()=>{
 const now=new Date(2026,9,31,9).getTime();let data=startBookTimer(emptyData(),'short','독서',now,900,'standard');
 data=settleBookTimer(data,now+900000);expect(data.bookTimer?.phase).toBe('break');data=saveBookNote(data,'short','조금 읽었어요','',new Date(now+900000));expect(getDay(data,key).bonus?.book).toBe(0);
 data=settleBookTimer(data,now+1200000);data=startBookTimer(data,'long','기출',now+1200000,3000,'standard');data=settleBookTimer(data,now+4200000);expect(data.bookSessions?.[1].seconds).toBe(3000);
 data=saveBookNote(data,'long','기출 풀이','',new Date(now+4200000));expect(getDay(data,key).bonus?.book).toBe(5);expect(()=>makeBackup(data,'owner')).not.toThrow();
 data=saveBookNote(data,'long','기록 수정','',new Date(now+4200000));expect(getDay(data,key).bonus?.book).toBe(5);
});
test('routine date keeps the 04:00 boundary instead of moving ordinary calendar dates',()=>{
 expect(routineDay(new Date(2026,9,31,1))).toBe('2026-10-30');expect(routineDay(new Date(2026,9,31,4))).toBe(key);
});
