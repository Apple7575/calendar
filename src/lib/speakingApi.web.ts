import {claimSpeakingCall} from './speakingCalls';
import type {SpeakingFeedback,SpeakingVerdict} from './speaking';

/** Web preview only: sample replies with no server, so the flow can be looked at. It never sends anything. */
export class SpeakingLimitError extends Error{constructor(){super('오늘 AI 답변 100회를 모두 썼어요. 말한 내용은 남아 있고, 내일 이어서 받을 수 있어요.')}}
const wait=()=>new Promise(r=>setTimeout(r,500));
export async function coachSpeakingAnswer(day:string,_question:string,_answer:string,style:{language?:string;coach?:string}={}):Promise<{feedback:SpeakingFeedback;verdict:SpeakingVerdict}>{
 if(!await claimSpeakingCall(day))throw new SpeakingLimitError();
 await wait();
 return {feedback:{good:'[예시] 역할을 먼저 말하고 이유를 이어서 설명한 순서가 분명했어요.',missed:style.coach==='reflect'?'[예시] 다른 사람의 입장에서 보면 어떻게 달라질지도 생각해 볼 수 있어요.':'[예시] 직접 겪은 사례가 무엇이었는지는 말하지 않았어요.',followUp:'[예시] 방금 말한 문제 정의를 실제로 해 본 적이 있나요?'},verdict:{relevant:true,repetitive:false}};
}
export async function checkSpeakingFollowUp(day:string,_question:string,_answer:string,_followUp:string,_followUpAnswer:string,_style:object={}):Promise<SpeakingVerdict>{
 if(!await claimSpeakingCall(day))throw new SpeakingLimitError();
 await wait();
 return {relevant:true,repetitive:false};
}
export async function askSpeakingQuestion(day:string,topic:string,_brief?:string,_avoid?:string):Promise<string>{
 if(!await claimSpeakingCall(day))throw new SpeakingLimitError();
 await wait();
 return topic==='일본어 말하기'?'[例] 週末はどのように過ごすことが多いですか。':'[예시] '+topic+'에 대해 가장 중요하다고 생각하는 점을 설명해 주세요.';
}
