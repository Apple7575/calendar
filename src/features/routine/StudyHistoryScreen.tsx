import React,{useState} from 'react';
import { Pressable,View } from 'react-native';
import { State } from 'ts-fsrs';
import { addDays } from '../../lib/dateUtils';
import { completedStudyIds,getDay,pendingWords,planStudy } from '../../lib/routineModel';
import { reviewEvents } from '../../lib/studyHistory';
import { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { useRoutine } from './RoutineProvider';
import { CardView,Copy,Link,Page,u } from './ui';
const grades:Record<number,string>={1:'다시',2:'어려움',3:'좋음',4:'쉬움'};
const phases={new:'새 카드',learning:'학습 중',review:'복습',relearning:'재학습'};
const date=(s:string)=>new Date(s).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
export function StudyHistoryScreen({route,navigation}:RootScreenProps<'StudyHistory'>){
 const {data,dayKey}=useRoutine(),{colors:c}=useTheme();const [range,setRange]=useState<7|30>(7),[limit,setLimit]=useState(30),[deckId,setDeckId]=useState(route.params?.deckId);
 const wordId=route.params?.wordId,word=data.words.find(w=>w.id===wordId),events=reviewEvents(data,{deckId,wordId,includeVoided:true});
 const selected=new Set(data.words.filter(w=>(!deckId||w.deckId===deckId)&&(!wordId||w.id===wordId)).map(w=>w.id));
 const first=addDays(dayKey,1-range),active=events.filter(e=>!e.voidedAt&&e.day>=first&&e.day<=dayKey);
 const days=Array.from({length:range},(_,i)=>{const key=addDays(first,i),d=getDay(data,key),done=completedStudyIds(d).filter(id=>selected.has(id)).length;return {key,done};});
 const totalDone=days.reduce((n,d)=>n+d.done,0),maximum=Math.max(1,...days.map(d=>d.done));
 const pending=pendingWords(planStudy(data,dayKey),dayKey,'full',deckId).filter(w=>!wordId||w.id===wordId),remainingNew=pending.filter(w=>w.card.state===State.New).length,remainingReview=pending.filter(w=>w.card.state===State.Review).length;
 const legacy=!deckId&&!wordId?Object.entries(data.days).filter(([k])=>k>=first&&k<=dayKey).reduce((n,[,d])=>n+d.responses,0):null;
 return <Page title={word?'카드별 복습 이력':'학습 기록'} right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  {word?<CardView><Copy size={27} weight="800">{word.front}</Copy><Copy>{word.back}</Copy><Copy muted>다음 복습 {date(word.card.due)} · 누적 응답 {word.card.reps}회</Copy></CardView>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{[{id:undefined,name:'전체 덱'},...data.decks].map(d=><Pressable accessibilityRole="button" accessibilityLabel={`${d.name} 기록`} key={d.id??'all'} onPress={()=>{setDeckId(d.id);setLimit(30)}} style={{padding:12,borderRadius:16,backgroundColor:deckId===d.id?c.primarySoft:c.card}}><Copy size={13}>{d.name}</Copy></Pressable>)}</View>}
  <View style={u.row}>{([7,30]as const).map(value=><Pressable key={value} accessibilityRole="button" onPress={()=>setRange(value)} style={{padding:10,borderRadius:14,backgroundColor:range===value?c.primarySoft:c.card}}><Copy>최근 {value}일</Copy></Pressable>)}</View>
  <CardView><Copy muted>다음 학습일로 넘어간 카드</Copy><Copy size={40} weight="800">{totalDone}장 완료</Copy><View style={{flexDirection:'row',alignItems:'flex-end',height:100,gap:range===7?9:3}}>{days.map(d=><View key={d.key} accessibilityLabel={`${d.key} ${d.done}장 완료`} style={{flex:1,gap:5,alignItems:'center'}}>{range===7?<Copy size={10} muted>{d.done}</Copy>:null}<View style={{width:'80%',height:Math.max(3,d.done/maximum*65),borderRadius:4,backgroundColor:d.key===dayKey?c.primary:c.primarySoft}}/>{range===7?<Copy size={10} muted>{Number(d.key.slice(-2))}일</Copy>:null}</View>)}</View><Copy muted size={12}>같은 날 반복한 응답은 완료 수를 늘리지 않아요.</Copy></CardView>
  <CardView><Copy weight="700">오늘 남은 학습</Copy><Copy>새 카드 {remainingNew} · 복습 {remainingReview} · 학습·재학습 {pending.length-remainingNew-remainingReview}</Copy></CardView>
  {!word?<Link label="앞으로의 복습 예정 보기" onPress={()=>navigation.navigate('StudyForecast',{deckId})}/>:null}
  <CardView><Copy weight="700">응답과 완료를 따로 봐요</Copy><Copy>응답 {legacy??active.length}회 · 완료 {totalDone}장</Copy>{(Object.keys(phases)as (keyof typeof phases)[]).map(phase=><View key={phase} style={u.between}><Copy muted size={13}>{phases[phase]} 응답</Copy><Copy>{active.filter(e=>e.phase===phase).length}회</Copy></View>)}<Copy muted size={12}>등급·카드별 이력은 이 기능을 적용한 뒤의 응답부터 기록해요. 이전 일별 합계는 보존돼요. 취소한 응답은 통계에서 제외해요.</Copy></CardView>
  <Copy size={19} weight="700">{word?'이 카드의 채점 기록':'최근 채점 기록'}</Copy>
  {events.length?events.slice().reverse().slice(0,limit).map(e=><CardView key={e.id} style={{padding:16,gap:6}}><View style={u.between}><Copy weight="700">{data.words.find(w=>w.id===e.wordId)?.front??'보관된 카드'}</Copy><Copy muted size={12}>{grades[e.grade]}{e.voidedAt?' · 취소됨':''}</Copy></View><Copy muted size={12}>{date(e.at)} · {phases[e.phase]} · {Math.round(e.seconds)}초</Copy><Copy size={13}>다음 복습 {date(e.after.due)}{e.completed?' · 오늘 학습 완료':''}</Copy>{!word?<Link label="이 카드의 이력" onPress={()=>navigation.push('StudyHistory',{wordId:e.wordId,deckId:e.deckId})}/>:null}</CardView>):<Copy muted>새로 학습하면 채점 이력이 여기에 쌓여요.</Copy>}
  {events.length>limit?<Link label="30개 더 보기" onPress={()=>setLimit(n=>n+30)}/>:null}
 </Page>;
}
