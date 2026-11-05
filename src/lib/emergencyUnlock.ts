import type {RoutineData} from './routineModel';
import {routineDay} from './routineModel';
import {focusLockUntil} from './focusPenalty';

/**
 * Opening the restricted apps during the sleep lock when it really cannot wait (user decision 2026-11-05). It costs a lot on
 * purpose, and more each time. All the numbers are here. Length must stay at 15 or more, the shortest schedule iOS accepts.
 */
export const EMERGENCY_POLICY={minutes:15,waitSeconds:10,reasonChars:100,stalePendingMs:120000,penalties:[{minutes:30,won:3000},{minutes:60,won:6000},{minutes:120,won:12000}]} as const;
export type EmergencyUnlock={id:string;at:string;day:string;until:number;reason:string;minutes:number;won:number;order:number};
export type EmergencyPending={id:string;at:string;reason:string;minutes:number;won:number;order:number};
export type EmergencyNativeEntry={id:string;at:number;until:number;minutes:number;penalty?:number};
export type EmergencyBlock='not-sleep'|'studying'|'open';

const whole=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
/** Saved values are never trusted: a broken row counts as nothing and never blocks loading. */
const validRow=(u:EmergencyUnlock|null|undefined):u is EmergencyUnlock=>!!u&&typeof u==='object'&&typeof u.id==='string'&&typeof u.day==='string'&&whole(u.minutes);
export const emergencyUnlocks=(data:RoutineData):EmergencyUnlock[]=>Array.isArray(data.emergencyUnlocks)?data.emergencyUnlocks.filter(validRow):[];
export const emergencyUnlocksOn=(data:RoutineData,day:string)=>emergencyUnlocks(data).filter(u=>u.day===day);
const validPending=(p:EmergencyPending|null|undefined):p is EmergencyPending=>!!p&&typeof p==='object'&&typeof p.id==='string'&&typeof p.at==='string'&&whole(p.minutes);

/** The same hours as the phone's own sleep lock, 21:00 to 04:30. */
export function inSleepWindow(now=Date.now()){
 const d=new Date(now),minute=d.getHours()*60+d.getMinutes();
 return minute>=21*60||minute<4*60+30;
}
/** The price of the next one today. Money only applies once the money wallet is on. */
export function emergencyPrice(data:RoutineData,now=Date.now()){
 const order=emergencyUnlocksOn(data,routineDay(new Date(now))).length+1,row=EMERGENCY_POLICY.penalties[Math.min(order,EMERGENCY_POLICY.penalties.length)-1];
 return {order,minutes:row.minutes,won:data.money?row.won:0};
}
/**
 * When the one still running ends, by the clock. The phone's word decides when there is one, since starting study closes it
 * there. Anything further off than one length is a changed clock and counts as over.
 */
