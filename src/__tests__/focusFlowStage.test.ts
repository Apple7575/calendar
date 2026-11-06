import {emptyData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {pauseBookTimer,settleBookTimer,startBookBreak,startBookTimer,stopBookTimer} from '../lib/bookStudy';
import {canTakeHandwritingPhoto,focusFlowStage,opensTimer} from '../lib/focusFlow';
const at=new Date(2026,10,1,9).getTime(),subject='수능';
const planned=()=>claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at);
const studying=()=>startBookTimer(planned(),'t',subject,at,120,'output');
const pending={id:'p',imageHash:'a'.repeat(64),subject,analysis:{lines:['가'],languages:['ko' as const],quality:'readable' as const,message:''}};
test('no plan yet asks for the plan',()=>{expect(focusFlowStage(emptyData(),false,at)).toBe('plan');});
test('a planned idle study waits to start',()=>{expect(focusFlowStage(planned(),false,at)).toBe('start');});
test('an unfinished focus is studying, running or paused',()=>{
 expect(focusFlowStage(studying(),false,at+60000)).toBe('study');
 expect(focusFlowStage(pauseBookTimer(studying(),at+60000),false,at+60000)).toBe('study');
});
test('a break stays a break even when photos are also possible',()=>{
 const d=startBookBreak(studying(),at+150000);
 expect(focusFlowStage(d,false,at+160000)).toBe('break');
 expect(focusFlowStage(pauseBookTimer(d,at+160000),false,at+160000)).toBe('break');
});
test('a naturally ended break keeps the timer page, even after a restart',()=>{
 const d=JSON.parse(JSON.stringify(settleBookTimer(startBookBreak(studying(),at+60000),at+360000)));
 expect(focusFlowStage(d,false,at+370000)).toBe('break');
});
test('a malformed + value falls back to the start page',()=>{
 const d=settleBookTimer(startBookBreak(studying(),at+60000),at+360000);
 expect(focusFlowStage({...d,bookTimer:{...d.bookTimer!,restEndedAt:'soon' as unknown as number}},false,at+370000)).toBe('start');
});
/** At the 25-minute stage, the only stage that takes a photo since 2026-11-06. */
const at25=()=>{const d=planned();return startBookTimer({...d,focusRamp:{...d.focusRamp!,level:5}},'t',subject,at,600,'output',true)};
test('with the timer stopped, meeting the 25-minute stage makes the photo the next step',()=>{
 expect(focusFlowStage(stopBookTimer(at25(),at+600000),false,at+600000)).toBe('capture');
});
test('a stage before 25 minutes takes no photo: the rest button pays it',()=>{
 expect(focusFlowStage(stopBookTimer(studying(),at+120000),false,at+120000)).toBe('start');
 expect(canTakeHandwritingPhoto(studying(),at+120000)).toBe(false);
});
test('a running timer stays the study page even after the stage is met',()=>{
 expect(focusFlowStage(studying(),false,at+120000)).toBe('study');
});
test('the photo page opens only once the 25-minute stage is met',()=>{
 expect(focusFlowStage(at25(),false,at+600000,true)).toBe('capture');
 expect(focusFlowStage(startBookBreak(at25(),at+600000),false,at+610000,true)).toBe('capture');
 expect(canTakeHandwritingPhoto(at25(),at+600000)).toBe(true);
 expect(canTakeHandwritingPhoto(at25(),at+599000)).toBe(false);
});
test('a direct capture link before the time falls back to the normal page',()=>{
 expect(canTakeHandwritingPhoto(studying(),at+60000)).toBe(false);
 expect(focusFlowStage(studying(),false,at+60000,true)).toBe('study');
 expect(focusFlowStage(startBookBreak(studying(),at+60000),false,at+70000,true)).toBe('break');
 expect(focusFlowStage(planned(),false,at,true)).toBe('start');
 expect(focusFlowStage(emptyData(),false,at,true)).toBe('plan');
 const expired=pauseBookTimer(startBookBreak(studying(),at+120000),at+130000);
 expect(focusFlowStage(expired,false,at+7400000,true)).toBe('plan');
});
test('a result saved before the policy can still be reviewed',()=>{
 expect(focusFlowStage({...studying(),handwritingPending:pending},false,at+60000)).toBe('review');
 expect(focusFlowStage({...planned(),handwritingPending:pending},false,at)).toBe('review');
});
test('only study and break hand over to the timer',()=>{
 expect(opensTimer('study')).toBe(true);expect(opensTimer('break')).toBe(true);
 for(const stage of ['plan','start','capture','submit','review'] as const)expect(opensTimer(stage)).toBe(false);
});
test('a chosen photo and an AI result take over every other state',()=>{
 expect(focusFlowStage(startBookBreak(studying(),at+60000),true,at+70000)).toBe('submit');
 expect(focusFlowStage({...studying(),handwritingPending:pending},true,at+70000)).toBe('review');
});
test('two hours away returns to the plan',()=>{
 const d=pauseBookTimer(startBookBreak(studying(),at+60000),at+70000);
 expect(focusFlowStage(d,false,at+7400000)).toBe('plan');
});
