import {emptyData} from '../lib/routineModel';
import {finishFocusRun,pauseBookTimer,resumeBookTimer,settleBookTimer,skipBookBreak,startBookTimer,takeEarnedBreak} from '../lib/bookStudy';
import {canStartBreak,claimFocusPlan,focusBreakWait,focusRampStatus,focusRunCredit} from '../lib/focusRamp';
import {canTakeHandwritingPhoto} from '../lib/focusFlow';
import {focusQuitPenalty} from '../lib/focusPenalty';
import {focusJourney} from '../lib/focusJourney';
import {acceptHandwriting,settleHandwritingRewards,startOutputStudy} from '../lib/handwriting';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,1,9).getTime(),sec=1000,subject='전기기사 실기',user='00000000-0000-4000-8000-000000000000';
const when=(s:number)=>at+s*sec;
const running=()=>startBookTimer(startOutputStudy(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'draft',subject,new Date(at)),'run',subject,at,120,'output');
/** Study to `s` seconds, rest, and come straight back. */
const restedAt=(s:number,back=s+10)=>skipBookBreak(takeEarnedBreak(running(),when(s)),'run','back',when(back));

describe('coming back from a rest',()=>{
 test('the loop is closed: straight back, no rest',()=>{
  const d=restedAt(130);
  expect(focusRunCredit(d,when(141))).toBeGreaterThanOrEqual(120);
  expect(canStartBreak(d,when(141))).toBe(false);
  expect(takeEarnedBreak(d,when(141))).toBe(d);
 });
 test('it opens once the current stage is studied again after the rest',()=>{
  const d=restedAt(130);
  expect(canStartBreak(d,when(140+119))).toBe(false);
  expect(canStartBreak(d,when(140+120))).toBe(true);
 });
 test('the wait counts down and is what the screen shows',()=>{
  const d=restedAt(130);
  expect(focusBreakWait(d,when(140))).toBe(120);
  expect(focusBreakWait(d,when(170))).toBe(90);
  expect(focusBreakWait(d,when(260))).toBe(0);
 });
 test('a rest that ran out on its own closes it the same way',()=>{
  const ended=settleBookTimer(takeEarnedBreak(running(),when(130)),when(130+301));
  const d=startBookTimer(ended,'back',subject,when(440),120,'output');
  expect(canStartBreak(d,when(441))).toBe(false);
  expect(canStartBreak(d,when(440+120))).toBe(true);
 });
 test('resting again after studying the stage closes it again',()=>{
  const once=restedAt(130),twice=skipBookBreak(takeEarnedBreak(once,when(260)),'back','again',when(270));
  expect(canStartBreak(twice,when(271))).toBe(false);
  expect(canStartBreak(twice,when(270+120))).toBe(true);
 });
});

describe('nothing on the way opens it',()=>{
 test('pausing and resuming',()=>{
  const paused=pauseBookTimer(restedAt(130),when(150));
  expect(canStartBreak(paused,when(155))).toBe(false);
  const again=resumeBookTimer(paused,when(160));
  expect(canStartBreak(again,when(161))).toBe(false);
  expect(canStartBreak(again,when(160+110))).toBe(true);
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

describe('only the rest button changes',()=>{
 const d=restedAt(130),now=when(141);
 test('the photo still counts the time before the rest',()=>{
  expect(canTakeHandwritingPhoto(d,now)).toBe(true);
 });
 test('the clock still shows it',()=>{
  expect(focusJourney(focusRunCredit(d,now),focusRampStatus(d,now).required).studied).toBe(131);
 });
 test('finishing stays free, since the stage was met',()=>{
  expect(focusQuitPenalty(d,now)).toBeNull();
 });
 test('a paid photo pays from all of it and takes the same time off what the rest used',()=>{
  const when2=now,paid=settleHandwritingRewards(acceptHandwriting(d,'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(when2)),when2);
  expect(paid.handwritingReceipts![0]).toMatchObject({focusSeconds:120,stageMinutes:1});
  expect(paid.bookTimer!.restedCredit).toBe(10);
 });
 test('after that photo the next stage has to be studied whole before a rest',()=>{
  const paid=settleHandwritingRewards(acceptHandwriting(d,'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(now)),now);
  const next=startBookTimer(paid,'next',subject,now,focusRampStatus(paid,now).required,'output');
  // One second was studied after the rest and before the photo, and it counts.
  expect(canStartBreak(next,now+298*sec)).toBe(false);
  expect(canStartBreak(next,now+299*sec)).toBe(true);
 });
 test('another subject starts clean, as it always has',()=>{
  const ended=finishFocusRun(d,now),other=startBookTimer(startOutputStudy({...ended,outputDraft:undefined},'d2','영어',new Date(now)),'other','영어',now,120,'output');
  expect(other.bookTimer!.restedCredit).toBeUndefined();
  expect(canStartBreak(other,now+120*sec)).toBe(true);
 });
 test('surplus from a paid stage with no rest still counts toward the next rest',()=>{
  const paid=settleHandwritingRewards(acceptHandwriting(running(),'p1','a'.repeat(64),subject,{lines:['가나다라마바사아자차카타파하'],languages:['ko'],quality:'readable',message:''},new Date(when(130))),when(130));
  const next=startBookTimer(paid,'next',subject,when(130),300,'output');
  expect(next.bookTimer!.restedCredit).toBeUndefined();
  expect(canStartBreak(next,when(130+289))).toBe(false);
  expect(canStartBreak(next,when(130+290))).toBe(true);
 });
});

describe('saved data',()=>{
 test('from an earlier build, with no such value, behaves as before and opens',()=>{
  const d=restedAt(130),{restedCredit:_gone,...timer}=d.bookTimer!,old={...d,bookTimer:timer};
  expect(canStartBreak(old,when(141))).toBe(true);
  expect(focusBreakWait(old,when(141))).toBe(0);
  expect(()=>validateBackup(makeBackup(old,user),user)).not.toThrow();
 });
 test.each([['text'],[-5],[1.5],[null],[1e9]])('a broken value %j counts as nothing and never blocks loading',bad=>{
  const d=restedAt(130),broken={...d,bookTimer:{...d.bookTimer!,restedCredit:bad as number}};
  expect(canStartBreak(broken,when(141))).toBe(true);
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
