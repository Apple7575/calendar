import type {Day,RoutineData} from './routineModel';
import {getDay,routineDay,withDay} from './routineModel';
import {speakingCharWeight,type SpeakingTopic} from './speakingTopics';

/**
 * Speaking rewards (user decision 2026-11-05), shaped like word rewards: characters said add up, and each step asks for more:
 * 500, then 1,000, then 1,500, each paying 5 minutes and 500 won. No daily limit. Korean speech runs about 200 usable
 * characters a minute, so the first step is about two and a half minutes. The day resets at 04:00.
 * Every character said counts, while only part of a long answer is stored or sent to the AI.
 */
export const SPEAKING_POLICY={firstStepChars:500,stepGrowthChars:500,stepMinutes:5,wonPerMinute:100,followUpWeight:2,storeAnswerChars:4000,storeFollowUpChars:1000,sendAnswerHead:2000,sendAnswerTail:1000,sendFollowUpChars:1000,maxFeedbackChars:400,maxFollowUpQuestionChars:150,keepRecords:100,minChars:20,dailyAiCalls:100} as const;
export type SpeakingFeedback={good:string;missed:string;followUp:string};
export type SpeakingVerdict={relevant:boolean;repetitive:boolean};
export type SpeakingUncounted='off-topic'|'repeat'|'similar'|'unchecked';
export type SpeakingRecord={id:string;at:string;day:string;topicId:string;topicTitle:string;question:string;answer:string;answerChars?:number;repeated?:boolean;seconds:number;feedback?:SpeakingFeedback;verdict?:SpeakingVerdict;followUpAnswer?:string;followUpChars?:number;followUpVerdict?:SpeakingVerdict;status:'answered'|'settled';rewardDay?:string;creditedChars?:number;stepsPaid?:number;minutes?:number;uncounted?:SpeakingUncounted};
export type SpeakingDayRewards={chars:number;steps:number};
export const SPEAKING_UNCOUNTED_TEXT:Record<SpeakingUncounted,string>={
 'off-topic':'질문과 다른 이야기여서 이번 글자는 인정되지 않았어요.',
 repeat:'같은 말이 반복되어 이번 글자는 인정되지 않았어요.',
 similar:'오늘 말한 답변과 거의 같아서 이번 글자는 인정되지 않았어요. 고쳐 말하면 인정돼요.',
 unchecked:'AI 답변 없이 마쳐서 이번 글자는 인정되지 않았어요. 말한 내용은 남아요.',
};

const letters=(text:string)=>Array.from(text.replace(/[\s\p{P}\p{S}]/gu,''));
export const spokenChars=(text:string)=>letters(text).length;
const whole=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0?n:0;
/** Runs of 8 characters: long enough that natural speech seldom says the same one twice, even over many minutes. */
const RUN=8,REPEATED_SHARE=.4,SIMILAR_SHARE=.8;
const runsOf=(text:string)=>{const c=letters(text);return c.slice(0,Math.max(0,c.length-RUN+1)).map((_,i)=>c.slice(i,i+RUN).join(''))};
/** Padding: at least 40% of the answer's runs have already been said in it. Saying a sentence twice reaches about half. */
export function isRepetitiveSpeech(text:string){
 const runs=runsOf(text);if(runs.length<30)return false;
 return 1-new Set(runs).size/runs.length>=REPEATED_SHARE;
}
/**
 * Nearly the same as an earlier answer: 80% of its runs appear there. One changed character breaks eight runs, so reworking a
 * few sentences or saying it in other words falls well short, while reading the same thing out again stays above.
 */
export function isSimilarSpeech(text:string,earlier:string){
 const runs=runsOf(text);if(runs.length<30)return false;
 const seen=new Set(runsOf(earlier));
 return runs.filter(r=>seen.has(r)).length/runs.length>=SIMILAR_SHARE;
}
/** What goes to the AI from a long answer: its start and end, which is what the question and follow-up turn on. */
export function answerForAi(text:string){
 const {sendAnswerHead:head,sendAnswerTail:tail}=SPEAKING_POLICY;
 return text.length<=head+tail?text:text.slice(0,head)+' … '+text.slice(-tail);
}

/** Saved values are never trusted: a broken row is skipped, a broken number is 0, and neither blocks loading. */
const validRecord=(r:SpeakingRecord|null|undefined):r is SpeakingRecord=>!!r&&typeof r==='object'&&typeof r.id==='string'&&typeof r.day==='string'&&typeof r.question==='string'&&typeof r.answer==='string';
export const speakingRecords=(data:RoutineData):SpeakingRecord[]=>Array.isArray(data.speakingRecords)?data.speakingRecords.filter(validRecord):[];
const dayRewards=(day:Day|undefined):SpeakingDayRewards=>({chars:whole(day?.speakingRewards?.chars),steps:whole(day?.speakingRewards?.steps)});
export const speakingStepChars=(steps:number)=>SPEAKING_POLICY.firstStepChars+steps*SPEAKING_POLICY.stepGrowthChars;
/** Today's state, and how much more earns the next 5 minutes. `saying` is what is being said now, not yet counted. */
export function speakingToday(data:RoutineData,key:string,saying=0){
 const {chars,steps}=dayRewards(data.days[key]);
 let left=chars+saying,step=steps;
 while(left>=speakingStepChars(step)){left-=speakingStepChars(step);step+=1}
 return {steps,minutes:steps*SPEAKING_POLICY.stepMinutes,won:steps*SPEAKING_POLICY.stepMinutes*SPEAKING_POLICY.wonPerMinute,required:speakingStepChars(step),moreChars:speakingStepChars(step)-left,upcomingSteps:step-steps};
}
/** A finished answer still waiting for its follow-up or its reward, so closing the app loses nothing. */
export const unsettledSpeaking=(data:RoutineData)=>speakingRecords(data).find(r=>r.status==='answered');
/** The run stays open while paused, so only a rest or a finished run leaves room to speak. */
export const canStartSpeaking=(data:RoutineData)=>data.bookTimer?.phase!=='focus';
/** Rotates by day, and starts with what has not been answered today. The same question can be practised again. */
export function nextSpeakingQuestion(data:RoutineData,topic:SpeakingTopic,key:string){
 const list=topic.questions;if(!list?.length)return undefined;
 const done=new Set(speakingRecords(data).filter(r=>r.day===key).map(r=>r.question)),n=Math.floor(Date.parse(key+'T00:00:00Z')/86400000),first=Number.isFinite(n)?n%list.length:0;
 const order=list.map((_,i)=>list[(first+i)%list.length]);
 return order.find(q=>!done.has(q))??order[0];
}

