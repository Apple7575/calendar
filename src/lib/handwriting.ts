import type {RoutineData} from './routineModel';
import {getDay,routineDay,withDay} from './routineModel';
import {FOCUS_STEPS,carryRunPastStage,focusRampAccess,focusRampStatus,validateFocusRamp} from './focusRamp';
import {bookFocusSeconds} from './bookTimerTime';

export const OUTPUT_POLICY={version:1,units:100,minutes:5,goalUnits:500} as const;
export type HandwritingAnalysis={lines:string[];languages:('ko'|'en'|'ja'|'math')[];quality:'readable'|'retake';message:string};
export type HandwritingReceipt={id:string;imageHash:string;subject:string;at:string;day:string;lines:string[];languages:HandwritingAnalysis['languages'];units:number;duplicateUnits:number;minutes:number;policyVersion:1;focusSeconds?:number;rewardPolicy?:'ramp-v1';focusCycle?:string;focusStage?:number;focusBatch?:string;rewardStatus?:'pending'|'earned';rewardDay?:string;rewardOrder?:number};
export type OutputDraft={id:string;subject:string;startedAt:string};
export const normalizeHandwriting=(text:string)=>Array.from(text.normalize('NFKC').toLowerCase()).filter(c=>/[\p{L}\p{N}]/u.test(c)).join('');
/** Pauses and breaks never count. Unused study credit survives leaving the screen. */
export function handwritingAccess(data:RoutineData,subject:string,now=Date.now()){
 if(data.focusRamp||data.handwritingReceipts?.some(r=>r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v1'))return focusRampAccess(data,subject,now);
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
 const subjects=[...new Set((data.handwritingReceipts??[]).filter(r=>r.rewardStatus==='pending'&&r.rewardPolicy!=='ramp-v1').map(r=>r.subject))];
 for(const subject of subjects){
  if(!legacyHandwritingAccess(next,subject,now).ready)continue;
  let carry=outputCarry(next),first=true,minutes=0;
  let ordinal=Math.max(-1,...(next.handwritingReceipts??[]).map((r,i)=>r.rewardOrder??i))+1;
  const day=routineDay(new Date(now)),rows=next.handwritingReceipts!.map(r=>{
   if(r.subject!==subject||r.rewardStatus!=='pending'||r.rewardPolicy==='ramp-v1')return r;
   const reward=Math.floor((carry+r.units)/100)*5;carry=(carry+r.units)%100;minutes+=reward;
   const receipt:HandwritingReceipt={...r,rewardStatus:'earned',rewardDay:day,rewardOrder:ordinal++,minutes:reward,...(first?{focusSeconds:1500 as const}:{})};first=false;return receipt;
  });
  next=withDay({...next,handwritingReceipts:rows},day,d=>({...d,bonus:{...d.bonus,handwriting:(d.bonus?.handwriting??0)+minutes}}));
 }
 const rampSubjects=[...new Set((next.handwritingReceipts??[]).filter(r=>r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v1').map(r=>r.subject))];
 for(const subject of rampSubjects){
  const access=focusRampAccess(next,subject,now),ramp=next.focusRamp;
  if(!ramp||!access.ready)continue;
  const pending=next.handwritingReceipts!.filter(r=>r.subject===subject&&r.rewardStatus==='pending'&&r.rewardPolicy==='ramp-v1'&&r.focusCycle===ramp.cycleId);
  if(!pending.length)continue;
  let first=true,ordinal=next.handwritingReceipts!.reduce((n,r,i)=>Math.max(n,r.rewardOrder??i),-1)+1;
  const batch=pending[0].id,day=routineDay(new Date(now));
  const rows=next.handwritingReceipts!.map(r=>{
   if(!pending.some(p=>p.id===r.id))return r;
   const receipt:HandwritingReceipt={...r,rewardStatus:'earned',rewardDay:day,rewardOrder:ordinal++,focusStage:ramp.level,focusBatch:batch,minutes:first?5:0,...(first?{focusSeconds:access.required}:{})};first=false;return receipt;
  });
  next=withDay({...next,handwritingReceipts:rows,focusRamp:{...ramp,level:Math.min(5,ramp.level+1) as 1|2|3|4|5,consumed:{...ramp.consumed,[subject]:(Object.prototype.hasOwnProperty.call(ramp.consumed,subject)?ramp.consumed[subject]:0)+access.required}}},day,d=>({...d,bonus:{...d.bonus,handwriting:(d.bonus?.handwriting??0)+5}}));
  next=carryRunPastStage(next,subject,access.required,now);
 }
 return next;
}
export function startOutputStudy(data:RoutineData,id:string,subject:string,now=new Date()):RoutineData{
 const clean=subject.trim();if(!clean||clean.length>80)throw new Error('공부 주제를 1~80자로 입력해 주세요.');
 if(data.outputDraft)return data;
 return {...data,outputDraft:{id,subject:clean,startedAt:now.toISOString()}};
}
export function acceptHandwriting(data:RoutineData,id:string,hash:string,subject:string,analysis:HandwritingAnalysis,now=new Date(),policy:'legacy25'|'ramp-v1'=data.focusRamp?'ramp-v1':'legacy25'):RoutineData{
 if(!/^[a-f0-9]{64}$/.test(hash)||!id||id.length>100||!subject.trim()||subject.trim().length>80)throw new Error('공부 사진 정보를 확인해 주세요.');
 if(data.handwritingReceipts?.some(r=>r.id===id))return data;
 const p=outputPreview(data,hash,analysis);
 if(analysis.quality!=='readable')throw new Error(analysis.message||'글씨가 잘 보이도록 다시 찍어 주세요.');
 if(!p.units)throw new Error(p.duplicate?'이미 기록한 내용이에요. 새로 쓴 부분만 찍어 주세요.':'읽을 수 있는 손글씨가 없어요.');
 if(!data.outputDraft||data.outputDraft.subject!==subject)throw new Error('이 과목의 공부를 먼저 시작해 주세요.');
 const day=routineDay(now),receipt:HandwritingReceipt={id,imageHash:hash,subject:subject.trim(),at:now.toISOString(),day,lines:[...analysis.lines],languages:[...analysis.languages],units:p.units,duplicateUnits:p.duplicateUnits,minutes:0,policyVersion:1,rewardStatus:'pending',...(policy==='ramp-v1'?{rewardPolicy:'ramp-v1',focusCycle:focusRampStatus(data,now.getTime()).needsPlan?'awaiting-plan':data.focusRamp!.cycleId}:{})};
 return settleHandwritingRewards(withDay({...data,handwritingPending:undefined,handwritingReceipts:[...(data.handwritingReceipts??[]),receipt]},day,d=>d),now.getTime());
}
export function validateHandwritingState(data:RoutineData){
 const rows=data.handwritingReceipts;
 validateFocusRamp(data);
 if(rows?.some(r=>r.focusSeconds!==undefined&&(![120,300,600,900,1500].includes(r.focusSeconds)||r.rewardPolicy!=='ramp-v1'&&r.focusSeconds!==1500)))throw new Error('손글씨 집중 시간 기록을 확인해 주세요.');
 if(rows!==undefined&&(!Array.isArray(rows)||rows.length>50000||new Set(rows.map(r=>r?.id)).size!==rows.length||new Set(rows.map(r=>r?.imageHash)).size!==rows.length||rows.some(r=>!r||typeof r.id!=='string'||typeof r.subject!=='string'||!r.subject.trim()||r.subject.length>80||!/^[a-f0-9]{64}$/.test(r.imageHash)||!Number.isFinite(Date.parse(r.at))||!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||r.policyVersion!==1||![r.units,r.duplicateUnits,r.minutes].every(n=>Number.isSafeInteger(n)&&n>=0)||r.units<1||r.units+r.duplicateUnits>16000||r.minutes%5!==0)))throw new Error('손글씨 공부 기록 형식을 확인해 주세요.');
 if(rows){let carry=0;const ordered=rows.map((r,i)=>({r,order:r.rewardOrder??i})).sort((a,b)=>a.order-b.order);for(const {r} of ordered){validateHandwritingAnalysis({...r,quality:'readable',message:''});const length=Array.from(normalizeHandwriting(r.lines.join(''))).length;if(length!==r.units+r.duplicateUnits||r.rewardStatus!==undefined&&!['pending','earned'].includes(r.rewardStatus)||r.rewardOrder!==undefined&&(!Number.isSafeInteger(r.rewardOrder)||r.rewardOrder<0)||r.rewardDay!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(r.rewardDay))throw new Error('손글씨 적립 내역을 확인해 주세요.');if(r.rewardStatus==='pending'){if(r.minutes!==0||r.focusSeconds!==undefined||r.rewardDay!==undefined)throw new Error('대기 중인 보상을 확인해 주세요.');continue;}if(r.rewardPolicy==='ramp-v1'){if(!r.focusCycle||!data.focusPlans?.some(p=>p.cycleId===r.focusCycle)||!r.focusBatch||!r.focusStage||r.focusStage<1||r.focusStage>5||!Number.isInteger(r.focusStage)||r.minutes!==(r.focusSeconds?5:0)||r.focusSeconds!==undefined&&r.focusSeconds!==FOCUS_STEPS[r.focusStage])throw new Error('집중 단계 적립 내역을 확인해 주세요.');}else if(r.minutes!==Math.floor((carry+r.units)/100)*5)throw new Error('손글씨 적립 내역을 확인해 주세요.');carry=(carry+r.units)%100;}}
 if(data.outputDraft&&(!data.outputDraft.id||!data.outputDraft.subject?.trim()||data.outputDraft.subject.length>80||!Number.isFinite(Date.parse(data.outputDraft.startedAt))))throw new Error('진행 중인 손글씨 공부를 확인해 주세요.');
 if(data.handwritingPending){const p=data.handwritingPending;if(!p.id||!p.subject?.trim()||p.subject.length>80||!/^[a-f0-9]{64}$/.test(p.imageHash))throw new Error('대기 중인 공부 사진을 확인해 주세요.');validateHandwritingAnalysis(p.analysis);}
 const daily=new Map<string,number>();for(const plan of data.focusPlans??[])daily.set(plan.day,(daily.get(plan.day)??0)+5);for(const r of rows??[])daily.set(r.rewardDay??r.day,(daily.get(r.rewardDay??r.day)??0)+r.minutes);
 for(const [key,day]of Object.entries(data.days)){const value=day.bonus?.handwriting??0;if(!Number.isSafeInteger(value)||value<0||value%5!==0||value!==(daily.get(key)??0))throw new Error('손글씨 보상 원장을 확인해 주세요.');}
 if(rows?.some(r=>!data.days[r.day]))throw new Error('손글씨 공부 날짜를 확인해 주세요.');
 const batches=new Map<string,HandwritingReceipt[]>();
 for(const r of rows??[])if(r.rewardPolicy==='ramp-v1'&&r.rewardStatus==='earned'){const group=batches.get(r.focusBatch!)??[];group.push(r);batches.set(r.focusBatch!,group);}
 for(const [id,group]of batches){const first=group.find(r=>r.id===id);if(!first?.focusSeconds||group.filter(r=>r.focusSeconds!==undefined).length!==1||group.some(r=>r.focusCycle!==first.focusCycle||r.focusStage!==first.focusStage||r.subject!==first.subject||r.rewardDay!==first.rewardDay))throw new Error('집중 단계 보상 묶음을 확인해 주세요.');}
 if(data.focusRamp){const current=(rows??[]).filter(r=>r.rewardPolicy==='ramp-v1'&&r.rewardStatus==='earned'&&r.focusCycle===data.focusRamp!.cycleId&&r.focusSeconds!==undefined),used:Record<string,number>=Object.fromEntries([...new Set(current.map(r=>r.subject))].map(subject=>[subject,current.filter(r=>r.subject===subject).reduce((n,r)=>n+r.focusSeconds!,0)]));
  if(data.focusRamp.level!==Math.min(5,current.length+1)||Object.keys({...used,...data.focusRamp.consumed}).some(subject=>(used[subject]??0)!==(data.focusRamp!.consumed[subject]??0)))throw new Error('집중 단계 진행과 사용 시간을 확인해 주세요.');
 }
}
