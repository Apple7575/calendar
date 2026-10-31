import {emptyData,getDay,checkMorning} from '../lib/routineModel';
import {completeGuidedStep,SUGGESTED_EVENING,previousDay} from '../lib/dailyPlan';
import {routineActivities,routineStreak,isActivityComplete} from '../lib/routineActivity';
const key='2026-10-31';
test('a small morning finish receives five minutes and counts as completed without requiring the full set',()=>{
 let data=emptyData();data=checkMorning(data,key,'min',0);expect(getDay(data,key).paid.morning).toBe(0);
 data=checkMorning(data,key,'min',1);expect(getDay(data,key).paid.morning).toBe(5);
 expect(routineActivities(data,key).find(a=>a.id==='morning')?.status).toBe('min');
 data=checkMorning(data,key,'full',2);expect(getDay(data,key).paid.morning).toBe(10);
 data=checkMorning(data,key,'min',1);expect(getDay(data,key).paid.morning).toBe(10);
});
test('evening-only minimum completion counts for the calendar and streak without inventing reward minutes',()=>{
 let data=emptyData();SUGGESTED_EVENING.forEach((s,i)=>{if(s.minimum)data=completeGuidedStep(data,key,'evening',i,'min')});
 expect(getDay(data,key).paid).toEqual({morning:0,words:0,gym:0});
 expect(routineActivities(data,key).filter(isActivityComplete).map(a=>a.id)).toEqual(['evening']);
 expect(routineStreak(data,key).current).toBe(1);
});
test('today remains open until the routine-day boundary, while missing a full day breaks the streak',()=>{
 let data=emptyData();const yesterday=previousDay(key);data=checkMorning(checkMorning(data,yesterday,'min',0),yesterday,'min',1);
 expect(routineStreak(data,key)).toMatchObject({current:1,todayDone:false});
 expect(routineStreak(data,'2026-11-01').current).toBe(0);
 expect(routineStreak(data,'2026-10-29').current).toBe(0);
});
test('mere partial actions and unfinished study notes do not complete a routine',()=>{
 let data=checkMorning(emptyData(),key,'full',0);
 data={...data,bookSessions:[{id:'b',subject:'공부',startedAt:`${key}T09:00:00`,completedAt:`${key}T09:25:00`,seconds:1500,note:'',next:''}]};
 expect(routineActivities(data,key).filter(isActivityComplete)).toHaveLength(0);
 data.bookSessions![0].note='기출 한 회';expect(routineActivities(data,key).filter(isActivityComplete).map(a=>a.id)).toEqual(['book']);
});
