import {emptyData} from '../lib/routineModel';
import {finishFocusRun,pauseBookTimer,resumeBookTimer,settleBookTimer,skipBookBreak,startBookTimer,takeEarnedBreak} from '../lib/bookStudy';
import {canStartBreak,claimFocusPlan,focusBreakWait,focusRampStatus,focusRunCredit} from '../lib/focusRamp';
import {focusStageMet} from '../lib/focusFlow';
import {focusQuitPenalty} from '../lib/focusPenalty';
import {focusJourney} from '../lib/focusJourney';
import {acceptHandwriting,settleHandwritingRewards,startOutputStudy} from '../lib/handwriting';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
// This suite pins a cycle started before rounds (2026-11-06): its ramp has no round, so it keeps the old stage lengths and
// tables until it ends. Rounds themselves are covered in focusRounds.test.ts and breakReward.test.ts.
jest.mock('../lib/focusRamp',()=>{const actual=jest.requireActual('../lib/focusRamp');return {...actual,claimFocusPlan:(...args:unknown[])=>{const d=actual.claimFocusPlan(...args);if(!d?.focusRamp)return d;const {round:_round,...ramp}=d.focusRamp;return {...d,focusRamp:ramp};}};});
const at=new Date(2026,10,1,9).getTime(),sec=1000,subject='전기기사 실기',user='00000000-0000-4000-8000-000000000000';
const when=(s:number)=>at+s*sec;
const running=()=>startBookTimer(startOutputStudy(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'draft',subject,new Date(at)),'run',subject,at,120,'output');
/** Study to `s` seconds, rest, and come straight back. */
const restedAt=(s:number,back=s+10)=>skipBookBreak(takeEarnedBreak(running(),when(s)),'run','back',when(back));

// Since 2026-11-06 a rest pays the 2-minute stage it closes (focusBreakReward.ts), so coming back the current stage is the
// 5-minute one. The 10 seconds studied past the 2 minutes carry on for the clock and the photo, but not for the next rest.
describe('coming back from a rest',()=>{
 test('the loop is closed: straight back, no rest',()=>{
  const d=restedAt(130);
  expect(focusRampStatus(d,when(141)).required).toBe(300);
  expect(canStartBreak(d,when(141))).toBe(false);
  expect(takeEarnedBreak(d,when(141))).toBe(d);
 });
 test('it opens once the current stage is studied again after the rest',()=>{
  const d=restedAt(130);
  expect(canStartBreak(d,when(140+299))).toBe(false);
  expect(canStartBreak(d,when(140+300))).toBe(true);
 });
 test('the wait counts down and is what the screen shows',()=>{
  const d=restedAt(130);
  expect(focusBreakWait(d,when(140))).toBe(300);
  expect(focusBreakWait(d,when(170))).toBe(270);
  expect(focusBreakWait(d,when(440))).toBe(0);
 });
 test('a rest that ran out on its own closes it the same way',()=>{
  const ended=settleBookTimer(takeEarnedBreak(running(),when(130)),when(130+301));
  const d=startBookTimer(ended,'back',subject,when(440),300,'output');
  expect(canStartBreak(d,when(441))).toBe(false);
  expect(canStartBreak(d,when(440+300))).toBe(true);
 });
 test('resting again after studying the stage closes it again',()=>{
  const once=restedAt(130),twice=skipBookBreak(takeEarnedBreak(once,when(440)),'back','again',when(450));
  expect(canStartBreak(twice,when(451))).toBe(false);
  expect(canStartBreak(twice,when(450+600))).toBe(true);
 });
});

