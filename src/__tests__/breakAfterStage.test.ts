import {emptyData} from '../lib/routineModel';
import {finishFocusRun,pauseBookTimer,skipBookBreak,startBookBreak,startBookTimer,takeEarnedBreak} from '../lib/bookStudy';
import {canStartBreak,claimFocusPlan,focusRampStatus,focusRunCredit} from '../lib/focusRamp';
import {focusStageMet} from '../lib/focusFlow';
import {focusJourney} from '../lib/focusJourney';
import {startOutputStudy} from '../lib/handwriting';

jest.mock('../lib/supabase',()=>({supabase:{}}));
// This suite pins a cycle started before rounds (2026-11-06): its ramp has no round, so it keeps the old stage lengths and
// tables until it ends. Rounds themselves are covered in focusRounds.test.ts and breakReward.test.ts.
jest.mock('../lib/focusRamp',()=>{const actual=jest.requireActual('../lib/focusRamp');return {...actual,claimFocusPlan:(...args:unknown[])=>{const d=actual.claimFocusPlan(...args);if(!d?.focusRamp)return d;const {round:_round,...ramp}=d.focusRamp;return {...d,focusRamp:ramp};}};});
const fs=require('fs'),path=require('path');
const at=new Date(2026,10,1,9).getTime(),sec=1000,subject='전기기사 실기';
const planned=()=>startOutputStudy(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'draft',subject,new Date(at));
const running=()=>startBookTimer(planned(),'run',subject,at,120,'output');

describe('a rest has to be earned by the current stage',()=>{
 test('closed before the stage is met and open from the moment it is',()=>{
  const d=running();
  expect(canStartBreak(d,at+10*sec)).toBe(false);
  expect(canStartBreak(d,at+119*sec)).toBe(false);
  expect(canStartBreak(d,at+120*sec)).toBe(true);
 });
 test('the state change refuses too, whatever the screen shows',()=>{
  const d=running();
  expect(takeEarnedBreak(d,at+10*sec)).toBe(d);
  expect(takeEarnedBreak(d,at+120*sec).bookTimer).toMatchObject({phase:'break',remaining:60,running:true});
 });
 test('it agrees with the photo rule and with the number on the clock at every second around the goal',()=>{
  const d=running();
  for(const s of [0,1,60,119,120,121,600]){
   const now=at+s*sec,credit=focusRunCredit(d,now),required=focusRampStatus(d,now).required;
   expect(canStartBreak(d,now)).toBe(focusStageMet(d,now));
   expect(canStartBreak(d,now)).toBe(focusJourney(credit,required).studied>=required);
  }
 });
 test('a run cut short by a rest has to fill the whole stage again',()=>{
  const rested=startBookBreak(running(),at+90*sec);
  const again=skipBookBreak(rested,'run','next',at+100*sec);
  expect(canStartBreak(again,at+101*sec)).toBe(false);
  expect(canStartBreak(again,at+219*sec)).toBe(false);
  expect(canStartBreak(again,at+220*sec)).toBe(true);
 });
 test('surplus left after a paid stage counts toward the next stage, and the rest of that stage is still owed',()=>{
  const d=planned();
  const next={...d,focusRamp:{...d.focusRamp!,level:2 as const}};
  const t=startBookTimer(next,'run',subject,at,300,'output',true),carried={...t,bookTimer:{...t.bookTimer!,carrySeconds:10}};
  expect(canStartBreak(carried,at+289*sec)).toBe(false);
  expect(canStartBreak(carried,at+290*sec)).toBe(true);
 });
 test('pausing does not open it early and does not take away a met stage',()=>{
  expect(canStartBreak(pauseBookTimer(running(),at+60*sec),at+70*sec)).toBe(false);
  expect(canStartBreak(pauseBookTimer(running(),at+130*sec),at+140*sec)).toBe(true);
 });
 test('after two idle hours a plan comes first, so no rest',()=>{
  const paused=pauseBookTimer(running(),at+130*sec),later=at+130*sec+2*60*60*sec+sec;
  expect(focusRampStatus(paused,later).needsPlan).toBe(true);
  expect(canStartBreak(paused,later)).toBe(false);
 });
 test('no plan yet means no stage to meet, so no rest',()=>{
  const t=startBookTimer(emptyData(),'run',subject,at,120,'output');
  expect(canStartBreak(t,at+600*sec)).toBe(false);
 });
 test('waiting for the choice after a photo, an existing rest and no timer have nothing to start',()=>{
  const d=running();
  expect(canStartBreak({...d,bookTimer:{...d.bookTimer!,phase:'idle',running:false,awaitingChoice:true}},at+200*sec)).toBe(false);
  expect(canStartBreak(startBookBreak(d,at+130*sec),at+140*sec)).toBe(false);
  expect(canStartBreak(emptyData(),at)).toBe(false);
 });
 test('a saved timer outside the stages keeps its rest, since it has no stage to meet',()=>{
  const d=startBookTimer(emptyData(),'run',subject,at,1500,'standard');
  expect(canStartBreak(d,at+10*sec)).toBe(true);
 });
 test('ending a run early keeps its penalty rule',()=>{
  const d=running(),ended=finishFocusRun(d,at+90*sec);
  expect(ended.bookTimer?.phase).toBe('idle');
  expect(ended.focusPenalties?.[0]).toMatchObject({minutes:10});
 });
});

describe('every screen path goes through the guard',()=>{
 const walk=(dir:string):string[]=>fs.readdirSync(dir,{withFileTypes:true}).flatMap((e:any)=>e.isDirectory()?(e.name==='__tests__'?[]:walk(path.join(dir,e.name))):/\.tsx?$/.test(e.name)?[path.join(dir,e.name)]:[]);
 test('only bookStudy itself uses the unguarded function',()=>{
  const users=walk(path.join(__dirname,'..')).filter(f=>fs.readFileSync(f,'utf8').includes('startBookBreak')).map(f=>path.basename(f));
  expect(users).toEqual(['bookStudy.ts']);
 });
});
