import {emptyData,getDay,routineDay} from '../lib/routineModel';
import {finishFocusRun,pauseBookTimer,startBookBreak,startBookTimer} from '../lib/bookStudy';
import {claimFocusPlan} from '../lib/focusRamp';
import {startOutputStudy} from '../lib/handwriting';
import {focusQuitPenalty,penaltyMinutesOnDay,rewardSyncExtras} from '../lib/focusPenalty';
import {moneySummary,PROPOSED_MONEY_RATES,startMoneyRewards} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {beginEmergencyUnlock,cancelEmergencyUnlock,EMERGENCY_POLICY,emergencyBlock,emergencyOpenUntil,emergencyPrice,emergencyUnlocks,finishEmergencyUnlock,inSleepWindow,reconcileEmergency} from '../lib/emergencyUnlock';
import {dailyTimeline} from '../lib/dailyTimeline';
import {mergePlayLog} from '../lib/playLog';
import {timeWallet} from '../lib/timeWallet';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const fs=require('fs'),path=require('path');
const read=(f:string)=>(fs.readFileSync(path.join(__dirname,'../..',f),'utf8') as string).replace(/\r/g,'');
const at=new Date(2026,10,5,22).getTime(),key=routineDay(new Date(at)),min=60000,user='00000000-0000-4000-8000-000000000000';
const open=(d:RoutineData,id:string,now=at)=>finishEmergencyUnlock(beginEmergencyUnlock(d,id,'가족 연락',now),id,now+15*min,now);
const wallet=()=>startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at));

describe('when it is offered',()=>{
 test.each([[20,59,false],[21,0,true],[23,30,true],[3,0,true],[4,29,true],[4,30,false],[12,0,false]])('at %i:%i, %s',(h,m,inside)=>{
  expect(inSleepWindow(new Date(2026,10,5,h as number,m as number).getTime())).toBe(inside);
 });
 test('outside the sleep lock it is refused',()=>{
  const noon=new Date(2026,10,5,12).getTime();
  expect(emergencyBlock(emptyData(),undefined,noon)).toBe('not-sleep');
  expect(()=>beginEmergencyUnlock(emptyData(),'a','이유',noon)).toThrow(/21시/);
 });
 const studying=(now=at)=>startBookTimer(startOutputStudy(claimFocusPlan(emptyData(),'plan','수능','기출',now),'draft','수능',new Date(now)),'run','수능',now,120,'output');
 test('not during study, running or paused',()=>{
  expect(emergencyBlock(studying(),undefined,at+min)).toBe('studying');
  expect(emergencyBlock(pauseBookTimer(studying(),at+min),undefined,at+2*min)).toBe('studying');
  expect(()=>beginEmergencyUnlock(studying(),'a','이유',at+min)).toThrow(/공부 중/);
 });
 test('allowed during a rest and after study has ended',()=>{
  expect(emergencyBlock(startBookBreak(studying(),at+130000),undefined,at+140000)).toBeNull();
  expect(emergencyBlock(finishFocusRun(studying(),at+min),undefined,at+2*min)).toBeNull();
 });
 test('a reason is required',()=>{
  expect(()=>beginEmergencyUnlock(emptyData(),'a','   ',at)).toThrow(/이유/);
 });
 test('not while one is open',()=>{
  expect(emergencyBlock(open(emptyData(),'a'),undefined,at+min)).toBe('open');
 });
 test('ten seconds and fifteen minutes are the agreed numbers',()=>{
  expect(EMERGENCY_POLICY).toMatchObject({minutes:15,waitSeconds:10});
 });
});

describe('the price',()=>{
 test.each([[0,1,30,3000],[1,2,60,6000],[2,3,120,12000],[3,4,120,12000],[6,7,120,12000]])('after %i today, number %i costs %i minutes and %i won',(done,order,minutes,won)=>{
  let d=wallet();for(let i=0;i<done;i++)d=open(d,'r'+i,at+i*20*min);
  expect(emergencyPrice(d,at+done*20*min)).toEqual({order,minutes,won});
 });
 test('the count resets at 04:00',()=>{
  const d=open(open(emptyData(),'a',new Date(2026,10,6,3,0).getTime()),'b',new Date(2026,10,6,3,30).getTime());
  expect(emergencyPrice(d,new Date(2026,10,6,3,50).getTime()).order).toBe(3);
  expect(emergencyPrice(d,new Date(2026,10,6,4,5).getTime()).order).toBe(1);
 });
 test('with no money wallet the money part is nothing',()=>{
  expect(emergencyPrice(emptyData(),at)).toMatchObject({minutes:30,won:0});
 });
});

