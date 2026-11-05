import AsyncStorage from '@react-native-async-storage/async-storage';
import {HARVARD_QUESTIONS,MUSK_QUESTIONS} from './focusQuestionWords';

export type FocusQuestionMoment='plan'|'quit';
type Shown={day:string;plan:number;quit:number};
/** Screen-only count in its own key, outside saved routine data and backups. No study or earning rule reads it. */
export const FOCUS_QUESTION_KEY='focus.questions.shown.v1';
const LIMITS:Record<FocusQuestionMoment,number>={plan:1,quit:2};
const WORDS:Record<FocusQuestionMoment,readonly string[]>={plan:HARVARD_QUESTIONS,quit:MUSK_QUESTIONS};
const count=(value:unknown)=>Number.isSafeInteger(value)&&(value as number)>0?value as number:0;
const dayNumber=(day:string)=>{const n=Math.floor(Date.parse(day+'T00:00:00Z')/86400000);return Number.isFinite(n)?n:0};

/** What to show now and the count after showing it. Each new day moves to the next wording. */
export function nextFocusQuestion(shown:Shown,moment:FocusQuestionMoment,day:string):{text:string|null;shown:Shown}{
 const today:Shown=shown.day===day?shown:{day,plan:0,quit:0},used=today[moment];
 if(used>=LIMITS[moment])return {text:null,shown:today};
 const words=WORDS[moment];
 return {text:words[(dayNumber(day)+used)%words.length]??null,shown:{...today,[moment]:used+1}};
}

let current:Shown|null=null,loading:Promise<void>|null=null,writes:Promise<unknown>=Promise.resolve();
const parse=(raw:string|null):Shown=>{
 try{const v=JSON.parse(raw??'null');if(v&&typeof v.day==='string')return {day:v.day,plan:count(v.plan),quit:count(v.quit)}}catch{}
 return {day:'',plan:0,quit:0};
};
export function loadFocusQuestions(){
 return loading??(loading=AsyncStorage.getItem(FOCUS_QUESTION_KEY).then(raw=>{current=parse(raw)}).catch(()=>{current=parse(null)}));
}
/** The question to show now, or null. Taking one uses it up. Nothing is offered until the count has loaded. */
export function takeFocusQuestion(moment:FocusQuestionMoment,day:string){
 if(!current)return null;
 const next=nextFocusQuestion(current,moment,day);current=next.shown;
 if(next.text){const saved=JSON.stringify(next.shown);writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(FOCUS_QUESTION_KEY,saved)).catch(()=>{})}
 return next.text;
}
