import type {RoutineData} from './routineModel';
import {routineDay} from './routineModel';
import {focusRampStatus,focusRunCredit,focusRunSeconds} from './focusRamp';
import {moneySummary} from './moneyRewards';
import type {BookTimer} from './bookStudy';

export type FocusPenalty={id:string;timerId:string;at:string;day:string;minutes:number;won:number};
export const QUIT_PENALTY={minutes:10,won:1000,freeSeconds:60,debtMinutes:60,debtWon:6000} as const;
/** Saved values are never trusted: a broken row counts as nothing and never blocks loading. */
const validRow=(p:FocusPenalty|null|undefined):p is FocusPenalty=>!!p&&typeof p.id==='string'&&typeof p.day==='string'&&Number.isSafeInteger(p.minutes)&&p.minutes>=0&&p.minutes<=QUIT_PENALTY.minutes;
export const penaltyMinutesOnDay=(data:RoutineData,key:string)=>(Array.isArray(data.focusPenalties)?data.focusPenalties:[]).filter(validRow).filter(p=>p.day===key).reduce((n,p)=>n+p.minutes,0);
/**
 * What ending this run would cost (user decision 2026-11-04). Free within a minute of real study since the
 * last payout, once the stage is met, after the two-hour reset, and for a timer already charged.
 */
export function focusQuitPenalty(data:RoutineData,now=Date.now()){
 const t=data.bookTimer;if(!t||t.rewardMode!=='output')return null;
 const required=focusRampStatus(data,now).required;
 if(!required||focusRunCredit(data,now)>=required)return null;
 const mark=typeof t.creditMark==='number'&&t.creditMark>0?t.creditMark:0;
 if(focusRunSeconds(data,now)-mark<=QUIT_PENALTY.freeSeconds)return null;
 const id='penalty:'+t.id;if((Array.isArray(data.focusPenalties)?data.focusPenalties:[]).some(p=>p?.id===id)||data.money?.entries.some(e=>e.id===id))return null;
 const minutes=Math.min(QUIT_PENALTY.minutes,Math.max(0,QUIT_PENALTY.debtMinutes-penaltyMinutesOnDay(data,routineDay(new Date(now)))));
 const won=data.money?Math.min(QUIT_PENALTY.won,Math.max(0,moneySummary(data).balance+QUIT_PENALTY.debtWon)):0;
 return minutes||won?{id,minutes,won}:null;
}
export function recordQuitPenalty(data:RoutineData,now=Date.now()):RoutineData{
 const due=focusQuitPenalty(data,now);if(!due)return data;
 const at=new Date(now).toISOString(),day=routineDay(new Date(now)),rows=Array.isArray(data.focusPenalties)?data.focusPenalties:[];
 const row:FocusPenalty={id:due.id,timerId:data.bookTimer!.id,at,day,minutes:due.minutes,won:due.won};
 return {...data,focusPenalties:[...rows,row],...(data.money&&due.won?{money:{...data.money,entries:[...data.money.entries,{id:due.id,kind:'adjustment' as const,amount:-due.won,at,day,note:'공부 중간에 마친 벌점'}]}}:{})};
}
export const penaltyLabel=(due:{minutes:number;won:number}|null)=>due?'벌점 '+[due.minutes?due.minutes+'분':'',due.won?due.won.toLocaleString('ko-KR')+'원':''].filter(Boolean).join('·'):'';
/**
 * A started run keeps the apps locked until it is ended in the app, or until the first 04:00 after it was last started, resumed or paused
 * (user decision 2026-11-04). A rest that ran out is not an ending: stopBookTimer is what clears restEndedAt.
 */
export function focusLockUntil(t:BookTimer|undefined,now=Date.now()){
 if(!t||t.phase==='idle'&&t.restEndedAt===undefined)return 0;
 const started=Date.parse(t.startedAt),touched=typeof t.focusResumedAt==='number'&&Number.isFinite(t.focusResumedAt)?t.focusResumedAt:0;
 if(!Number.isFinite(started))return 0;
 const start=new Date(Math.max(started,touched));
 const until=new Date(start);until.setHours(4,0,0,0);if(start.getHours()>=4)until.setDate(until.getDate()+1);
 return until.getTime()>now?until.getTime():0;
}
/** The fields only a matching build understands. An older build rejects minutes off the 5-minute step and would fail its whole sync. */
export function rewardSyncExtras(data:RoutineData,key:string,native:{supportsHandwritingRewards?:boolean;supportsMinuteHandwriting?:boolean}|null|undefined):{handwriting?:number;penalty?:number}{
 if(!native?.supportsHandwritingRewards)return {};
 const value=data.days[key]?.bonus?.handwriting??0;
 return native.supportsMinuteHandwriting?{handwriting:value,penalty:penaltyMinutesOnDay(data,key)}:{handwriting:value-value%5};
}