describe('the order: nothing is charged until the phone has opened',()=>{
 test('step 1 charges nothing',()=>{
  const d=beginEmergencyUnlock(wallet(),'a','이유',at);
  expect(d.emergencyPending).toMatchObject({id:'a',minutes:30,won:3000,order:1,reason:'이유'});
  expect(penaltyMinutesOnDay(d,key)).toBe(0);
  expect(moneySummary(d).balance).toBe(0);
 });
 test('a failed phone call leaves no charge and no trace',()=>{
  const d=cancelEmergencyUnlock(beginEmergencyUnlock(wallet(),'a','이유',at),'a');
  expect(d.emergencyPending).toBeUndefined();
  expect(emergencyUnlocks(d)).toEqual([]);
  expect(penaltyMinutesOnDay(d,key)).toBe(0);
  expect(emergencyPrice(d,at).order).toBe(1);
 });
 test('success charges minutes and money and keeps the reason',()=>{
  const d=open(wallet(),'a');
  expect(emergencyUnlocks(d)[0]).toMatchObject({id:'a',day:key,reason:'가족 연락',minutes:30,won:3000,order:1,until:at+15*min});
  expect(d.emergencyPending).toBeUndefined();
  expect(penaltyMinutesOnDay(d,key)).toBe(30);
  expect(moneySummary(d).balance).toBe(-3000);
 });
 test('finishing twice charges once',()=>{
  const once=open(wallet(),'a');
  expect(finishEmergencyUnlock(once,'a',at+15*min,at)).toBe(once);
  expect(beginEmergencyUnlock(once,'a','이유',at)).toBe(once);
 });
 test('beginning twice with one id keeps the first',()=>{
  const once=beginEmergencyUnlock(emptyData(),'a','이유',at);
  expect(beginEmergencyUnlock(once,'a','다른 이유',at)).toBe(once);
 });
 test('finishing an unknown id charges nothing',()=>{
  const d=emptyData();
  expect(finishEmergencyUnlock(d,'x',at,at)).toBe(d);
 });
 test('the reason is cut to one line',()=>{
  const d=beginEmergencyUnlock(emptyData(),'a','첫 줄\n둘째 '+'가'.repeat(300),at);
  expect(d.emergencyPending!.reason.length).toBe(EMERGENCY_POLICY.reasonChars);
  expect(d.emergencyPending!.reason.startsWith('첫 줄 둘째')).toBe(true);
 });
});

describe('the app dying part way',()=>{
 const entry={id:'a',at,until:at+15*min,minutes:15};
 test('dies after the phone opened: charged from the log, keeping the reason',()=>{
  const d=reconcileEmergency(beginEmergencyUnlock(wallet(),'a','이유',at),[entry],at+min);
  expect(emergencyUnlocks(d)[0]).toMatchObject({id:'a',reason:'이유',minutes:30,won:3000});
  expect(d.emergencyPending).toBeUndefined();
 });
 test('even with nothing remembered it is charged at the price of its turn',()=>{
  const d=reconcileEmergency(open(wallet(),'first',at-60*min),[{...entry,id:'b'}],at+min);
  expect(emergencyUnlocks(d)[1]).toMatchObject({id:'b',reason:'',minutes:60,won:6000,order:2});
 });
 test('seeing the log again changes nothing',()=>{
  const once=reconcileEmergency(wallet(),[entry],at+min);
  expect(reconcileEmergency(once,[entry],at+2*min)).toBe(once);
  expect(moneySummary(once).balance).toBe(-3000);
 });
 test('dies before the phone was asked: dropped once old, kept while the call may still run',()=>{
  const d=beginEmergencyUnlock(wallet(),'a','이유',at);
  expect(reconcileEmergency(d,[],at+30000)).toBe(d);
  const later=reconcileEmergency(d,[],at+EMERGENCY_POLICY.stalePendingMs+1);
  expect(later.emergencyPending).toBeUndefined();
  expect(emergencyUnlocks(later)).toEqual([]);
 });
 test('a build with no log leaves everything alone',()=>{
  const d=beginEmergencyUnlock(wallet(),'a','이유',at);
  expect(reconcileEmergency(d,undefined,at+999999999)).toBe(d);
 });
});

