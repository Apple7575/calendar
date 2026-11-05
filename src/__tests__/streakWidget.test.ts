import {addDays} from '../lib/dateUtils';
import {routineStreak} from '../lib/routineActivity';
import {checkMorning,emptyData,RoutineData} from '../lib/routineModel';
import {STREAK_ANIMALS,streakWidgetPayload,streakWidgetView} from '../lib/streakWidget';

const done=(data:RoutineData,key:string)=>checkMorning(checkMorning(data,key,'min',0),key,'min',1);
const history=(...keys:string[])=>keys.reduce(done,emptyData());
const D='2026-11-10';

test('the saved number and today flag are the home streak',()=>{
 const data=history(addDays(D,-2),addDays(D,-1),D);
 expect(streakWidgetPayload(data,D)).toEqual({current:3,todayDone:true,day:D,nextDay:addDays(D,1)});
 expect(streakWidgetPayload(data,D).current).toBe(routineStreak(data,D).current);
});
test('a day not done yet gets calmer to more urgent as the evening goes on',()=>{
 const payload=streakWidgetPayload(history(addDays(D,-2),addDays(D,-1)),D);
 expect(streakWidgetView(payload,D,4).state).toBe('calm');
 expect(streakWidgetView(payload,D,17).state).toBe('calm');
 expect(streakWidgetView(payload,D,18).state).toBe('worried');
 expect(streakWidgetView(payload,D,20).state).toBe('worried');
 expect(streakWidgetView(payload,D,21).state).toBe('urgent');
 expect(streakWidgetView(payload,D,3).state).toBe('urgent');
 expect(streakWidgetView(payload,D,12).days).toBe(2);
});
test('a finished day shows done until 04:00, then the next day starts calm with the same number',()=>{
 const payload=streakWidgetPayload(history(addDays(D,-1),D),D);
 expect(streakWidgetView(payload,D,23)).toMatchObject({state:'done',days:2});
 expect(streakWidgetView(payload,addDays(D,1),9)).toMatchObject({state:'calm',days:2});
 expect(streakWidgetView(payload,addDays(D,1),22)).toMatchObject({state:'urgent',days:2});
 expect(streakWidgetView(payload,addDays(D,2),9)).toMatchObject({state:'zero',days:0});
});
test('no streak shows the starting picture at any hour',()=>{
 const payload=streakWidgetPayload(emptyData(),D);
 expect(streakWidgetView(payload,D,22)).toMatchObject({state:'zero',days:0});
});
test('without opening the app the widget matches what home would show on every later day',()=>{
 const cases=[[],[D],[addDays(D,-1)],[addDays(D,-2)],[addDays(D,-3),addDays(D,-2),addDays(D,-1)],[addDays(D,-5),addDays(D,-1),D]];
 for(const keys of cases){
  const data=history(...keys),payload=streakWidgetPayload(data,D);
  for(let later=0;later<5;later++){
   const day=addDays(D,later),home=routineStreak(data,day),view=streakWidgetView(payload,day,12);
   expect(view.days).toBe(home.current);
   expect(view.state==='done').toBe(home.todayDone);
  }
 }
});
test('the animal stays the same all day and changes at the next day, the done pose every four days',()=>{
 const payload=streakWidgetPayload(history(D),D);
 expect(streakWidgetView(payload,D,5).animal).toBe(streakWidgetView(payload,D,23).animal);
 const animals=[0,1,2,3].map(n=>streakWidgetView(payload,addDays(D,n),12).animal);
 expect(new Set(animals).size).toBe(STREAK_ANIMALS.length);
 const poses=[0,4].map(n=>streakWidgetView({...payload,day:addDays(D,n),nextDay:addDays(D,n+1)},addDays(D,n),12).pose);
 expect(poses[0]).not.toBe(poses[1]);
});
test('a clock set back keeps the saved day instead of guessing',()=>{
 const payload=streakWidgetPayload(history(addDays(D,-1),D),D);
 expect(streakWidgetView(payload,addDays(D,-3),12)).toMatchObject({state:'done',days:2});
});
test('a missing or broken value shows no number and the calm picture',()=>{
 expect(streakWidgetView(null,D,12)).toMatchObject({state:'calm',days:null});
 expect(streakWidgetView({current:'3'} as never,D,12)).toMatchObject({state:'calm',days:null});
});
