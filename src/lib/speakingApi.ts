import {supabase} from './supabase';
import {claimSpeakingCall,returnSpeakingCall} from './speakingCalls';
import type {SpeakingFeedback,SpeakingVerdict} from './speaking';
import type {SpeakingLanguage} from './speakingTopics';

export class SpeakingLimitError extends Error{constructor(){super('오늘 AI 답변 100회를 모두 썼어요. 말한 내용은 남아 있고, 내일 이어서 받을 수 있어요.')}}
/** Failed before the model could answer: no cost, so the day's count goes back. */
const neverReachedAi=(status?:number)=>!status||status===401||status===404||status===503;
async function call(day:string,body:Record<string,unknown>){
 if(!await claimSpeakingCall(day))throw new SpeakingLimitError();
 try{
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)throw Object.assign(new Error('계정에 다시 로그인해 주세요. 말한 내용은 남아 있어요.'),{refund:true});
  const {data,error}=await supabase.functions.invoke('speaking-coach',{body});
  if(error){
   const status:number|undefined=error.context?.status;let message='AI 답변을 받지 못했어요. 말한 내용은 남아 있으니 다시 시도해 주세요.';
   try{const detail=await error.context?.json();if(typeof detail?.message==='string')message=detail.message}catch{}
   throw Object.assign(new Error(message),{refund:neverReachedAi(status)});
  }
  return data;
 }catch(e){if((e as {refund?:boolean}).refund!==false)returnSpeakingCall(day);throw e}
}
const fine=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const badShape=()=>Object.assign(new Error('AI 답변 형식이 맞지 않아요. 말한 내용은 남아 있으니 다시 시도해 주세요.'),{refund:false});
export type SpeakingCoachStyle={language?:SpeakingLanguage;coach?:'reflect'};
export async function coachSpeakingAnswer(day:string,question:string,answer:string,style:SpeakingCoachStyle={}):Promise<{feedback:SpeakingFeedback;verdict:SpeakingVerdict}>{
 const d=await call(day,{mode:'feedback',question,answer,...style});
 if(!fine(d?.good,400)||!fine(d?.missed,400)||!fine(d?.followUp,150)||typeof d?.relevant!=='boolean'||typeof d?.repetitive!=='boolean')throw badShape();
 return {feedback:{good:d.good,missed:d.missed,followUp:d.followUp},verdict:{relevant:d.relevant,repetitive:d.repetitive}};
}
export async function checkSpeakingFollowUp(day:string,question:string,answer:string,followUp:string,followUpAnswer:string,style:SpeakingCoachStyle={}):Promise<SpeakingVerdict>{
 const d=await call(day,{mode:'followup',question,answer,followUp,followUpAnswer,...style});
 if(typeof d?.relevant!=='boolean'||typeof d?.repetitive!=='boolean')throw badShape();
 return {relevant:d.relevant,repetitive:d.repetitive};
}
/** For a topic with no fixed questions. */
export async function askSpeakingQuestion(day:string,topic:string,brief?:string,avoid?:string):Promise<string>{
 const d=await call(day,{mode:'question',topic,brief,avoid});
 if(!fine(d?.question,300))throw badShape();
 return d.question;
}
