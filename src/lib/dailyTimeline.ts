import {emergencyUnlocksOn} from './emergencyUnlock';
import {promisePenalties} from './focusPenalty';
import {earned,getDay,routineDay,type RoutineData} from './routineModel';
import {bookFocusSeconds} from './bookTimerTime';
import {playDayState,readPlayLog,type PlayDayState} from './playLog';
import {reviewEvents} from './studyHistory';
import type {ScreenTimeStatus} from './screenTime';

export type TimelineItem=
 |{kind:'study';id:string;subject:string;start:number;end:number;seconds:number;live?:boolean}
 |{kind:'deck';id:string;deckName:string;start:number;end:number;cards:number;seconds:number}
 |{kind:'play';id:string;start:number;end:number;seconds:number;live?:boolean;emergency?:boolean};
export type DailyTimeline={
 items:TimelineItem[];play:PlayDayState;
 totals:{studySeconds:number;playSeconds:number|null;consumedMinutes:number|null;earnedMinutes:number;penaltyMinutes:number;penaltyWon:number;untimedResponses:number};
};

/** Answers of one deck this close together read as one sitting. */
const SITTING_GAP_MS=600000;

export function timelineBounds(key:string){
 const [y,m,d]=key.split('-').map(Number);
 return {start:new Date(y,m-1,d,4).getTime(),end:new Date(y,m-1,d+1,4).getTime()};
}
export function durationLabel(seconds:number){
 if(seconds<=0)return '0분';
 if(seconds<60)return '1분 미만';
 const minutes=Math.round(seconds/60),hours=Math.floor(minutes/60),rest=minutes%60;
 return hours?hours+'시간'+(rest?' '+rest+'분':''):rest+'분';
}

function studyRows(data:RoutineData,key:string,now:number):TimelineItem[]{
 const saved=Array.isArray(data.bookSessions)?data.bookSessions:[];
 const rows:TimelineItem[]=saved.flatMap(s=>{
  const end=Date.parse(s?.completedAt);
  if(!Number.isFinite(end)||routineDay(new Date(end))!==key||!(s.seconds>0))return [];
  const started=Date.parse(s.startedAt);
  return [{kind:'study' as const,id:s.id,subject:s.subject,start:Number.isFinite(started)?started:end-s.seconds*1000,end,seconds:s.seconds}];
 });
 const t=data.bookTimer;
 if(t?.phase==='focus'&&routineDay(new Date(now))===key&&!saved.some(s=>s?.id===t.id)){
  const seconds=bookFocusSeconds(t,now),started=Date.parse(t.startedAt);
  if(seconds>0)rows.push({kind:'study',id:t.id,subject:t.subject,start:Number.isFinite(started)?started:now-seconds*1000,end:now,seconds,live:true});
 }
 return rows;
}

function deckRows(data:RoutineData,key:string):TimelineItem[]{
 const events=reviewEvents(data,{day:key}).map(e=>({e,at:Date.parse(e.at)})).filter(x=>Number.isFinite(x.at)).sort((a,b)=>a.at-b.at);
 const rows:{id:string;deckId:string;start:number;end:number;seconds:number;cards:Set<string>}[]=[];
 for(const {e,at} of events){
  const seconds=Number.isFinite(e.seconds)?e.seconds:0,last=rows[rows.length-1];
  if(last&&last.deckId===e.deckId&&at-last.end<=SITTING_GAP_MS){last.end=at;last.seconds+=seconds;last.cards.add(e.wordId);continue;}
  rows.push({id:'deck:'+e.id,deckId:e.deckId,start:at-seconds*1000,end:at,seconds,cards:new Set([e.wordId])});
 }
 return rows.map(r=>({kind:'deck',id:r.id,deckName:data.decks.find(d=>d.id===r.deckId)?.name??'보관된 단어장',start:r.start,end:r.end,cards:r.cards.size,seconds:r.seconds}));
}

function playRows(data:RoutineData,key:string,status:ScreenTimeStatus|null|undefined,now:number):TimelineItem[]{
 const byStart=new Map<number,{start:number;end?:number;emergency?:boolean}>(readPlayLog(data).rows.map(r=>[r.start,r]));
 if(status?.supportsPlayLog&&Array.isArray(status.playLog))for(const r of status.playLog)if(r&&Number.isFinite(r.start)&&(r.end===undefined||Number.isFinite(r.end)&&r.end>r.start))byStart.set(r.start,r);
 return [...byStart.values()].filter(r=>routineDay(new Date(r.start))===key).map(r=>{
  const end=r.end??Math.max(r.start,now);
  return {kind:'play' as const,id:'play:'+r.start,start:r.start,end,seconds:Math.round((end-r.start)/1000),...(r.end===undefined?{live:true}:{}),...(r.emergency===true?{emergency:true}:{})};
 });
}

/** Today is the phone's own count. A past day is what the phone kept at 04:00. No value stays unknown, never zero. */
function consumedOn(data:RoutineData,key:string,status:ScreenTimeStatus|null|undefined){
 if(status?.supportsPlayLog&&status.enabled&&status.rewardMode&&status.day===key&&Number.isFinite(status.consumedMinutes))return status.consumedMinutes;
 const saved=readPlayLog(data).consumed?.[key],kept=status?.supportsPlayLog?status.consumedByDay?.[key]:undefined;
 if(saved!==undefined)return saved;
 return Number.isSafeInteger(kept)&&kept!>=0?kept!:null;
}

export function dailyTimeline(data:RoutineData,key:string,status:ScreenTimeStatus|null|undefined,now=Date.now()):DailyTimeline{
 const day=getDay(data,key),study=studyRows(data,key,now),decks=deckRows(data,key),plays=playRows(data,key,status,now);
 const items=[...study,...decks,...plays].sort((a,b)=>a.start-b.start);
 const answered=decks.reduce((n,r)=>n+r.seconds,0),untimed=!decks.length&&day.responses>0;
 const penalties=[...(Array.isArray(data.focusPenalties)?data.focusPenalties:[]).filter(p=>p?.day===key),...promisePenalties(data,key)],emergency=emergencyUnlocksOn(data,key);
 const play=playDayState(data,key,now,status),playSeconds=plays.reduce((n,r)=>n+r.seconds,0);
 return {items,play,totals:{
  studySeconds:study.reduce((n,r)=>n+r.seconds,0)+(untimed?(Number.isFinite(day.studySeconds)?day.studySeconds:0):answered),
  playSeconds:plays.length||play.state!=='none'?playSeconds:null,
  consumedMinutes:consumedOn(data,key,status),
  earnedMinutes:earned(day),
  penaltyMinutes:[...penalties,...emergency].reduce((n,p)=>n+(Number.isFinite(p.minutes)?p.minutes:0),0),
  penaltyWon:[...penalties,...emergency].reduce((n,p)=>n+(Number.isFinite(p.won)?p.won:0),0),
  untimedResponses:untimed?day.responses:0,
 }};
}
