import {emptyData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {handwritingAccess} from '../lib/handwriting';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {validateStudyState} from '../lib/studyHistory';
import {bookFocusSeconds,bookRestOvertime} from '../lib/bookTimerTime';
import {settleBookTimer,skipBookBreak,startBookBreak,startBookTimer,stopBookTimer} from '../lib/bookStudy';
jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,1,9).getTime(),subject='수능',user='00000000-0000-4000-8000-000000000000';
const breakEnd=at+60000+300000;
const onBreak=()=>startBookBreak(startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'first',subject,at,120,'output'),at+60000);
const ended=()=>settleBookTimer(onBreak(),breakEnd);

test('a naturally ended break counts up from +0:00',()=>{
 const t=ended().bookTimer!;
 expect(t).toMatchObject({phase:'idle',running:false,restEndedAt:breakEnd});
 expect(bookRestOvertime(t,breakEnd)).toBe(0);
 expect(bookRestOvertime(t,breakEnd+12000)).toBe(12);
});
test('the + time is neither study time nor reward credit',()=>{
 const d=ended();
 expect(bookFocusSeconds(d.bookTimer!,breakEnd+600000)).toBe(0);
 expect(handwritingAccess(d,subject,breakEnd+600000).seconds).toBe(60);
 expect(d.bookSessions).toHaveLength(1);
 expect(d.days).toEqual(onBreak().days);
});
test('the + time survives an app restart',()=>{
 const restored=settleBookTimer(JSON.parse(JSON.stringify(ended())),breakEnd+90000);
 expect(bookRestOvertime(restored.bookTimer!,breakEnd+90000)).toBe(90);
});
test('a break settled late still counts from when it really ended',()=>{
 const t=settleBookTimer(onBreak(),breakEnd+500000).bookTimer!;
 expect(bookRestOvertime(t,breakEnd+500000)).toBe(500);
});
test('starting study clears the value',()=>{
 expect(startBookTimer(ended(),'second',subject,breakEnd+1000,120,'output').bookTimer!.restEndedAt).toBeUndefined();
 expect(skipBookBreak(ended(),'first','third',breakEnd+1000).bookTimer!.restEndedAt).toBeUndefined();
});
test('ending the timer clears the value',()=>{
 const stopped=stopBookTimer(ended(),breakEnd+1000).bookTimer!;
 expect(stopped.restEndedAt).toBeUndefined();
 expect(bookRestOvertime(stopped,breakEnd+2000)).toBeNull();
});
test('only a natural break end shows + time',()=>{
 const focus=startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'first',subject,at,120,'output');
 expect(bookRestOvertime(focus.bookTimer!,at+1000)).toBeNull();
 expect(bookRestOvertime(onBreak().bookTimer!,at+70000)).toBeNull();
 expect(bookRestOvertime(stopBookTimer(focus,at+1000).bookTimer!,at+2000)).toBeNull();
 expect(bookRestOvertime(stopBookTimer(onBreak(),at+70000).bookTimer!,at+80000)).toBeNull();
});
test('an old saved idle timer loads without + time',()=>{
 const {restEndedAt,...old}=ended().bookTimer!;
 expect(restEndedAt).toBe(breakEnd);
 const data={...ended(),bookTimer:old};
 expect(()=>validateStudyState(data)).not.toThrow();
 expect(bookRestOvertime(old,breakEnd+5000)).toBeNull();
});
test.each(['soon',null,Number.NaN,{}])('a malformed value %p neither blocks loading nor shows + time',bad=>{
 const data={...ended(),bookTimer:{...ended().bookTimer!,restEndedAt:bad as unknown as number}};
 expect(()=>validateStudyState(data)).not.toThrow();
 expect(()=>validateBackup(makeBackup(data,user),user)).not.toThrow();
 expect(bookRestOvertime(data.bookTimer,breakEnd+5000)).toBeNull();
});
test('a time before the end never counts down',()=>{
 expect(bookRestOvertime(ended().bookTimer!,breakEnd-5000)).toBe(0);
});
test('the value survives a backup round trip',()=>{
 const restored=validateBackup(JSON.parse(JSON.stringify(makeBackup(ended(),user))),user);
 expect(bookRestOvertime(restored.data.bookTimer!,breakEnd+7000)).toBe(7);
});
