import {emptyData,routineDay,type RoutineData} from '../lib/routineModel';
import {dailyTimeline,durationLabel,timelineBounds} from '../lib/dailyTimeline';
import {mergePlayLog,playDayState} from '../lib/playLog';
import {validateBackup} from '../lib/routineBackup';
import type {ScreenTimeStatus} from '../lib/screenTime';
jest.mock('../lib/supabase',()=>({supabase:{}}));

const at=(d:number,h:number,m=0)=>new Date(2026,10,d,h,m).getTime();
const iso=(n:number)=>new Date(n).toISOString();
const KEY='2026-11-05',NOW=at(5,20);
const native=(over:Partial<ScreenTimeStatus>={}):ScreenTimeStatus=>({supported:true,authorized:true,day:KEY,enabled:true,rewardMode:true,selectedApps:1,selectedCategories:0,selectedWebsites:0,grantedMinutes:30,consumedMinutes:5,morningComplete:true,locked:false,lastEvent:'',lastEventAt:0,supportsPlayLog:true,playLogSince:at(3,10),playLog:[],...over});
const session=(id:string,start:number,end:number,seconds:number,subject='전기기사')=>({id,subject,startedAt:iso(start),completedAt:iso(end),seconds,note:'',next:'',rewardMode:'output' as const});
const review=(id:string,wordId:string,deckId:string,when:number,seconds=30,voidedAt?:string)=>({id,wordId,deckId,day:routineDay(new Date(when)),at:iso(when),grade:3,seconds,phase:'review',mode:'daily',before:{},after:{},completed:true,voidedAt}) as any;
const base=(over:Partial<RoutineData>={}):RoutineData=>({...emptyData(),decks:[{id:'n2',name:'JLPT N2'} as any],...over});

describe('the routine day',()=>{
 test('runs from 04:00 to the next 04:00, as the rest of the app',()=>{
  expect(timelineBounds(KEY)).toEqual({start:at(5,4),end:at(6,4)});
  const data=base({bookSessions:[session('late',at(6,3),at(6,3,30),1800),session('next',at(6,4,10),at(6,4,20),600)]});
  expect(dailyTimeline(data,KEY,null,at(6,23)).items.map(i=>i.id)).toEqual(['late']);
 });
});

describe('the list',()=>{
 test('merges study, decks and play in time order',()=>{
  const data=base({bookSessions:[session('s',at(5,14),at(5,14,25),1500)],reviewHistory:[review('r1','a','n2',at(5,9)),review('r2','b','n2',at(5,9,2))]});
  const t=dailyTimeline(data,KEY,native({playLog:[{start:at(5,12),end:at(5,12,40)}]}),NOW);
  expect(t.items.map(i=>i.kind)).toEqual(['deck','play','study']);
  expect(t.items[1]).toMatchObject({kind:'play',start:at(5,12),end:at(5,12,40),seconds:2400});
  expect(t.items[2]).toMatchObject({kind:'study',subject:'전기기사',start:at(5,14),end:at(5,14,25),seconds:1500});
 });
 test('a study row counts the real study seconds, not the span with its pauses',()=>{
  const t=dailyTimeline(base({bookSessions:[session('s',at(5,14),at(5,15),600)]}),KEY,null,NOW);
  expect(t.totals.studySeconds).toBe(600);expect(t.items[0]).toMatchObject({start:at(5,14),end:at(5,15),seconds:600});
 });
 test('a running timer shows as a live row, once',()=>{
  const timer={id:'run',subject:'회로',startedAt:iso(at(5,19,50)),phase:'focus',endsAt:NOW,remaining:0,running:true,rewardMode:'output',focusElapsed:0,focusResumedAt:at(5,19,50)} as any;
  const t=dailyTimeline(base({bookTimer:timer}),KEY,null,NOW);
  expect(t.items[0]).toMatchObject({id:'run',kind:'study',live:true,seconds:600,end:NOW});
  expect(dailyTimeline(base({bookTimer:timer}),'2026-11-04',null,NOW).items).toEqual([]);
  expect(dailyTimeline(base({bookTimer:timer,bookSessions:[session('run',at(5,19),at(5,19,10),600)]}),KEY,null,NOW).items.filter(i=>i.id==='run')).toHaveLength(1);
 });
 test('a timer waiting after a photo adds nothing beyond its saved session',()=>{
  const timer={id:'run',subject:'회로',startedAt:iso(at(5,19)),phase:'idle',endsAt:NOW,remaining:0,running:false,awaitingChoice:true} as any;
  expect(dailyTimeline(base({bookTimer:timer,bookSessions:[session('run',at(5,19),at(5,19,10),600)]}),KEY,null,NOW).items).toHaveLength(1);
 });
});

