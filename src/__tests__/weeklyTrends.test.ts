import {emptyData,type RoutineData} from '../lib/routineModel';
import {clockLabel,firstStarts,median,weekTrends} from '../lib/weeklyTrends';

const LAST='2026-11-02';
const at=(day:string,h:number,m=0)=>{const [y,mo,d]=day.split('-').map(Number);return new Date(y,mo-1,d,h,m);};
const session=(id:string,start:Date,seconds=1500,note='오늘 한 것')=>({id,subject:'수학',startedAt:start.toISOString(),completedAt:new Date(start.getTime()+seconds*1000).toISOString(),seconds,note,next:''});

describe('first start',()=>{
 it('keeps the earliest start of each 04:00 day and counts 01:00 as late',()=>{
  const data:RoutineData={...emptyData(),bookSessions:[
   session('a',at(LAST,10,40)),session('b',at(LAST,9,0)),
   session('c',at('2026-11-04',1,0)), // 11월 3일의 늦은 공부
  ]};
  const starts=firstStarts(data);
  expect(starts.get(LAST)).toBe(300);
  expect(starts.get('2026-11-03')).toBe(1260);
  expect(clockLabel(1260)).toBe('01:00');
 });
 it('uses the median and shows a dash without starts',()=>{
  expect(median([400,300,500])).toBe(400);
  expect(median([300,400])).toBe(350);
  expect(median([])).toBeNull();
  expect(clockLabel(400)).toBe('10:40');
  expect(clockLabel(null)).toBe('—');
 });
});

describe('weekTrends',()=>{
 it('counts studied days for four weeks, oldest first, with zero for empty weeks',()=>{
  const data:RoutineData={...emptyData(),bookSessions:[
   session('w4',at('2026-10-14',9)),
   session('w1a',at(LAST,9)),session('w1b',at('2026-11-03',10)),session('w1c',at('2026-11-05',11)),
  ]};
  const t=weekTrends(data,LAST);
  expect(t.studyDays4w).toEqual([1,0,0,3]);
  expect(t.firstStartMedian).toBe(360);
  expect(t.firstStartDays).toBe(3);
 });
 it('reads saved-time days only from settled interest days',()=>{
  const none=weekTrends(emptyData(),LAST);
  expect([none.savedTenDays,none.savedKnownDays]).toEqual([0,0]);
  const data={...emptyData(),interestDays:{
   [LAST]:{unusedMinutes:25,won:600,emergency:false},
   '2026-11-03':{unusedMinutes:5,won:0,emergency:false},
   '2026-11-04':{unusedMinutes:10,won:300,emergency:false},
  }} as RoutineData;
  const t=weekTrends(data,LAST);
  expect([t.savedTenDays,t.savedKnownDays]).toEqual([2,3]);
 });
});
