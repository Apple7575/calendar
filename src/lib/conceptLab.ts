import {createEmptyCard,Rating,State,Grade} from 'ts-fsrs';
import {decodeCard,encodeCard,routineDay,scheduler} from './routineModel';
import {sampleBook} from './conceptLabContent';
import {listeningAssets} from './conceptLabListening';
import type {AIGrade,Attempt,DraftAnswer,ErrorCause,LabBook,LabCard,LabState} from './conceptLabTypes';

const DAY=86400000;
export const labStorageKey=(account='signed-out')=>`routine.concept-lab.v1.${account}`;
export function normalizeAnswer(text:string){return text.normalize('NFKC').trim().replace(/[\s。．.!！?？、,]/gu,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));}
export function exactGrade(card:LabCard,text:string):boolean|null{
 if(card.assessment==='self'||card.assessment==='open')return null;
 return card.accepted.some(a=>normalizeAnswer(a)===normalizeAnswer(text))?true:null;
}
export function validateCard(card:LabCard,book:LabBook):string[]{
 const errors:string[]=[];
 if(!card.id.startsWith('lab_')||card.difficulty!=='N3'||!card.prompt.trim()||!card.answer.trim()||!card.explanation.trim()||!card.rubric.trim())errors.push('missing_fields');
 if(!book.units.some(u=>u.id===card.unitId))errors.push('unknown_unit');
 if(card.conceptId&&!book.concepts.some(c=>c.id===card.conceptId&&book.units.find(u=>u.id===card.unitId)?.domain===c.domain))errors.push('unknown_concept');
 if(!card.evidenceIds.length||card.evidenceIds.some(id=>!book.extractions.some(e=>e.id===id&&e.source.status==='model_visual_reviewed')))errors.push('unreviewed_source');
 if(card.type==='cloze'&&!/[（(]\s*[）)]|＿|___/.test(card.prompt))errors.push('missing_blank');
 if(card.assessment==='exact'&&!card.accepted.length)errors.push('no_answers');
 // An answer may appear as an explicit choice, but not as an accidental solution in the question.
 const choiceValue=(choice:string)=>normalizeAnswer(choice.replace(/^\s*(?:[a-dA-D1-4][.．:：)）]\s*|[a-dA-D1-4]\s+|[①②③④]\s*)/u,''));
 if(card.accepted.some(a=>a.length>1&&normalizeAnswer(card.prompt+' '+(card.cue?.text??'')).includes(normalizeAnswer(a))&&!card.choices?.some(choice=>choiceValue(choice)===normalizeAnswer(a))))errors.push('answer_leak');
 if(!card.quality||Object.values(card.quality).some(value=>value===false)||!card.quality.reviewer)errors.push('quality_rejected');
 if(card.type==='audio'&&!card.audioNoteId&&(!card.audioAssetId||!listeningAssets[card.audioAssetId]))errors.push('missing_audio');
 const bundle=book.bundles.find(b=>b.id===card.bundleId);
 if(card.bundleId&&(!bundle||!bundle.questionIds.includes(card.id)||bundle.blockedReason))errors.push('blocked_bundle');
 if(card.novel){const parent=[...book.cards,...book.variants].find(c=>c.id===card.parentId);
  if(!parent||parent.conceptId!==card.conceptId||parent.unitId!==card.unitId)errors.push('invalid_parent');}
 return errors;
}
export function createLab(now=new Date()):LabState{
 const cards=Object.fromEntries(sampleBook.cards.map(c=>[c.id,c]));
 return {version:1,bookId:sampleBook.id,createdAt:now.toISOString(),cards,schedules:{},attempts:[],settings:{dailyNew:6,dailyVariants:2,variantCooldownDays:1,automaticVariants:false},corrections:[],reports:[],revisions:[],generationJobs:[]};
}
/** Append reviewed content only. Keep user edits/reports, attempts and FSRS intact. */
export function mergeLabContent(s:LabState):LabState{
 const missing=sampleBook.cards.filter(c=>!s.cards[c.id]);
 const updates:Record<string,LabCard>={};
 for(const canonical of sampleBook.cards.filter(c=>c.id.startsWith('lab_pdf_'))){const old=s.cards[canonical.id];if(!old||old.quality.reviewer==='user-confirmed'||s.reports.some(r=>r.cardId===old.id)||s.revisions.some(r=>r.cardId===old.id))continue;
  if(old.status==='ready'&&canonical.status==='needs_review')updates[old.id]={...old,status:'needs_review'};
  else if(old.status==='needs_review'&&canonical.status==='ready'&&old.prompt===canonical.prompt&&old.answer===canonical.answer&&JSON.stringify(old.accepted)===JSON.stringify(canonical.accepted))updates[old.id]={...old,status:'ready',quality:canonical.quality,audioAssetId:canonical.audioAssetId};
 }
 if(!missing.length&&!Object.keys(updates).length&&s.studyVocabulary!==undefined)return s;
 return {...s,studyVocabulary:s.studyVocabulary??false,cards:{...s.cards,...Object.fromEntries(missing.map(c=>[c.id,c])),...updates}};
}
export function validateLab(raw:unknown):LabState{
 const s=raw as LabState;
 if(!s||s.version!==1||s.bookId!==sampleBook.id||!s.cards||!Array.isArray(s.attempts)||!s.schedules||!s.settings||!Array.isArray(s.corrections)||!Array.isArray(s.reports)||!Array.isArray(s.revisions)||!Array.isArray(s.generationJobs))throw new Error('실험 학습 기록의 형식을 확인해 주세요. 원본은 덮어쓰지 않았어요.');
 if(!Number.isInteger(s.settings.dailyNew)||s.settings.dailyNew<0||s.settings.dailyNew>30||!Number.isInteger(s.settings.dailyVariants)||s.settings.dailyVariants<0||s.settings.dailyVariants>5)throw new Error('학습량 설정을 확인해 주세요.');
 if(!Number.isFinite(s.settings.variantCooldownDays)||s.settings.variantCooldownDays<1||s.settings.variantCooldownDays>30||!Number.isFinite(Date.parse(s.createdAt)))throw new Error('학습 날짜와 생성 간격을 확인해 주세요.');
 for(const [id,c]of Object.entries(s.cards))if(c.id!==id||!c.prompt||!Array.isArray(c.accepted))throw new Error('카드 형식을 확인해 주세요.');
 for(const [id,c]of Object.entries(s.schedules))if(!s.cards[id]||!Number.isFinite(Date.parse(c.due))||!Number.isFinite(c.reps)||c.reps<0)throw new Error('복습 일정의 형식을 확인해 주세요.');
 for(const a of s.attempts)if(!s.cards[a.cardId]||!Number.isFinite(Date.parse(a.at))||!Number.isFinite(a.elapsedMs)||typeof a.correct!=='boolean')throw new Error('응답 기록의 형식을 확인해 주세요.');
 if(s.session&&(!Array.isArray(s.session.ids)||!Array.isArray(s.session.answers)||s.session.ids.some(id=>!s.cards[id])||s.session.answers.length>s.session.ids.length))throw new Error('중단한 학습 기록을 확인해 주세요.');
 if(s.generatedDrafts!==undefined&&(!Array.isArray(s.generatedDrafts)||s.generatedDrafts.some(d=>!d.id||!d.target||!d.card||!['ready','added','discarded'].includes(d.status)||validateCard(d.card,{...sampleBook,cards:Object.values(s.cards)}).length)))throw new Error('생성 결과 보관함의 형식을 확인해 주세요.');
 if(s.generationRuns!==undefined&&(!Array.isArray(s.generationRuns)||s.generationRuns.some(r=>!r.id||!r.targetId||!Number.isFinite(Date.parse(r.at))||!['running','complete','failed'].includes(r.status))))throw new Error('생성 요청 기록의 형식을 확인해 주세요.');
 return s;
}
export function effectiveAttempt(s:LabState,a:Attempt){const change=[...s.corrections].reverse().find(c=>c.attemptId===a.id);return change?{...a,correct:change.correct,grade:change.grade}:a;}
const ready=(s:LabState,c:LabCard)=>c.status==='ready'&&validateCard(c,{...sampleBook,cards:Object.values(s.cards)}).length===0;
export function labQueue(s:LabState,now=new Date()):string[]{
 const today=routineDay(now),used=new Set(s.attempts.filter(a=>a.firstSeen&&routineDay(new Date(a.at))===today).map(a=>a.cardId));
 let remaining=Math.max(0,s.settings.dailyNew-used.size);const queue:string[]=[];
 const candidates=Object.values(s.cards).filter(c=>ready(s,c)&&(s.studyVocabulary!==false||!c.unitId.startsWith('v-')||!!s.schedules[c.id])&&(!s.schedules[c.id]||new Date(s.schedules[c.id].due)<=now));
 candidates.sort((a,b)=>Number(!s.schedules[a.id])-Number(!s.schedules[b.id])||(s.schedules[a.id]?.due??'').localeCompare(s.schedules[b.id]?.due??'')||Number(b.novel)-Number(a.novel));
 for(const card of candidates){if(queue.includes(card.id))continue;
  const bundle=sampleBook.bundles.find(b=>b.id===card.bundleId);
  const ids=bundle?bundle.questionIds:[card.id];
  if(ids.some(id=>!s.cards[id]||!ready(s,s.cards[id])))continue;
  const fresh=ids.filter(id=>!s.schedules[id]).length;
  if(fresh>remaining)continue;
  remaining-=fresh;queue.push(...ids);
 }
 return queue;
}
export function beginLab(s:LabState,ids=labQueue(s),now=new Date()):LabState{
 if(s.session&&!s.session.finished) return s;
 // A manual choice may be outside today's ranked queue, but must obey the same
 // due/focus/new limits. Expanding the catalog must not make later units unreachable.
 const available=new Set(Object.values(s.cards).filter(c=>ready(s,c)&&(s.studyVocabulary!==false||!c.unitId.startsWith('v-')||!!s.schedules[c.id])&&(!s.schedules[c.id]||new Date(s.schedules[c.id].due)<=now)).map(c=>c.id));
 if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!available.has(id)))throw new Error('현재 복습 가능한 카드가 아니에요. 학습량과 일정을 확인해 주세요.');
 const used=new Set(s.attempts.filter(a=>a.firstSeen&&routineDay(new Date(a.at))===routineDay(now)).map(a=>a.cardId)).size;
 if(ids.filter(id=>!s.schedules[id]).length>Math.max(0,s.settings.dailyNew-used))throw new Error('하루 새 학습 한도를 확인해 주세요.');
 for(const id of ids){const b=sampleBook.bundles.find(b=>b.id===s.cards[id].bundleId);if(b&&b.questionIds.some(q=>!ids.includes(q)))throw new Error('지문 문제는 묶음 전체로 시작해 주세요.');}
 return {...s,session:{id:`session_${now.getTime()}_${s.attempts.length}`,ids,answers:[],revealed:false,startedAt:now.toISOString()}};
}
/** Manual picks obey group/focus/due limits, not their rank in today's queue. */
export function canStartLabCard(s:LabState,id:string,now=new Date()):boolean{
 const card=s.cards[id];if(!card)return false;
 const bundle=sampleBook.bundles.find(b=>b.id===card.bundleId),ids=bundle?.questionIds??[id];
 if(ids.some(key=>!s.cards[key]||!ready(s,s.cards[key])||(s.studyVocabulary===false&&s.cards[key].unitId.startsWith('v-')&&!s.schedules[key])||(s.schedules[key]&&new Date(s.schedules[key].due)>now)))return false;
 const used=new Set(s.attempts.filter(a=>a.firstSeen&&routineDay(new Date(a.at))===routineDay(now)).map(a=>a.cardId)).size;
 return ids.filter(key=>!s.schedules[key]).length<=Math.max(0,s.settings.dailyNew-used);
}
export function answerLab(s:LabState,text:string,elapsedMs:number,hint:boolean,mode?:Attempt['mode']):LabState{
 const session=s.session;if(!session||session.finished||session.revealed||session.answers.length>=session.ids.length)throw new Error('응답 순서를 확인해 주세요.');
 if(text.length>2000||!Number.isFinite(elapsedMs)||elapsedMs<0)throw new Error('응답은 2,000자까지 남길 수 있어요.');
 const card=s.cards[session.ids[session.answers.length]],answer:DraftAnswer={cardId:card.id,text:text.trim(),elapsedMs:Math.min(elapsedMs,3600000),hint,exact:exactGrade(card,text),mode:mode??(text.trim()?'text':'self')};
 return {...s,session:{...session,answers:[...session.answers,answer]}};
}
export function revealLab(s:LabState):LabState{
 const session=s.session;if(!session||session.answers.length!==session.ids.length)throw new Error('모든 질문에 먼저 답해 주세요.');
 return {...s,session:{...session,revealed:true}};
}
/** Phone-first recall: no answer entry; each bundle question is considered before feedback. */
export function flipLab(s:LabState,elapsedMs:number,hint:boolean):LabState{
 const session=s.session;if(!session||session.finished||session.revealed)return s;
 const next=session.answers.length<session.ids.length?answerLab(s,'',elapsedMs,hint,'self'):s;
 return next.session!.answers.length===next.session!.ids.length?revealLab(next):next;
}
export function finishAndAdvanceLab(s:LabState,assessments:SelfAssessment[],now=new Date(),expectedSessionId=s.session?.id):LabState{
 if(!s.session||s.session.finished||s.session.id!==expectedSessionId)return s;
 const finished=finishLab(s,assessments,now),first=labQueue(finished,now)[0];
 if(!first)return finished;
 const bundle=sampleBook.bundles.find(b=>b.id===finished.cards[first].bundleId);
 return beginLab(finished,bundle?.questionIds??[first],now);
}
export function setDraftAI(s:LabState,cardId:string,ai:AIGrade):LabState{
 if(!s.session?.revealed||s.session.finished)throw new Error('응답 후 해설 단계에서만 AI 채점을 요청할 수 있어요.');
 if(!Number.isFinite(ai.confidence)||ai.confidence<0||ai.confidence>1||typeof ai.correct!=='boolean'||ai.feedback.length>1500)throw new Error('AI 채점 결과를 확인해 주세요.');
 return {...s,session:{...s.session,answers:s.session.answers.map(a=>a.cardId===cardId?{...a,ai}:a)}};
}
export type SelfAssessment={correct:boolean;grade:Grade;reason?:ErrorCause;reasonText?:string;mode?:Attempt['mode']};
function scheduledGrade(a:Pick<DraftAnswer,'hint'>,self:SelfAssessment):Grade{
 if(!self.correct)return Rating.Again;return a.hint?Rating.Hard:self.grade;
}
export function finishLab(s:LabState,assessments:SelfAssessment[],now=new Date()):LabState{
 const session=s.session;if(session?.finished)return s;
 if(!session?.revealed||assessments.length!==session.ids.length)throw new Error('해설과 자기 평가를 모두 마쳐 주세요.');
 const schedules={...s.schedules},attempts=[...s.attempts];
 session.answers.forEach((draft,i)=>{
  const self=assessments[i];if(![1,2,3,4].includes(self.grade)||(self.reasonText?.length??0)>500)throw new Error('자기 평가를 확인해 주세요.');
  const card=s.cards[draft.cardId],grade=scheduledGrade(draft,self);
  const previous=schedules[card.id];schedules[card.id]=encodeCard(scheduler.next(previous?decodeCard(previous):createEmptyCard(now),now,grade).card);
  attempts.push({...draft,id:`${session.id}:${card.id}`,sessionId:session.id,at:now.toISOString(),firstSeen:!s.attempts.some(a=>a.cardId===card.id),origin:card.origin,novel:card.novel,conceptId:card.conceptId,ability:card.ability,mode:self.mode??draft.mode??(draft.text?'text':'self'),correct:self.correct,grade,selfGrade:self.grade,reason:self.reason,reasonText:self.reasonText?.trim(),feedbackComplete:true});
 });
 return {...s,schedules,attempts,session:{...session,finished:true}};
}
export function correctAttempt(s:LabState,attemptId:string,correct:boolean,grade:Grade,note:string,now=new Date()):LabState{
 const target=s.attempts.find(a=>a.id===attemptId);if(!target||!note.trim()||note.length>500||![1,2,3,4].includes(grade))throw new Error('수정 이유를 500자 이내로 남겨 주세요.');
 const next={...s,corrections:[...s.corrections,{attemptId,at:now.toISOString(),correct,grade:!correct?Rating.Again:target.hint?Rating.Hard:grade,note:note.trim()}]};
 let card=createEmptyCard(new Date(s.createdAt));
 for(const a of s.attempts.filter(a=>a.cardId===target.cardId))card=scheduler.next(card,new Date(a.at),effectiveAttempt(next,a).grade).card;
 return {...next,schedules:{...s.schedules,[target.cardId]:encodeCard(card)}};
}
export function reportCard(s:LabState,cardId:string,note:string,now=new Date()):LabState{
 if(!s.cards[cardId]||!note.trim()||note.length>500)throw new Error('신고 내용을 입력해 주세요.');
 const interrupted=s.session?.ids.includes(cardId)&&!s.session.finished;
 return {...s,cards:{...s.cards,[cardId]:{...s.cards[cardId],status:'disabled'}},session:interrupted?{...s.session!,finished:true}:s.session,archivedSessions:interrupted?[...(s.archivedSessions??[]),s.session!]:s.archivedSessions,reports:[...s.reports,{cardId,at:now.toISOString(),note:note.trim()}]};
}
export function reviseCard(s:LabState,card:LabCard,book:LabBook=sampleBook,now=new Date()):LabState{
 const old=s.cards[card.id];if(!old||old.conceptId!==card.conceptId||old.unitId!==card.unitId||validateCard(card,{...book,cards:Object.values(s.cards)}).length)throw new Error('목표·출처를 유지하고 정답·해설·검수를 확인해 주세요.');
 return {...s,cards:{...s.cards,[card.id]:{...card,status:'ready'}},revisions:[...s.revisions,{cardId:card.id,at:now.toISOString(),before:old}]};
}
export function adaptationNeeds(s:LabState):{label:string;conceptId?:string;ability:string}[]{
 const attempts=s.attempts.map(a=>effectiveAttempt(s,a)),needs:{label:string;conceptId?:string;ability:string}[]=[];
 for(const concept of sampleBook.concepts){const rows=attempts.filter(a=>a.conceptId===concept.id),wrong=rows.filter(a=>!a.correct);
  if(rows.some(a=>a.correct&&a.mode==='choice')&&rows.some(a=>!a.correct&&a.mode==='text'))needs.push({label:'선택지 없는 짧은 직접 응답 연습',conceptId:concept.id,ability:'form'});
  if(wrong.length>=2)needs.push({label:wrong.some(a=>a.reason==='confusion')?'개념 비교·작은 단계 연습':'반복 오답 재설명',conceptId:concept.id,ability:'form'});
  if(rows.some(a=>a.correct&&!a.novel)&&rows.some(a=>!a.correct&&a.novel))needs.push({label:'다른 상황 적용 연습',conceptId:concept.id,ability:'context'});
  if(rows.some(a=>a.correct&&a.ability==='meaning')&&rows.some(a=>!a.correct&&a.ability==='form'))needs.push({label:'접속·활용 연습',conceptId:concept.id,ability:'form'});
  if(rows.some(a=>a.correct&&a.ability!=='listening')&&rows.some(a=>!a.correct&&a.ability==='listening'))needs.push({label:'듣기 연습',conceptId:concept.id,ability:'listening'});
 }
 // Response speed is deliberately absent. Novel performance over multiple days is shown, never a diagnosis.
 return needs;
}
export function variantCandidates(s:LabState):LabCard[]{
 const needs=adaptationNeeds(s);return sampleBook.variants.filter(c=>!s.cards[c.id]).sort((a,b)=>Number(needs.some(n=>n.conceptId===b.conceptId&&n.ability===b.ability))-Number(needs.some(n=>n.conceptId===a.conceptId&&n.ability===a.ability)));
}
export function addVariant(s:LabState,id:string,now=new Date(),remote?:LabCard):LabState{
 if(s.cards[id])return s;
 const card=remote??sampleBook.variants.find(c=>c.id===id);if(!card||card.id!==id||!card.novel||card.origin!=='ai'||card.status!=='ready')throw new Error('검증된 새 문제를 찾지 못했어요. 기존 기록은 그대로예요.');
 const book={...sampleBook,cards:Object.values(s.cards)};
 if(validateCard(card,book).length||Object.values(s.cards).some(c=>normalizeAnswer(c.prompt)===normalizeAnswer(card.prompt)))throw new Error('새 문제 검증에 실패했어요. 기존 카드는 그대로예요.');
 const today=routineDay(now),jobs=s.generationJobs.filter(j=>j.status==='complete');
 if(jobs.filter(j=>routineDay(new Date(j.at))===today).length>=s.settings.dailyVariants)throw new Error('오늘 새 적용 문제 한도에 도달했어요.');
 if(jobs.some(j=>j.cardId&&s.cards[j.cardId]?.conceptId===card.conceptId&&now.getTime()-new Date(j.at).getTime()<s.settings.variantCooldownDays*DAY))throw new Error('이 개념의 새 문제 생성 간격이 아직 지나지 않았어요.');
 return {...s,cards:{...s.cards,[id]:{...card,createdAt:now.toISOString()}},generationJobs:[...s.generationJobs,{key:id,cardId:id,at:now.toISOString(),status:'complete'}]};
}
export function labStats(s:LabState,now=new Date()){
 const attempts=s.attempts.map(a=>effectiveAttempt(s,a));const summary=(rows:Attempt[])=>({total:rows.length,correct:rows.filter(a=>a.correct).length});
 const ability=Object.fromEntries([...new Set(attempts.map(a=>a.ability))].map(key=>[key,summary(attempts.filter(a=>a.ability===key))]));
 const concepts=sampleBook.concepts.map(c=>{const rows=attempts.filter(a=>a.conceptId===c.id);return {...c,wrong:rows.filter(a=>!a.correct).length,...summary(rows),novelDays:new Set(rows.filter(a=>a.novel&&a.correct&&!a.hint).map(a=>routineDay(new Date(a.at)))).size};});
 const cards=Object.values(s.cards),schedules=Object.values(s.schedules);
 return {due:labQueue(s,now).length,unlearned:cards.filter(c=>ready(s,c)&&!s.schedules[c.id]).length,learning:schedules.filter(c=>c.state===State.Learning||c.state===State.Relearning).length,reviewing:schedules.filter(c=>c.state===State.Review).length,held:cards.filter(c=>!ready(s,c)).length,original:summary(attempts.filter(a=>!a.novel)),novel:summary(attempts.filter(a=>a.novel&&a.firstSeen)),variantReview:summary(attempts.filter(a=>a.novel&&!a.firstSeen)),textbook:summary(attempts.filter(a=>a.origin==='textbook')),ai:summary(attempts.filter(a=>a.origin==='ai')),ability,concepts,feedback:attempts.filter(a=>a.feedbackComplete).length};
}
