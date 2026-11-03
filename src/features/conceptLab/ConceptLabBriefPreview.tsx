import React,{useState} from 'react';
import {View} from 'react-native';
import {briefExampleIds} from '../../lib/conceptLabBriefExamples';
import {sampleBook} from '../../lib/conceptLabContent';
import {Action,Copy,Link,Page} from '../routine/ui';
import {StudyRatingBar} from '../routine/StudyRatingBar';
import {ConceptLabCard} from './ConceptLabCard';

export function ConceptLabBriefPreview({onClose}:{onClose:()=>void}){
 const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[hint,setHint]=useState(false);
 const card=sampleBook.cards.find(c=>c.id===briefExampleIds[index])!;
 function move(next:number){setIndex(next);setRevealed(false);setHint(false);}
 return <Page key={`${index}-${revealed}`} title="카드 유형 예시" right={<Link label="닫기" onPress={onClose}/>} fillContent floatingFooter footer={revealed?<View style={{gap:6}}><Action label={index===briefExampleIds.length-1?'예시 마치기':'다음 예시'} onPress={()=>index===briefExampleIds.length-1?onClose():move(index+1)}/>{index>0?<Link label="이전 예시" onPress={()=>move(index-1)}/>:null}</View>:<StudyRatingBar revealed={false} busy={false} onReveal={()=>setRevealed(true)} onAnswer={()=>{}} interval={()=>''}/>}>
  <Copy muted size={12}>{index+1}/{briefExampleIds.length} · 미리보기 · 학습 기록에 반영하지 않아요</Copy>
  <ConceptLabCard key={`${card.id}-${revealed}`} card={card} revealed={revealed} fill hint={hint} onHint={()=>setHint(true)} onReveal={()=>setRevealed(true)} busy={false}/>
 </Page>;
}
