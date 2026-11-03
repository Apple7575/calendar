import {effectiveAttempt,normalizeAnswer,validateCard} from './conceptLab';
import {sampleBook} from './conceptLabContent';
import {abilityLabels,Ability,Attempt,CardType,LabCard,LabState} from './conceptLabTypes';
import {routineDay} from './routineModel';

export type GenerationStrategy='reinforce'|'contrast'|'transfer'|'form'|'recall'|'listening';
export type GenerationTarget={id:string;parentId:string;conceptId:string;conceptLabel:string;strategy:GenerationStrategy;type:CardType;ability:Ability;title:string;reason:string;wrongCount:number;evidenceIds:string[];blocked?:string};
export type GeneratedDraft={id:string;target:GenerationTarget;card:LabCard;at:string;status:'ready'|'added'|'discarded';reviewedAt?:string};
export type GenerationRun={id:string;targetId:string;at:string;status:'running'|'complete'|'failed';message?:string;target?:GenerationTarget};
const labels:Record<GenerationStrategy,string>={reinforce:'작은 단계로 다시 연습',contrast:'헷갈리는 표현 비교',transfer:'다른 상황에 적용',form:'접속·활용 연습',recall:'선택지 없이 떠올리기',listening:'듣기 연습'};
export function generationCountToday(s:LabState,now=new Date()){
 const day=routineDay(now),ids=new Set([...(s.generationRuns??[]).filter(r=>routineDay(new Date(r.at))===day).map(r=>r.id),...(s.generatedDrafts??[]).filter(d=>routineDay(new Date(d.at))===day).map(d=>d.id)]);
 return ids.size;
}
export function generationSuggestions(s:LabState,now=new Date()):GenerationTarget[]{
 const rows=s.attempts.map(a=>effectiveAttempt(s,a)),items:GenerationTarget[]=[];
 for(const concept of sampleBook.concepts){
  const recent=rows.filter(a=>a.conceptId===concept.id&&s.cards[a.cardId]?.status==='ready'&&now.getTime()>=new Date(a.at).getTime()&&now.getTime()-new Date(a.at).getTime()<=30*86400000).sort((a,b)=>a.at.localeCompare(b.at)),wrong=recent.filter(a=>!a.correct);
  if(!wrong.length)continue;
  const last=wrong.at(-1)!,parent=s.cards[last.cardId];let canonical=sampleBook.cards.find(c=>c.id===parent.id)??sampleBook.cards.find(c=>c.id===parent.parentId)??sampleBook.cards.find(c=>c.conceptId===concept.id&&c.type!=='audio');
  if(canonical?.type==='audio')canonical=sampleBook.cards.find(c=>c.conceptId===concept.id&&c.type!=='audio'&&!c.bundleId);
  if(!canonical)continue;
  const types:{strategy:GenerationStrategy;ability:Ability;type:CardType;reason:string}[]=[];
  if(wrong.length>=2)types.push({strategy:'reinforce',ability:canonical.ability,type:canonical.ability==='form'?'transform':'basic',reason:`최근 30일 ‘다시’ ${wrong.length}회 · 더 작은 단계로 확인`});
  if(last.reason==='confusion'||parent.type==='compare')types.push({strategy:'contrast',ability:concept.domain==='vocabulary'?'usage':'grammar',type:'compare',reason:'표현·개념을 혼동한 기록'});
  if(wrong.some(a=>a.ability==='form'))types.push({strategy:'form',ability:'form',type:'cloze',reason:recent.some(a=>a.correct&&a.ability==='meaning')?'뜻은 기억하지만 접속·활용에서 다시 평가':'접속·활용에서 다시 평가'});
  if(last.ability==='listening')types.push({strategy:'listening',ability:'listening',type:'audio',reason:'듣기 카드에서 다시 평가'});
  if(recent.some(a=>a.correct&&a.mode==='choice')&&wrong.some(a=>a.mode!=='choice'))types.push({strategy:'recall',ability:canonical.ability,type:'basic',reason:'선택형과 직접 회상 결과가 다름'});
  types.push({strategy:'transfer',ability:concept.domain==='vocabulary'?'context':'grammar',type:concept.domain==='vocabulary'?'cloze':'apply',reason:recent.some(a=>a.correct&&!a.novel)&&wrong.some(a=>a.novel)?'기존 문제는 기억하지만 새 상황에서 다시 평가':`${concept.label} · 다른 맥락에서 한 번 더 확인`});
  for(const type of types){
   const id=`${concept.id}:${type.strategy}:${last.id}`,prior=(s.generatedDrafts??[]).find(d=>d.target.id===id);
   const previousAt=(s.generatedDrafts??[]).filter(d=>d.target.conceptId===concept.id).map(d=>d.at).sort().at(-1);
   const cooldown=previousAt&&now.getTime()-new Date(previousAt).getTime()<s.settings.variantCooldownDays*86400000;
   const blocked=type.type==='audio'?'새 음성 생성은 아직 지원하지 않아요':parent.quality.reviewer==='user-confirmed'?'직접 수정한 카드는 원문 검토가 필요해요':prior?'이 오답에 대한 문제를 이미 만들었어요':cooldown?'이 개념의 생성 간격이 아직 지나지 않았어요':undefined;
   items.push({id,parentId:canonical.id,conceptId:concept.id,conceptLabel:concept.label,...type,title:labels[type.strategy],wrongCount:wrong.length,evidenceIds:wrong.slice(-5).map(a=>a.id),blocked});
  }
 }
 return items;
}
export function prepareGenerationPlan(s:LabState,ids:string[],now=new Date()):GenerationTarget[]{
 if(!ids.length)throw new Error('만들 문제를 먼저 체크해 주세요.');
 if(new Set(ids).size!==ids.length)throw new Error('같은 항목을 중복 선택할 수 없어요.');
 if(ids.length>Math.max(0,s.settings.dailyVariants-generationCountToday(s,now)))throw new Error('오늘 생성 가능한 개수를 넘었어요.');
 const suggestions=generationSuggestions(s,now),targets=ids.map(id=>suggestions.find(t=>t.id===id));
 if(targets.some(t=>!t||t.blocked))throw new Error('선택한 항목의 오답 기록·생성 간격·지원 상태를 다시 확인해 주세요.');
 return targets as GenerationTarget[];
}
export function recordGenerationRun(s:LabState,run:GenerationRun):LabState{
 const existing=(s.generationRuns??[]).find(r=>r.id===run.id);
 return {...s,generationRuns:existing?(s.generationRuns??[]).map(r=>r.id===run.id?run:r):[...(s.generationRuns??[]),run]};
}
export function stageGeneratedCard(s:LabState,target:GenerationTarget,card:LabCard,id:string,now=new Date()):LabState{
 if((s.generatedDrafts??[]).some(d=>d.id===id))return s;
 if(!card.novel||card.origin!=='ai'||card.status!=='ready'||card.parentId!==target.parentId||card.conceptId!==target.conceptId||card.type!==target.type||card.ability!==target.ability||validateCard(card,{...sampleBook,cards:Object.values(s.cards)}).length)throw new Error('선택한 목표와 맞지 않거나 검증되지 않은 문제예요. 학습에는 추가하지 않았어요.');
 if([...Object.values(s.cards),...(s.generatedDrafts??[]).map(d=>d.card)].some(c=>normalizeAnswer(c.prompt)===normalizeAnswer(card.prompt)))throw new Error('이미 있는 문제와 중복돼요.');
 return {...s,generatedDrafts:[...(s.generatedDrafts??[]),{id,target,card,at:now.toISOString(),status:'ready'}]};
}
export function acceptGeneratedDraft(s:LabState,id:string,now=new Date()):LabState{
 const draft=(s.generatedDrafts??[]).find(d=>d.id===id);if(draft?.status==='added')return s;
 if(!draft||draft.status!=='ready')throw new Error('추가할 생성 결과가 없어요.');
 if(!draft.reviewedAt)throw new Error('문제와 정답을 먼저 검토해 주세요.');
 const card=draft.card;if(validateCard(card,{...sampleBook,cards:Object.values(s.cards)}).length)throw new Error('카드 검증에 실패했어요.');
 if(Object.values(s.cards).some(c=>c.id!==card.id&&normalizeAnswer(c.prompt)===normalizeAnswer(card.prompt)))throw new Error('이미 학습 중인 문제와 중복돼요.');
 return {...s,cards:{...s.cards,[card.id]:{...card,createdAt:now.toISOString()}},generatedDrafts:(s.generatedDrafts??[]).map(d=>d.id===id?{...d,status:'added'}:d)};
}
export function reviewGeneratedDraft(s:LabState,id:string,now=new Date()):LabState{
 return {...s,generatedDrafts:(s.generatedDrafts??[]).map(d=>d.id===id&&d.status==='ready'?{...d,reviewedAt:now.toISOString()}:d)};
}
export function discardGeneratedDraft(s:LabState,id:string):LabState{
 const draft=(s.generatedDrafts??[]).find(d=>d.id===id);if(!draft||draft.status!=='ready')return s;
 return {...s,generatedDrafts:(s.generatedDrafts??[]).map(d=>d.id===id?{...d,status:'discarded'}:d)};
}
function windowStats(rows:Attempt[]){return {total:rows.length,days:new Set(rows.map(a=>routineDay(new Date(a.at)))).size,cards:new Set(rows.map(a=>a.cardId)).size,correct:rows.filter(a=>a.correct).length,again:rows.filter(a=>!a.correct).length,unassisted:rows.filter(a=>a.correct&&!a.hint).length,novelFirst:{total:rows.filter(a=>a.novel&&a.firstSeen).length,correct:rows.filter(a=>a.novel&&a.firstSeen&&a.correct).length}};}
export function conceptTrends(s:LabState,now=new Date()){
 const key=routineDay(now),[y,m,d]=key.split('-').map(Number),end=new Date(y,m-1,d+1,4).getTime(),start=end-7*86400000,prior=start-7*86400000;
 const events=s.attempts.map(a=>effectiveAttempt(s,a));
 return sampleBook.concepts.map(c=>{
  const rows=events.filter(a=>a.conceptId===c.id),currentRows=rows.filter(a=>+new Date(a.at)>=start&&+new Date(a.at)<end),priorRows=rows.filter(a=>+new Date(a.at)>=prior&&+new Date(a.at)<start);
  const current=windowStats(currentRows),previous=windowStats(priorRows),change=current.total&&previous.total?Math.round(100*current.correct/current.total-100*previous.correct/previous.total):null;
  const status=current.total<3||previous.total<3?'insufficient':change!>=15?'improved':change!<=-15?'declined':'stable';
  const abilities=Object.fromEntries([...new Set(rows.map(a=>a.ability))].map(ability=>[ability,{label:abilityLabels[ability],current:windowStats(currentRows.filter(a=>a.ability===ability)),previous:windowStats(priorRows.filter(a=>a.ability===ability))}]));
  return {...c,current,previous,change,status,abilities};
 });
}
