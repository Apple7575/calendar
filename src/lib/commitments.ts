import type {RoutineData} from './routineModel';
import {dayEnd,earned,getDay,routineDay,withDay} from './routineModel';
import {moneySummary} from './moneyRewards';
import {penaltyMinutesOnDay,QUIT_PENALTY} from './focusPenalty';
import {emergencyUnlocksOn} from './emergencyUnlock';
import {isActivityComplete,routineActivities} from './routineActivity';

/**
 * Promises made ahead of time (planning meeting 2026-11-06, user: "추천대로"; docs/plan-2026-11-06-ideas.md): a weekly stake,
 * tomorrow's first-study promise and interest on unused play time. All the numbers are here.
 */
export const COMMITMENT_POLICY={
 stake:{amounts:[5000,10000,20000],bonusRate:0.1},
 promise:{windowMinutes:15,minutes:10,won:1000,earliest:'04:15',latest:'23:45'},
 interest:{perMinutes:10,won:300,weeklyCapWon:5000,lookbackDays:14},
 rules:{stakeDays:[4,5,6],morningWords:[10,15,20],reflectTime:[2000,2040,2050]},
 defaults:{stakeDays:5,morningWords:10,reflectTime:2040},
} as const;

export type StakeAmount=typeof COMMITMENT_POLICY.stake.amounts[number];
export type WeeklyRuleKind=keyof typeof COMMITMENT_POLICY.rules;
export type WeeklyRule={kind:WeeklyRuleKind;value:number};
export type WeeklyRules=Record<WeeklyRuleKind,number>;
export type WeeklyReview={doneAt:string;rule?:WeeklyRule};
export type WeeklyStakeRow={amount:StakeAmount;targetDays:number;placedAt:string;status:'open'|'won'|'lost';payoutWon?:number;studyDays?:number;settledAt?:string};
export type PromiseOutcome={status:'kept'|'missed';at:string;day:string;minutes:number;won:number};
export type DayPromiseRow={startAt:string;setAt:string;outcome?:PromiseOutcome};
export type InterestDay={unusedMinutes:number;won:number;emergency:boolean};
export type WeeklyNote={text:string;at:string};
export const WEEKLY_NOTE_CHARS=40;

const P=COMMITMENT_POLICY,MIN=60000;
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const whole=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const DAY_KEY=/^\d{4}-\d{2}-\d{2}$/,HHMM=/^([01]\d|2[0-3]):([0-5]\d)$/;
const toDate=(key:string)=>{const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d)};
const keyOf=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const addDays=(key:string,n:number)=>{const d=toDate(key);d.setDate(d.getDate()+n);return keyOf(d)};
/** A week runs from Monday 04:00 to the next Monday 04:00. Its key is that Monday's day key. */
export function weekKeyOf(dayKey:string){const d=toDate(dayKey);d.setDate(d.getDate()-(d.getDay()+6)%7);return keyOf(d)}
const weekDays=(weekKey:string)=>Array.from({length:7},(_,i)=>addDays(weekKey,i));

