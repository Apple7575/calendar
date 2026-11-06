import {addDays} from './dateUtils';
import {routineDay,type RoutineData} from './routineModel';

/**
 * When the first focus run of a day actually started, by weekday, over the 4 weeks before a day.
 * Read only from saved sessions; it shows, it never sets a promise or changes a reward.
 * Clock times are counted in minutes after 04:00 (the routine day start), so a 01:00 start stays late, not early.
 */
export const START_MAP_WEEKS=4;
const WEEKDAYS=['일','월','화','수','목','금','토'] as const;
const ORDER=[1,2,3,4,5,6,0] as const;
const DAY_START=4*60;

export type StartDay={weekday:number;label:string;seen:number;started:number;median:string|null};
export type StartMap={from:string;to:string;days:StartDay[]};

export const weekdayOf=(key:string)=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d).getDay();};
const minutesAfterStart=(t:Date)=>((t.getHours()*60+t.getMinutes()-DAY_START)+1440)%1440;
const clock=(m:number)=>{const c=(m+DAY_START)%1440;return `${String(Math.floor(c/60)).padStart(2,'0')}:${String(c%60).padStart(2,'0')}`;};
const middle=(v:number[])=>{const s=[...v].sort((a,b)=>a-b),h=s.length>>1;return s.length%2?s[h]:(s[h-1]+s[h])/2;};

/** First start of each routine day in the 4 weeks before `day` (that day itself left out). */
function firstStarts(data:RoutineData,from:string,to:string){
 const first=new Map<string,number>();
 for(const s of Array.isArray(data.bookSessions)?data.bookSessions:[]){
  const t=new Date(typeof s?.startedAt==='string'?s.startedAt:NaN);
  if(!Number.isFinite(t.getTime()))continue;
  const key=routineDay(t);
  if(key<from||key>to)continue;
  const m=minutesAfterStart(t);
  if(!first.has(key)||m<first.get(key)!)first.set(key,m);
 }
 return first;
}

export function startTimeMap(data:RoutineData,day:string):StartMap{
 const to=addDays(day,-1),from=addDays(day,-START_MAP_WEEKS*7),first=firstStarts(data,from,to);
 const days=ORDER.map(weekday=>{
  const keys=Array.from({length:START_MAP_WEEKS*7},(_,i)=>addDays(from,i)).filter(k=>weekdayOf(k)===weekday);
  const starts=keys.map(k=>first.get(k)).filter((m):m is number=>m!==undefined);
  return {weekday,label:WEEKDAYS[weekday],seen:keys.length,started:starts.length,median:starts.length?clock(Math.round(middle(starts)/5)*5):null};
 });
 return {from,to,days};
}

/** One line for the promise screen, about the weekday of `day` (the promised day). */
export function startTimeHint(data:RoutineData,day:string){
 const weekday=weekdayOf(day),row=startTimeMap(data,day).days.find(d=>d.weekday===weekday)!,name=WEEKDAYS[weekday]+'요일';
 if(row.started<2||!row.median)return `아직 ${name} 기록이 적어요. 몇 주 쓰면 평소 시작 시각이 보여요.`;
 return `최근 ${START_MAP_WEEKS}주 ${name}은 보통 ${row.median}쯤 시작했어요 (${row.seen}번 중 ${row.started}번).`;
}
