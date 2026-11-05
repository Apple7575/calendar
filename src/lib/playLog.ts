import type {RoutineData} from './routineModel';
import type {ScreenTimeStatus} from './screenTime';

/** One stretch with the apps unlocked for reward use. Epoch milliseconds. A row with no end is still open. */
export type PlayRow={start:number;end:number};
export type PlayNativeRow={start:number;end?:number};
/** Stretches the phone was recording. A day outside these is unknown, which is not the same as zero. */
export type PlayCoverage={from:number;to:number};
export type PlayLog={rows:PlayRow[];coverage:PlayCoverage[];nativeSince?:number;floor?:number;consumed?:Record<string,number>};
export type PlayDayState={state:'none'}|{state:'full'}|{state:'partial';since?:number};

/** About a year at eight stretches a day, roughly 130 KB. Older rows go and their days read as unknown. */
export const PLAY_LOG_LIMIT=3000;
/** Polling arrives every 15 seconds. Only closed rows and this much elapsed time reach storage. */
const COVERAGE_REFRESH_MS=3600000;
/** Real use per past day. A little over a year of short rows. */
export const CONSUMED_DAY_LIMIT=400;

const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const validRow=(r:PlayRow|null|undefined):r is PlayRow=>!!r&&finite(r.start)&&finite(r.end)&&r.end>r.start;
const validConsumed=(n:unknown):n is number=>Number.isSafeInteger(n)&&(n as number)>=0;
const cleanConsumed=(v:unknown)=>Object.fromEntries(Object.entries(v&&typeof v==='object'?v:{}).filter(([,n])=>validConsumed(n))) as Record<string,number>;
const validCoverage=(c:PlayCoverage|null|undefined):c is PlayCoverage=>!!c&&finite(c.from)&&finite(c.to)&&c.to>=c.from;
/** Saved values are never trusted: broken rows count as nothing and never block loading. */
export function readPlayLog(data:RoutineData):PlayLog{
 const log=data.playLog as PlayLog|undefined;
 return {rows:Array.isArray(log?.rows)?log!.rows.filter(validRow):[],coverage:Array.isArray(log?.coverage)?log!.coverage.filter(validCoverage):[],...(finite(log?.nativeSince)?{nativeSince:log!.nativeSince}:{}),...(finite(log?.floor)?{floor:log!.floor}:{}),consumed:cleanConsumed(log?.consumed)};
}

/** The phone reports 0 until a connected write has set the start of its record. */
const recording=(status:ScreenTimeStatus|null|undefined)=>!!status?.supportsPlayLog&&status.enabled&&!!status.rewardMode&&finite(status.playLogSince)&&status.playLogSince>0;

export function mergePlayLog(data:RoutineData,status:ScreenTimeStatus|null|undefined,now=Date.now()):RoutineData{
 if(!status?.supportsPlayLog)return data;
 const log=readPlayLog(data),byStart=new Map(log.rows.map(r=>[r.start,r]));
 let changed=false;
 for(const row of Array.isArray(status.playLog)?status.playLog:[]){
  if(!row||row.end===undefined||!validRow(row as PlayRow))continue;
  const old=byStart.get(row.start);
  if(!old||old.end!==row.end){byStart.set(row.start,{start:row.start,end:row.end});changed=true;}
 }
 const coverage=[...log.coverage];let nativeSince=log.nativeSince;
 if(recording(status)){
  const since=status.playLogSince!;
  const last=coverage[coverage.length-1];
  if(last&&nativeSince===since){
   if(now-last.to>=COVERAGE_REFRESH_MS){coverage[coverage.length-1]={...last,to:now};changed=true;}
  }else if(last&&since<=last.to+COVERAGE_REFRESH_MS&&since>=last.from){
   // The phone dropped old rows and moved its start. Nothing was missed, so this is the same stretch.
   coverage[coverage.length-1]={...last,to:Math.max(last.to,now)};nativeSince=since;changed=true;
  }else{coverage.push({from:since,to:now});nativeSince=since;changed=true;}
 }
 const consumed={...log.consumed};
 for(const [day,minutes] of Object.entries(cleanConsumed(status.consumedByDay)))if(consumed[day]!==minutes){consumed[day]=minutes;changed=true;}
 if(!changed)return data;
 const days=Object.keys(consumed).sort();
 for(const day of days.slice(0,Math.max(0,days.length-CONSUMED_DAY_LIMIT)))delete consumed[day];
 const sorted=[...byStart.values()].sort((a,b)=>a.start-b.start),rows=sorted.slice(-PLAY_LOG_LIMIT),floor=sorted.length>rows.length?rows[0].start:log.floor;
 return {...data,playLog:{rows,coverage,...(nativeSince!==undefined?{nativeSince}:{}),...(floor!==undefined?{floor}:{}),...(Object.keys(consumed).length?{consumed}:{})}};
}

const dayBounds=(key:string)=>{const [y,m,d]=key.split('-').map(Number);return {start:new Date(y,m-1,d,4).getTime(),end:new Date(y,m-1,d+1,4).getTime()}};
export function playDayState(data:RoutineData,key:string,now=Date.now(),status?:ScreenTimeStatus|null):PlayDayState{
 const log=readPlayLog(data),{start,end}=dayBounds(key),until=Math.min(end,now),today=now>=start&&now<end;
 const ranges=log.coverage.map(c=>({from:Math.max(c.from,log.floor??c.from),to:c.to}));
 // Saved coverage lags behind polling, so a connected phone covers today right up to now.
 if(today&&recording(status)){
  const last=ranges[ranges.length-1];
  if(last&&log.nativeSince===status!.playLogSince)last.to=now;else ranges.push({from:status!.playLogSince!,to:now});
 }
 const touching=ranges.filter(r=>r.from<until&&r.to>=start);
 if(!touching.length)return {state:'none'};
 const from=Math.min(...touching.map(r=>r.from)),to=Math.max(...touching.map(r=>r.to));
 if(from>start)return {state:'partial',since:from};
 if(!today&&to<end-COVERAGE_REFRESH_MS)return {state:'partial'};
 return {state:'full'};
}