/* Saved values are never trusted: a broken entry counts as nothing and never blocks loading. */
const validRule=(r:unknown):r is WeeklyRule=>obj(r)&&typeof r.kind==='string'&&r.kind in P.rules&&(P.rules[r.kind as WeeklyRuleKind] as readonly number[]).includes(r.value as number);
function reviews(data:RoutineData):Record<string,WeeklyReview>{
 const out:Record<string,WeeklyReview>={},raw=data.weeklyReviews;if(!obj(raw))return out;
 for(const [k,v] of Object.entries(raw))if(DAY_KEY.test(k)&&obj(v)&&typeof v.doneAt==='string')out[k]={doneAt:v.doneAt,...(validRule(v.rule)?{rule:v.rule}:{})};
 return out;
}
function stakes(data:RoutineData):Record<string,WeeklyStakeRow>{
 const out:Record<string,WeeklyStakeRow>={},raw=data.weeklyStakes;if(!obj(raw))return out;
 for(const [k,v] of Object.entries(raw))if(DAY_KEY.test(k)&&obj(v)&&(P.stake.amounts as readonly number[]).includes(v.amount as number)&&whole(v.targetDays)&&(v.status==='open'||v.status==='won'||v.status==='lost'))out[k]=v as WeeklyStakeRow;
 return out;
}
const validOutcome=(o:unknown):o is PromiseOutcome=>obj(o)&&(o.status==='kept'||o.status==='missed')&&typeof o.day==='string'&&whole(o.minutes)&&o.minutes<=P.promise.minutes&&whole(o.won);
function promises(data:RoutineData):Record<string,DayPromiseRow>{
 const out:Record<string,DayPromiseRow>={},raw=data.dayPromises;if(!obj(raw))return out;
 for(const [k,v] of Object.entries(raw))if(DAY_KEY.test(k)&&obj(v)&&typeof v.startAt==='string'&&HHMM.test(v.startAt))out[k]={startAt:v.startAt,setAt:String(v.setAt??''),...(validOutcome(v.outcome)?{outcome:v.outcome}:{})};
 return out;
}
function interestDays(data:RoutineData):Record<string,InterestDay>{
 const out:Record<string,InterestDay>={},raw=data.interestDays;if(!obj(raw))return out;
 for(const [k,v] of Object.entries(raw))if(DAY_KEY.test(k)&&obj(v)&&whole(v.unusedMinutes)&&whole(v.won)&&v.won<=P.interest.weeklyCapWon)out[k]={unusedMinutes:v.unusedMinutes,won:v.won,emergency:v.emergency===true};
 return out;
}

function addMoney(data:RoutineData,id:string,amount:number,at:number,note:string):RoutineData{
 if(!data.money||!amount||data.money.entries.some(e=>e.id===id))return data;
 const when=new Date(at);
 return {...data,money:{...data.money,entries:[...data.money.entries,{id,kind:'adjustment',amount,at:when.toISOString(),day:routineDay(when),note}]}};
}

/* Weekly rules chosen in the Monday review. */
/** The rules in force on a day: each kind takes the latest value chosen in an earlier week's review, else the default. */
export function activeWeeklyRules(data:RoutineData,dayKey:string):WeeklyRules{
 const week=weekKeyOf(dayKey),rules:WeeklyRules={...P.defaults};
 for(const [k,r] of Object.entries(reviews(data)).sort(([a],[b])=>a.localeCompare(b)))if(k<week&&r.rule)rules[r.rule.kind]=r.rule.value;
 return rules;
}
/** Marks that week's review as seen, with at most one rule for the weeks after it. Saved once: a second call changes nothing. */
export function saveWeeklyReview(data:RoutineData,weekKey:string,rule?:WeeklyRule,now=Date.now()):RoutineData{
 if(!DAY_KEY.test(weekKey)||weekKeyOf(weekKey)!==weekKey)throw new Error('주간 점검은 월요일 기준으로 저장해요.');
 if(rule!==undefined&&!validRule(rule))throw new Error('고를 수 있는 규칙이 아니에요.');
 if(reviews(data)[weekKey])return data;
 return {...data,weeklyReviews:{...reviews(data),[weekKey]:{doneAt:new Date(now).toISOString(),...(rule?{rule:{kind:rule.kind,value:rule.value}}:{})}}};
}

