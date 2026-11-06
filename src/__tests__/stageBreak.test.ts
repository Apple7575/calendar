import {earned,emptyData,getDay,routineDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {breakLength,pauseBookTimer,resumeBookTimer,skipBookBreak,startBookTimer,takeEarnedBreak,BREAK_SECONDS} from '../lib/bookStudy';
import {focusBreakPayouts} from '../lib/focusBreakReward';
import {breakAlarmAt} from '../lib/breakAlarm';
import {restAlarmEnd} from '../lib/restAlarm';
import {PROPOSED_MONEY_RATES,moneySummary,startMoneyRewards} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';

jest.mock('../lib/supabase',()=>({supabase:{}}));
// S2-14 (team lead, 2026-11-07): a rest is a fifth of the stage it closes. 2→1, 5→1, 10→2, 15→3, 25→5 minutes.
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,key=routineDay(new Date(at)),user='00000000-0000-4000-8000-000000000000';
const planned=()=>claimFocusPlan(startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at)),'plan',subject,'기출 1번',at);
const running=()=>startBookTimer(planned(),'run',subject,at,120,'output');
const rest=(d:RoutineData,s:number)=>takeEarnedBreak(d,at+s*sec);
const back=(d:RoutineData,s:number,id:string)=>skipBookBreak(d,d.bookTimer!.id,id,at+s*sec);
const restOf=(d:RoutineData,s:number)=>({remaining:d.bookTimer!.remaining,breakSeconds:d.bookTimer!.breakSeconds,endsIn:(d.bookTimer!.endsAt-(at+s*sec))/sec});

describe('a rest is a fifth of the stage it closes',()=>{
 test('the table: 2→1, 5→1, 10→2, 15→3, 25→5 minutes',()=>expect(BREAK_SECONDS).toEqual([300,60,60,120,180,300]));
 test('resting at the 2-minute stage: 1 minute',()=>{
  const d=rest(running(),120);
  expect(d.bookTimer!.phase).toBe('break');
  expect(restOf(d,120)).toEqual({remaining:60,breakSeconds:60,endsIn:60});
 });
 test('resting again at the 5-minute stage: 1 minute',()=>{
  const d=rest(back(rest(running(),120),130,'run2'),130+180);
  expect(restOf(d,310)).toEqual({remaining:60,breakSeconds:60,endsIn:60});
 });
 test('resting again at the 10-minute stage: 2 minutes',()=>{
  const d=rest(back(rest(back(rest(running(),120),130,'run2'),310),320,'run3'),320+300);
  expect(restOf(d,620)).toEqual({remaining:120,breakSeconds:120,endsIn:120});
 });
 test('skipping rests, the first one goes by the last stage reached',()=>{
  expect(restOf(rest(running(),600),600).breakSeconds).toBe(120);
  expect(restOf(rest(running(),900),900).breakSeconds).toBe(180);
  expect(restOf(rest(running(),1500),1500).breakSeconds).toBe(300);
  expect(restOf(rest(running(),1800),1800).breakSeconds).toBe(300);
  expect(restOf(rest(running(),400),400).breakSeconds).toBe(60);
 });
 test('the plain 25-minute timer keeps its 5 minutes',()=>{
  const d=rest(startBookTimer(emptyData(),'run',subject,at,1500,'standard'),1500);
  expect(restOf(d,1500)).toEqual({remaining:300,breakSeconds:300,endsIn:300});
 });
});

describe('what does not change',()=>{
 test('a first rest at 10 minutes pays stages 2, 5 and 10 as before: 4 minutes + the plan minute, 500원',()=>{
  const d=rest(running(),600);
  expect(earned(getDay(d,key))).toBe(5);
  expect(moneySummary(d).balance).toBe(500);
  expect(focusBreakPayouts(d)).toEqual([expect.objectContaining({fromStage:1,stage:3,seconds:600})]);
 });
});

describe('the rest keeps its length',()=>{
 test('pausing and resuming a 1-minute rest keeps what is left of the minute',()=>{
  let d=rest(running(),120);
  d=pauseBookTimer(d,at+150*sec);
  expect(d.bookTimer).toMatchObject({remaining:30,breakSeconds:60,running:false});
  d=resumeBookTimer(d,at+200*sec);
  expect(d.bookTimer).toMatchObject({remaining:30,breakSeconds:60,endsAt:at+230*sec});
 });
 test('the rest-end alarm and notification follow the shorter rest',()=>{
  const d=rest(running(),120),t=d.bookTimer!;
  expect(restAlarmEnd(t)).toBe(at+180*sec);
  expect(breakAlarmAt(t,at+121*sec)).toBe(at+180*sec);
 });
 test('a rest saved before S2-14 has no length and reads as 5 minutes',()=>{
  const {breakSeconds:_gone,...old}=rest(running(),120).bookTimer!;
  expect(breakLength(old)).toBe(300);
  expect(breakLength({...old,breakSeconds:120})).toBe(120);
 });
 test('a length the screen cannot use reads as 5 minutes',()=>{
  const t=rest(running(),120).bookTimer!;
  for(const bad of [0,-60,1.5,NaN,3601,'60'])expect(breakLength({...t,breakSeconds:bad as number})).toBe(300);
  expect(breakLength({...t,breakSeconds:90})).toBe(90);
 });
 // Build 50: one shape check blocked the whole backup. A range, not the table, so a later table (say 90 s) never blocks one.
 test('backups take any whole length from 1 second to an hour, and refuse only broken ones',()=>{
  const d=rest(running(),120),with_=(v:unknown)=>()=>validateBackup(makeBackup({...d,bookTimer:{...d.bookTimer!,breakSeconds:v as number}},user),user);
  for(const ok of [60,90,1,3600])expect(with_(ok)).not.toThrow();
  for(const bad of [0,3601,1.5,'60'])expect(with_(bad)).toThrow();
 });
});
