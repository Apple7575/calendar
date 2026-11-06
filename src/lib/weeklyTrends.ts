import {addDays} from './dateUtils';
import {routineDay,type RoutineData} from './routineModel';
import {studyDayKeys,weeklyInterest} from './weeklyCommitments';

/**
 * 주간 점검의 추세 숫자 3개(빌드 51). 정의는 데이터 담당 Ada(feature/data-metrics의 scripts/metrics/weeklyMetrics.ts)를 따른다.
 * 앱이 scripts를 import하지 않도록 같은 계산을 여기로 옮겼다. weekKey는 지난주 월요일이다.
 */
export type WeekTrends={
 /** 지난주를 포함한 4개 주의 공부한 날 수. 오래된 주부터. */
 studyDays4w:number[];
 /** 지난주 날마다 가장 이른 집중 시작의 중앙값(04시부터 지난 분). 시작한 날이 없으면 null. */
 firstStartMedian:number|null;
 firstStartDays:number;
 /** 지난주 정산된 날 가운데 노는 시간을 10분 이상 남긴 날 / 정산된 날. 이자 기록이 없으면 known 0. */
 savedTenDays:number;
 savedKnownDays:number;
};

const MINUTE=60000;
const fourAm=(key:string)=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,4).getTime();};

export function median(values:number[]):number|null{
 if(!values.length)return null;
 const s=[...values].sort((a,b)=>a-b),mid=Math.floor(s.length/2);
 return s.length%2?s[mid]:(s[mid-1]+s[mid])/2;
}
/** 04시부터 지난 분을 시계 글자로 바꾼다. 400 → "10:40", 새벽 1시(1260) → "01:00". */
export function clockLabel(minutesAfter4:number|null){
 if(minutesAfter4===null)return '—';
 const total=(Math.round(minutesAfter4)+240)%1440;
 return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

/** 날마다(04시 기준) 가장 이른 집중 시작. 새벽 1시는 그 전날의 늦은 시각(04시부터 1260분)이다. */
export function firstStarts(data:RoutineData){
 const out=new Map<string,number>();
 for(const s of Array.isArray(data.bookSessions)?data.bookSessions:[]){
  const t=Date.parse(s?.startedAt);if(!Number.isFinite(t))continue;
  const key=routineDay(new Date(t)),m=(t-fourAm(key))/MINUTE,prev=out.get(key);
  if(prev===undefined||m<prev)out.set(key,m);
 }
 return out;
}

export function weekTrends(data:RoutineData,weekKey:string):WeekTrends{
 const days=Array.from({length:7},(_,i)=>addDays(weekKey,i)),starts=firstStarts(data);
 const minutes=days.map(k=>starts.get(k)).filter((m):m is number=>m!==undefined);
 const interest=weeklyInterest(data,weekKey).days;
 return {
  studyDays4w:[-21,-14,-7,0].map(n=>studyDayKeys(data,addDays(weekKey,n)).length),
  firstStartMedian:median(minutes),firstStartDays:minutes.length,
  savedTenDays:interest.filter(d=>d.unusedMinutes>=10).length,savedKnownDays:interest.length,
 };
}