export function emergencyOpenUntil(data:RoutineData,nativeUntil:number|undefined,now=Date.now()){
 const saved=emergencyUnlocks(data).slice(-1).map(u=>typeof u.until==='number'&&Number.isFinite(u.until)?u.until:0)[0]??0,until=typeof nativeUntil==='number'?(Number.isFinite(nativeUntil)?nativeUntil:0):saved;
 return until>now&&until-now<=(EMERGENCY_POLICY.minutes+2)*60000?until:0;
}
/** Study keeps its own lock: this only opens the sleep lock. A rest is not study. */
export function emergencyBlock(data:RoutineData,nativeUntil:number|undefined,now=Date.now()):EmergencyBlock|null{
 if(emergencyOpenUntil(data,nativeUntil,now))return 'open';
 if(data.bookTimer?.phase==='focus'||focusLockUntil(data.bookTimer,now)>0)return 'studying';
 if(!inSleepWindow(now))return 'not-sleep';
 return null;
}
/** Step 1, before asking the phone: remembers the reason and the price, and charges nothing yet. */
export function beginEmergencyUnlock(data:RoutineData,id:string,reason:string,now=Date.now(),nativeUntil?:number):RoutineData{
 if(validPending(data.emergencyPending)&&data.emergencyPending.id===id||emergencyUnlocks(data).some(u=>u.id===id))return data;
 const line=reason.replace(/\s+/g,' ').trim().slice(0,EMERGENCY_POLICY.reasonChars);if(!line)throw new Error('이유를 한 줄 적어 주세요.');
 const block=emergencyBlock(data,nativeUntil,now);
 if(block==='studying')throw new Error('공부 중에는 긴급 해제를 쓸 수 없어요.');
 if(block==='not-sleep')throw new Error('긴급 해제는 21시부터 04시 30분까지만 쓸 수 있어요.');
 if(block==='open')throw new Error('이미 긴급 해제 중이에요.');
 const {order,minutes,won}=emergencyPrice(data,now);
 return {...data,emergencyPending:{id,at:new Date(now).toISOString(),reason:line,minutes,won,order}};
}
/** The phone could not open: nothing was charged and nothing stays. */
export function cancelEmergencyUnlock(data:RoutineData,id:string):RoutineData{
 if(data.emergencyPending?.id!==id)return data;
 const {emergencyPending:_gone,...rest}=data;
 return rest;
}
function charge(data:RoutineData,row:EmergencyUnlock):RoutineData{
 const {emergencyPending:pending,...rest}=data,keep=pending&&pending.id!==row.id?{emergencyPending:pending}:{};
 const moneyId='emergency:'+row.id,money=data.money&&row.won>0&&!data.money.entries.some(e=>e.id===moneyId)?{money:{...data.money,entries:[...data.money.entries,{id:moneyId,kind:'adjustment' as const,amount:-row.won,at:row.at,day:row.day,note:'긴급 해제 벌점'}]}}:{};
 return {...rest,...keep,emergencyUnlocks:[...emergencyUnlocks(data),row],...money};
}
/** Step 2, once the phone has opened. The charge is final, and once per id whichever way it arrives. */
export function finishEmergencyUnlock(data:RoutineData,id:string,until:number,now=Date.now()):RoutineData{
 if(emergencyUnlocks(data).some(u=>u.id===id))return data;
 const p=data.emergencyPending;if(!validPending(p)||p.id!==id)return data;
 // The moment the phone opened decides the day, so both sides charge the same day even right at 04:00.
 const opened=Number.isFinite(until)?until-EMERGENCY_POLICY.minutes*60000:Date.parse(p.at),at=new Date(Number.isFinite(opened)?opened:now).toISOString();
 return charge(data,{id,at,day:routineDay(new Date(at)),until,reason:p.reason,minutes:p.minutes,won:p.won,order:p.order});
}
/**
 * The phone is the record of what really opened. If the app died before step 2 this charges it from the phone's log, and a
 * reminder the phone never heard of is dropped once it is old enough that the call cannot still be running.
 */
export function reconcileEmergency(data:RoutineData,log:EmergencyNativeEntry[]|undefined,now=Date.now()):RoutineData{
 if(!Array.isArray(log))return data;
 let next=data;
 for(const entry of log){
  if(!entry||typeof entry.id!=='string'||!Number.isFinite(entry.at)||!Number.isFinite(entry.until)||emergencyUnlocks(next).some(u=>u.id===entry.id))continue;
  const p=next.emergencyPending;
  if(validPending(p)&&p.id===entry.id){next=finishEmergencyUnlock(next,entry.id,entry.until,now);continue}
  const when=new Date(entry.at),price=emergencyPrice(next,entry.at);
  // The phone already took off what it recorded, so the same minutes are charged here, whatever the table says now.
  const minutes=typeof entry.penalty==='number'&&whole(entry.penalty)?entry.penalty:price.minutes;
  next=charge(next,{id:entry.id,at:when.toISOString(),day:routineDay(when),until:entry.until,reason:'',minutes,won:price.won,order:price.order});
 }
 const left=next.emergencyPending;
 if(left&&(!validPending(left)||now-Date.parse(left.at)>EMERGENCY_POLICY.stalePendingMs))return cancelEmergencyUnlock({...next,emergencyPending:{...left,id:String(left?.id)}},String(left?.id));
 return next;
}
