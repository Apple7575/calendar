import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {canStudyWord,getDay,planStudy,studyDeckProgress} from '../../lib/routineModel';
import {wordRewardBudget} from '../../lib/studyRewards';
import {State} from 'ts-fsrs';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Icon,Link,Page,Progress,u} from './ui';
import {BoriScene,MenuRow,Segments,SettingsButton} from './experience';
import {FocusStart} from './FocusStart';
export function StudyHomeScreen(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{colors:c}=useTheme(),{data,ready,error,dayKey}=useRoutine();
 const [section,setSection]=useState<'word'|'focus'>('word'),[selected,setSelected]=useState<string|undefined>();
 const planned=planStudy(data,dayKey),day=getDay(planned,dayKey),decks=data.decks.filter(d=>d.active||day.plan?.ids.some(id=>data.words.some(w=>w.id===id&&w.deckId===d.id)));
 const deckId=decks.some(d=>d.id===selected)?selected:undefined,progress=studyDeckProgress(planned,dayKey,deckId),started=!!getDay(data,dayKey).plan;
 const budget=wordRewardBudget(data,dayKey),pending=data.words.filter(w=>canStudyWord(w,dayKey)&&day.plan?.ids.includes(w.id)&&!day.complete.includes(w.id)&&(!deckId||w.deckId===deckId));
 const fresh=pending.filter(w=>w.card.state===State.New).length,learning=pending.filter(w=>w.card.state===State.Learning||w.card.state===State.Relearning).length,review=pending.length-fresh-learning;
 const label=deckId?decks.find(d=>d.id===deckId)!.name:decks.length===1?decks[0].name:'전체 단어장';
 return <Page title="기억이 자라는 시간" right={<SettingsButton/>}>
  <Segments value={section} onChange={setSection} items={[{id:'word',label:'단어'},{id:'focus',label:'집중'}]}/>
  {section==='focus'?<FocusStart/>:<>
   {decks.length>1?<View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{[{id:undefined,name:'전체 덱'},...decks].map(deck=><Pressable key={deck.id??'all'} accessibilityRole="button" accessibilityLabel={`${deck.name} 선택`} accessibilityState={{selected:deckId===deck.id}} onPress={()=>setSelected(deck.id)} style={{padding:10,borderRadius:15,borderWidth:1,borderColor:deckId===deck.id?c.primary:c.border,backgroundColor:deckId===deck.id?c.primarySoft:c.card}}><Copy size={12}>{deck.name}</Copy></Pressable>)}</View>:null}
   {!data.words.length?<BoriScene tone="focus" title="첫 단어를 심어볼까요?" description="컴퓨터에서 준비한 단어장을 같은 계정으로 받아요."><Action label="첫 단어장 준비하기" onPress={()=>nav.navigate('StudySettings')}/></BoriScene>:<>
    <BoriScene tone="focus" size={100} mood={progress.full?'celebrate':'focus'} title={progress.full?'오늘의 기억을 잘 가꿨어요!':progress.total?`${progress.remaining}장, 차근차근 만나봐요`:'오늘 예정된 학습이 없어요'} description={label}/>
    <View style={{gap:15,paddingHorizontal:4}}><View style={{flexDirection:'row',alignItems:'baseline',gap:7}}><Text style={{fontSize:46,fontWeight:'800',color:c.text}}>{progress.done}</Text><Copy muted size={21}>/ {progress.total}장 완료</Copy></View><Progress value={progress.total?progress.done/progress.total:0} label="오늘 학습 진행률"/><View style={u.between}><Copy muted size={12}>남은 새 카드 {fresh} · 복습 {review} · 재학습 {learning}</Copy><Copy size={12}>{day.paid.words>=20?'기본 보상 완료':'전체 +20분'}</Copy></View>
    <Action disabled={!ready} label={progress.full?'추가 학습하기':progress.total?started?'이어서 학습하기':'오늘 학습 시작':'더 공부하기'} onPress={()=>nav.navigate('RoutineStudySession',{level:'full',deckId})}/>
    {!deckId&&progress.minimum>0&&day.paid.words===0?<Link label={`오늘은 복습 ${progress.minimum}장만 · +5분`} onPress={()=>nav.navigate('RoutineStudySession',{level:'min'})}/>:null}
    {decks.length>1?<Copy muted size={12}>{deckId?'선택한 덱의 카드만 나와요.':'활성 덱을 함께 공부해요.'} 기본 보상은 오늘 전체 목표를 기준으로 해요.</Copy>:null}
    {!progress.total?<Copy muted size={12}>0장 목표에는 기본 보상을 새로 지급하지 않아요. 원하면 추가 학습을 시작할 수 있어요.</Copy>:null}</View>
   </>}
   <Copy muted size={12}>오늘 단어 보상 {budget.earned}/{budget.cap}분 · 한도 이후에도 학습은 계속할 수 있어요.</Copy>{error?<Copy muted>{error}</Copy>:null}
   <View style={{paddingHorizontal:4}}><MenuRow title="모아둔 단어" subtitle={`즐겨찾기 ${data.words.filter(w=>w.favorite).length} · 확인 필요 ${data.words.filter(w=>w.issue).length}`} icon="star-outline" onPress={()=>nav.navigate('SavedStudy')}/><MenuRow title="내 단어장" subtitle={`${data.decks.length}개 단어장 · 카드 관리·컴퓨터에서 받기`} icon="albums-outline" onPress={()=>nav.navigate('StudySettings')}/><MenuRow title="학습 통계" subtitle="완료와 응답, 복습의 발자국" icon="stats-chart-outline" onPress={()=>nav.navigate('StudyHistory')}/></View>
  </>}
 </Page>;
}

