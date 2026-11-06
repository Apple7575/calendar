import { Card, createEmptyCard, fsrs, Grade, Rating, State } from "ts-fsrs";
import { DeckRow, JapaneseNote, parseNoteText, PublishedDeck } from "./japaneseDeck";
import { applyAdditionalReward,applyWordReward,initializeWordRewards } from './studyRewards';
import { recordStudyAnswer } from './studyHistory';

export type Unit = "morning" | "words" | "gym";
export type Level = "min" | "full";
export const FULL = { morning: 10, words: 20, gym: 30 };
export const MIN = { morning: 5, words: 5, gym: 10 };
export const STEPS = ["이불 개기", "양치", "간단한 청소"];
export type MorningStep = { id: string; title: string; detail: string; minimum: boolean;minutes?:number;preparation?:string };
export const DEFAULT_MORNING: MorningStep[] = [
  { id: "bed", title: STEPS[0], detail: "이불을 정리하고 잠자리에서 일어나요.", minimum: true },
  { id: "brush", title: STEPS[1], detail: "상쾌하게 양치하고 하루를 깨워요.", minimum: true },
  { id: "clean", title: STEPS[2], detail: "눈에 보이는 곳 하나만 정리해요.", minimum: false },
];
export type StoredCard = Omit<Card, "due" | "last_review"> & { due: string; last_review?: string };
export type StudyIssue = 'audio' | 'wordAudio' | 'sentenceAudio' | 'example' | 'meaning' | 'other';
export type Word = { id: string; deckId: string; front: string; back: string; card: StoredCard; fields?: JapaneseNote; kind?: "word" | "sentence"; active?: boolean;suspended?:boolean;buriedOn?:string;localFields?:Partial<JapaneseNote>; favorite?: boolean; issue?: {categories:StudyIssue[];note:string;updatedAt:string} };
export const STUDY_ISSUES: Record<StudyIssue,string> = {audio:'음성',wordAudio:'단어 음성',sentenceAudio:'예문 음성',example:'예문 내용·번역',meaning:'단어 뜻·읽기',other:'기타·직접 입력'};
export const REPORT_TYPES:StudyIssue[]=['wordAudio','sentenceAudio','example','meaning','other'];
export function favoriteWord(data:RoutineData,id:string):RoutineData {
  return {...data,words:data.words.map(w=>w.id===id?{...w,favorite:!w.favorite}:w)};
}
export function flagWord(data:RoutineData,id:string,categories:StudyIssue[],note:string,now=new Date(),key=routineDay(now)):RoutineData {
  if(note.length>500)throw new Error('메모는 500자까지 남길 수 있어요.');
  const clean=[...new Set(categories.filter(value=>value in STUDY_ISSUES))];
  return reconcileStudyExclusions({...data,words:data.words.map(w=>w.id===id?{...w,issue:clean.length||note.trim()?{categories:clean,note:note.trim(),updatedAt:now.toISOString()}:undefined}:w)},key);
}
export function canStudyWord(word:Word,key:string):boolean{return word.active!==false&&!word.suspended&&!word.issue&&word.buriedOn!==key;}
export function setWordStudyStatus(data:RoutineData,id:string,status:'bury'|'suspend'|'restore',key=routineDay()):RoutineData{
 return reconcileStudyExclusions({...data,words:data.words.map(w=>w.id!==id?w:status==='bury'?{...w,buriedOn:key}:status==='suspend'?{...w,suspended:true,buriedOn:undefined}:{...w,suspended:false,buriedOn:undefined})},key);
}
/** Excluded cards remain in the frozen plan, but never count as learned cards. */
export function reconcileStudyExclusions(data:RoutineData,key:string):RoutineData{
 const day=data.days[key];if(!day)return data;
 const plans=[day.additional,...Object.values(day.additionalByDeck??{})].filter((p):p is AdditionalPlan=>!!p),completed=new Set([...day.complete,...plans.flatMap(p=>p.complete)]);
 const ids=[...new Set([...(day.plan?.ids??[]),...plans.flatMap(p=>p.ids)])],words=new Map(data.words.map(w=>[w.id,w]));
 const excluded=ids.filter(id=>!completed.has(id)&&(!words.has(id)||!canStudyWord(words.get(id)!,key)));
 if(JSON.stringify(day.excludedStudyIds??[])===JSON.stringify(excluded))return data;
 return withDay(data,key,d=>({...d,excludedStudyIds:excluded}));
}
export type Deck = { id: string; name: string; active: boolean; source?: "computer"; revision?: string;newLimit?:number };
export type AdditionalPlan={kind:'new'|'review'|'quick';ids:string[];complete:string[];completedIds:string[];responses:number;lastWordId?:string;reward?:{granted:number;withheld:number}};
export type Day = {
  paid: Record<Unit, number>; morning: boolean[];
  morningPlan?: MorningStep[];
  plan?: { ids: string[]; reviewIds: string[]; newLimit: number };
  complete: string[]; responses: number; studySeconds: number;
  lastStudyWordId?: string;
  additional?:AdditionalPlan;additionalByDeck?:Record<string,AdditionalPlan>;
  bonus?:{words?:number;book?:number;quick?:number;order?:number;freeStudy?:number;handwriting?:number;speaking?:number;content?:number;promise?:number};
  rewardedFreeSessionIds?:string[];
  orderProgress?:import('./habitOrder').HabitOrderProgress;
  evening?:boolean[];eveningPlan?:MorningStep[];guidedTimer?:import('./dailyPlan').GuidedTimer;
  guidedLevels?:Partial<Record<'morning'|'evening',Level>>;
  rewardedStudyIds?:string[];extraPendingIds?:string[];
  excludedStudyIds?:string[];
  wordRewardCap?:number;
  wordRewards?:import('./studyRewards').WordRewards;
  speakingRewards?:import('./speaking').SpeakingDayRewards;
};
export type RoutineData = {
  primaryGoal?:import('./primaryGoal').PrimaryGoal;goals?:import('./routineGoals').Goal[];
  priorityPolicy?:import('./priorityPlan').PriorityPolicy;priorityDays?:Record<string,import('./priorityPlan').PriorityDay>;
  focusRamp?:import('./focusRamp').FocusRamp;focusPlans?:import('./focusRamp').FocusPlan[];focusPenalties?:import('./focusPenalty').FocusPenalty[];
  speakingRecords?:import('./speaking').SpeakingRecord[];speakingConsentAt?:string;
  emergencyUnlocks?:import('./emergencyUnlock').EmergencyUnlock[];emergencyPending?:import('./emergencyUnlock').EmergencyPending;
  weeklyStakes?:Record<string,import('./commitments').WeeklyStakeRow>;dayPromises?:Record<string,import('./commitments').DayPromiseRow>;
  interestDays?:Record<string,import('./commitments').InterestDay>;interestSince?:string;weeklyReviews?:Record<string,import('./commitments').WeeklyReview>;
  contentUploads?:import('./content').ContentUpload[];contentSeenLinks?:string[];contentIdeas?:import('./content').ContentIdea[];
  money?:import('./moneyRewards').MoneyWallet;playLog?:import('./playLog').PlayLog;
  version: 1; decks: Deck[]; words: Word[]; days: Record<string, Day>; newLimit: number; morningSteps?: MorningStep[];
  boriStage?: import("./boriGrowth").BoriGrowthStage;
  eveningSteps?:MorningStep[];bookSessions?:import('./bookStudy').BookSession[];bookTimer?:import('./bookStudy').BookTimer;
  learningSummaries?:import('./learningSummary').LearningSummary[];
  studyRewardPolicy?:import('./studyRewards').StudyRewardPolicy;
  habitOrderPolicy?:import('./habitOrder').HabitOrderPolicy;
  freeStudyPolicy?:{unlockAfter:import('./freeStudy').FreeStudyUnlock};
  handwritingReceipts?:import('./handwriting').HandwritingReceipt[];
  outputDraft?:import('./handwriting').OutputDraft;
  handwritingPending?:{id:string;imageHash:string;subject:string;analysis:import('./handwriting').HandwritingAnalysis;declared?:boolean};
  reviewHistory?:import('./studyHistory').ReviewEvent[];studyUndo?:import('./studyHistory').StudyUndo;pendingStudyAdjustment?:import('./studyHistory').StudyAdjustment;
};
export const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false });
export const emptyData = (): RoutineData => ({ version: 1, decks: [], words: [], days: {}, newLimit: 10 });
export const emptyDay = (): Day => ({ paid: { morning: 0, words: 0, gym: 0 }, morning: [false, false, false], complete: [], responses: 0, studySeconds: 0 });
export function routineDay(now: Date = new Date()): string {
  const d = new Date(now); if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dayEnd(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d + 1, 4);
}
export function encodeCard(card: Card): StoredCard {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() };
}
export function decodeCard(card: StoredCard): Card {
  return { ...card, due: new Date(card.due), last_review: card.last_review ? new Date(card.last_review) : undefined };
}
export function getDay(data: RoutineData, key: string): Day { return data.days[key] ?? emptyDay(); }
export function withDay(data: RoutineData, key: string, update: (day: Day) => Day): RoutineData {
  return { ...data, days: { ...data.days, [key]: update(getDay(data, key)) } };
}
export function morningSteps(data: RoutineData, key: string): MorningStep[] {
  const day = getDay(data, key);
  return day.morningPlan ?? (day.morning.some(Boolean) || day.paid.morning > 0 ? DEFAULT_MORNING : data.morningSteps ?? DEFAULT_MORNING);
}
export function saveMorningSteps(data: RoutineData, steps: MorningStep[]): RoutineData {
  if (!steps.length || steps.length > 12 || !steps.some(s => s.minimum) || new Set(steps.map(s => s.id)).size !== steps.length || steps.some(s => !s.title.trim() || s.title.trim().length > 60 || s.detail.length > 160 || (s.preparation!==undefined&&(typeof s.preparation!=='string'||s.preparation.length>160)) || (s.minutes!==undefined&&(!Number.isInteger(s.minutes)||s.minutes<1||s.minutes>120)))) throw new Error("행동은 1~12개, 이름은 1~60자, 시간은 1~120분으로 입력하고 최소 목표를 하나 이상 선택해 주세요.");
  return { ...data, morningSteps: steps.map(s => ({ ...s, title: s.title.trim(), detail: s.detail.trim() })) };
}
export function checkMorning(data: RoutineData, key: string, level: Level, index?: number): RoutineData {
  const steps = morningSteps(data, key);
  const required = steps.map((s, i) => level === "full" || s.minimum ? i : -1).filter(i => i >= 0);
  let next = withDay(data, key, day => ({ ...day, morningPlan: steps.map(s => ({ ...s })), morning: steps.map((_, i) => !!day.morning[i] || i === index) }));
  if (required.length && required.every(i => getDay(next, key).morning[i])) next = earn(next, key, "morning", level);
  return next;
}
export function earn(data: RoutineData, key: string, unit: Unit, level: Level): RoutineData {
  if(unit==='words')return data;
  return withDay(data, key, day => ({ ...day, paid: { ...day.paid, [unit]: Math.max(day.paid[unit], (level === "full" ? FULL : MIN)[unit]) } }));
}
/** Saved values are never trusted: a broken value counts as nothing and never blocks loading. */
export const speakingBonus=(day:Day|undefined)=>{const v=day?.bonus?.speaking;return typeof v==='number'&&Number.isSafeInteger(v)&&v>0?v:0};
/** Only sums of the two platforms' rewards are real. Anything else counts as nothing, and the device would refuse it. */
export const contentBonus=(day:Day|undefined)=>{const v=day?.bonus?.content;return v===60||v===120||v===180?v:0};
/** A kept promise is worth exactly 10 minutes; any other saved value counts as nothing. */
export const promiseBonus=(day:Day|undefined)=>day?.bonus?.promise===10?10:0;
export function earned(day: Day): number { return promiseBonus(day) + contentBonus(day) + speakingBonus(day) + day.paid.morning + day.paid.words + day.paid.gym + (day.bonus?.book??0) + (day.bonus?.words??0) + (day.bonus?.quick??0) + (day.bonus?.order??0) + (day.bonus?.freeStudy??0) + (day.bonus?.handwriting??0); }
export function achieved(day: Day): boolean { return earned(day) > 0; }
export function planStudy(data: RoutineData, key: string): RoutineData {
  if (getDay(data, key).plan) return data;
  const active = new Set(data.decks.filter(d => d.active).map(d => d.id));
  const pool = data.words.filter(w => active.has(w.deckId) && canStudyWord(w,key));
  const review = pool.filter(w => w.card.state !== State.New && new Date(w.card.due) < dayEnd(key))
    .sort((a, b) => a.card.due.localeCompare(b.card.due));
  const fresh = data.decks.filter(d=>d.active).flatMap(deck=>pool.filter(w=>w.deckId===deck.id&&w.card.state===State.New).slice(0,deck.newLimit??data.newLimit));
  return withDay(data, key, day => ({ ...day, plan: { ids: [...review, ...fresh].map(w => w.id), reviewIds: review.map(w => w.id), newLimit: data.newLimit } }));
}
export function studyProgress(day: Day) {
  const excludedIds=new Set(day.excludedStudyIds??[]),ids=day.plan?.ids.filter(id=>!excludedIds.has(id))??[],reviewIds=day.plan?.reviewIds.filter(id=>!excludedIds.has(id))??[];
  const total = ids.length;
  const done = ids.filter(id=>day.complete.includes(id)).length;
  const reviewDone = reviewIds.filter(id => day.complete.includes(id)).length;
  const minimum = Math.min(5, reviewIds.length),excluded=(day.plan?.ids.length??0)-total;
  return { total, done, excluded, remaining: Math.max(0, total - done), minimum,
    full: total > 0 && done >= total, min: minimum > 0 && reviewDone >= minimum };
}
export function studyDeckProgress(data:RoutineData,key:string,deckId?:string){
 const day=getDay(data,key);if(!deckId)return studyProgress(day);
 const ids=new Set(data.words.filter(w=>w.deckId===deckId).map(w=>w.id));
 return studyProgress({...day,complete:day.complete.filter(id=>ids.has(id)),plan:day.plan?{...day.plan,ids:day.plan.ids.filter(id=>ids.has(id)),reviewIds:day.plan.reviewIds.filter(id=>ids.has(id))}:undefined});
}
export function pendingWords(data: RoutineData, key: string, level: Level,deckId?:string): Word[] {
  const day = getDay(data, key);
  const ids = new Set(level === "min" ? day.plan?.reviewIds : day.plan?.ids);
  return data.words.filter(w => ids.has(w.id) && canStudyWord(w,key) && !day.complete.includes(w.id)&&(!deckId||w.deckId===deckId))
    .sort((a, b) => a.card.due.localeCompare(b.card.due) || a.id.localeCompare(b.id));
}
/** Finish ready/new/day-review cards first, then learn ahead within this routine day. */
export function nextStudyWord(data: RoutineData, key: string, level: Level, now: Date,deckId?:string): Word | undefined {
  const pending = pendingWords(data, key, level,deckId);
  const end = dayEnd(key);
  const ready = pending.find(w => w.card.state === State.New ||
    (w.card.state === State.Review && new Date(w.card.due) < end) || new Date(w.card.due) <= now);
  if (ready) return ready;
  const ahead = pending.filter(w => (w.card.state === State.Learning || w.card.state === State.Relearning) && new Date(w.card.due) < end);
  return ahead.find(w => w.id !== getDay(data, key).lastStudyWordId) ?? ahead[0];
}
export function additionalCandidates(data: RoutineData, key: string, kind: 'new' | 'review' | 'quick',deckId?:string): Word[] {
  const decks = new Set(data.decks.filter(d => d.active).map(d => d.id));
  const daily = new Set(getDay(data, key).plan?.ids ?? []);
  const day=getDay(data,key),used=new Set([...daily,...(day.rewardedStudyIds??[]),...(day.extraPendingIds??[]),...(day.wordRewards?.countedIds??[])]);
  return data.words.filter(w => decks.has(w.deckId) && canStudyWord(w,key)&&(!deckId||w.deckId===deckId) &&
    (kind === 'new' ? w.card.state === State.New && !daily.has(w.id) : w.card.state !== State.New) &&
    (kind!=='quick'||!used.has(w.id)))
    .sort((a,b) => Number(used.has(a.id))-Number(used.has(b.id))||a.card.due.localeCompare(b.card.due)||a.id.localeCompare(b.id));
}
export function additionalPlan(data:RoutineData,key:string,deckId?:string){return deckId?getDay(data,key).additionalByDeck?.[deckId]:getDay(data,key).additional;}
function extraDay(day:Day,plan:AdditionalPlan,deckId?:string):Day{return deckId?{...day,additionalByDeck:{...day.additionalByDeck,[deckId]:plan}}:{...day,additional:plan};}
export function pendingAdditionalWords(data: RoutineData, key: string,deckId?:string): Word[] {
  const plan = additionalPlan(data,key,deckId);
  const ids = new Set(plan?.ids ?? []), done = new Set(plan?.complete ?? []);
  return data.words.filter(w => ids.has(w.id) && canStudyWord(w,key) && !done.has(w.id))
    .sort((a,b) => a.card.due.localeCompare(b.card.due) || a.id.localeCompare(b.id));
}
export function nextAdditionalWord(data: RoutineData, key: string, now: Date,deckId?:string): Word | undefined {
  const pending = pendingAdditionalWords(data,key,deckId);
  const ready = pending.find(w => w.card.state === State.New || new Date(w.card.due) <= now);
  return ready ?? pending.find(w => w.id !== additionalPlan(data,key,deckId)?.lastWordId) ?? pending[0];
}
export function additionalProgress(data:RoutineData,key:string,deckId?:string){
 const day=getDay(data,key),plan=additionalPlan(data,key,deckId),excluded=new Set(day.excludedStudyIds??[]),ids=plan?.ids.filter(id=>!excluded.has(id))??[];
 const done=ids.filter(id=>plan?.complete.includes(id)).length;
 return {total:ids.length,done,excluded:(plan?.ids.length??0)-ids.length,remaining:pendingAdditionalWords(data,key,deckId).length,full:ids.length>0&&done===ids.length,min:false};
}
/** A persistent custom-study batch in the same deck. It never rewrites the daily goal. */
export function startAdditionalStudy(data: RoutineData, key: string, kind: 'new' | 'review' | 'quick', count = 10, now = new Date(),deckId?:string): RoutineData {
  if(routineDay(now)!==key)throw new Error('새 하루가 시작됐어요. 학습을 다시 열어 주세요.');
  if(!Number.isSafeInteger(count)||count<1)throw new Error('추가 분량은 1장 이상의 정수로 선택해 주세요.');
  if(kind==='quick'&&!data.studyRewardPolicy?.quickEnabled)throw new Error('짧은 복습 보상 설정과 오늘 남은 횟수를 확인해 주세요.');
  if(pendingAdditionalWords(data,key,deckId).length){if(kind==='quick'&&additionalPlan(data,key,deckId)?.kind!=='quick')throw new Error('하던 추가 학습을 먼저 마쳐 주세요.');return data;}
  if(kind==='quick')count=3;
  const candidates=additionalCandidates(data,key,kind,deckId).slice(0,count);
  if(kind==='quick'&&candidates.length<3)throw new Error('오늘 아직 보상받지 않은 복습 카드가 3장 필요해요.');
  if(!candidates.length)throw new Error(kind==='new'?'남은 새 단어가 없어요. 복습 더 하기를 선택해 주세요.':'복습할 카드가 아직 없어요. 새 단어 더 하기를 선택해 주세요.');
  return withDay(data,key,day=>extraDay(day,{kind,ids:candidates.map(w=>w.id),complete:[],reward:{granted:0,withheld:0},
    completedIds:additionalPlan(data,key,deckId)?.completedIds??[],responses:additionalPlan(data,key,deckId)?.responses??0},deckId));
}
export function answerAdditionalWord(data: RoutineData,key: string,id: string,grade: Grade,now: Date,seconds: number,deckId?:string,presentedReps?:number): RoutineData {
  if(data.pendingStudyAdjustment)throw new Error('이전 채점의 보상을 되돌리는 중이에요. 잠시 후 다시 시도해 주세요.');
  if(routineDay(now)!==key)throw new Error('새 하루가 시작됐어요. 학습을 다시 열어 주세요.');
  const day=getDay(data,key),plan=additionalPlan(data,key,deckId),word=data.words.find(w=>w.id===id);
  if(!plan||!word||!canStudyWord(word,key)||!plan.ids.includes(id)||plan.complete.includes(id)||deckId&&word.deckId!==deckId)return data;
  if(presentedReps!==undefined?word.card.reps!==presentedReps:nextAdditionalWord(data,key,now,deckId)?.id!==id)return data;
  data=initializeWordRewards(data,key);
  const result=scheduler.next(decodeCard(word.card),now,grade),done=grade!==Rating.Again&&result.card.due>=dayEnd(key);
  const next={...data,words:data.words.map(w=>w.id===id?{...w,card:encodeCard(result.card)}:w)};
  const saved=withDay(next,key,d=>extraDay({...d,responses:d.responses+1,studySeconds:d.studySeconds+Math.max(0,Math.min(seconds,120))},
    {...plan,responses:plan.responses+1,lastWordId:id,complete:done?[...plan.complete,id]:plan.complete,
      completedIds:done?[...new Set([...plan.completedIds,id])]:plan.completedIds},deckId));
  return recordStudyAnswer(data,done?applyAdditionalReward(saved,key,id,additionalPlan(saved,key,deckId)):saved,key,id,grade,now,seconds,'additional');
}
export function answerWord(data: RoutineData, key: string, id: string, grade: Grade, now: Date, seconds: number, level: Level = 'full',deckId?:string,presentedReps?:number): RoutineData {
  if(data.pendingStudyAdjustment)throw new Error('이전 채점의 보상을 되돌리는 중이에요. 잠시 후 다시 시도해 주세요.');
  if (routineDay(now) !== key) throw new Error("새 하루가 시작됐어요. 오늘 학습을 다시 열어 주세요.");
  const day = getDay(data, key);
  const word = data.words.find(w => w.id === id);
  if (!word || !canStudyWord(word,key) || !day.plan?.ids.includes(id) || day.complete.includes(id)) return data;
  if(deckId&&word.deckId!==deckId||level==='min'&&!day.plan.reviewIds.includes(id)||presentedReps!==undefined&&word.card.reps!==presentedReps)return data;
  if (word.card.state !== State.New && new Date(word.card.due) > now) {
    const sameDayReview = word.card.state === State.Review && new Date(word.card.due) < dayEnd(key);
    const learnAhead = (word.card.state === State.Learning || word.card.state === State.Relearning) && new Date(word.card.due)<dayEnd(key) &&
      (presentedReps!==undefined||nextStudyWord(data, key, level, now,deckId)?.id === id);
    if (!sameDayReview && !learnAhead) return data;
  }
  data=initializeWordRewards(data,key);
  const result = scheduler.next(decodeCard(word.card), now, grade);
  const complete = grade !== Rating.Again && result.card.due >= dayEnd(key);
  let next = { ...data, words: data.words.map(w => w.id === id ? { ...w, card: encodeCard(result.card) } : w) };
  next = withDay(next, key, d => ({ ...d, complete: complete ? [...d.complete, id] : d.complete,
    responses: d.responses + 1, studySeconds: d.studySeconds + Math.max(0, Math.min(seconds, 120)), lastStudyWordId: id }));
  if(complete)next=applyWordReward(next,key,id);
  return recordStudyAnswer(data,next,key,id,grade,now,seconds,'daily',level);
}
export function addDeck(data: RoutineData, name: string, rows: DeckRow[], id: string, now = new Date()): RoutineData {
  const clean = rows.map(r => ({ ...r, front: r.front.trim(), back: r.back.trim() })).filter(r => r.front && r.back);
  if (!clean.length) throw new Error("앞면과 뒷면이 있는 단어가 없어요.");
  if (clean.length > 10000) throw new Error("한 번에 10,000개까지 가져올 수 있어요.");
  return { ...data, decks: [...data.decks, { id, name, active: true }],
    words: [...data.words, ...clean.map((r, i) => ({ ...r, id: `${id}:${i}`, deckId: id, card: encodeCard(createEmptyCard(now)) }))] };
}

