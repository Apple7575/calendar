import React,{useState} from 'react';
import {Pressable,Text,useWindowDimensions,View} from 'react-native';
import {sampleBook} from '../../lib/conceptLabContent';
import {labCardFace} from '../../lib/conceptLabPresentation';
import {briefCardExample} from '../../lib/conceptLabBriefExamples';
import {DraftAnswer,LabCard,typeLabels} from '../../lib/conceptLabTypes';
import {useTheme} from '../../theme/ThemeContext';
import {Copy,Icon,Link} from '../routine/ui';
import {StudyCardSurface} from '../routine/StudyCardSurface';
import {ConceptAudio} from './ConceptAudio';
import {normalizeAnswer} from '../../lib/conceptLab';

export function ConceptLabCard({card,revealed,fill=false,hint,onHint,onReveal,busy,answer,children}:{card:LabCard;revealed:boolean;fill?:boolean;hint:boolean;onHint:()=>void;onReveal:()=>void;busy:boolean;answer?:DraftAnswer;children?:React.ReactNode}){
 const {colors:c}=useTheme(),{height}=useWindowDimensions(),compact=height<760,face=labCardFace(card),[details,setDetails]=useState(false);
 const sources=sampleBook.extractions.filter(e=>card.evidenceIds.includes(e.id));
 const brief=briefCardExample(card),cue=brief?.cue??card.cue;
 const inset=face.large?0:30;
 const instructionLine=(line:string)=>line.includes('→')?!/[ぁ-ゖァ-ヺ一-龯]/.test(line.split('→').slice(1).join('→')):!/[ぁ-ゖァ-ヺ一-龯]/.test(line)&&/보통체|정중체/.test(line);
 const choiceValue=(text:string)=>normalizeAnswer(text.replace(/^\s*(?:[a-dA-D1-4][.．:：)）]\s*|[a-dA-D1-4]\s+|[①②③④]\s*)/u,''));
 const separateChoices=card.choices?.length&&!card.choices.every(choice=>normalizeAnswer(face.front).includes(choiceValue(choice)));
 function blankMarked(line:string){return line.split(/([（(]\s*[）)]|_{2,}|＿+)/g).map((part,index)=>/^(?:[（(]\s*[）)]|_{2,}|＿+)$/.test(part)?<Text key={index} accessible accessibilityLabel="빈칸: 여기에 들어갈 표현을 떠올려 보세요" testID="concept-answer-blank" style={{color:c.primary,backgroundColor:c.primarySoft}}>{'（'}<Icon name="create-outline" size={20} color={c.primary}/>{' ____ ）'}</Text>:part);}
 return <StudyCardSurface animate={!revealed} fill={fill} revealed={revealed} onReveal={onReveal} canReveal={!busy}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:24}}><Copy muted size={12}>{typeLabels[card.type]} · {card.novel?'새 적용 문제':'기본 문제'}</Copy><Copy muted size={12}>{card.origin==='textbook'?'교재 기반':'AI 작성'}</Copy></View>
  <Copy muted size={12} style={{textAlign:face.large?'center':'left',paddingLeft:inset}}>{face.label}</Copy>
  {cue?<View accessible accessibilityLabel={`${cue.kind==='seen'?'직접 본 정보':'들은 정보'}: ${cue.text}`} style={{flexDirection:'row',alignItems:'flex-start',gap:8,paddingVertical:8}}><View style={{width:22,paddingTop:2}}><Icon name={cue.kind==='seen'?'eye-outline':'chatbubble-outline'} size={22} color={c.textMuted}/></View><Copy size={17} weight="600" style={{flex:1}}>{cue.text}</Copy></View>:null}
  <View style={{alignItems:face.large?'center':'stretch',paddingLeft:inset,minHeight:face.large?compact?84:94:82,justifyContent:'flex-start'}}>
   {face.large?<Text testID="study-word-title" style={{color:c.text,fontSize:compact?40:44,lineHeight:compact?60:66,fontWeight:'700',textAlign:'center'}}>{face.front}</Text>:<View testID="study-word-title" style={{gap:8}}>{face.front.split('\n').map((line,index)=><Text key={index} testID={`concept-prompt-line-${index}`} style={{color:c.text,fontSize:instructionLine(line)?18:24,lineHeight:instructionLine(line)?28:35,fontWeight:instructionLine(line)?'500':'700',textAlign:'left'}}>{blankMarked(line)}</Text>)}</View>}
   {face.large?<View style={{minHeight:24,justifyContent:'center'}}>{revealed&&face.reading?<Text style={{color:c.textMuted,fontSize:16,lineHeight:24}}>{face.reading}</Text>:null}</View>:null}
  </View>
  {!revealed&&separateChoices?<View style={{paddingLeft:inset,gap:5}}><Copy muted size={12}>보기</Copy>{card.choices!.map((choice,index)=><Copy key={index} size={16}>{/^(?:\s*[a-dA-D1-4](?:[.．:：)）]|\s)|[①②③④])/.test(choice)?choice:`${index+1}. ${choice}`}</Copy>)}</View>:null}
  {card.type==='audio'&&(card.audioNoteId||card.audioAssetId)?<Pressable accessible={false} onPress={event=>event.stopPropagation()}>{card.audioAssetId?<Copy muted size={12}>AI 합성 음성 · 저장된 파일 재사용</Copy>:null}<ConceptAudio key={card.id} noteId={card.audioNoteId} assetId={card.audioAssetId} kind={card.audioKind}/></Pressable>:null}
  {revealed?<View style={{borderTopWidth:1,borderColor:c.border,paddingTop:12,gap:12}}>
   <Text style={{color:c.text,fontSize:22,lineHeight:30,fontWeight:'700',textAlign:face.large?'center':'left',paddingLeft:inset}}>{face.back}</Text>
   <View style={{backgroundColor:c.inputBg,borderRadius:16,marginLeft:face.large?0:16,padding:14,gap:5}}><Copy muted size={11}>핵심</Copy><Copy>{brief?.note??card.explanation}</Copy></View>
   {answer?.text?<Copy muted size={12}>이전에 입력한 응답: {answer.text}</Copy>:null}
   <Link label={details?'채점 기준·근거 접기':'채점 기준·교재 근거'} disabled={busy} onPress={()=>setDetails(!details)}/>
   {details?<>{brief?<><Copy muted size={12}>자세한 해설</Copy><Copy size={13}>{card.explanation}</Copy></>:null}<Copy muted size={13}>채점 기준: {card.rubric}</Copy>{card.accepted.length?<Copy muted size={12}>인정할 수 있는 답: {card.accepted.join(' / ')}</Copy>:null}<Copy muted size={12}>근거: {sources.map(e=>`PDF ${e.source.pdfPage} · 인쇄 ${e.source.printedPage??'미확인'}쪽`).join(', ')}</Copy></>:null}
   {children}
  </View>:<View style={{alignItems:'center',gap:8,paddingTop:12}}>
   {hint?<Copy muted size={13}>{card.hint}</Copy>:<Pressable accessibilityRole="button" accessibilityLabel="힌트 보기" disabled={busy} onPress={event=>{event.stopPropagation();onHint();}} style={{minHeight:44,justifyContent:'center'}}><Copy muted size={13}>힌트 보기</Copy></Pressable>}
  </View>}
 </StudyCardSurface>;
}
