import React,{useState} from 'react';
import * as Clipboard from 'expo-clipboard';
import {studyIssueText} from '../../lib/studyIssueExport';
import { View } from 'react-native';
import { STUDY_ISSUES } from '../../lib/routineModel';
import { RootScreenProps } from '../../navigation/types';
import { useRoutine } from './RoutineProvider';
import { StudyCard } from './StudyCard';
import { Action,CardView,Copy,Link,Page } from './ui';

export function SavedStudyScreen({navigation}:RootScreenProps<'SavedStudy'>){
  const {data}=useRoutine();
  const [filter,setFilter]=useState<'favorite'|'issue'>('favorite'),[opened,setOpened]=useState<string|null>(null),[revealed,setRevealed]=useState(false);
  const words=data.words.filter(w=>filter==='favorite'?w.favorite:!!w.issue);
  const [copied,setCopied]=useState('');
  const copy=async(selected=words)=>{try{const text=studyIssueText(selected,data.decks);if(!text)return;await Clipboard.setStringAsync(text);setCopied(`${selected.filter(w=>w.issue).length}건을 복사했어요. 카카오톡이나 ChatGPT에 붙여넣어 주세요.`);}catch{setCopied('복사하지 못했어요. 다시 시도해 주세요.');}};
  return <Page title="모아둔 단어" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
    <View style={{flexDirection:'row',gap:8}}>{(['favorite','issue']as const).map(value=><View key={value} style={{flex:1}}><Action compact secondary={filter!==value} label={`${value==='favorite'?'즐겨찾기':'확인 필요'} ${data.words.filter(w=>value==='favorite'?w.favorite:!!w.issue).length}`} onPress={()=>{setFilter(value);setOpened(null);setRevealed(false)}}/></View>)}</View>
    <Copy muted size={13}>이 기기에 저장한 표시예요. 학습 일정에는 영향을 주지 않아요.</Copy>
    {filter==='issue'&&words.length?<Action secondary label={`신고 전체 복사 · ${words.length}건`} onPress={()=>void copy()}/>:null}
    {copied?<Copy size={13}>{copied}</Copy>:null}
    {words.length?words.map(word=>opened===word.id?<View key={word.id} style={{gap:4}}>
      <StudyCard key={word.id} word={word} revealed={revealed} onReveal={()=>setRevealed(true)}/><Link label="카드 접기" onPress={()=>{setOpened(null);setRevealed(false)}}/>
      {word.issue?<Link label="이 신고 복사" onPress={()=>void copy([word])}/>:null}
    </View>:<CardView key={word.id} style={{padding:18,gap:8}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Copy size={23} weight="700">{word.front}</Copy><Copy muted size={12}>{word.favorite?'★':''}{word.active===false?' · 비활성 카드':''}</Copy></View>
      <Copy>{word.back}</Copy>
      {word.issue?<Copy muted size={13}>{word.issue.categories.map(value=>STUDY_ISSUES[value]).join(' · ')}{word.issue.note?` — ${word.issue.note}`:''}</Copy>:null}
      {word.issue?<Link label={`${word.front} 신고 복사`} onPress={()=>void copy([word])}/>:null}
      <Link label="카드 확인·표시 수정" onPress={()=>{setOpened(word.id);setRevealed(false)}}/>
    </CardView>):<CardView><Copy muted>{filter==='favorite'?'아직 저장한 단어가 없어요.':'확인할 단어가 없어요.'} 카드의 … 메뉴에서 표시해 보세요.</Copy></CardView>}
  </Page>;
}
