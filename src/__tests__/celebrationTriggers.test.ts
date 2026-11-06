import {achievements,dailyPick,newAchievements} from '../lib/celebrationTriggers';
import {emptyData,getDay,type RoutineData} from '../lib/routineModel';

const T='2026-11-06';
/** 운동 30분을 채운 날 = 실천한 날(간단한 완료 기준). */
const practiced=(data:RoutineData,days:string[]):RoutineData=>({...data,days:{...data.days,...Object.fromEntries(days.map(k=>{const d=getDay(data,k);return [k,{...d,paid:{...d.paid,gym:30}}]}))}});
const range=(end:string,n:number)=>Array.from({length:n},(_,i)=>{const d=new Date(end+'T12:00:00');d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)});

describe('축하 판정 (읽기만 한다)',()=>{
 test('연속 실천 3·7일에 닿은 날만 기념일',()=>{
  expect(achievements(practiced(emptyData(),range(T,3)),T).streak).toBe(3);
  expect(achievements(practiced(emptyData(),range(T,4)),T).streak).toBeNull();
  expect(achievements(practiced(emptyData(),range(T,7)),T).streak).toBe(7);
 });
 test('다시 돌아온 날: 어제 실천을 놓쳤다가 오늘 처음 실천',()=>{
  const back=practiced(emptyData(),['2026-11-03','2026-11-04',T]);
  expect(achievements(back,T).comeback).toBe(true);
  expect(achievements(practiced(emptyData(),range(T,3)),T).comeback).toBe(false);
  expect(achievements(practiced(emptyData(),[T]),T).comeback).toBe(false); // 첫날은 돌아온 날이 아니다
  expect(achievements(practiced(emptyData(),['2026-11-04']),T).comeback).toBe(false); // 오늘 아직이면 아니다
 });
 test('오늘 4개 항목을 모두 끝내야 오늘 전부',()=>{
  expect(achievements(practiced(emptyData(),[T]),T).dayComplete).toBe(false);
 });
 test('이미 보여 준 축하는 같은 날 다시 고르지 않는다',()=>{
  const now={streak:7,dayComplete:true,comeback:false,priorityAll:false,stage:'sprout' as const};
  expect(newAchievements(now,null,T).kinds).toEqual(['streak','dayComplete']);
  const shown=newAchievements(now,null,T).shown;
  expect(newAchievements(now,shown,T).kinds).toEqual([]);
  expect(newAchievements(now,shown,'2026-11-07').kinds).toEqual(['streak','dayComplete']);
 });
 test('성장 단계는 처음 본 단계를 기억만 하고, 오를 때 축하한다',()=>{
  const first=newAchievements({streak:null,dayComplete:false,comeback:false,priorityAll:false,stage:'sprout'},null,T);
  expect(first.kinds).toEqual([]);
  expect(newAchievements({streak:null,dayComplete:false,comeback:false,priorityAll:false,stage:'growing'},first.shown,T).kinds).toEqual(['growth']);
 });
 test('dailyPick은 날마다 다른 것을 고르고 같은 날에는 같다',()=>{
  const list=['A25','A27','A28','A24'];
  expect(dailyPick(list,T,'morning')).toBe(dailyPick(list,T,'morning'));
  expect(new Set(range(T,8).map(d=>dailyPick(list,d,'morning'))).size).toBeGreaterThan(1);
 });
});
