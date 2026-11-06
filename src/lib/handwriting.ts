import type {RoutineData} from './routineModel';
import {getDay,routineDay,withDay} from './routineModel';
import {FOCUS_STEPS,carryRunPastStage,FOCUS_STAGE_MINUTES,FOCUS_STAGE_TABLES,focusPlanMinutesDue,focusRunCredit,focusRampAccess,focusStagePayout,focusStagesDue,focusRampStatus,validateFocusRamp} from './focusRamp';
import {bookFocusSeconds} from './bookTimerTime';
import {stopBookTimer} from './bookStudy';
import {breakPayoutMinutes,focusBreakPayouts,validBreakPayout} from './focusBreakReward';

export const OUTPUT_POLICY={version:1,units:100,minutes:5,goalUnits:500} as const;
export type HandwritingAnalysis={lines:string[];languages:('ko'|'en'|'ja'|'math')[];quality:'readable'|'retake';message:string};
export type HandwritingReceipt={id:string;imageHash:string;subject:string;at:string;day:string;lines:string[];languages:HandwritingAnalysis['languages'];units:number;duplicateUnits:number;minutes:number;policyVersion:1;focusSeconds?:number;rewardPolicy?:'ramp-v1'|'ramp-v2';stageMinutes?:number;planMinutes?:number;letterMinutes?:number;finish?:'timer'|'declared';focusCycle?:string;focusStage?:number;focusStagesPaid?:number[];focusBatch?:string;rewardStatus?:'pending'|'earned';rewardDay?:string;rewardOrder?:number};
const isRamp=(r:HandwritingReceipt)=>r.rewardPolicy==='ramp-v1'||r.rewardPolicy==='ramp-v2';
export type OutputDraft={id:string;subject:string;startedAt:string};
export const normalizeHandwriting=(text:string)=>Array.from(text.normalize('NFKC').toLowerCase()).filter(c=>/[\p{L}\p{N}]/u.test(c)).join('');
/** Pauses and breaks never count. Unused study credit survives leaving the screen. */
export function handwritingAccess(data:RoutineData,subject:string,now=Date.now()){
 if(data.focusRamp||data.handwritingReceipts?.some(r=>r.rewardStatus==='pending'&&isRamp(r)))return focusRampAccess(data,subject,now);
 return legacyHandwritingAccess(data,subject,now);
}
function legacyHandwritingAccess(data:RoutineData,subject:string,now=Date.now()){
 let seconds=(data.bookSessions??[]).filter(s=>s.rewardMode==='output'&&s.subject===subject).reduce((n,s)=>n+s.seconds,0);
 const t=data.bookTimer;
 if(t?.rewardMode==='output'&&t.subject===subject&&t.phase==='focus'&&!(data.bookSessions??[]).some(s=>s.id===t.id)){
  seconds+=bookFocusSeconds(t,now);
 }
 const consumed=(data.handwritingReceipts??[]).filter(r=>r.subject===subject).reduce((n,r)=>n+(r.focusSeconds??0),0);
 const available=Math.max(0,seconds-consumed);
 return {seconds:available,ready:available>=1500,submissions:Math.floor(available/1500),remaining:Math.max(0,1500-available)};
}
export function validateHandwritingAnalysis(input:unknown):HandwritingAnalysis{
 const a=input as HandwritingAnalysis;
 if(!a||!Array.isArray(a.lines)||a.lines.length>1200||a.lines.some(s=>typeof s!=='string'||s.length>2000)||a.lines.join('').length>16000||!Array.isArray(a.languages)||a.languages.some(l=>!['ko','en','ja','math'].includes(l))||!['readable','retake'].includes(a.quality)||typeof a.message!=='string'||a.message.length>500)throw new Error('인식 결과를 확인하지 못했어요. 사진을 다시 찍어 주세요.');
 return a;
}
/** Conservative text overlap guard. OCR is approximate; this is not proof of a physical page. */
export function outputPreview(data:RoutineData,hash:string,analysis:HandwritingAnalysis){
 validateHandwritingAnalysis(analysis);
 const receipts=data.handwritingReceipts??[],text=normalizeHandwriting(analysis.lines.join(''));
 if(analysis.quality!=='readable'||!text.length)return {units:0,duplicateUnits:0,minutes:0,remainder:outputCarry(data),duplicate:false};
 if(receipts.some(r=>r.imageHash===hash||normalizeHandwriting(r.lines.join(''))===text))return {units:0,duplicateUnits:Array.from(text).length,minutes:0,remainder:outputCarry(data),duplicate:true};
 const chars=Array.from(text),mask=new Uint8Array(chars.length),window=16;
 const candidateGrams=new Map<string,number[]>();
 for(let i=0;i<=chars.length-window;i++){const gram=chars.slice(i,i+window).join(''),positions=candidateGrams.get(gram)??[];positions.push(i);candidateGrams.set(gram,positions);}
 for(const r of receipts){const old=Array.from(normalizeHandwriting(r.lines.join('')));for(let i=0;i<=old.length-window;i++){const gram=old.slice(i,i+window).join(''),positions=candidateGrams.get(gram);if(positions){for(const at of positions)mask.fill(1,at,at+window);candidateGrams.delete(gram);}}}
 const duplicateUnits=mask.reduce((n,v)=>n+v,0),units=chars.length-duplicateUnits,carry=outputCarry(data);
 return {units,duplicateUnits,minutes:Math.floor((carry+units)/OUTPUT_POLICY.units)*OUTPUT_POLICY.minutes,remainder:(carry+units)%OUTPUT_POLICY.units,duplicate:units===0};
}
export function outputCarry(data:RoutineData){return (data.handwritingReceipts??[]).filter(r=>r.rewardStatus!=='pending').reduce((n,r)=>n+r.units,0)%OUTPUT_POLICY.units;}
export function outputUnitsOnDay(data:RoutineData,key:string,subject?:string){return (data.handwritingReceipts??[]).filter(r=>r.rewardStatus!=='pending'&&(r.rewardDay??r.day)===key&&(!subject||r.subject===subject)).reduce((n,r)=>n+r.units,0);}
/** A completed 25-minute block releases all photos awaiting that subject, once. */
export function settleHandwritingRewards(data:RoutineData,now=Date.now()):RoutineData{
 let next=data;
 const subjects=[...new Set((data.handwritingReceipts??[]).filter(r=>r.rewardStatus==='pending'&&!isRamp(r)).map(r=>r.subject))];
 for(const subject of subjects){
  if(!legacyHandwritingAccess(next,subject,now).ready)continue;
  let carry=outputCarry(next),first=true,minutes=0;
  let ordinal=Math.max(-1,...(next.handwritingReceipts??[]).map((r,i)=>r.rewardOrder??i))+1;
  const day=routineDay(new Date(now)),rows=next.handwritingReceipts!.map(r=>{
   if(r.subject!==subject||r.rewardStatus!=='pending'||isRamp(r))return r;
   const reward=Math.floor((carry+r.units)/100)*5;carry=(carry+r.units)%100;minutes+=reward;
   const receipt:HandwritingReceipt={...r,rewardStatus:'earned',rewardDay:day,rewardOrder:ordinal++,minutes:reward,...(first?{focusSeconds:1500 as const}:{})};first=false;return receipt;
  });
  next=withDay({...next,handwritingReceipts:rows},day,d=>({...d,bonus:{...d.bonus,handwriting:(d.bonus?.handwriting??0)+minutes}}));
 }
 const rampSubjects=[...new Set((next.handwritingReceipts??[]).filter(r=>r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v1').map(r=>r.subject))];
 for(const subject of rampSubjects){
  const due=focusStagesDue(next,subject,now),ramp=next.focusRamp;
  if(!ramp||!due.stages.length)continue;
  const pending=next.handwritingReceipts!.filter(r=>r.subject===subject&&r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v1'&&r.focusCycle===ramp.cycleId);
  if(!pending.length)continue;
  let first=true,ordinal=next.handwritingReceipts!.reduce((n,r,i)=>Math.max(n,r.rewardOrder??i),-1)+1;
  const batch=pending[0].id,day=routineDay(new Date(now));
  const rows=next.handwritingReceipts!.map(r=>{
   if(!pending.some(p=>p.id===r.id))return r;
   const receipt:HandwritingReceipt={...r,rewardStatus:'earned',rewardDay:day,rewardOrder:ordinal++,focusStage:ramp.level,focusBatch:batch,minutes:first?5*due.stages.length:0,...(first?{focusSeconds:due.seconds,...(due.stages.length>1?{focusStagesPaid:due.stages}:{})}:{})};first=false;return receipt;
  });
  next=withDay({...next,handwritingReceipts:rows,focusRamp:{...ramp,level:due.level as 1|2|3|4|5,consumed:{...ramp.consumed,[subject]:(Object.prototype.hasOwnProperty.call(ramp.consumed,subject)?ramp.consumed[subject]:0)+due.seconds}}},day,d=>({...d,bonus:{...d.bonus,handwriting:(d.bonus?.handwriting??0)+5*due.stages.length}}));
  next=carryRunPastStage(next,subject,due.seconds,now);
 }
 const stageSubjects=[...new Set((next.handwritingReceipts??[]).filter(r=>r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v2').map(r=>r.subject))];
 for(const subject of stageSubjects){
  const due=focusStagePayout(next,subject,now);
  if(due)next=payStage(next,subject,now,{...due,finish:'timer'});
 }
 return next;
}
/** One payout: the stage and plan go on the first photo of the batch, letters on each photo in order. Money follows in reconcileMoneyRewards. */
function payStage(data:RoutineData,subject:string,now:number,pay:{stage:number;seconds:number;minutes:number;level:number;finish:'timer'|'declared'}):RoutineData{
 const ramp=data.focusRamp;if(!ramp)return data;
 const rows=data.handwritingReceipts??[],pending=rows.filter(r=>r.subject===subject&&r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v2'&&r.focusCycle===ramp.cycleId);
 if(!pending.length)return data;
 const plan=focusPlanMinutesDue(data),batch=pending[0].id,day=routineDay(new Date(now));
 let ordinal=rows.reduce((n,r,i)=>Math.max(n,r.rewardOrder??i),-1)+1,carry=outputCarry(data),total=0;
 const paid=rows.map(r=>{
  if(!pending.includes(r))return r;
  const head=r.id===batch,letterMinutes=Math.floor((carry+r.units)/OUTPUT_POLICY.units)*OUTPUT_POLICY.minutes,stageMinutes=head?pay.minutes:0,planMinutes=head?plan:0,minutes=stageMinutes+planMinutes+letterMinutes;
  carry=(carry+r.units)%OUTPUT_POLICY.units;total+=minutes;
  return {...r,rewardStatus:'earned' as const,rewardDay:day,rewardOrder:ordinal++,focusStage:pay.stage,focusBatch:batch,finish:pay.finish,stageMinutes,planMinutes,letterMinutes,minutes,...(head?{focusSeconds:pay.seconds}:{})};
 });
 const next=withDay({...data,handwritingReceipts:paid,focusRamp:{...ramp,level:pay.level as 1|2|3|4|5,consumed:{...ramp.consumed,[subject]:(Object.prototype.hasOwnProperty.call(ramp.consumed,subject)?ramp.consumed[subject]:0)+pay.seconds}}},day,d=>({...d,bonus:{...d.bonus,handwriting:(d.bonus?.handwriting??0)+total}}));
 const t=next.bookTimer,asks=t?.subject===subject&&t.rewardMode==='output'&&t.phase!=='break';
 const settled=carryRunPastStage(asks?stopBookTimer(next,now):next,subject,pay.seconds,now);
 // The run stops here and the user picks 계속 공부 or 마치기 (user decision 2026-11-04). A break just carries on.
 return asks?{...settled,bookTimer:{...settled.bookTimer!,awaitingChoice:true,focusResumedAt:now}}:settled;
}
/** "다 했어요": the current stage at the share actually studied, and the next stage is opened. */
function payDeclared(data:RoutineData,subject:string,now:number):RoutineData{
 const access=focusRampAccess(data,subject,now),seconds=Math.min(focusRunCredit(data,now),access.seconds);
 if(access.needsPlan||!access.level||seconds<=0)throw new Error('공부한 시간이 있어야 끝낼 수 있어요.');
 return payStage(data,subject,now,{stage:access.level,seconds,minutes:Math.floor(FOCUS_STAGE_MINUTES[access.level]*Math.min(1,seconds/access.required)),level:Math.min(5,access.level+1),finish:'declared'});
}
export function startOutputStudy(data:RoutineData,id:string,subject:string,now=new Date()):RoutineData{
 const clean=subject.trim();if(!clean||clean.length>80)throw new Error('공부 주제를 1~80자로 입력해 주세요.');
 if(data.outputDraft)return data;
 return {...data,outputDraft:{id,subject:clean,startedAt:now.toISOString()}};
}
export function acceptHandwriting(data:RoutineData,id:string,hash:string,subject:string,analysis:HandwritingAnalysis,now=new Date(),policy:'legacy25'|'ramp-v1'|'ramp-v2'=data.focusRamp?'ramp-v2':'legacy25',declared=false):RoutineData{
 if(!/^[a-f0-9]{64}$/.test(hash)||!id||id.length>100||!subject.trim()||subject.trim().length>80)throw new Error('공부 사진 정보를 확인해 주세요.');
 if(data.handwritingReceipts?.some(r=>r.id===id))return data;
 const p=outputPreview(data,hash,analysis);
 if(analysis.quality!=='readable')throw new Error(analysis.message||'글씨가 잘 보이도록 다시 찍어 주세요.');
 if(!p.units)throw new Error(p.duplicate?'이미 기록한 내용이에요. 새로 쓴 부분만 찍어 주세요.':'읽을 수 있는 손글씨가 없어요.');
 if(!data.outputDraft||data.outputDraft.subject!==subject)throw new Error('이 과목의 공부를 먼저 시작해 주세요.');
 if(declared&&p.units<OUTPUT_POLICY.units)throw new Error('새로 쓴 글자가 100자 이상이면 공부를 끝낼 수 있어요.');
 const day=routineDay(now),receipt:HandwritingReceipt={id,imageHash:hash,subject:subject.trim(),at:now.toISOString(),day,lines:[...analysis.lines],languages:[...analysis.languages],units:p.units,duplicateUnits:p.duplicateUnits,minutes:0,policyVersion:1,rewardStatus:'pending',...(policy!=='legacy25'?{rewardPolicy:policy,focusCycle:focusRampStatus(data,now.getTime()).needsPlan?'awaiting-plan':data.focusRamp!.cycleId}:{})};
 const saved=settleHandwritingRewards(withDay({...data,handwritingPending:undefined,handwritingReceipts:[...(data.handwritingReceipts??[]),receipt]},day,d=>d),now.getTime());
 if(!declared||saved.handwritingReceipts!.find(r=>r.id===id)?.rewardStatus!=='pending')return saved;
 return payDeclared(saved,subject.trim(),now.getTime());
}
/** A receipt pays one stage, or the consecutive list one photo finished. */
function validPaidStages(r:HandwritingReceipt){
 const list=r.focusStagesPaid;
 if(list===undefined)return r.minutes===(r.focusSeconds?5:0)&&(r.focusSeconds===undefined||r.focusSeconds===FOCUS_STEPS[r.focusStage!]);
 if(!Array.isArray(list)||list.length<2||list.length>200||!r.focusSeconds||list[0]!==r.focusStage||list.some((s,i)=>!Number.isInteger(s)||s<1||s>5||i>0&&s!==Math.min(5,list[i-1]+1)))return false;
 return r.minutes===5*list.length&&r.focusSeconds===list.reduce((n,s)=>n+FOCUS_STEPS[s],0);
}
/** A build-43 payout must add up from the table, so a tampered backup cannot mint time or money. */
function validStagePay(r:HandwritingReceipt,carry:number){
 const parts=[r.stageMinutes,r.planMinutes,r.letterMinutes];
 if(parts.some(n=>!Number.isSafeInteger(n)||n!<0)||r.minutes!==parts.reduce((a,b)=>a!+b!,0)||r.letterMinutes!==Math.floor((carry+r.units)/OUTPUT_POLICY.units)*OUTPUT_POLICY.minutes)return false;
 const stage=r.focusStage!;
 if(r.focusSeconds===undefined)return r.stageMinutes===0&&r.planMinutes===0;
 if(!Number.isSafeInteger(r.focusSeconds)||r.focusSeconds<=0||(r.planMinutes!==0&&r.planMinutes!==1))return false;
 if(r.finish==='declared')return r.focusSeconds<=FOCUS_STEPS[stage]&&FOCUS_STAGE_TABLES.some(table=>r.stageMinutes===Math.floor(table[stage]*r.focusSeconds!/FOCUS_STEPS[stage]));
 if(r.finish!=='timer')return false;
 const times=r.focusSeconds/FOCUS_STEPS[stage];
 return Number.isInteger(times)&&(times===1||stage===5)&&FOCUS_STAGE_TABLES.some(table=>r.stageMinutes===table[stage]*times);
}
export function validateHandwritingState(data:RoutineData){
 const rows=data.handwritingReceipts;
 validateFocusRamp(data);
 if(rows?.some(r=>r.focusSeconds!==undefined&&r.rewardPolicy!=='ramp-v2'&&(r.focusStagesPaid===undefined&&![120,300,600,900,1500].includes(r.focusSeconds)||r.rewardPolicy!=='ramp-v1'&&r.focusSeconds!==1500)))throw new Error('손글씨 집중 시간 기록을 확인해 주세요.');
 if(rows!==undefined&&(!Array.isArray(rows)||rows.length>50000||new Set(rows.map(r=>r?.id)).size!==rows.length||new Set(rows.map(r=>r?.imageHash)).size!==rows.length||rows.some(r=>!r||typeof r.id!=='string'||typeof r.subject!=='string'||!r.subject.trim()||r.subject.length>80||!/^[a-f0-9]{64}$/.test(r.imageHash)||!Number.isFinite(Date.parse(r.at))||!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||r.policyVersion!==1||![r.units,r.duplicateUnits,r.minutes].every(n=>Number.isSafeInteger(n)&&n>=0)||r.units<1||r.units+r.duplicateUnits>16000||r.rewardPolicy!=='ramp-v2'&&r.minutes%5!==0)))throw new Error('손글씨 공부 기록 형식을 확인해 주세요.');
 if(rows){let carry=0;const ordered=rows.map((r,i)=>({r,order:r.rewardOrder??i})).sort((a,b)=>a.order-b.order);for(const {r} of ordered){validateHandwritingAnalysis({...r,quality:'readable',message:''});const length=Array.from(normalizeHandwriting(r.lines.join(''))).length;if(length!==r.units+r.duplicateUnits||r.rewardStatus!==undefined&&!['pending','earned'].includes(r.rewardStatus)||r.rewardOrder!==undefined&&(!Number.isSafeInteger(r.rewardOrder)||r.rewardOrder<0)||r.rewardDay!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(r.rewardDay))throw new Error('손글씨 적립 내역을 확인해 주세요.');if(r.rewardStatus==='pending'){if(r.minutes!==0||r.focusSeconds!==undefined||r.rewardDay!==undefined)throw new Error('대기 중인 보상을 확인해 주세요.');continue;}if(r.rewardPolicy==='ramp-v1'){if(!r.focusCycle||!data.focusPlans?.some(p=>p.cycleId===r.focusCycle)||!r.focusBatch||!r.focusStage||r.focusStage<1||r.focusStage>5||!Number.isInteger(r.focusStage)||!validPaidStages(r))throw new Error('집중 단계 적립 내역을 확인해 주세요.');}else if(r.rewardPolicy==='ramp-v2'){if(!r.focusCycle||!data.focusPlans?.some(p=>p.cycleId===r.focusCycle)||!r.focusBatch||!Number.isInteger(r.focusStage)||r.focusStage!<1||r.focusStage!>5||!validStagePay(r,carry))throw new Error('집중 단계 적립 내역을 확인해 주세요.');}else if(r.minutes!==Math.floor((carry+r.units)/100)*5)throw new Error('손글씨 적립 내역을 확인해 주세요.');carry=(carry+r.units)%100;}}
 if(data.outputDraft&&(!data.outputDraft.id||!data.outputDraft.subject?.trim()||data.outputDraft.subject.length>80||!Number.isFinite(Date.parse(data.outputDraft.startedAt))))throw new Error('진행 중인 손글씨 공부를 확인해 주세요.');
 if(data.handwritingPending){const p=data.handwritingPending;if(!p.id||!p.subject?.trim()||p.subject.length>80||!/^[a-f0-9]{64}$/.test(p.imageHash))throw new Error('대기 중인 공부 사진을 확인해 주세요.');validateHandwritingAnalysis(p.analysis);}
 const daily=new Map<string,number>();for(const plan of data.focusPlans??[])daily.set(plan.day,(daily.get(plan.day)??0)+plan.minutes);for(const r of rows??[])daily.set(r.rewardDay??r.day,(daily.get(r.rewardDay??r.day)??0)+r.minutes);
 for(const [key,day]of Object.entries(data.days)){const value=day.bonus?.handwriting??0;if(!Number.isSafeInteger(value)||value<0||value!==(daily.get(key)??0))throw new Error('손글씨 보상 원장을 확인해 주세요.');}
 if(rows?.some(r=>!data.days[r.day]))throw new Error('손글씨 공부 날짜를 확인해 주세요.');
 const batches=new Map<string,HandwritingReceipt[]>();
 for(const r of rows??[])if(isRamp(r)&&r.rewardStatus==='earned'){const group=batches.get(r.focusBatch!)??[];group.push(r);batches.set(r.focusBatch!,group);}
 for(const [id,group]of batches){const first=group.find(r=>r.id===id);if(!first?.focusSeconds||group.filter(r=>r.focusSeconds!==undefined).length!==1||group.some(r=>r.focusCycle!==first.focusCycle||r.focusStage!==first.focusStage||r.subject!==first.subject||r.rewardDay!==first.rewardDay))throw new Error('집중 단계 보상 묶음을 확인해 주세요.');}
 // Stages paid by a rest count like photo payouts: each one raised the level and spent its time. Stages only go up, so
 // in a cycle with rests the level is one past the highest stage paid.
 const breaks=data.focusBreakPayouts;
 if(breaks!==undefined&&(!Array.isArray(breaks)||breaks.length>50000||breaks.some(p=>!validBreakPayout(p))||new Set(breaks.map(p=>p.id)).size!==breaks.length))throw new Error('휴식 단계 보상 기록을 확인해 주세요.');
 const breakDaily=new Map<string,number>();for(const p of focusBreakPayouts(data))breakDaily.set(p.day,(breakDaily.get(p.day)??0)+breakPayoutMinutes(p));
 for(const [key,day]of Object.entries(data.days)){const value=day.bonus?.focusBreak??0;if(!Number.isSafeInteger(value)||value<0||value!==(breakDaily.get(key)??0))throw new Error('휴식 단계 보상 원장을 확인해 주세요.');}
 if(focusBreakPayouts(data).some(p=>!data.days[p.day]))throw new Error('휴식 단계 보상 날짜를 확인해 주세요.');
 if(data.focusRamp){const rested=focusBreakPayouts(data).filter(p=>p.cycle===data.focusRamp!.cycleId).map(p=>({rewardPolicy:'ramp-v2' as const,focusStage:p.stage,focusSeconds:p.seconds,subject:p.subject,focusStagesPaid:undefined as number[]|undefined}));
  const photos=(rows??[]).map((r,i)=>({r,order:r.rewardOrder??i})).sort((a,b)=>a.order-b.order).map(x=>x.r).filter(r=>isRamp(r)&&r.rewardStatus==='earned'&&r.focusCycle===data.focusRamp!.cycleId&&r.focusSeconds!==undefined);
  const current=rested.length?[...photos,...rested].sort((a,b)=>a.focusStage!-b.focusStage!):photos,used:Record<string,number>=Object.fromEntries([...new Set(current.map(r=>r.subject))].map(subject=>[subject,current.filter(r=>r.subject===subject).reduce((n,r)=>n+r.focusSeconds!,0)]));
  if(data.focusRamp.level!==current.reduce((level,r)=>r.rewardPolicy==='ramp-v2'?Math.min(5,r.focusStage!+1):Math.min(5,level+(r.focusStagesPaid?.length??1)),1)||Object.keys({...used,...data.focusRamp.consumed}).some(subject=>(used[subject]??0)!==(data.focusRamp!.consumed[subject]??0)))throw new Error('집중 단계 진행과 사용 시간을 확인해 주세요.');
 }
}
