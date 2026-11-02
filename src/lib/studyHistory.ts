import type { Grade } from 'ts-fsrs';
import { State } from 'ts-fsrs';
import type { Day,RoutineData,StoredCard } from './routineModel';
import { getDay,routineDay,withDay } from './routineModel';
import {advanceHabitOrder,validHabitSequence,HabitOrderProgress} from './habitOrder';
import {validateHandwritingState} from './handwriting';
import {validateMoneyState} from './moneyRewards';
import {validatePriorityPlans} from './priorityPlan';
export type StudyPhase='new'|'learning'|'review'|'relearning';
export type ReviewEvent={id:string;wordId:string;deckId:string;day:string;at:string;grade:Grade;seconds:number;phase:StudyPhase;mode:'daily'|'additional';level?:'min'|'full';before:StoredCard;after:StoredCard;completed:boolean;voidedAt?:string};
type Snapshot=Pick<Day,'plan'|'complete'|'responses'|'studySeconds'|'lastStudyWordId'|'additional'|'additionalByDeck'|'rewardedStudyIds'|'extraPendingIds'|'wordRewards'|'orderProgress'>&{paidWords:number;bonusWords:number;bonusQuick:number;bonusOrder?:number};
export type StudyUndo={eventId:string;day:string;wordId:string;before:Snapshot;after:Snapshot;cardBefore:StoredCard;cardAfter:StoredCard};
export type StudyLedger={words:number;extra:number;quick:number;order?:number};
export type StudyAdjustment={eventId:string;day:string;from:StudyLedger;to:StudyLedger};
export const studyLedger=(day:Day):StudyLedger=>({words:day.paid.words,extra:day.bonus?.words??0,quick:day.bonus?.quick??0,...(day.bonus?.order?{order:day.bonus.order}:{})});
function snapshot(d:Day):Snapshot{return JSON.parse(JSON.stringify({plan:d.plan,complete:d.complete,responses:d.responses,studySeconds:d.studySeconds,lastStudyWordId:d.lastStudyWordId,additional:d.additional,additionalByDeck:d.additionalByDeck,rewardedStudyIds:d.rewardedStudyIds,extraPendingIds:d.extraPendingIds,wordRewards:d.wordRewards,...(d.orderProgress?{orderProgress:d.orderProgress}:{}),paidWords:d.paid.words,bonusWords:d.bonus?.words??0,bonusQuick:d.bonus?.quick??0,...(d.bonus?.order?{bonusOrder:d.bonus.order}:{})}));}
export function recordStudyAnswer(before:RoutineData,after:RoutineData,key:string,id:string,grade:Grade,now:Date,seconds:number,mode:ReviewEvent['mode'],level:'min'|'full'='full'):RoutineData{
 if(before===after)return after;
 after=advanceHabitOrder(before,after,key);
 const old=before.words.find(w=>w.id===id)!,word=after.words.find(w=>w.id===id)!;
 const a=getDay(before,key),b=getDay(after,key),eventId=`${now.getTime()}:${before.reviewHistory?.length??0}:${id}`;
 const completed=(d:Day)=>completedStudyIds(d).includes(id);
 const event:ReviewEvent={id:eventId,wordId:id,deckId:word.deckId,day:key,at:now.toISOString(),grade,seconds:Math.max(0,Math.min(seconds,120)),phase:old.card.state===State.New?'new':old.card.state===State.Review?'review':old.card.state===State.Relearning?'relearning':'learning',mode,level,before:old.card,after:word.card,completed:!completed(a)&&completed(b)};
 return {...after,reviewHistory:[...(before.reviewHistory??[]),event],studyUndo:{eventId,day:key,wordId:id,before:snapshot(a),after:snapshot(b),cardBefore:old.card,cardAfter:word.card}};
}
export function canUndoStudy(data:RoutineData,key:string):boolean{
 const u=data.studyUndo;if(!u||u.day!==key||data.pendingStudyAdjustment)return false;
 const word=data.words.find(w=>w.id===u.wordId);
 return !!word&&JSON.stringify(word.card)===JSON.stringify(u.cardAfter)&&JSON.stringify(snapshot(getDay(data,key)))===JSON.stringify(u.after);
}
export function undoStudyAnswer(data:RoutineData,key:string,now=new Date()):RoutineData{
 if(routineDay(now)!==key||!canUndoStudy(data,key))throw new Error('되돌릴 수 있는 마지막 채점이 없어요. 같은 학습일의 마지막 채점만 취소할 수 있어요.');
 const u=data.studyUndo!,s=u.before;
 const next=withDay(data,key,d=>({...d,plan:s.plan,complete:s.complete,responses:s.responses,studySeconds:s.studySeconds,lastStudyWordId:s.lastStudyWordId,additional:s.additional,additionalByDeck:s.additionalByDeck,rewardedStudyIds:s.rewardedStudyIds,extraPendingIds:s.extraPendingIds,wordRewards:s.wordRewards,orderProgress:s.orderProgress,paid:{...d.paid,words:s.paidWords},bonus:{...d.bonus,words:s.bonusWords,quick:s.bonusQuick,order:s.bonusOrder??0}}));
 return {...next,studyUndo:undefined,words:next.words.map(w=>w.id===u.wordId?{...w,card:u.cardBefore}:w),reviewHistory:next.reviewHistory?.map(e=>e.id===u.eventId?{...e,voidedAt:now.toISOString()}:e)};
}
export function completedStudyIds(day:Day):string[]{return [...new Set([...day.complete,...(day.additional?.completedIds??[]),...Object.values(day.additionalByDeck??{}).flatMap(p=>p.completedIds)])];}
export function reviewEvents(data:RoutineData,filter:{deckId?:string;wordId?:string;day?:string;includeVoided?:boolean}={}){
 return (data.reviewHistory??[]).filter(e=>(filter.includeVoided||!e.voidedAt)&&(!filter.deckId||e.deckId===filter.deckId)&&(!filter.wordId||e.wordId===filter.wordId)&&(!filter.day||e.day===filter.day));
}
export function validateStudyState(data:RoutineData):void{
   validatePriorityPlans(data);
 validateMoneyState(data);
 const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(s=>typeof s==='string');
 const nonnegative=(v:number)=>Number.isFinite(v)&&v>=0;
 const card=(c:StoredCard)=>!!c&&typeof c.due==='string'&&Number.isFinite(Date.parse(c.due))&&Number.isInteger(c.reps)&&c.reps>=0&&[0,1,2,3].includes(c.state);
 const extra=(p:Day['additional'])=>p===undefined||!!p&&['new','review','quick'].includes(p.kind)&&ids(p.ids)&&ids(p.complete)&&ids(p.completedIds)&&p.complete.every(id=>p.ids.includes(id))&&Number.isInteger(p.responses)&&p.responses>=0&&(p.reward===undefined||!!p.reward&&[p.reward.granted,p.reward.withheld].every(n=>Number.isSafeInteger(n)&&n>=0));
 const order=(p:HabitOrderProgress|undefined)=>p===undefined||!!p&&validHabitSequence(p.sequence)&&Number.isInteger(p.step)&&p.step>=0&&p.step<=p.sequence.length&&ids(p.started)&&new Set(p.started).size===p.started.length&&p.started.every(id=>p.sequence.includes(id as any))&&['active','outOfOrder','untracked','complete','off'].includes(p.status)&&(p.status!=='complete'||p.step===p.sequence.length);
 const cap=(n:number|undefined)=>n===undefined||Number.isInteger(n)&&n>=20&&n<=60&&n%5===0;
 const wordRewards=(s:Day['wordRewards'])=>s===undefined||!!s&&s.version===2&&ids(s.countedIds)&&new Set(s.countedIds).size===s.countedIds.length&&ids(s.pendingIds)&&new Set(s.pendingIds).size===s.pendingIds.length&&s.pendingIds.every(id=>s.countedIds.includes(id))&&Number.isSafeInteger(s.rounds)&&s.rounds>=0&&s.pendingIds.length<10+s.rounds*5;
 const ledger=(l:StudyLedger)=>!!l&&Number.isSafeInteger(l.words)&&l.words>=0&&l.words%5===0&&nonnegative(l.extra)&&l.extra%5===0&&[0,2,4].includes(l.quick)&&[0,60].includes(l.order??0);
 const snap=(s:Snapshot)=>!!s&&wordRewards(s.wordRewards)&&ids(s.complete)&&Number.isInteger(s.responses)&&s.responses>=0&&nonnegative(s.studySeconds)&&ledger({words:s.paidWords,extra:s.bonusWords,quick:s.bonusQuick,order:s.bonusOrder})&&order(s.orderProgress)&&extra(s.additional)&&(s.additionalByDeck===undefined||!!s.additionalByDeck&&Object.values(s.additionalByDeck).every(extra));
 const history=data.reviewHistory;
 for(const day of Object.values(data.days))if(!wordRewards(day.wordRewards))throw new Error('단어 보상 진행 기록을 확인해 주세요.');
 if(history!==undefined&&(!Array.isArray(history)||history.some(e=>!e||typeof e.id!=='string'||typeof e.wordId!=='string'||typeof e.deckId!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.day)||!Number.isFinite(Date.parse(e.at))||![1,2,3,4].includes(e.grade)||!['new','learning','review','relearning'].includes(e.phase)||!['daily','additional'].includes(e.mode)||!nonnegative(e.seconds)||e.seconds>120||typeof e.completed!=='boolean'||!card(e.before)||!card(e.after)||e.voidedAt!==undefined&&!Number.isFinite(Date.parse(e.voidedAt)))||new Set(history.map(e=>e.id)).size!==history.length))throw new Error('카드별 복습 이력 형식을 확인해 주세요.');
 for(const day of Object.values(data.days))if(!extra(day.additional)||day.additionalByDeck!==undefined&&(!day.additionalByDeck||!Object.values(day.additionalByDeck).every(extra)))throw new Error('추가 학습 기록 형식을 확인해 주세요.');
 if(data.studyRewardPolicy&&(!cap(data.studyRewardPolicy.wordDailyCap)||typeof data.studyRewardPolicy.extraEnabled!=='boolean'||typeof data.studyRewardPolicy.quickEnabled!=='boolean'))throw new Error('단어 보상 한도 설정을 확인해 주세요.');
 if(data.habitOrderPolicy&&(typeof data.habitOrderPolicy.enabled!=='boolean'||!validHabitSequence(data.habitOrderPolicy.sequence)))throw new Error('하루 순서 설정을 확인해 주세요.');
 if(data.freeStudyPolicy&&!['dailyPlan','focusCap','allRewardCaps'].includes(data.freeStudyPolicy.unlockAfter))throw new Error('자유 공부 시작 조건을 확인해 주세요.');
 for(const day of Object.values(data.days))if(day.rewardedFreeSessionIds!==undefined&&(!ids(day.rewardedFreeSessionIds)||new Set(day.rewardedFreeSessionIds).size!==day.rewardedFreeSessionIds.length)||(day.bonus?.freeStudy!==undefined&&(!Number.isSafeInteger(day.bonus.freeStudy)||day.bonus.freeStudy<0||day.bonus.freeStudy%5!==0)))throw new Error('자유 공부 적립 기록을 확인해 주세요.');
 if(data.bookSessions?.some(s=>s.rewardMode!==undefined&&!['standard','free','output'].includes(s.rewardMode))||data.bookTimer?.rewardMode!==undefined&&!['standard','free','output'].includes(data.bookTimer.rewardMode))throw new Error('공부 보상 모드를 확인해 주세요.');
 validateHandwritingState(data);
 for(const day of Object.values(data.days))if(!order(day.orderProgress)||!cap(day.wordRewardCap)||![0,60].includes(day.bonus?.order??0)||day.excludedStudyIds!==undefined&&!ids(day.excludedStudyIds))throw new Error('하루 순서·제외 기록을 확인해 주세요.');
 if(data.words.some(w=>w.buriedOn!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(w.buriedOn)))throw new Error('카드 숨김 날짜를 확인해 주세요.');
 const u=data.studyUndo;
 if(u!==undefined&&(!u||!snap(u.before)||!snap(u.after)||!card(u.cardBefore)||!card(u.cardAfter)||!history?.some(e=>e.id===u.eventId&&e.wordId===u.wordId&&e.day===u.day&&!e.voidedAt)))throw new Error('마지막 채점 복원 기록을 확인해 주세요.');
 const p=data.pendingStudyAdjustment;
 if(p!==undefined&&(!p||!ledger(p.from)||!ledger(p.to)||p.from.words<p.to.words||p.from.extra<p.to.extra||p.from.quick<p.to.quick||(p.from.order??0)<(p.to.order??0)||!history?.some(e=>e.id===p.eventId&&e.day===p.day&&!!e.voidedAt)))throw new Error('학습 보상 복원 기록을 확인해 주세요.');
}
