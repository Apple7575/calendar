import {createEmptyCard,Grade,Rating} from 'ts-fsrs';
import {decodeCard,scheduler} from './routineModel';
import {sampleBook} from './conceptLabContent';
import {abilityLabels,LabCard,LabState} from './conceptLabTypes';
import {briefCardExample} from './conceptLabBriefExamples';

export function labCardFace(card:LabCard){
 const brief=briefCardExample(card);
 const source=sampleBook.extractions.find(e=>card.evidenceIds.includes(e.id)&&e.kind==='vocabulary');
 const basic=source&&card.origin==='textbook'&&card.quality.reviewer!=='user-confirmed';
 if(basic&&card.type==='basic'&&(card.ability==='reading'||card.ability==='meaning'))return {
  front:source.text,large:true,label:brief?.label??(card.ability==='reading'?'읽기를 떠올려 보세요':'뜻을 떠올려 보세요'),
  reading:card.ability==='reading'?card.answer:source.reading,back:card.ability==='reading'?(source.meaning??''):card.answer,
 };
 if(basic&&card.type==='reverse')return {front:source.meaning??card.prompt,large:true,label:'일본어를 떠올려 보세요',reading:undefined,back:card.answer};
 return {front:brief?.front??card.prompt.replace(/。(?=[^\n])/g,'。\n'),large:false,label:brief?.label??abilityLabels[card.ability],reading:undefined,back:brief?.back??card.answer};
}
/** Lists and history use the same wording as the study face, including its context. */
export function labCardSummary(card:LabCard){const brief=briefCardExample(card);return [brief?.cue?.text??card.cue?.text,labCardFace(card).front].filter(Boolean).join('\n');}
export function labIntervalLabel(s:LabState,id:string,grade:Grade,hint:boolean,now=new Date()){
 const stored=s.schedules[id],effective=hint&&grade!==Rating.Again?Rating.Hard:grade;
 const due=scheduler.next(stored?decodeCard(stored):createEmptyCard(now),now,effective).card.due;
 const minutes=Math.max(1,Math.ceil((due.getTime()-now.getTime())/60000));
 return minutes<60?`${minutes}분 후`:minutes<1440?`${Math.round(minutes/60)}시간 후`:`${Math.round(minutes/1440)}일 후`;
}
