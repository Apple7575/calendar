import type {HandwritingReceipt} from './handwriting';
import {FOCUS_MONEY_MINUTES,FOCUS_STEPS} from './focusRamp';
import type {RoutineData} from './routineModel';
import {getDay} from './routineModel';
import {eveningSteps} from './dailyPlan';
export const MONEY_RATE_LABELS={morningMin:'아침 작은 목표',morningFull:'아침 전체 목표',eveningMin:'저녁 작은 목표',eveningFull:'저녁 전체 목표',gymMin:'짧은 집 운동',gymFull:'헬스장 운동',wordStep:'단어 보상 구간 1회',outputStep:'손글씨 100자'} as const;
export type MoneyRates=Record<keyof typeof MONEY_RATE_LABELS,number>;
export const PROPOSED_MONEY_RATES:MoneyRates={morningMin:500,morningFull:1000,eveningMin:0,eveningFull:0,gymMin:1000,gymFull:3000,wordStep:500,outputStep:500};
export type MoneySource='morning'|'evening'|'gym'|'words'|'output';
const sources:MoneySource[]=['morning','evening','gym','words','output'];
const labels:Record<MoneySource,string>={morning:'아침 루틴',evening:'저녁 루틴',gym:'운동',words:'단어 학습',output:'손글씨 공부'};
export type MoneyEntry={id:string;kind:'reward'|'adjustment'|'expense'|'refund';amount:number;at:string;note:string;day?:string;source?:MoneySource;reverses?:string};
type MoneyCheckpoint={basis:number;amounts:number[]};
type MoneyDay={rates:MoneyRates;sources:Record<MoneySource,MoneyCheckpoint>};
export type MoneyWallet={id:string;startedAt:string;rates:MoneyRates;days:Record<string,MoneyDay>;entries:MoneyEntry[]};
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000;
export function validateMoneyRates(rates:MoneyRates){
 if(!rates||Object.keys(MONEY_RATE_LABELS).some(k=>!integer(rates[k as keyof MoneyRates]))||rates.morningFull<rates.morningMin||rates.eveningFull<rates.eveningMin||rates.gymFull<rates.gymMin)throw new Error('금액은 0원 이상의 정수로, 전체 목표는 작은 목표 이상으로 입력해 주세요.');
}
export function parseWon(value:string){const s=value.replace(/,/g,'').trim();if(!/^\d+$/.test(s)||!integer(Number(s)))throw new Error('금액을 원 단위 정수로 입력해 주세요.');return Number(s);}
function basis(data:RoutineData,key:string):Record<MoneySource,number>{
 const d=getDay(data,key),steps=eveningSteps(data,key),minimum=steps.map((s,i)=>s.minimum?i:-1).filter(i=>i>=0);
 const rows=(data.handwritingReceipts??[]).filter(r=>r.rewardStatus!=='pending'),carry=rows.filter(r=>(r.rewardDay??r.day)<key).reduce((n,r)=>n+r.units,0)%100,units=rows.filter(r=>(r.rewardDay??r.day)===key).reduce((n,r)=>n+r.units,0);
 return {morning:d.paid.morning>=10?2:d.paid.morning>=5?1:0,gym:d.paid.gym>=30?2:d.paid.gym>=10?1:0,evening:steps.length&&steps.every((_,i)=>d.evening?.[i])?2:minimum.length&&minimum.every(i=>d.evening?.[i])?1:0,words:d.wordRewards?.rounds??0,output:Math.floor((carry+units)/100)};
}
function checkpoint(data:RoutineData,key:string,rates:MoneyRates):MoneyDay{
 const b=basis(data,key);return {rates:{...rates},sources:Object.fromEntries(sources.map(source=>[source,{basis:b[source],amounts:Array(b[source]).fill(0)}])) as MoneyDay['sources']};
}
function unitAmount(r:MoneyRates,source:MoneySource,index:number){return source==='words'?r.wordStep:source==='output'?r.outputStep:source==='morning'?index===0?r.morningMin:r.morningFull-r.morningMin:source==='evening'?index===0?r.eveningMin:r.eveningFull-r.eveningMin:index===0?r.gymMin:r.gymFull-r.gymMin;}
/** Activation is explicit. Existing achievements are baselined, never retroactively paid. */
export function startMoneyRewards(data:RoutineData,key:string,id:string,rates:MoneyRates,now=new Date()):RoutineData{
 validateMoneyRates(rates);if(data.money)return data;
 return {...data,money:{id,startedAt:now.toISOString(),rates:{...rates},days:{[key]:checkpoint(data,key,rates)},entries:[]}};
}
export function saveMoneyRates(data:RoutineData,rates:MoneyRates):RoutineData{
 validateMoneyRates(rates);if(!data.money)throw new Error('돈 보상을 먼저 시작해 주세요.');
 return {...data,money:{...data.money,rates:{...rates}}};
}
/** One atomic ledger update with the domain action. Day rates and paid units survive undo/regrade. */
export function reconcileMoneyRewards(before:RoutineData,after:RoutineData,key:string,now=new Date()):RoutineData{
 return reconcileFixedRewards(before,reconcileRateRewards(before,after,key,now),key,now);
}
/**
 * Rewards at a fixed rate (user decisions 2026-11-04): 100 won per stage or free-study minute, 3,000 won for the order
 * bonus. They are plain entries because a new rate key or source would make older wallets fail validation and block loading.
 */
