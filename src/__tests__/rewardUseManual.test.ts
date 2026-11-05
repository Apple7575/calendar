import {timeWallet} from '../lib/timeWallet';
import {emptyDay} from '../lib/routineModel';

const fs=require('fs'),path=require('path');
const read=(file:string)=>fs.readFileSync(path.join(__dirname,'../..',file),'utf8') as string;
const moduleSwift=read('modules/routine-screen-time/ios/RoutineScreenTimeModule.swift');
const stateSwift=read('modules/routine-screen-time/ios/ScreenTimeState.swift');

/** Swift cannot run here. These fix the shape of the rule; the behaviour itself is a device check. */
describe('reward use turns on only when the user asks',()=>{
 test('finishing the morning routine does not start use, and starting use is the only place that does',()=>{
  expect(moduleSwift.match(/usingRewards = true/g)).toHaveLength(1);
  const start=moduleSwift.indexOf('static func startRewardUse'),end=moduleSwift.indexOf('static func adjustStudyRewards');
  expect(moduleSwift.indexOf('usingRewards = true')).toBeGreaterThan(start);
  expect(moduleSwift.indexOf('usingRewards = true')).toBeLessThan(end);
  expect(stateSwift).not.toMatch(/usingRewards = true/);
 });
 test('every write drops use on an empty balance, before a refill can reopen the apps and after the write itself',()=>{
  const update=stateSwift.slice(stateSwift.indexOf('static func update'),stateSwift.indexOf('static func recordPlay'));
  const before=update.indexOf('dropExhaustedUse(&state)'),body=update.indexOf('try body(&state)'),after=update.lastIndexOf('dropExhaustedUse(&state)'),play=update.indexOf('recordPlay(&state)');
  expect(before).toBeGreaterThan(-1);
  expect(before).toBeLessThan(body);
  expect(after).toBeGreaterThan(body);
  expect(after).toBeLessThan(play);
 });
 test('the app and the extension compile the same rule',()=>{
  expect(read('targets/screentime/ScreenTimeState.swift')).toBe(stateSwift);
 });
});

describe('the wallet after use stopped on an empty balance',()=>{
 const key='2026-11-05',native:any={supported:true,authorized:true,enabled:true,rewardMode:true,day:key,grantedMinutes:30,consumedMinutes:30,morningComplete:true,usingRewards:false,policyVersion:2,locked:true};
 const day=()=>{const d=emptyDay();d.paid={morning:10,words:20,gym:0};return d};
 test('says the time is used up, not that it is waiting',()=>{
  expect(timeWallet(day(),key,native)).toMatchObject({balance:0,available:0,held:0,reason:'사용 시간을 모두 썼어요'});
 });
 test('a refill waits for the switch',()=>{
  expect(timeWallet(day(),key,{...native,grantedMinutes:35})).toMatchObject({balance:5,available:5,paused:true,reason:'모은 시간 사용 대기'});
 });
});