describe('time decides, not whether anything fired',()=>{
 const d=open(emptyData(),'a');
 test('open until the end and not after',()=>{
  expect(emergencyOpenUntil(d,undefined,at+14*min)).toBe(at+15*min);
  expect(emergencyOpenUntil(d,undefined,at+15*min)).toBe(0);
 });
 test('moving the clock back does not lengthen it',()=>{
  expect(emergencyOpenUntil(d,undefined,at-60*min)).toBe(0);
 });
 const swift=read('modules/routine-screen-time/ios/ScreenTimeState.swift');
 const lockedCode=swift.slice(swift.indexOf('static func locked('),swift.indexOf('static func priorityRequired'));
 test('Swift: study comes first and is never passed',()=>{
  expect(lockedCode.indexOf('focusUntil')).toBeLessThan(lockedCode.indexOf('emergencyOpen'));
  expect(lockedCode).toMatch(/focusUntil[\s\S]*return true[\s\S]*emergencyOpen\(state\)[\s\S]*return false/);
 });
 test('Swift: open is judged by the clock, and a far-off end counts as over',()=>{
  const code=swift.slice(swift.indexOf('static func emergencyOpen('),swift.indexOf('static func locked('));
  expect(code).toContain('until > now');
  expect(code).toMatch(/until - now <=/);
 });
 const module=read('modules/routine-screen-time/ios/RoutineScreenTimeModule.swift');
 const start=module.slice(module.indexOf('static func startEmergencyUnlock'),module.indexOf('static func adjustStudyRewards'));
 test('Swift: the schedule is set before anything opens, and a failure opens nothing',()=>{
  expect(start.indexOf('center.startMonitoring')).toBeGreaterThan(-1);
  expect(start.indexOf('center.startMonitoring')).toBeLessThan(start.indexOf('state.emergencyUntil = until'));
  expect(start.indexOf('state.emergencyUntil = until')).toBeLessThan(start.indexOf('state.penalty ='));
 });
 test('Swift: the schedule is over the 15 minute minimum and ends after the unlock does',()=>{
  expect(start).toContain('now - 60');
  expect(start).toContain('until + 20');
  expect(start).toContain('(15...30).contains(minutes)');
 });
 test('Swift: one id once, sleep hours only, never during study',()=>{
  expect(start.indexOf('first(where: { $0.id == id })')).toBeLessThan(start.indexOf('center.startMonitoring'));
  expect(start).toContain('ScreenTimeStorage.sleepLocked(state)');
  expect(start).toContain('state.focusUntil');
 });
 test('Swift: starting study ends it',()=>{
  const focus=module.slice(module.indexOf('AsyncFunction("setFocusWindow")'),module.indexOf('AsyncFunction("getStatus")'));
  expect(focus).toContain('state.emergencyUntil');
 });
 test('the extension relocks with the app closed: an ended interval and each minute of use both apply the lock',()=>{
  const monitor=read('targets/screentime/RoutineActivityMonitor.swift');
  expect(monitor.slice(monitor.indexOf('intervalDidEnd'),monitor.indexOf('eventDidReachThreshold'))).toContain('refresh()');
  expect(monitor.slice(monitor.indexOf('eventDidReachThreshold'))).toContain('ScreenTimeStorage.apply(state)');
 });
 test('both copies of the shared state stay the same',()=>{
  expect(read('targets/screentime/ScreenTimeState.swift')).toBe(swift);
 });
 test('new saved fields are optional, so an earlier state file still reads',()=>{
  expect(swift).toContain('var emergencyUntil: Double? = nil');
  expect(swift).toContain('var emergencyLog: [EmergencyEntry]? = nil');
  expect(swift).toContain('var emergency: Bool? = nil');
 });
});