/* A one-line note for the week, written in the Monday review (Grace, build 51). */
const validNote=(n:unknown):n is WeeklyNote=>obj(n)&&typeof n.text==='string'&&!!n.text.trim()&&[...n.text].length<=WEEKLY_NOTE_CHARS&&typeof n.at==='string'&&Number.isFinite(Date.parse(n.at));
function notes(data:RoutineData):Record<string,WeeklyNote>{
 const out:Record<string,WeeklyNote>={},raw=data.weeklyNotes;if(!obj(raw))return out;
 for(const [k,v] of Object.entries(raw))if(DAY_KEY.test(k)&&validNote(v))out[k]={text:v.text,at:v.at};
 return out;
}
export const weeklyNote=(data:RoutineData,weekKey:string):WeeklyNote|undefined=>notes(data)[weekKey];
/** Saves the week's note trimmed, up to 40 characters. An empty note removes it. It can be rewritten. */
export function saveWeeklyNote(data:RoutineData,weekKey:string,text:string,now=Date.now()):RoutineData{
 if(!DAY_KEY.test(weekKey)||weekKeyOf(weekKey)!==weekKey)throw new Error('주간 메모는 월요일 기준으로 저장해요.');
 const clean=String(text??'').trim();
 if([...clean].length>WEEKLY_NOTE_CHARS)throw new Error('한 줄 메모는 40자까지 적을 수 있어요.');
 const {[weekKey]:_old,...rest}=notes(data);
 if(!clean){const {weeklyNotes:_gone,...base}=data;return Object.keys(rest).length?{...base,weeklyNotes:rest}:base}
 return {...data,weeklyNotes:{...rest,[weekKey]:{text:clean,at:new Date(now).toISOString()}}};
}

/* Studied days: the same rule as the calendar's 집중 공부 완료. */
/**
 * Focus minutes that also make a studied day, alongside the calendar's rule (OR). The team lead
 * chose 25 (2026-11-06); null would turn it off. Real study only: paused time is never in a session's seconds.
 */
export const STUDY_DAY_FOCUS_MINUTES:number|null=25;
/** Seconds of finished focus sessions on a day, by the 04:00 day of when each ended, in any study mode. */
export function focusSecondsOnDay(data:RoutineData,dayKey:string){
 return (Array.isArray(data.bookSessions)?data.bookSessions:[]).filter(s=>s&&whole(s.seconds)&&Number.isFinite(Date.parse(s.completedAt))&&routineDay(new Date(s.completedAt))===dayKey).reduce((n,s)=>n+s.seconds,0);
}
export function studyDayKeys(data:RoutineData,weekKey:string,focusMinutes:number|null=STUDY_DAY_FOCUS_MINUTES){
 return weekDays(weekKey).filter(k=>routineActivities(data,k).some(a=>a.id==='book'&&isActivityComplete(a))||focusMinutes!==null&&focusSecondsOnDay(data,k)>=focusMinutes*60);
}

/* Weekly stake. */
export function weeklyStake(data:RoutineData,dayKey:string,_now=Date.now()){
 const weekKey=weekKeyOf(dayKey),row=stakes(data)[weekKey],studyDays=studyDayKeys(data,weekKey).length;
 const reason=!data.money?'돈 보상을 먼저 시작해 주세요.':row?'이번 주 예치금을 이미 걸었어요.':dayKey!==weekKey?'예치금은 그 주 월요일에만 걸 수 있어요.':moneySummary(data).balance<P.stake.amounts[0]?'지갑 잔액이 모자라요.':undefined;
 return {weekKey,...(row?{stake:{amount:row.amount,targetDays:row.targetDays,studyDays:row.status==='open'?studyDays:row.studyDays??studyDays,status:row.status,...(row.payoutWon!==undefined?{payoutWon:row.payoutWon}:{})}}:{}),canPlace:!reason,...(reason?{reason}:{})};
}
/** Takes the money from the wallet now. Only on that week's Monday, once, and only with enough in the wallet. */
export function placeWeeklyStake(data:RoutineData,dayKey:string,amount:StakeAmount,now=Date.now()):RoutineData{
 if(!(P.stake.amounts as readonly number[]).includes(amount))throw new Error('5,000원, 10,000원, 20,000원 중에서 골라 주세요.');
 const weekKey=weekKeyOf(dayKey),row=stakes(data)[weekKey];
 if(row){if(row.amount===amount)return data;throw new Error('이번 주 예치금을 이미 걸었어요.')}
 if(!data.money)throw new Error('돈 보상을 먼저 시작해 주세요.');
 if(dayKey!==weekKey||routineDay(new Date(now))!==dayKey)throw new Error('예치금은 그 주 월요일에만 걸 수 있어요.');
 if(moneySummary(data).balance<amount)throw new Error('지갑 잔액이 모자라요.');
 const placed:WeeklyStakeRow={amount,targetDays:activeWeeklyRules(data,dayKey).stakeDays,placedAt:new Date(now).toISOString(),status:'open'};
 return addMoney({...data,weeklyStakes:{...stakes(data),[weekKey]:placed}},'stake:'+weekKey,-amount,now,'주간 예치금 걸기');
}
function settleStakes(data:RoutineData,now:number):RoutineData{
 let next=data;
 for(const [weekKey,row] of Object.entries(stakes(data))){
  if(row.status!=='open'||now<dayEnd(addDays(weekKey,6)).getTime())continue;
  const studyDays=studyDayKeys(next,weekKey).length,won=studyDays>=row.targetDays,payoutWon=row.amount+Math.floor(row.amount*P.stake.bonusRate);
  next={...next,weeklyStakes:{...stakes(next),[weekKey]:{...row,status:won?'won':'lost',studyDays,settledAt:new Date(now).toISOString(),...(won?{payoutWon}:{})}}};
  if(won)next=addMoney(next,'stake-payout:'+weekKey,payoutWon,now,'주간 예치금 돌려받기');
 }
 return next;
}