describe('deck sittings',()=>{
 test('group one deck within ten minutes, counting distinct cards and answer time',()=>{
  const data=base({reviewHistory:[review('1','a','n2',at(5,9),30),review('2','a','n2',at(5,9,5),20),review('3','b','n2',at(5,9,10),40),review('4','c','n2',at(5,9,30),30)]});
  const rows=dailyTimeline(data,KEY,null,NOW).items;
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({kind:'deck',deckName:'JLPT N2',cards:2,seconds:90,start:at(5,9)-30000,end:at(5,9,10)});
  expect(rows[1]).toMatchObject({cards:1,seconds:30});
 });
 test('another deck starts a new sitting, undone answers are gone, a removed deck keeps its row',()=>{
  const data=base({reviewHistory:[review('1','a','n2',at(5,9)),review('2','b','gone',at(5,9,1)),review('3','c','n2',at(5,9,2),30,iso(at(5,9,3)))]});
  expect(dailyTimeline(data,KEY,null,NOW).items.map(i=>i.kind==='deck'&&[i.deckName,i.cards])).toEqual([['JLPT N2',1],['보관된 단어장',1]]);
 });
 test('old days with only a daily total say the time is unknown instead of inventing a row',()=>{
  const data=base({days:{[KEY]:{paid:{morning:0,words:0,gym:0},morning:[],complete:[],responses:12,studySeconds:600}} as any});
  const t=dailyTimeline(data,KEY,null,NOW);
  expect(t.items).toEqual([]);expect(t.totals.untimedResponses).toBe(12);expect(t.totals.studySeconds).toBe(600);
 });
});

describe('totals',()=>{
 test('add study and decks, and show earned minutes and penalties of that day',()=>{
  const data=base({bookSessions:[session('s',at(5,14),at(5,14,25),1500)],reviewHistory:[review('r','a','n2',at(5,9),60)],focusPenalties:[{id:'p',timerId:'t',at:iso(at(5,15)),day:KEY,minutes:10,won:1000},{id:'q',timerId:'u',at:iso(at(4,15)),day:'2026-11-04',minutes:10,won:0}],days:{[KEY]:{paid:{morning:10,words:5,gym:0},bonus:{handwriting:7},morning:[],complete:[],responses:1,studySeconds:60}} as any});
  expect(dailyTimeline(data,KEY,null,NOW).totals).toMatchObject({studySeconds:1560,earnedMinutes:22,penaltyMinutes:10,penaltyWon:1000});
 });
 test('labels durations plainly',()=>{
  expect([durationLabel(0),durationLabel(40),durationLabel(1500),durationLabel(3900)]).toEqual(['0분','1분 미만','25분','1시간 5분']);
 });
});

