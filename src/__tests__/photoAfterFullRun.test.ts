import {emptyData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {handwritingAccess} from '../lib/handwriting';
import {adjustBookTimer,pauseBookTimer,resumeBookTimer,settleBookTimer,skipBookBreak,startBookBreak,startBookTimer} from '../lib/bookStudy';
import {canTakeHandwritingPhoto,focusFlowStage} from '../lib/focusFlow';
const at=new Date(2026,10,1,9).getTime(),subject='수능',min=60000;
const stage5=()=>{const d=claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at);return {...d,focusRamp:{...d.focusRamp!,level:5 as const}};};
const first=()=>startBookTimer(stage5(),'first',subject,at,1500,'output');
/** 10 minutes of study, a break skipped after 1 minute, then a new run. */
const restarted=()=>skipBookBreak(startBookBreak(first(),at+10*min),'first','second',at+11*min);

test('a new run after a break needs the whole stage again, though the reward total is already met',()=>{
 const d=restarted(),when=at+26*min;
 expect(handwritingAccess(d,subject,when).ready).toBe(true);
 expect(canTakeHandwritingPhoto(d,when)).toBe(false);
 expect(focusFlowStage(d,false,when,true)).toBe('study');
});
test('the photo opens exactly when the new run reaches zero',()=>{
 const d=restarted();
 expect(canTakeHandwritingPhoto(d,at+36*min-1000)).toBe(false);
 expect(canTakeHandwritingPhoto(d,at+36*min)).toBe(true);
});
test('a natural break end restarts the requirement the same way',()=>{
 const ended=settleBookTimer(startBookBreak(first(),at+10*min),at+15*min);
 const d=startBookTimer(ended,'second',subject,at+16*min,1500,'output');
 expect(canTakeHandwritingPhoto(d,at+31*min)).toBe(false);
 expect(canTakeHandwritingPhoto(d,at+41*min)).toBe(true);
});
test('finishing the whole stage keeps the photo open during the break and after it ends',()=>{
 const resting=startBookBreak(first(),at+25*min);
 expect(canTakeHandwritingPhoto(resting,at+26*min)).toBe(true);
 expect(canTakeHandwritingPhoto(settleBookTimer(resting,at+30*min),at+31*min)).toBe(true);
});
test('a break before the stage is full does not open the photo',()=>{
 expect(canTakeHandwritingPhoto(startBookBreak(first(),at+24*min),at+25*min)).toBe(false);
});
test('a pause is not a break: the same run keeps counting real time only',()=>{
 const d=resumeBookTimer(pauseBookTimer(first(),at+10*min),at+40*min);
 expect(canTakeHandwritingPhoto(d,at+54*min)).toBe(false);
 expect(canTakeHandwritingPhoto(d,at+55*min)).toBe(true);
});
test('shortening the countdown cannot open the photo early',()=>{
 let d=first();for(let i=0;i<4;i++)d=adjustBookTimer(d,-300,at+min);
 expect(canTakeHandwritingPhoto(d,at+10*min)).toBe(false);
});
test('another subject cannot use the run',()=>{
 const d={...first(),outputDraft:{id:'x',subject:'영어',startedAt:new Date(at).toISOString()}};
 expect(canTakeHandwritingPhoto(d,at+30*min)).toBe(false);
});
test('a result already waiting for review stays reviewable',()=>{
 const pending={id:'p',imageHash:'a'.repeat(64),subject,analysis:{lines:['가'],languages:['ko' as const],quality:'readable' as const,message:''}};
 expect(focusFlowStage({...restarted(),handwritingPending:pending},false,at+12*min)).toBe('review');
});
