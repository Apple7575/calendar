import React,{useEffect,useRef,useState} from 'react';
import {Grade,Rating} from 'ts-fsrs';
import {finishAndAdvanceLab,flipLab,SelfAssessment} from '../../lib/conceptLab';
import {labIntervalLabel} from '../../lib/conceptLabPresentation';
import {sampleBook} from '../../lib/conceptLabContent';
import {abilityLabels,errorCauses,ErrorCause,LabState} from '../../lib/conceptLabTypes';
import {Action,CardView,Copy,Link,Page} from '../routine/ui';
import {StudyRatingBar} from '../routine/StudyRatingBar';
import {ConceptLabCard} from './ConceptLabCard';

type Props={data:LabState;busy:boolean;error:string|null;update:(fn:(s:LabState)=>LabState)=>Promise<void>;onDone:()=>void};
export function ConceptLabSession({data,busy,error,update,onDone}:Props){
 const session=data.session!,index=session.answers.length,card=data.cards[session.ids[Math.min(index,session.ids.length-1)]];
 const [hint,setHint]=useState(false),[evaluations,setEvaluations]=useState<Record<string,SelfAssessment>>({});
 const started=useRef(Date.now()),saving=useRef(false);
 useEffect(()=>{setHint(false);started.current=Date.now();},[index]);
 const bundle=sampleBook.bundles.find(b=>b.id===card.bundleId),single=session.ids.length===1;
 function save(values:Record<string,SelfAssessment>){
  if(saving.current||busy)return;saving.current=true;let complete=false;
  void update(s=>{const next=finishAndAdvanceLab(s,session.ids.map(id=>values[id]),new Date(),session.id);complete=!!next.session?.finished;return next;})
   .then(()=>{if(complete)onDone();}).catch(()=>{}).finally(()=>{saving.current=false;});
 }
 function evaluate(id:string,grade:Grade){
  const next={...evaluations,[id]:{grade,correct:grade!==Rating.Again}};setEvaluations(next);
  if(single)save(next);
 }
 function flip(){if(saving.current||busy)return;saving.current=true;void update(s=>s.session?.id===session.id?flipLab(s,Date.now()-started.current,hint):s).catch(()=>{}).finally(()=>{saving.current=false;});}
 const flipLabel=!single&&index<session.ids.length-1?'떠올렸어요 · 다음 질문':!single?'묶음 정답 보기':'정답 보기';
 const grading=(id:string)=> <StudyRatingBar revealed={session.revealed} busy={busy} onReveal={flip} onAnswer={grade=>evaluate(id,grade)} revealLabel={flipLabel} interval={grade=>labIntervalLabel(data,id,grade,session.answers.find(a=>a.cardId===id)?.hint??hint)}/>;
 const footer=!session.revealed||single?grading(card.id):<Action label="평가 저장 · 다음 카드" disabled={busy||session.ids.some(id=>!evaluations[id])} onPress={()=>save(evaluations)}/>;
 function reasons(id:string){return evaluations[id]?.correct===false?<><Copy muted size={13}>막힌 이유 (선택)</Copy>{Object.entries(errorCauses).filter(([value])=>value!=='custom').map(([value,label])=><Link key={value} disabled={busy} label={`${evaluations[id].reason===value?'✓ ':''}${label}`} onPress={()=>setEvaluations(old=>({...old,[id]:{...old[id],reason:value as ErrorCause}}))}/>)}</>:null;}
 return <Page key={`${session.id}-${Math.min(index,session.ids.length-1)}`} title="오늘의 학습" right={<Link label="중단" onPress={onDone}/>} footer={footer} floatingFooter fillContent={single}>
  <Copy muted size={12}>개념서 N3 · 별도 실험 단어장 · {single?abilityLabels[card.ability]:`문제 묶음 ${Math.min(index+1,session.ids.length)}/${session.ids.length}`}</Copy>
  {error?<Copy>{error}</Copy>:null}
  {!session.revealed?<>
   {bundle?.kind==='reading'?<CardView><Copy size={18}>{bundle.text}</Copy></CardView>:null}
   <ConceptLabCard key={`${card.id}-front`} card={card} revealed={false} fill={single} hint={hint} onHint={()=>setHint(true)} onReveal={flip} busy={busy}/>
   {!single?<Copy muted size={12}>각 질문을 떠올린 뒤 묶음 전체의 정답·해설을 함께 확인해요.</Copy>:null}
  </>:<>{bundle?.kind==='reading'&&bundle.text?<CardView><Copy muted size={12}>지문 · 답의 근거 다시 확인</Copy><Copy size={18}>{bundle.text}</Copy></CardView>:null}{bundle?.kind==='listening'&&bundle.transcript?<CardView><Copy muted size={12}>{bundle.origin==='textbook'?'교재 기반 대본 · 음성은 AI 합성':'AI 연습 대본 · 묶음 응답 후 공개'}</Copy><Copy size={17}>{bundle.transcript}</Copy></CardView>:null}{session.answers.map(answer=>{const item=data.cards[answer.cardId];return <ConceptLabCard key={`${item.id}-back`} card={item} answer={answer} revealed fill={single} hint={answer.hint} onHint={()=>{}} onReveal={()=>{}} busy={busy}>
   {!single?<>{grading(item.id)}{evaluations[item.id]?<Copy muted size={12}>평가: {({[Rating.Again]:'다시',[Rating.Hard]:'어려움',[Rating.Good]:'좋음',[Rating.Easy]:'쉬움'})[evaluations[item.id].grade]}</Copy>:null}</>:null}
   {reasons(item.id)}
  </ConceptLabCard>;})}</>}
 </Page>;
}