describe('play time honesty',()=>{
 test('a day before the record began is unknown, never zero',()=>{
  const log=mergePlayLog(base(),native({playLogSince:at(5,10)}),at(5,11));
  const t=dailyTimeline(log,'2026-11-04',null,at(5,11));
  expect(t.play).toEqual({state:'none'});expect(t.totals.playSeconds).toBeNull();
 });
 test('a build without the record is unknown, even today',()=>{
  const data=base();
  expect(dailyTimeline(data,KEY,null,NOW).totals.playSeconds).toBeNull();
  expect(mergePlayLog(data,{...native(),supportsPlayLog:undefined},NOW)).toBe(data);
 });
 test('a recorded day without play is a real zero',()=>{
  const log=mergePlayLog(base(),native(),at(5,11));
  expect(dailyTimeline(log,'2026-11-04',null,at(5,11)).totals.playSeconds).toBe(0);
 });
 test('the first day says when the record began',()=>{
  const log=mergePlayLog(base(),native({playLogSince:at(5,10)}),at(5,11));
  expect(dailyTimeline(log,KEY,native({playLogSince:at(5,10)}),at(5,11)).play).toEqual({state:'partial',since:at(5,10)});
 });
 test('days while the restriction was off are unknown, days after reconnecting count again',()=>{
  let d=mergePlayLog(base(),native({playLogSince:at(1,10)}),at(1,11));
  d=mergePlayLog(d,native({playLogSince:at(4,10)}),at(4,11));
  expect(playDayState(d,'2026-11-02',at(5,11))).toEqual({state:'none'});
  expect(playDayState(d,'2026-11-04',at(5,11))).toEqual({state:'partial',since:at(4,10)});
 });
 test('a disconnected status does not extend what was recorded',()=>{
  const d=mergePlayLog(base(),native({playLogSince:at(1,10)}),at(1,11));
  expect(mergePlayLog(d,native({enabled:false,playLogSince:undefined}),at(4,11))).toBe(d);
 });
 test('the open interval runs to now and is not saved until it closes',()=>{
  const status=native({playLog:[{start:at(5,19)}]});
  const d=mergePlayLog(base(),status,NOW);
  expect(d.playLog?.rows).toEqual([]);
  expect(dailyTimeline(d,KEY,status,NOW).items[0]).toMatchObject({kind:'play',live:true,start:at(5,19),end:NOW,seconds:3600});
 });
 test('rows from the phone still show before they are saved, without doubling',()=>{
  const row={start:at(5,12),end:at(5,12,30)},status=native({playLog:[row]});
  const d=mergePlayLog(base(),status,NOW);
  expect(d.playLog?.rows).toEqual([row]);
  expect(dailyTimeline(d,KEY,status,NOW).totals.playSeconds).toBe(1800);
  expect(dailyTimeline(base(),KEY,status,NOW).totals.playSeconds).toBe(1800);
 });
 test('a repeated status writes nothing, so polling does not touch storage',()=>{
  const status=native({playLog:[{start:at(5,12),end:at(5,12,30)}]}),d=mergePlayLog(base(),status,NOW);
  expect(mergePlayLog(d,status,NOW+60000)).toBe(d);
  expect(mergePlayLog(d,status,NOW+3600000)).not.toBe(d);
 });
 test('rows the phone already dropped stay, and its moved start is not a gap',()=>{
  let d=mergePlayLog(base(),native({playLogSince:at(1,10),playLog:[{start:at(1,12),end:at(1,13)}]}),at(4,11));
  d=mergePlayLog(d,native({playLogSince:at(1,13),playLog:[{start:at(4,12),end:at(4,13)}]}),at(4,14));
  expect(d.playLog?.rows.map(r=>r.start)).toEqual([at(1,12),at(4,12)]);
  expect(d.playLog?.coverage).toHaveLength(1);
  expect(playDayState(d,'2026-11-02',at(5,11))).toEqual({state:'full'});
 });
 test('storage is capped and the days it dropped go back to unknown',()=>{
  const rows=Array.from({length:3001},(_,i)=>({start:at(1,10)+i*1000,end:at(1,10)+i*1000+500}));
  const d=mergePlayLog(base(),native({playLogSince:at(1,10),playLog:rows}),at(5,11));
  expect(d.playLog?.rows).toHaveLength(3000);
  expect(d.playLog?.rows[0].start).toBe(rows[1].start);
  expect(playDayState({...d,playLog:{...d.playLog!,rows:[{start:at(3,10),end:at(3,11)}],floor:at(3,10)}},'2026-11-02',at(5,11))).toEqual({state:'none'});
 });
});

