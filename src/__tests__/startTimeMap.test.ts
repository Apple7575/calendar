jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import {emptyData,type RoutineData} from '../lib/routineModel';
import {startTimeHint,startTimeMap} from '../lib/startTimeMap';

// 2026-11-07 is a Saturday. The 28 days before it run 10-10 (Sat) … 11-06 (Fri).
const at=(day:string,h:number,m=0)=>{const [y,mo,d]=day.split('-').map(Number);return new Date(y,mo-1,d,h,m).toISOString();};
const session=(id:string,startedAt:string)=>({id,subject:'일본어',startedAt,completedAt:startedAt,seconds:1500,note:'',next:''});
const withSessions=(...starts:string[]):RoutineData=>({...emptyData(),bookSessions:starts.map((s,i)=>session('s'+i,s))});
const SAT='2026-11-07';

describe('startTimeMap',()=>{
 it('takes each day\'s first start and the middle value per weekday',()=>{
  const data=withSessions(
   at('2026-10-17',10,40),at('2026-10-17',8,0), // Sat: first start 08:00
   at('2026-10-24',11,0),
   at('2026-10-31',10,0),
   at('2026-11-02',9,0), // Mon
  );
  const map=startTimeMap(data,SAT);
  const sat=map.days.find(d=>d.weekday===6)!;
  expect(sat).toMatchObject({weekday:6,label:'토',seen:4,started:3,median:'10:00'}); // 08:00 · 10:00 · 11:00
  expect(map.days.find(d=>d.weekday===1)).toMatchObject({seen:4,started:1,median:'09:00'});
  expect(map.days.map(d=>d.label)).toEqual(['월','화','수','목','금','토','일']);
 });
 it('counts a start after midnight on the day before, and keeps it late',()=>{
  // Fri 11-06 01:30 belongs to Thu 11-05; Thu 10-29 23:00.
  const data=withSessions(at('2026-11-06',1,30),at('2026-10-29',23,0));
  const thu=startTimeMap(data,SAT).days.find(d=>d.weekday===4)!;
  expect(thu).toMatchObject({started:2,median:'00:15'}); // middle of 23:00 and 25:30
 });
 it('leaves out today and anything older than 4 weeks',()=>{
  const data=withSessions(at(SAT,6,0),at('2026-10-10',6,0),at('2026-10-03',6,0));
  const sat=startTimeMap(data,SAT).days.find(d=>d.weekday===6)!;
  expect(sat).toMatchObject({seen:4,started:1,median:'06:00'}); // only 10-10
 });
 it('rounds the middle value to 5 minutes',()=>{
  const data=withSessions(at('2026-10-31',10,1),at('2026-10-24',10,8));
  expect(startTimeMap(data,SAT).days.find(d=>d.weekday===6)!.median).toBe('10:05'); // 10:04.5
 });
 it('ignores broken sessions',()=>{
  const data={...emptyData(),bookSessions:[{startedAt:'x'},null,{...session('a',at('2026-10-31',9,0))}]} as unknown as RoutineData;
  expect(startTimeMap(data,SAT).days.find(d=>d.weekday===6)).toMatchObject({started:1,median:'09:00'});
  expect(startTimeMap({...emptyData(),bookSessions:undefined} as unknown as RoutineData,SAT).days.every(d=>d.started===0&&d.median===null)).toBe(true);
 });
});

describe('startTimeHint',()=>{
 const data=withSessions(at('2026-10-17',8,0),at('2026-10-24',11,0),at('2026-10-31',10,0));
 it('speaks about tomorrow\'s weekday',()=>{
  // Set on Friday 11-06 for Saturday 11-07: the 4 weeks before tomorrow.
  expect(startTimeHint(data,'2026-11-07')).toBe('최근 4주 토요일은 보통 10:00쯤 시작했어요 (4번 중 3번).');
 });
 it('says there is too little when fewer than 2 days started',()=>{
  expect(startTimeHint(withSessions(at('2026-10-31',10,0)),'2026-11-07')).toBe('아직 토요일 기록이 적어요. 몇 주 쓰면 평소 시작 시각이 보여요.');
 });
});

describe('matches the promise rule',()=>{
 it('reads startedAt, the same field the promise check reads, not completedAt',()=>{
  // Started Fri 10-30 23:50, finished Sat 10-31 00:40: it belongs to Friday.
  const data={...emptyData(),bookSessions:[{...session('a',at('2026-10-30',23,50)),completedAt:at('2026-10-31',0,40)}]} as RoutineData;
  const map=startTimeMap(data,SAT);
  expect(map.days.find(d=>d.weekday===5)).toMatchObject({started:1,median:'23:50'});
  expect(map.days.find(d=>d.weekday===6)!.started).toBe(0);
 });
 it('puts a 02:00 start on the day before, like routineDay (04:00)',()=>{
  const data=withSessions(at('2026-10-31',2,0),at('2026-10-31',4,0)); // Sat 02:00 → Fri; Sat 04:00 → Sat
  const map=startTimeMap(data,SAT);
  expect(map.days.find(d=>d.weekday===5)).toMatchObject({started:1,median:'02:00'});
  expect(map.days.find(d=>d.weekday===6)).toMatchObject({started:1,median:'04:00'});
 });
 it('gives a plain line with no record at all',()=>{
  expect(startTimeHint(emptyData(),'2026-11-07')).toBe('아직 토요일 기록이 적어요. 몇 주 쓰면 평소 시작 시각이 보여요.');
 });
});
