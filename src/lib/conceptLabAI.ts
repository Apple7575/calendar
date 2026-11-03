import {supabase} from './supabase';
import type {AIGrade,LabCard,LabState} from './conceptLabTypes';
import {sampleBook} from './conceptLabContent';
import {validateCard} from './conceptLab';
import type {GenerationTarget} from './conceptGeneration';

// Public capability switch only. The model key is never read by client code.
export const conceptAIEnabled=process.env.EXPO_PUBLIC_CONCEPT_AI_ENABLED!=='0';
async function call(task:'grade'|'generate'|'status'|'lookup',input:Record<string,unknown>){
 if(!conceptAIEnabled)throw new Error('AI 서버 연결 전이에요. 검수된 표본과 자기 평가로 학습할 수 있어요.');
 const {data,error}=await supabase.functions.invoke('concept-lab',{body:{task,input}});
 if(error||!data?.result){let message=data?.message;try{if(error?.context instanceof Response)message=(await error.context.json()).message;}catch{}
  const messages:Record<string,string>={login_required:'구글 계정을 연결한 뒤 생성해 주세요.',budget_limit:'5달러 예산의 안전 예약액이 부족해요.',daily_limit:'서버의 오늘 생성 한도에 도달했어요.',failed:'이 요청은 실패 기록이 있어요. 기존 결과를 확인해 주세요.',running:'같은 요청을 이미 처리 중이에요.',server_not_configured:'AI 서버의 키 설정이 필요해요.',budget_not_configured:'AI 서버 예산 설정이 필요해요.'};
  throw new Error(messages[message]??'생성·검증을 완료하지 못했어요. 기존 기록은 그대로예요. 실패 항목만 다시 확인해 주세요.');}
 return data.result;
}
export async function gradeConceptAnswer(card:LabCard,text:string):Promise<AIGrade>{
 if(card.quality.reviewer==='user-confirmed')throw new Error('직접 수정한 카드는 서버 원본과 다르므로 자기 평가를 사용해 주세요.');
 const bundle=sampleBook.bundles.find(b=>b.id===card.bundleId);
 const raw=await call('grade',{card,answer:text,passage:bundle?.text??'',dailyLimit:1});
 if(typeof raw.correct!=='boolean'||typeof raw.feedback!=='string'||raw.feedback.length>1500||typeof raw.confidence!=='number'||raw.confidence<0||raw.confidence>1)throw new Error('AI 채점 결과를 확인하지 못했어요. 자기 평가를 사용해 주세요.');
 return {...raw,model:String(raw.model??'server'),rubricVersion:'concept-lab-v1'};
}
export type ConceptBudget={ready:boolean;model:string;limitUSD:number;estimatedUsedUSD:number;remainingUSD:number;reservationUSD:number;billVerified:boolean};
export async function conceptGenerationBudget():Promise<ConceptBudget>{
 const raw=await call('status',{});if(typeof raw.ready!=='boolean'||!Number.isFinite(raw.limitUSD)||raw.limitUSD>5||raw.limitUSD<0||!Number.isFinite(raw.remainingUSD)||!Number.isFinite(raw.estimatedUsedUSD))throw new Error('서버 예산 정보를 확인하지 못했어요.');return raw;
}
export async function recoverConceptGeneration(requestId:string):Promise<LabCard>{return await call('lookup',{requestId});}
export async function generateConceptVariant(s:LabState,target:GenerationTarget,requestId:string):Promise<LabCard>{
 const parentId=target.parentId,parent=s.cards[parentId],unit=sampleBook.units.find(u=>u.id===parent?.unitId);
 if(!parent?.conceptId||parent.bundleId||parent.type==='audio')throw new Error('현재 온라인 생성은 어휘·문법의 문자 카드만 지원해요.');
 if(parent.quality.reviewer==='user-confirmed')throw new Error('직접 수정한 원본은 먼저 검토해 주세요.');
 const raw=await call('generate',{parent,unit,strategy:target.strategy,reason:target.reason,requestId,dailyLimit:s.settings.dailyVariants,existingPrompts:[...Object.values(s.cards),...(s.generatedDrafts??[]).map(d=>d.card)].filter(c=>c.conceptId===parent.conceptId).slice(-20).map(c=>c.prompt.slice(0,1000))});
 const card=raw as LabCard;
 if(card.parentId!==parentId||card.conceptId!==parent.conceptId||validateCard(card,{...sampleBook,cards:Object.values(s.cards)}).length)throw new Error('생성 문제의 검증에 실패했어요. 기존 학습은 계속할 수 있어요.');
 return card;
}