describe('saved values are never trusted',()=>{
 test('broken rows count as nothing and never block a backup',()=>{
  const junk=base({playLog:{rows:[null,{start:'x',end:1},{start:at(5,12),end:at(5,11)},{start:at(5,12),end:at(5,13)}],coverage:'bad'} as any});
  expect(dailyTimeline(junk,KEY,null,NOW).items).toHaveLength(1);
  expect(()=>validateBackup({schema:'routine.backup.v1',userId:'u',createdAt:iso(NOW),data:junk},'u')).not.toThrow();
  expect(()=>mergePlayLog(junk,native(),NOW)).not.toThrow();
 });
 test('a backup without the field still restores',()=>{
  expect(()=>validateBackup({schema:'routine.backup.v1',userId:'u',createdAt:iso(NOW),data:base()},'u')).not.toThrow();
 });
});

describe('real use beside play time',()=>{
 test('today uses the phone value, including a real zero',()=>{
  expect(dailyTimeline(base(),KEY,native({consumedMinutes:12}),NOW).totals.consumedMinutes).toBe(12);
  expect(dailyTimeline(base(),KEY,native({consumedMinutes:0}),NOW).totals.consumedMinutes).toBe(0);
 });
 test('a past day uses the value kept at the 04:00 change, saved or still on the phone',()=>{
  const status=native({consumedMinutes:12,consumedByDay:{'2026-11-04':40}});
  expect(dailyTimeline(base(),'2026-11-04',status,NOW).totals.consumedMinutes).toBe(40);
  const saved=mergePlayLog(base(),status,NOW);
  expect(saved.playLog?.consumed).toEqual({'2026-11-04':40});
  expect(dailyTimeline(saved,'2026-11-04',null,NOW).totals.consumedMinutes).toBe(40);
 });
 test('a past day with no value stays unknown instead of zero',()=>{
  expect(dailyTimeline(base(),'2026-11-03',native({consumedByDay:{'2026-11-04':40}}),NOW).totals.consumedMinutes).toBeNull();
 });
 test('no phone, an old build or a disconnected phone shows nothing for today',()=>{
  expect(dailyTimeline(base(),KEY,null,NOW).totals.consumedMinutes).toBeNull();
  expect(dailyTimeline(base(),KEY,{...native(),supportsPlayLog:undefined},NOW).totals.consumedMinutes).toBeNull();
  expect(dailyTimeline(base(),KEY,native({enabled:false}),NOW).totals.consumedMinutes).toBeNull();
 });
 test('the phone value for another day does not leak into today',()=>{
  expect(dailyTimeline(base(),KEY,native({day:'2026-11-04',consumedMinutes:9}),NOW).totals.consumedMinutes).toBeNull();
 });
 test('a repeated status writes nothing and a new value is saved once',()=>{
  const status=native({consumedByDay:{'2026-11-04':40}}),d=mergePlayLog(base(),status,NOW);
  expect(mergePlayLog(d,status,NOW+60000)).toBe(d);
  expect(mergePlayLog(d,native({consumedByDay:{'2026-11-04':40,[KEY]:5}}),NOW+60000).playLog?.consumed).toEqual({'2026-11-04':40,[KEY]:5});
 });
 test('broken values count as nothing and old days fall off past the cap',()=>{
  const junk=base({playLog:{rows:[],coverage:[],consumed:{'2026-11-04':'x','2026-11-03':-1,'2026-11-02':7}}} as any);
  expect(dailyTimeline(junk,'2026-11-04',null,NOW).totals.consumedMinutes).toBeNull();
  expect(dailyTimeline(junk,'2026-11-03',null,NOW).totals.consumedMinutes).toBeNull();
  expect(dailyTimeline(junk,'2026-11-02',null,NOW).totals.consumedMinutes).toBe(7);
  const many=Object.fromEntries(Array.from({length:401},(_,i)=>[new Date(2025,0,1+i,12).toISOString().slice(0,10),1]));
  const capped=mergePlayLog(base(),native({consumedByDay:many}),NOW).playLog!.consumed!;
  expect(Object.keys(capped)).toHaveLength(400);expect(capped['2025-01-01']).toBeUndefined();
 });
});
