jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import {emptyData,type RoutineData} from '../lib/routineModel';
import {reflectAlarmTimes,ruleLabel,shouldOpenWeekCheck,weeklySummary,wonLabel} from '../lib/weeklyReview';
import {COMMITMENT_POLICY,activeWeeklyRules,saveWeeklyReview} from '../lib/weeklyCommitments';
const T=COMMITMENT_POLICY.defaults.reflectTime,TH=Math.floor(T/100),TM=T%100;
import {BUILD_CHECKS,buildCheckReport} from '../lib/buildChecklist';

const MONDAY='2026-11-09',LAST='2026-11-02';
const at=(day:string,h:number,m=0)=>{const [y,mo,d]=day.split('-').map(Number);return new Date(y,mo-1,d,h,m);};
const session=(id:string,day:string,h:number,seconds:number)=>({id,subject:'수학',startedAt:at(day,h).toISOString(),completedAt:new Date(at(day,h).getTime()+seconds*1000).toISOString(),seconds,note:'오늘 한 것',next:''});
const withMorning=(data:RoutineData,day:string):RoutineData=>({...data,days:{...data.days,[day]:{paid:{morning:5,words:0,gym:0},morning:[],complete:[],responses:0,studySeconds:0}}});

describe('weeklySummary',()=>{
 it('adds up last week from saved records only',()=>{
  const data:RoutineData={...emptyData(),
   bookSessions:[session('a',LAST,9,1500),session('b','2026-11-04',9,600),session('c',MONDAY,9,900)],
   emergencyUnlocks:[{id:'e',at:at('2026-11-05',22).toISOString(),day:'2026-11-05',until:0,reason:'택배 연락',minutes:30,won:3000,order:1}],
   money:{id:'w',startedAt:at(LAST,5).toISOString(),rates:{} as never,days:{},entries:[
    {id:'r1',kind:'reward',amount:1000,at:at(LAST,10).toISOString(),note:'',day:LAST},
    {id:'r2',kind:'reward',amount:500,at:at(MONDAY,10).toISOString(),note:'',day:MONDAY},
    {id:'x',kind:'expense',amount:-2000,at:at(LAST,11).toISOString(),note:''},
   ]},
  };
  const s=weeklySummary(data,LAST,at(MONDAY,12).getTime());
  expect(s.studySeconds).toBe(2100);
  expect(s.studyDays).toBe(2);
  expect(s.earnedWon).toBe(1000);
  expect(s.emergencies).toEqual([{day:'2026-11-05',reason:'택배 연락'}]);
  expect(s.penaltyMinutes).toBe(30);
  expect(s.penaltyWon).toBe(3000);
  expect(s.empty).toBe(false);
 });
 it('marks an empty week',()=>{
  expect(weeklySummary(emptyData(),LAST,at(MONDAY,12).getTime()).empty).toBe(true);
 });
});

describe('shouldOpenWeekCheck',()=>{
 it('opens only on Monday after the morning routine, once a week',()=>{
  const morning=withMorning(emptyData(),MONDAY);
  expect(shouldOpenWeekCheck(emptyData(),MONDAY)).toBe(false);
  expect(shouldOpenWeekCheck(morning,MONDAY)).toBe(true);
  expect(shouldOpenWeekCheck(withMorning(emptyData(),'2026-11-10'),'2026-11-10')).toBe(false);
  expect(shouldOpenWeekCheck(saveWeeklyReview(morning,MONDAY),MONDAY)).toBe(false);
 });
});

describe('weekly rules',()=>{
 it('applies a chosen rule from the next Monday',()=>{
  const data=saveWeeklyReview(emptyData(),MONDAY,{kind:'reflectTime',value:2050},at(MONDAY,8).getTime());
  expect(activeWeeklyRules(data,'2026-11-15').reflectTime).toBe(T);
  expect(activeWeeklyRules(data,'2026-11-16').reflectTime).toBe(2050);
  expect(ruleLabel({kind:'reflectTime',value:2050})).toBe('밤 돌아보기 알림 20:50');
 });
});

describe('reflectAlarmTimes',()=>{
 it('skips tonight once tomorrow is promised and follows the rule time',()=>{
  const now=at(MONDAY,18).getTime();
  expect(reflectAlarmTimes(emptyData(),MONDAY,false,now)).toEqual([at(MONDAY,TH,TM),at('2026-11-10',TH,TM),at('2026-11-11',TH,TM)].map(d=>d.getTime()));
  expect(reflectAlarmTimes(emptyData(),MONDAY,true,now)[0]).toBe(at('2026-11-10',TH,TM).getTime());
  expect(reflectAlarmTimes(emptyData(),MONDAY,false,at(MONDAY,21).getTime())[0]).toBe(at('2026-11-10',TH,TM).getTime());
 });
});

describe('buildCheckReport',()=>{
 it('lists every item with marks and notes',()=>{
  const list={build:50,items:[{id:'a',title:'가'},{id:'b',title:'나'},{id:'c',title:'다'}]};
  const text=buildCheckReport(list,{a:{ok:true,note:''},b:{ok:false,note:' 알림 안 옴 '}},new Date(2026,10,9));
  expect(text).toBe('[빌드 50 확인] 2026-11-09\n됨 1 · 안 됨 1 · 미확인 1\n✓ 가\n✗ 나 — 알림 안 옴\n· 다');
 });
 it('keeps build numbers and item ids unique',()=>{
  expect(new Set(BUILD_CHECKS.map(b=>b.build)).size).toBe(BUILD_CHECKS.length);
  for(const b of BUILD_CHECKS)expect(new Set(b.items.map(i=>i.id)).size).toBe(b.items.length);
 });
 it('formats won',()=>{expect(wonLabel(-3000)).toBe('−3,000원');});
});
