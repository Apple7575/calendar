import {emptyData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {pauseBookTimer,startBookBreak,startBookTimer,stopBookTimer} from '../lib/bookStudy';
import {focusFlowStage} from '../lib/focusFlow';
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
test('meeting the stage makes the photo the next step',()=>{
 expect(focusFlowStage(studying(),false,at+120000)).toBe('capture');
 expect(focusFlowStage(stopBookTimer(studying(),at+120000),false,at+120000)).toBe('capture');
});
test('a chosen photo and an AI result take over every other state',()=>{
 expect(focusFlowStage(startBookBreak(studying(),at+60000),true,at+70000)).toBe('submit');
 expect(focusFlowStage({...studying(),handwritingPending:pending},true,at+70000)).toBe('review');
});
test('two hours away returns to the plan',()=>{
 const d=pauseBookTimer(startBookBreak(studying(),at+60000),at+70000);
 expect(focusFlowStage(d,false,at+7400000)).toBe('plan');
});