/* Tomorrow's promise. */
const promiseTime=(dayKey:string,startAt:string)=>{const [h,m]=startAt.split(':').map(Number),d=toDate(dayKey);d.setHours(h,m,0,0);return d.getTime()};
export function dayPromise(data:RoutineData,dayKey:string):{startAt?:string;status:'none'|'pending'|'kept'|'missed'}{
 const row=promises(data)[dayKey];
 return row?{startAt:row.startAt,status:row.outcome?.status??'pending'}:{status:'none'};
}
/** Set during today for tomorrow, and changeable until tomorrow starts at 04:00. Breaking it never blocks use (A안). */
export function setTomorrowPromise(data:RoutineData,dayKey:string,startAt:string,now=Date.now()):RoutineData{
 if(routineDay(new Date(now))!==dayKey)throw new Error('내일 약속은 오늘 안에 정해 주세요.');
 if(!HHMM.test(startAt)||startAt<P.promise.earliest||startAt>P.promise.latest)throw new Error('약속 시각은 04:15부터 23:45 사이로 골라 주세요.');
 const target=addDays(dayKey,1),row=promises(data)[target];
 if(row?.outcome)throw new Error('이미 끝난 약속이에요.');
 return {...data,dayPromises:{...promises(data),[target]:{startAt,setAt:new Date(now).toISOString()}}};
}
/** Every moment a focus run was started or resumed that the saved data still shows. */
function focusStarts(data:RoutineData){
 const t=data.bookTimer,times=[...(Array.isArray(data.bookSessions)?data.bookSessions:[]).map(s=>Date.parse(s?.startedAt)),t?Date.parse(t.startedAt):NaN,typeof t?.focusResumedAt==='number'?t.focusResumedAt:NaN];
 return times.filter(Number.isFinite);
}
function settlePromises(data:RoutineData,now:number):RoutineData{
 let next=data;const window=P.promise.windowMinutes*MIN,starts=focusStarts(data);
 for(const [dayKey,row] of Object.entries(promises(data))){
  if(row.outcome)continue;
  const due=promiseTime(dayKey,row.startAt),kept=starts.some(s=>s>=due-window&&s<=due+window);
  if(!kept&&now<=due+window)continue;
  // The result lands on the day it was found, so the phone, which only takes today's numbers, hears it.
  const day=routineDay(new Date(now)),at=new Date(now).toISOString();
  const won=kept?(next.money?P.promise.won:0):next.money?Math.min(P.promise.won,Math.max(0,moneySummary(next).balance+QUIT_PENALTY.debtWon)):0;
  const outcome:PromiseOutcome={status:kept?'kept':'missed',at,day,minutes:P.promise.minutes,won};
  next={...next,dayPromises:{...promises(next),[dayKey]:{...row,outcome}}};
  if(kept)next=withDay(next,day,d=>({...d,bonus:{...d.bonus,promise:P.promise.minutes}}));
  next=addMoney(next,'promise:'+dayKey,kept?won:-won,now,kept?'내일 약속 지킴':'내일 약속 놓침');
 }
 return next;
}

