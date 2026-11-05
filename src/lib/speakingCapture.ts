import {isLiveSttAvailable,startContinuousLive} from './stt';
import type {SpeakingLanguage} from './speakingTopics';

export type SpeakingStop='denied'|'silent'|'failed';
export const speakingCaptureAvailable=isLiveSttAvailable;
export const SPEAKING_SAMPLE=false;
/** Listens until stopped, past Apple's one minute limit. Resolves to a function that stops and returns all that was heard. */
export async function startSpeakingCapture(_kind:'answer'|'followUp',language:SpeakingLanguage,onText:(text:string)=>void,onStopped:(reason:SpeakingStop)=>void):Promise<()=>Promise<string>>{
 const listening=await startContinuousLive(onText,onStopped,language);
 return listening.stop;
}
