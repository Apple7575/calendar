import type {RoutineData} from './routineModel';
import {getDay,routineDay,withDay} from './routineModel';

export const OUTPUT_POLICY={version:1,units:100,minutes:5,goalUnits:500} as const;
export type HandwritingAnalysis={lines:string[];languages:('ko'|'en'|'ja'|'math')[];quality:'readable'|'retake';message:string};
export type HandwritingReceipt={id:string;imageHash:string;subject:string;at:string;day:string;lines:string[];languages:HandwritingAnalysis['languages'];units:number;duplicateUnits:number;minutes:number;policyVersion:1};
export type OutputDraft={id:string;subject:string;startedAt:string};
export const normalizeHandwriting=(text:string)=>Array.from(text.normalize('NFKC').toLowerCase()).filter(c=>/[\p{L}\p{N}]/u.test(c)).join('');
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
export function outputCarry(data:RoutineData){return (data.handwritingReceipts??[]).reduce((n,r)=>n+r.units,0)%OUTPUT_POLICY.units;}
export function outputUnitsOnDay(data:RoutineData,key:string,subject?:string){return (data.handwritingReceipts??[]).filter(r=>r.day===key&&(!subject||r.subject===subject)).reduce((n,r)=>n+r.units,0);}
export function startOutputStudy(data:RoutineData,id:string,subject:string,now=new Date()):RoutineData{
 const clean=subject.trim();if(!clean||clean.length>80)throw new Error('공부 주제를 1~80자로 입력해 주세요.');
 if(data.outputDraft)return data;
 return {...data,outputDraft:{id,subject:clean,startedAt:now.toISOString()}};
}
export function acceptHandwriting(data:RoutineData,id:string,hash:string,subject:string,analysis:HandwritingAnalysis,now=new Date()):RoutineData{
 if(!/^[a-f0-9]{64}$/.test(hash)||!id||id.length>100||!subject.trim()||subject.trim().length>80)throw new Error('공부 사진 정보를 확인해 주세요.');
 if(data.handwritingReceipts?.some(r=>r.id===id))return data;
 const p=outputPreview(data,hash,analysis);
 if(analysis.quality!=='readable')throw new Error(analysis.message||'글씨가 잘 보이도록 다시 찍어 주세요.');
 if(!p.units)throw new Error(p.duplicate?'이미 기록한 내용이에요. 새로 쓴 부분만 찍어 주세요.':'읽을 수 있는 손글씨가 없어요.');
 const day=routineDay(now),receipt:HandwritingReceipt={id,imageHash:hash,subject:subject.trim(),at:now.toISOString(),day,lines:[...analysis.lines],languages:[...analysis.languages],units:p.units,duplicateUnits:p.duplicateUnits,minutes:p.minutes,policyVersion:1};
 return withDay({...data,handwritingPending:undefined,handwritingReceipts:[...(data.handwritingReceipts??[]),receipt]},day,d=>({...d,bonus:{...d.bonus,handwriting:(d.bonus?.handwriting??0)+p.minutes}}));
}
export function validateHandwritingState(data:RoutineData){
 const rows=data.handwritingReceipts;
 if(rows!==undefined&&(!Array.isArray(rows)||rows.length>50000||new Set(rows.map(r=>r?.id)).size!==rows.length||new Set(rows.map(r=>r?.imageHash)).size!==rows.length||rows.some(r=>!r||typeof r.id!=='string'||typeof r.subject!=='string'||!r.subject.trim()||r.subject.length>80||!/^[a-f0-9]{64}$/.test(r.imageHash)||!Number.isFinite(Date.parse(r.at))||!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||r.policyVersion!==1||![r.units,r.duplicateUnits,r.minutes].every(n=>Number.isSafeInteger(n)&&n>=0)||r.units<1||r.units+r.duplicateUnits>16000||r.minutes%5!==0)))throw new Error('손글씨 공부 기록 형식을 확인해 주세요.');
 if(rows){let carry=0;for(const r of rows){validateHandwritingAnalysis({...r,quality:'readable',message:''});const length=Array.from(normalizeHandwriting(r.lines.join(''))).length;if(length!==r.units+r.duplicateUnits||r.minutes!==Math.floor((carry+r.units)/100)*5)throw new Error('손글씨 적립 내역을 확인해 주세요.');carry=(carry+r.units)%100;}}
 if(data.outputDraft&&(!data.outputDraft.id||!data.outputDraft.subject?.trim()||data.outputDraft.subject.length>80||!Number.isFinite(Date.parse(data.outputDraft.startedAt))))throw new Error('진행 중인 손글씨 공부를 확인해 주세요.');
 if(data.handwritingPending){const p=data.handwritingPending;if(!p.id||!p.subject?.trim()||p.subject.length>80||!/^[a-f0-9]{64}$/.test(p.imageHash))throw new Error('대기 중인 공부 사진을 확인해 주세요.');validateHandwritingAnalysis(p.analysis);}
 const daily=new Map<string,number>();for(const r of rows??[])daily.set(r.day,(daily.get(r.day)??0)+r.minutes);
 for(const [key,day]of Object.entries(data.days)){const value=day.bonus?.handwriting??0;if(!Number.isSafeInteger(value)||value<0||value%5!==0||value!==(daily.get(key)??0))throw new Error('손글씨 보상 원장을 확인해 주세요.');}
 if(rows?.some(r=>!data.days[r.day]))throw new Error('손글씨 공부 날짜를 확인해 주세요.');
}
