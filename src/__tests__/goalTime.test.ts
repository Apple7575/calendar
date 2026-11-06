import {emptyData,type RoutineData} from '../lib/routineModel';
import {goalSecondsOn,goalWeekTime} from '../lib/goalTime';
import type {Goal} from '../lib/routineGoals';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const TODAY='2026-11-07'; // 토요일, 이번 주는 11월 2일 월요일부터
const at=(day:string,h:number)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d,h).toISOString()};
const session=(id:string,subject:string,day:string,seconds:number,h=10)=>({id,subject,startedAt:at(day,h),completedAt:at(day,h),seconds,note:'한 것',next:''});
const review=(id:string,deckId:string,day:string,seconds:number,voidedAt?:string)=>({id,wordId:'w'+id,deckId,day,at:at(day,9),grade:3,seconds,phase:'review',mode:'daily',before:{},after:{},completed:true,...(voidedAt?{voidedAt}:{})});
const goal=(links:Goal['links']):Goal=>({id:'g',title:'시험',weeklyTargetDays:5,createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-01T00:00:00.000Z',links});
const data={...emptyData(),
 decks:[{id:'d1',name:'단어장'}],
 bookSessions:[
  session('a','수학','2026-11-03',1800),session('b','수학','2026-11-05',3600),session('c','영어','2026-11-05',900),
  session('late','수학','2026-11-08',600,2), // 11월 8일 새벽 2시는 11월 7일의 늦은 공부
  session('last','수학','2026-10-28',1200),session('next','수학','2026-11-09',999,10),
 ],
 reviewHistory:[review('1','d1','2026-11-04',30),review('2','d1','2026-11-04',20),review('3','d1','2026-11-04',40,'2026-11-04T10:00:00.000Z'),review('4','gone','2026-11-04',50),review('5','d1','2026-10-30',60)],
} as unknown as RoutineData;

describe('goal study time',()=>{
 test('counts linked subjects and decks by the 04:00 day',()=>{
  const g=goal({subjects:['수학'],deckIds:['d1','gone']});
  expect(goalSecondsOn(data,g,'2026-11-05')).toBe(3600);
  expect(goalSecondsOn(data,g,'2026-11-04')).toBe(50);
  expect(goalSecondsOn(data,g,TODAY)).toBe(600);
 });
 test('this week up to today beside all of last week',()=>{
  expect(goalWeekTime(data,goal({subjects:['수학'],deckIds:['d1']}),TODAY)).toEqual({seconds:1800+3600+600+50,lastWeekSeconds:1200+60});
 });
 test('nothing linked, nothing counted',()=>{
  expect(goalWeekTime(data,goal({subjects:[],deckIds:[]}),TODAY)).toEqual({seconds:0,lastWeekSeconds:0});
 });
 test('broken saved sessions are skipped',()=>{
  const bad={...emptyData(),bookSessions:[null,{subject:'수학',completedAt:'x',seconds:100},{subject:'수학',completedAt:at(TODAY,10),seconds:-5}]} as unknown as RoutineData;
  expect(goalWeekTime(bad,goal({subjects:['수학'],deckIds:[]}),TODAY).seconds).toBe(0);
 });
});