/** Oldest finished sessions go first. Paid rewards live on the day and in the wallet, so dropping a row takes nothing back. */
function keepRecent(rows:SpeakingRecord[]){
 let extra=rows.length-SPEAKING_POLICY.keepRecords;if(extra<=0)return rows;
 return rows.filter(r=>r.status!=='settled'||extra--<=0);
}
/** Saved before the AI is asked, so a failed call never loses what was said. Calling again with the same id changes nothing. */
export function saveSpeakingAnswer(data:RoutineData,input:{id:string;topicId:string;topicTitle:string;question:string;answer:string;seconds:number;feedback?:SpeakingFeedback;verdict?:SpeakingVerdict},now=Date.now()):RoutineData{
 const rows=speakingRecords(data);if(rows.some(r=>r.id===input.id))return data;
 const date=new Date(now),repeated=isRepetitiveSpeech(input.answer);
 return {...data,speakingRecords:keepRecent([...rows,{...input,answer:input.answer.slice(0,SPEAKING_POLICY.storeAnswerChars),answerChars:spokenChars(input.answer),...(repeated?{repeated}:{}),seconds:Math.max(0,Math.round(input.seconds)),at:date.toISOString(),day:routineDay(date),status:'answered'}])};
}
export function attachSpeakingFeedback(data:RoutineData,id:string,feedback:SpeakingFeedback,verdict:SpeakingVerdict):RoutineData{
 const rows=speakingRecords(data),r=rows.find(x=>x.id===id);if(!r||r.status==='settled')return data;
 return {...data,speakingRecords:rows.map(x=>x===r?{...x,feedback:{good:feedback.good.slice(0,SPEAKING_POLICY.maxFeedbackChars),missed:feedback.missed.slice(0,SPEAKING_POLICY.maxFeedbackChars),followUp:feedback.followUp.slice(0,SPEAKING_POLICY.maxFollowUpQuestionChars)},verdict}:x)};
}
export function saveSpeakingFollowUp(data:RoutineData,id:string,answer:string):RoutineData{
 const rows=speakingRecords(data),r=rows.find(x=>x.id===id);if(!r||r.status==='settled')return data;
 return {...data,speakingRecords:rows.map(x=>x===r?{...x,followUpAnswer:answer.slice(0,SPEAKING_POLICY.storeFollowUpChars),followUpChars:spokenChars(answer)}:x)};
}
function whyUncounted(data:RoutineData,r:SpeakingRecord,key:string):SpeakingUncounted|undefined{
 if(!r.verdict)return 'unchecked';
 if(r.verdict.relevant===false)return 'off-topic';
 if(r.verdict.repetitive||r.repeated)return 'repeat';
 if(speakingRecords(data).some(p=>p.id!==r.id&&p.status==='settled'&&p.rewardDay===key&&whole(p.creditedChars)>0&&isSimilarSpeech(r.answer,p.answer)))return 'similar';
 return undefined;
}
/**
 * Ends a session and pays it, once: a settled row returns unchanged, whatever failed or retried before. Its characters count
 * on the routine day it settles, so coming back after 04:00 counts toward the new day. A follow-up counts double.
 */
export function settleSpeaking(data:RoutineData,id:string,followUpVerdict?:SpeakingVerdict,now=Date.now()):RoutineData{
 const rows=speakingRecords(data),r=rows.find(x=>x.id===id);if(!r||r.status==='settled')return data;
 const key=routineDay(new Date(now)),uncounted=whyUncounted(data,r,key),weight=speakingCharWeight(r.topicId),said=(whole(r.answerChars)||spokenChars(r.answer))*weight;
 const followUp=!uncounted&&followUpVerdict&&r.followUpAnswer&&followUpVerdict.relevant&&!followUpVerdict.repetitive&&!isRepetitiveSpeech(r.followUpAnswer)&&!isSimilarSpeech(r.followUpAnswer,r.answer)?(whole(r.followUpChars)||spokenChars(r.followUpAnswer))*SPEAKING_POLICY.followUpWeight*weight:0;
 const credited=uncounted?0:said+followUp;
 let {chars,steps}=dayRewards(getDay(data,key)),paid=0;chars+=credited;
 while(chars>=speakingStepChars(steps)){chars-=speakingStepChars(steps);steps+=1;paid+=1}
 const minutes=paid*SPEAKING_POLICY.stepMinutes;
 const settled:SpeakingRecord={...r,status:'settled',rewardDay:key,creditedChars:credited,stepsPaid:paid,minutes,...(followUpVerdict?{followUpVerdict}:{}),...(uncounted?{uncounted}:{})};
 const next:RoutineData={...data,speakingRecords:rows.map(x=>x.id===id?settled:x)};
 return credited?withDay(next,key,d=>({...d,speakingRewards:{chars,steps},...(minutes?{bonus:{...d.bonus,speaking:whole(d.bonus?.speaking)+minutes}}:{})})):next;
}
