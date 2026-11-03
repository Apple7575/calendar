import React, { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Word } from '../../lib/routineModel';
import { useTheme } from '../../theme/ThemeContext';
import { Copy, Icon } from './ui';
import { useStudyAudio } from './StudyAudio';
import { StudyCardMenu } from './StudyCardMenu';
import {StudyCardSurface} from './StudyCardSurface';

export function StudyCard({word,revealed,onReveal,fill=false,paused=false}:{word:Word;revealed:boolean;onReveal:()=>void;fill?:boolean;paused?:boolean}) {
  const {colors:c}=useTheme(),{height}=useWindowDimensions();const compact=height<760;
  const [extra,setExtra]=useState(false);
  const [details,setDetails]=useState(false),[hint,setHint]=useState(false);
  const audio=useStudyAudio(word.fields,word.kind==='sentence'?'sentence':'word',revealed&&!paused);
  const audioButton=(kind:'word'|'sentence')=>{
    const source=kind==='word'?audio.wordSource:audio.sentenceSource;
    if(!revealed||source===null)return null;
    const active=audio.playing===kind||audio.loading===kind;
    return <Pressable accessibilityRole="button" accessibilityLabel={kind==='word'?'단어 듣기':'예문 듣기'} accessibilityState={{selected:active}}
      onPress={e=>{e.stopPropagation();if(active)audio.stop();else void audio.play(kind)}}
      style={({pressed})=>({width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:pressed?c.primarySoft:'transparent'})}>
      <Icon name={active?'pause-outline':'volume-medium-outline'} color={c.primary} size={22}/>
    </Pressable>;
  };
  return <StudyCardSurface fill={fill} revealed={revealed} onReveal={onReveal} canReveal={!details} overlay={<StudyCardMenu word={word} visible={details} onClose={()=>setDetails(false)} auto={audio.auto} sentenceAuto={audio.sentenceAuto} toggleAuto={audio.toggleAuto} toggleSentenceAuto={audio.toggleSentenceAuto} rates={audio.rates} setRate={audio.setRate}/>}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:24}}>
      <Copy muted size={12}>{word.kind==='sentence'?'문장':'단어'} · {word.card.reps===0?'새 카드':'복습 카드'}{word.favorite?' · ★':''}{word.issue?' · 확인 필요':''}</Copy>
      <Pressable accessibilityRole="button" accessibilityLabel="학습 카드 옵션" onPress={e=>{e.stopPropagation();setDetails(true)}} style={{width:44,height:44,justifyContent:'center',alignItems:'center'}}><Icon name="ellipsis-horizontal" size={20}/></Pressable>
    </View>
    <Pressable testID="study-word-anchor" accessible={revealed} accessibilityRole={revealed?"button":undefined} accessibilityLabel={revealed?"단어 영역 듣기":undefined} onPress={e=>{e.stopPropagation();if(revealed)void audio.play(word.kind==='sentence'?'sentence':'word');else if(!details)onReveal();}} style={{alignItems:'center',paddingHorizontal:word.kind==='sentence'?0:38,minHeight:word.kind==='sentence'?82:compact?84:94,justifyContent:'flex-start'}}>
      <Text testID="study-word-title" style={{color:c.text,fontSize:word.kind==='sentence'?24:compact?40:44,lineHeight:word.kind==='sentence'?35:compact?60:66,fontWeight:'700',textAlign:'center'}}>{word.front}</Text>
      <View style={{height:24,justifyContent:'center'}}>{revealed&&word.kind!=='sentence'&&word.fields?.Word_Reading?<Text style={{color:c.textMuted,fontSize:16,lineHeight:24}}>{word.fields.Word_Reading}</Text>:null}</View>
      {word.kind!=='sentence'?<View style={{position:'absolute',right:0,top:compact?8:11}}>{audioButton('word')}</View>:null}
    </Pressable>
    {revealed?<View style={{borderTopWidth:1,borderColor:c.border,paddingTop:12,gap:12}}>
      <Text style={{color:c.text,fontSize:22,lineHeight:30,fontWeight:'700',textAlign:'center'}}>{word.back}</Text>
      {word.fields?.Sentence&&word.kind!=='sentence'?<Pressable testID="study-example-surface" accessibilityRole="button" accessibilityLabel="예문 영역 듣기" onPress={e=>{e.stopPropagation();void audio.play('sentence')}} style={{backgroundColor:c.inputBg,borderRadius:16,padding:14,gap:5}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',height:30}}><Copy muted size={11}>예문</Copy>{audioButton('sentence')}</View>
        <Text testID="study-sentence" style={{color:c.text,fontSize:compact?18:19,lineHeight:compact?26:28,fontWeight:'500'}}>{word.fields.Sentence}</Text>
        <Text testID="study-sentence-meaning" style={{color:c.textMuted,fontSize:14,lineHeight:21}}>{word.fields.Sentence_Meaning}</Text>
      </Pressable>:word.kind==='sentence'?<View style={{alignItems:'center'}}>{audioButton('sentence')}</View>:null}
      {word.fields?.Sentence_Reading||word.fields?.Grammar_Note||word.fields?.Hint?<Pressable accessibilityRole="button" accessibilityLabel="읽기·학습 메모" onPress={e=>{e.stopPropagation();setExtra(!extra)}} style={{minHeight:44,justifyContent:'center'}}><Copy muted size={12}>{extra?'학습 메모 접기':'읽기·학습 메모'}</Copy></Pressable>:null}
      {extra?<View style={{gap:6}}>{word.fields?.Sentence_Reading?<Copy muted size={13}>{word.fields.Sentence_Reading}</Copy>:null}{word.fields?.Grammar_Note?<Copy muted size={13}>{word.fields.Grammar_Note}</Copy>:null}{word.fields?.Hint?<Copy muted size={13}>{word.fields.Hint}</Copy>:null}</View>:null}
      {audio.sourceLoading?<Copy muted size={12}>음성을 준비하고 있어요…</Copy>:null}
      {audio.error?<View><Copy muted size={12}>{audio.error}</Copy><Pressable accessibilityRole="button" accessibilityLabel="음성 다시 준비" onPress={e=>{e.stopPropagation();audio.retrySources()}} style={{minHeight:44,justifyContent:'center'}}><Copy muted size={12}>다시 받기</Copy></Pressable></View>:null}
    </View>:<View style={{alignItems:'center',gap:8,paddingTop:12}}>
      {word.fields?.Hint?hint?<Copy muted size={13}>{word.fields.Hint}</Copy>:<Pressable accessibilityRole="button" accessibilityLabel="힌트 보기" onPress={e=>{e.stopPropagation();setHint(true)}} style={{minHeight:44,justifyContent:'center'}}><Copy muted size={13}>힌트 보기</Copy></Pressable>:null}
    </View>}
  </StudyCardSurface>;
}