const FIXED={perMinute:100,order:3000} as const;
/** A stage's money follows its own table, at the share studied when finished early. */
const stageMoneyMinutes=(r:HandwritingReceipt)=>r.focusStage&&r.focusSeconds?Math.floor(FOCUS_MONEY_MINUTES[r.focusStage]*r.focusSeconds/FOCUS_STEPS[r.focusStage]):0;
function reconcileFixedRewards(before:RoutineData,after:RoutineData,key:string,now:Date):RoutineData{
 const wallet=after.money;if(!wallet)return after;
 const entries=[...wallet.entries],at=now.toISOString(),a=getDay(before,key).bonus,b=getDay(after,key).bonus,earlier=new Set((before.handwritingReceipts??[]).filter(r=>r.rewardStatus==='earned').map(r=>r.id));
 for(const r of after.handwritingReceipts??[]){
  if(r.rewardPolicy!=='ramp-v2'||r.rewardStatus!=='earned'||earlier.has(r.id))continue;
  const minutes=stageMoneyMinutes(r)+(r.planMinutes??0),id='focus:'+r.id;
  if(minutes>0&&!entries.some(e=>e.id===id))entries.push({id,kind:'reward',amount:minutes*FIXED.perMinute,at,day:r.rewardDay??key,source:'output',note:'집중 단계 보상'});
 }
 const free=(b?.freeStudy??0)-(a?.freeStudy??0),freeId=`free:${key}:${b?.freeStudy??0}`;
 if(free>0&&!entries.some(e=>e.id===freeId))entries.push({id:freeId,kind:'reward',amount:free*FIXED.perMinute,at,day:key,note:'자유 공부 보상'});
 if((a?.order??0)!==(b?.order??0)){
  const prefix=`order:${key}`,held=entries.filter(e=>e.id.startsWith(prefix)).reduce((n,e)=>n+e.amount,0),change=((b?.order??0)>0?FIXED.order:0)-held;
  if(change)entries.push({id:`${prefix}:${entries.length+1}`,kind:change>0?'reward':'adjustment',amount:change,at,day:key,note:change>0?'하루 순서 보너스':'하루 순서 보너스 취소·정정'});
 }
 return entries.length===wallet.entries.length?after:{...after,money:{...wallet,entries}};
}
function reconcileRateRewards(before:RoutineData,after:RoutineData,key:string,now:Date):RoutineData{
 const wallet=after.money;if(!wallet)return after;
 const day=wallet.days[key]??checkpoint(before,key,wallet.rates),nextBasis=basis(after,key),nextSources={...day.sources},entries=[...wallet.entries];let changed=!wallet.days[key];
 for(const source of sources){const previous=day.sources[source],current=nextBasis[source];if(current===previous.basis)continue;
  const amounts=[...previous.amounts];let amount=0;
  if(current>previous.basis)for(let i=previous.basis;i<current;i++){if(amounts[i]===undefined)amounts[i]=unitAmount(day.rates,source,i);amount+=amounts[i];}
  else for(let i=current;i<previous.basis;i++)amount-=amounts[i]??0;
  nextSources[source]={basis:current,amounts};changed=true;
  if(amount)entries.push({id:`${wallet.id}:event:${entries.length+1}`,kind:amount>0?'reward':'adjustment',amount,at:now.toISOString(),day:key,source,note:amount>0?`${labels[source]} 보상`:`${labels[source]} 보상 취소·정정`});
 }
 return changed?{...after,money:{...wallet,days:{...wallet.days,[key]:{...day,sources:nextSources}},entries}}:after;
}
export function moneySummary(data:RoutineData){
 const entries=data.money?.entries??[],balance=entries.reduce((sum,e)=>sum+e.amount,0);
 return {balance,available:Math.max(0,balance),overspent:Math.max(0,-balance),earned:entries.filter(e=>e.kind==='reward'||e.kind==='adjustment').reduce((n,e)=>n+e.amount,0),spent:Math.max(0,-entries.filter(e=>e.kind==='expense'||e.kind==='refund').reduce((n,e)=>n+e.amount,0))};
}
export function recordMoneyExpense(data:RoutineData,id:string,amount:number,note:string,now=new Date()):RoutineData{
 const wallet=data.money;if(!wallet)throw new Error('돈 보상을 먼저 시작해 주세요.');
 if(!integer(amount)||amount===0||note.length>200||!id||id.length>128)throw new Error('지출은 1원 이상의 정수, 메모는 200자까지 입력해 주세요.');
 if(wallet.entries.some(e=>e.id===id))return data;
 return {...data,money:{...wallet,entries:[...wallet.entries,{id,kind:'expense',amount:-amount,at:now.toISOString(),note:note.trim()||'지출'}]}};
}
export function refundMoneyExpense(data:RoutineData,id:string,now=new Date()):RoutineData{
 const wallet=data.money,expense=wallet?.entries.find(e=>e.id===id&&e.kind==='expense');if(!wallet||!expense)throw new Error('취소할 지출을 찾지 못했어요.');
 if(wallet.entries.some(e=>e.kind==='refund'&&e.reverses===id))return data;
 return {...data,money:{...wallet,entries:[...wallet.entries,{id:`refund:${id}`,kind:'refund',amount:-expense.amount,at:now.toISOString(),note:`지출 취소 · ${expense.note}`,reverses:id}]}};
}
export function validateMoneyState(data:RoutineData){
 const w=data.money;if(w===undefined)return;
 if(!w||typeof w.id!=='string'||!w.id||!Number.isFinite(Date.parse(w.startedAt))||!w.days||!Array.isArray(w.entries)||w.entries.length>100000)throw new Error('돈 보상 지갑 형식을 확인해 주세요.');
 validateMoneyRates(w.rates);
 if(new Set(w.entries.map(e=>e.id)).size!==w.entries.length||w.entries.some(e=>!e||typeof e.id!=='string'||typeof e.note!=='string'||e.note.length>220||!Number.isSafeInteger(e.amount)||e.amount===0||Math.abs(e.amount)>1e12||!Number.isFinite(Date.parse(e.at))||!['reward','adjustment','expense','refund'].includes(e.kind)||(['reward','refund'].includes(e.kind)?e.amount<0:e.amount>0)))throw new Error('돈 보상 적립·지출 내역을 확인해 주세요.');
 for(const e of w.entries.filter(e=>e.kind==='refund')){const expense=w.entries.find(row=>row.id===e.reverses&&row.kind==='expense');if(!expense||expense.amount!==-e.amount||w.entries.filter(row=>row.kind==='refund'&&row.reverses===e.reverses).length!==1)throw new Error('지출 취소 내역을 확인해 주세요.');}
 for(const [key,day]of Object.entries(w.days)){if(!/^\d{4}-\d{2}-\d{2}$/.test(key))throw new Error('돈 보상 날짜를 확인해 주세요.');validateMoneyRates(day.rates);for(const source of sources){const c=day.sources?.[source];if(!c||!integer(c.basis)||!Array.isArray(c.amounts)||c.amounts.length>100000||c.basis>c.amounts.length||c.amounts.some(n=>!integer(n)))throw new Error('돈 보상 지급 기준 기록을 확인해 주세요.');}}
}
