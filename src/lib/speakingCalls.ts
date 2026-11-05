import AsyncStorage from '@react-native-async-storage/async-storage';
import {SPEAKING_POLICY} from './speaking';

/**
 * AI calls of the day, to bound cost once rewards are used up. A count for this phone only, in its own key: it
 * changes no reward and stays out of routine data and backups. A call that never reached the AI gives its count back.
 */
export const SPEAKING_CALLS_KEY='speaking.ai.calls.v1';
type Calls={day:string;count:number};
let current:Calls|null=null,loading:Promise<void>|null=null;
const read=(raw:string|null):Calls=>{
 try{const v=JSON.parse(raw??'null');if(v&&typeof v.day==='string'&&Number.isSafeInteger(v.count)&&v.count>=0)return {day:v.day,count:v.count}}catch{}
 return {day:'',count:0};
};
const save=()=>{if(current)void AsyncStorage.setItem(SPEAKING_CALLS_KEY,JSON.stringify(current)).catch(()=>{})};
export function loadSpeakingCalls(){return loading??(loading=AsyncStorage.getItem(SPEAKING_CALLS_KEY).then(raw=>{current=read(raw)}).catch(()=>{current=read(null)}));}
const today=(day:string):Calls=>current?.day===day?current:{day,count:0};
export const speakingCallsLeft=(day:string)=>Math.max(0,SPEAKING_POLICY.dailyAiCalls-today(day).count);
export async function claimSpeakingCall(day:string){
 await loadSpeakingCalls();
 const now=today(day);if(now.count>=SPEAKING_POLICY.dailyAiCalls)return false;
 current={day,count:now.count+1};save();return true;
}
export function returnSpeakingCall(day:string){
 const now=today(day);if(now.count<=0)return;
 current={day,count:now.count-1};save();
}