describe('nothing on the way opens it',()=>{
 test('pausing and resuming',()=>{
  const paused=pauseBookTimer(restedAt(130),when(150));
  expect(canStartBreak(paused,when(155))).toBe(false);
  const again=resumeBookTimer(paused,when(160));
  expect(canStartBreak(again,when(161))).toBe(false);
  expect(canStartBreak(again,when(160+290))).toBe(true);
 });
 test('closing and opening the app, which reloads what was saved',()=>{
  const saved=JSON.parse(JSON.stringify(restedAt(130))) as RoutineData;
  expect(canStartBreak(saved,when(141))).toBe(false);
 });
 test('passing 04:00 during the rest',()=>{
  const late=new Date(2026,10,1,3,50).getTime(),t=(s:number)=>late+s*sec;
  const start=startBookTimer(startOutputStudy(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',late),'draft',subject,new Date(late)),'run',subject,late,120,'output');
  const rested=takeEarnedBreak(start,t(130)),d=skipBookBreak(rested,'run','back',t(1000));
  expect(new Date(t(1000)).getHours()).toBe(4);
  expect(canStartBreak(d,t(1001))).toBe(false);
 });
 test('ending the run and starting another of the same subject',()=>{
  const ended=finishFocusRun(restedAt(130),when(145)),d=startBookTimer(ended,'third',subject,when(150),120,'output');
  expect(canStartBreak(d,when(151))).toBe(false);
 });
});

describe('what the rest settled',()=>{
 const d=restedAt(130),now=when(141);
 test('the photo waits for the next stage, since the rest paid this one',()=>{
  expect(focusStageMet(d,now)).toBe(false);
  expect(focusStageMet(d,when(140+290))).toBe(true);
 });
 test('the clock counts on from the 10 seconds past the stage',()=>{
  expect(focusJourney(focusRunCredit(d,now),focusRampStatus(d,now).required).studied).toBe(11);
 });
 test('finishing stays free, right after a paid stage',()=>{
  expect(focusQuitPenalty(d,now)).toBeNull();
 });
 test('a photo at the next stage pays that stage, not the one the rest paid',()=>{
  const t=when(140+290),paid=settleHandwritingRewards(acceptHandwriting(d,'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(t)),t);
  expect(paid.handwritingReceipts![0]).toMatchObject({focusSeconds:300,focusStage:2,stageMinutes:2,planMinutes:0});
 });
 test('finishing starts the next study at 2 minutes, in any subject (rounds, 2026-11-06)',()=>{
  const ended=finishFocusRun(d,now),other=startBookTimer(startOutputStudy({...ended,outputDraft:undefined},'d2','영어',new Date(now)),'other','영어',now,300,'output');
  expect(other.bookTimer!.restedCredit).toBeUndefined();
  expect(canStartBreak(other,now+119*sec)).toBe(false);
  expect(canStartBreak(other,now+120*sec)).toBe(true);
 });
 test('after a photo-paid stage, a new start carries nothing: the next rest needs the whole first stage (build 52)',()=>{
  const paid=settleHandwritingRewards(acceptHandwriting(running(),'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(when(130))),when(130));
  const next=startBookTimer(paid,'next',subject,when(130),300,'output');
  expect(next.bookTimer!.restedCredit).toBeUndefined();
  expect(next.bookTimer!.carrySeconds).toBeUndefined();
  expect(canStartBreak(next,when(130+119))).toBe(false);
  expect(canStartBreak(next,when(130+120))).toBe(true);
 });
});

describe('saved data',()=>{
 test('from an earlier build, with no such value, behaves as before and opens',()=>{
  const d=restedAt(130),{restedCredit:_gone,...timer}=d.bookTimer!,old={...d,bookTimer:timer};
  expect(canStartBreak(old,when(141))).toBe(false);
  expect(canStartBreak(old,when(140+290))).toBe(true);
  expect(focusBreakWait(old,when(141))).toBe(0);
  expect(()=>validateBackup(makeBackup(old,user),user)).not.toThrow();
 });
 test.each([['text'],[-5],[1.5],[null],[1e9]])('a broken value %j counts as nothing and never blocks loading',bad=>{
  const d=restedAt(130),broken={...d,bookTimer:{...d.bookTimer!,restedCredit:bad as number}};
  expect(canStartBreak(broken,when(140+290))).toBe(true);
  expect(()=>validateBackup(makeBackup(broken,user),user)).not.toThrow();
 });
 test('goes through a backup and comes back still closed',()=>{
  const d=restedAt(130);
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
  expect(canStartBreak(JSON.parse(JSON.stringify(makeBackup(d,user))).data??d,when(141))).toBe(false);
 });
});

describe('a timer outside the stages',()=>{
 test('keeps its rest and never records one',()=>{
  const d=startBookTimer(emptyData(),'run',subject,at,1500,'standard');
  expect(takeEarnedBreak(d,when(10)).bookTimer!.restedCredit).toBeUndefined();
  expect(focusBreakWait(d,when(10))).toBe(0);
 });
});