/** CSV/TSV text including quoted commas, newlines and escaped quotes. */
export const parseDeckText = parseNoteText;

/** Content updates keep FSRS and all frozen daily plans intact. */
export function mergePublishedDeck(data: RoutineData, deck: PublishedDeck, now = new Date()): RoutineData {
  const id = `pc:${deck.id}`;
  const existing = data.decks.find(d => d.id === id);
  if (existing?.revision === deck.revision) return data;
  const words = new Map(data.words.map(w => [w.id, w.deckId === id ? { ...w, active: false } : w]));
  for (const fields of deck.notes) {
    for (const kind of (["word", ...(fields.Make_Sentence_Card ? ["sentence"] : [])] as ("word" | "sentence")[])) {
      const wordId = `${id}:${encodeURIComponent(fields.ID)}:${kind}`;
      const old = words.get(wordId);
      const effectiveFields={...fields,...old?.localFields};
      words.set(wordId, { ...old, id: wordId, deckId: id, kind, fields:effectiveFields, active: true,
        front: kind === "word" ? effectiveFields.Word : effectiveFields.Sentence,
        back: kind === "word" ? effectiveFields.Word_Meaning : effectiveFields.Sentence_Meaning,
        card: old?.card ?? encodeCard(createEmptyCard(now)) });
    }
  }
  const record: Deck = { id, name: deck.name, active: existing?.active ?? true, source: "computer", revision: deck.revision,newLimit:existing?.newLimit };
  return { ...data, words: [...words.values()], decks: existing ? data.decks.map(d => d.id === id ? record : d) : [...data.decks, record] };
}