export type PromiseOutcomeRow={promiseDay:string;startAt:string;status:'kept'|'missed';minutes:number;won:number;label:string};
/** Promise results charged or paid on a day, worded for the day record (user decision: no confirm screen, but say it once). */
export function promiseOutcomesOn(data:RoutineData,day:string):PromiseOutcomeRow[]{
 return Object.entries(promises(data)).filter(([,r])=>r.outcome?.day===day).sort(([a],[b])=>a.localeCompare(b)).map(([promiseDay,r])=>{
  const o=r.outcome!,d=toDate(promiseDay),when=promiseDay===day?'오늘':promiseDay===addDays(day,-1)?'어제':`${d.getMonth()+1}월 ${d.getDate()}일`;
  const sign=o.status==='kept'?'+':'−',amounts=[sign+o.minutes+'분',...(o.won?[o.won.toLocaleString('ko-KR')+'원']:[])];
  const label=`${when} 약속(${r.startAt})을 ${o.status==='kept'?'지켜서':'놓쳐서'} ${amounts.join('·')}`;
  return {promiseDay,startAt:r.startAt,status:o.status,minutes:o.minutes,won:o.won,label};
 });
}

/* Interest on unused time. */
const consumedOn=(data:RoutineData,key:string)=>{const v=(data.playLog as {consumed?:Record<string,unknown>}|undefined)?.consumed?.[key];return whole(v)?v:undefined};
/** What the phone carried into a day: the same rule as its 04:00 rollover, capped at 60. Unknown days carry nothing. */
function carriedDebt(data:RoutineData,key:string,depth=7):number{
 if(depth<=0)return 0;
 const prev=addDays(key,-1),used=consumedOn(data,prev);if(used===undefined)return 0;
 return Math.min(QUIT_PENALTY.debtMinutes,Math.max(0,penaltyMinutesOnDay(data,prev)+carriedDebt(data,prev,depth-1)+used-earned(getDay(data,prev))));
}
export function weeklyInterest(data:RoutineData,weekKey:string){
 const all=interestDays(data),days=weekDays(weekKey).filter(k=>all[k]).map(k=>({dayKey:k,...all[k]}));
 return {won:days.reduce((n,d)=>n+d.won,0),capWon:P.interest.weeklyCapWon,days};
}
function settleInterest(data:RoutineData,now:number):RoutineData{
 const today=routineDay(new Date(now)),since=typeof data.interestSince==='string'&&DAY_KEY.test(data.interestSince)?data.interestSince:addDays(today,-1);
 let next:RoutineData=data.interestSince===since?data:{...data,interestSince:since};
 for(let i=P.interest.lookbackDays;i>=1;i--){
  const key=addDays(today,-i);
  if(key<since||interestDays(next)[key])continue;
  const used=consumedOn(next,key);if(used===undefined)continue;
  const unusedMinutes=Math.max(0,earned(getDay(next,key))-penaltyMinutesOnDay(next,key)-carriedDebt(next,key)-used),emergency=emergencyUnlocksOn(next,key).length>0;
  const room=Math.max(0,P.interest.weeklyCapWon-weeklyInterest(next,weekKeyOf(key)).won);
  const won=next.money&&!emergency?Math.min(room,Math.floor(unusedMinutes/P.interest.perMinutes)*P.interest.won):0;
  next={...next,interestDays:{...interestDays(next),[key]:{unusedMinutes,won,emergency}}};
  next=addMoney(next,'interest:'+key,won,dayEnd(key).getTime(),'안 쓴 시간 이자');
 }
 return next;
}

/** Settles whatever is due: promises, interest on closed days, stakes of finished weeks. Returns the same object when nothing changed. */
export function reconcileCommitments(data:RoutineData,now=Date.now()):RoutineData{
 const next=settleStakes(settleInterest(settlePromises(data,now),now),now);
 // The interest start day alone is not a change: it is saved with the first real one, so at most the day before is paid back.
 const {interestSince:_a,...a}=next,{interestSince:_b,...b}=data;
 return JSON.stringify(a)===JSON.stringify(b)?data:next;
}