describe('use stays off, and the rest of the lock agrees with it',()=>{
 const swift=read('modules/routine-screen-time/ios/ScreenTimeState.swift'),module=read('modules/routine-screen-time/ios/RoutineScreenTimeModule.swift');
 const start=module.slice(module.indexOf('static func startEmergencyUnlock'),module.indexOf('static func adjustStudyRewards'));
 test('opening never turns reward use on, and starting use is still the only place that does',()=>{
  expect(start).not.toContain('usingRewards');
  expect(module.match(/usingRewards = true/g)).toHaveLength(1);
  expect(swift).not.toMatch(/usingRewards = true/);
 });
 test('the shield reads only locked, so it agrees with use being off',()=>{
  const apply=swift.slice(swift.indexOf('static func apply('),swift.indexOf('static func snapshot('));
  expect(apply).toContain('let isLocked = locked(state)');
  expect(apply).not.toContain('emergency');
 });
 test('an empty balance is left to the usual rule, which only ever turns use off',()=>{
  const drop=swift.slice(swift.indexOf('static func dropExhaustedUse'),swift.indexOf('/// Display only'));
  expect(drop).toContain('state.usingRewards = false');
  expect(drop).not.toContain('emergency');
 });
 test('the record opens a stretch for it with use off, and closes it at its own end',()=>{
  const play=swift.slice(swift.indexOf('static func recordPlay'),swift.indexOf('private static func playCutoff'));
  expect(play).toContain('state.usingRewards == true || emergency');
  expect(play).toContain('end = min(end, until)');
  expect(play).toContain('emergency: emergency ? true : nil');
 });
 test('use counted while open goes through the same callback',()=>{
  const monitor=read('targets/screentime/RoutineActivityMonitor.swift');
  expect(monitor).not.toContain('emergency');
  expect(monitor).toContain('state.consumed = max(previous');
 });
 test('starting study closes it now, and the record ends at that moment',()=>{
  const focus=module.slice(module.indexOf('AsyncFunction("setFocusWindow")'),module.indexOf('AsyncFunction("getStatus")'));
  expect(focus).toContain('if ScreenTimeStorage.emergencyOpen(state) { state.emergencyUntil = Date().timeIntervalSince1970 }');
  expect(focus.indexOf('state.focusUntil = until / 1000')).toBeLessThan(focus.indexOf('state.emergencyUntil'));
  const until=at+15*min,d=open(emptyData(),'a');
  expect(emergencyOpenUntil(d,0,at+min)).toBe(0);
  expect(emergencyOpenUntil(d,until,at+min)).toBe(until);
 });
});

describe('the penalty is taken once, on both sides',()=>{
 const module=read('modules/routine-screen-time/ios/RoutineScreenTimeModule.swift');
 test('a sync can only raise it, so it cannot undo what the phone already added',()=>{
  expect(module).toContain('state.penalty = max(state.penalty ?? 0, penalty)');
 });
 test('the phone adds once per id, returning before it adds on a repeat',()=>{
  const start=module.slice(module.indexOf('static func startEmergencyUnlock'),module.indexOf('static func adjustStudyRewards'));
  expect(start.indexOf('first(where: { $0.id == id })')).toBeLessThan(start.indexOf('state.penalty ='));
  expect(start.match(/state\.penalty =/g)).toHaveLength(1);
 });
 const base={supportsHandwritingRewards:true,supportsMinuteHandwriting:true};
 test('a sync before the app has recorded it sends less, which the phone keeps at its own higher value',()=>{
  const before=beginEmergencyUnlock(emptyData(),'a','이유',at);
  expect(rewardSyncExtras(before,key,base)).toMatchObject({penalty:0});
  expect(Math.max(30,rewardSyncExtras(before,key,base).penalty!)).toBe(30);
 });
 test('once recorded the app sends the same number, so it is not counted twice',()=>{
  expect(Math.max(30,rewardSyncExtras(open(emptyData(),'a'),key,base).penalty!)).toBe(30);
 });
 test('recovering from the log charges what the phone took, even if the table differs',()=>{
  const d=reconcileEmergency(emptyData(),[{id:'a',at,until:at+15*min,minutes:15,penalty:45}],at+min);
  expect(penaltyMinutesOnDay(d,key)).toBe(45);
 });
 test('right at 04:00 the app records the day the phone opened on',()=>{
  const before=new Date(2026,10,6,3,59,59).getTime(),opened=new Date(2026,10,6,4,0,1).getTime();
  const d=finishEmergencyUnlock(beginEmergencyUnlock(emptyData(),'a','이유',before),'a',opened+15*min,opened+1000);
  expect(emergencyUnlocks(d)[0].day).toBe(routineDay(new Date(opened)));
 });
 test('a closed unlock is not reported open and does not stop the next one',()=>{
  const d=open(emptyData(),'a');
  expect(emergencyBlock(d,0,at+min)).toBeNull();
  expect(()=>beginEmergencyUnlock(d,'b','이유',at+min,0)).not.toThrow();
 });
});

