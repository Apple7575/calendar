import {getDay,routineDay,RoutineData,studyProgress} from './routineModel';
import {eveningSteps} from './dailyPlan';
import {computeStreak} from './streaks';
import {outputUnitsOnDay,OUTPUT_POLICY} from './handwriting';
export type ActivityStatus='none'|'progress'|'min'|'full';
export type RoutineActivity={id:string;title:string;status:ActivityStatus};
export const activityStatusLabel:Record<ActivityStatus,string>={none:'기록 없음',progress:'진행 중',min:'간단하게 완료',full:'완료'};
const paidStatus=(paid:number,full:number,partial=false):ActivityStatus=>paid>=full?'full':paid>0?'min':partial?'progress':'none';
/** Extend this catalog when adding a routine; calendar and streak UI consume the same entries. */
export function routineActivities(data:RoutineData,key:string):RoutineActivity[]{
 const day=getDay(data,key),evening=eveningSteps(data,key),checks=day.evening??[];
 const minimum=evening.map((s,i)=>s.minimum?i:-1).filter(i=>i>=0);
 const eveningStatus:ActivityStatus=checks.some(Boolean)?evening.length>0&&evening.every((_,i)=>checks[i])?'full':minimum.length>0&&minimum.every(i=>checks[i])?'min':'progress':'none';
 const sessions=(data.bookSessions??[]).filter(s=>routineDay(new Date(s.completedAt))===key);
 return [
  {id:'morning',title:'아침 루틴',status:paidStatus(day.paid.morning,10,day.morning.some(Boolean))},
  {id:'words',title:'단어 학습',status:day.wordRewards?(studyProgress(day).full?'full':studyProgress(day).min?'min':day.responses>0?'progress':'none'):paidStatus(day.paid.words,20,day.responses>0)},
  {id:'gym',title:'운동',status:paidStatus(day.paid.gym,30)},
  {id:'evening',title:'저녁 루틴',status:eveningStatus},
  {id:'book',title:'집중 공부',status:outputUnitsOnDay(data,key)>=OUTPUT_POLICY.goalUnits||sessions.some(s=>s.rewardMode!=='output'&&!!s.note.trim())?'full':sessions.length||outputUnitsOnDay(data,key)>0?'progress':'none'},
 ];
}
export const isActivityComplete=(activity:RoutineActivity)=>activity.status==='min'||activity.status==='full';
export function activityDays(data:RoutineData):string[]{return [...new Set([...Object.keys(data.days),...(data.bookSessions??[]).map(s=>routineDay(new Date(s.completedAt)))])].sort();}
export function routineStreak(data:RoutineData,today:string){
 const completedDays=activityDays(data).filter(key=>key<=today&&routineActivities(data,key).some(isActivityComplete));
 return {current:computeStreak(completedDays,today),todayDone:completedDays.includes(today),completedDays};
}