describe('the 60 minute carry-over limit stays as it is',()=>{
 const swift=read('modules/routine-screen-time/ios/ScreenTimeState.swift');
 test('the rule is unchanged',()=>{
  expect(swift).toContain('state.debtIn = min(60, max(0, (state.penalty ?? 0) + (state.debtIn ?? 0) + state.consumed - total))');
 });
 test('minutes past it do not move on, while the money is taken in full',()=>{
  let d=wallet();for(let i=0;i<3;i++)d=open(d,'r'+i,at+i*20*min);
  const penalty=penaltyMinutesOnDay(d,key);
  expect(penalty).toBe(210);
  expect(Math.min(60,Math.max(0,penalty))).toBe(60);
  expect(moneySummary(d).balance).toBe(-21000);
 });
});

describe('it leaves the quit penalty alone',()=>{
 test('a quit is still charged after a big emergency, since its cap counts only quits',()=>{
  let d=open(open(open(emptyData(),'a',at),'b',at+20*min),'c',at+40*min);
  const later=at+60*min;
  d=startBookTimer(startOutputStudy(claimFocusPlan(d,'plan','수능','기출',later),'draft','수능',new Date(later)),'run','수능',later,120,'output');
  expect(focusQuitPenalty(d,later+90000)).toMatchObject({minutes:10});
 });
});

describe('the record of the day',()=>{
 test('penalties count in the totals',()=>{
  const t=dailyTimeline(open(wallet(),'a'),key,null);
  expect(t.totals.penaltyMinutes).toBe(30);
  expect(t.totals.penaltyWon).toBe(3000);
 });
 test('and the device is told the whole penalty',()=>{
  expect(rewardSyncExtras(open(emptyData(),'a'),key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true})).toMatchObject({penalty:30});
 });
 const status={supportsPlayLog:true,enabled:true,rewardMode:true,day:key,playLogSince:at-1000,consumedMinutes:0,playLog:[{start:at,end:at+5*min,emergency:true},{start:at-90*min,end:at-80*min}]} as any;
 test('play time marks which stretch was an emergency, and keeps it when saved',()=>{
  const live=dailyTimeline(emptyData(),key,status,at+6*min).items.filter(i=>i.kind==='play') as any[];
  expect(live.find(i=>i.start===at).emergency).toBe(true);
  expect(live.find(i=>i.start===at-90*min).emergency).toBeUndefined();
  const saved=dailyTimeline(mergePlayLog(emptyData(),status,at+6*min),key,null,at+6*min).items.filter(i=>i.kind==='play') as any[];
  expect(saved.find(i=>i.start===at).emergency).toBe(true);
 });
 test('the screen shows the label, the reason and the penalty',()=>{
  const screen=read('src/features/routine/DailyTimeline.tsx');
  expect(screen).toContain('긴급 해제');
  expect(screen).toContain('EmergencyDayRecords');
 });
 test('the wallet says so while it is open',()=>{
  const native={supported:true,authorized:true,enabled:true,rewardMode:true,day:key,grantedMinutes:0,consumedMinutes:0,morningComplete:false,usingRewards:false,policyVersion:2,locked:false,sleepLocked:true,emergencyUntil:at+5*min} as any;
  expect(timeWallet(getDay(emptyData(),key),key,native,at).reason).toBe('긴급 해제 중');
 });
});

describe('saved data never blocks the app',()=>{
 test.each([['text'],[{}],[[null,5,{id:1},{id:'x',day:'d',minutes:-1}]]])('broken rows %j are skipped',bad=>{
  const d={...emptyData(),emergencyUnlocks:bad as never};
  expect(emergencyUnlocks(d)).toEqual([]);
  expect(penaltyMinutesOnDay(d,key)).toBe(0);
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
 });
 test('a broken reminder is dropped',()=>{
  const d=reconcileEmergency({...emptyData(),emergencyPending:'x' as never},[],at);
  expect(d.emergencyPending).toBeUndefined();
 });
 test('goes through a backup',()=>{
  expect(()=>validateBackup(makeBackup(open(wallet(),'a'),user),user)).not.toThrow();
 });
});
