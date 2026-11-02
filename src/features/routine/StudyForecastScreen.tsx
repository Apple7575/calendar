import React,{useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,View} from 'react-native';
import {State} from 'ts-fsrs';
import {RootScreenProps} from '../../navigation/types';
import {studyForecast} from '../../lib/studyForecast';
import {addDays} from '../../lib/dateUtils';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {CardView,Copy,Icon,Link,Page,u} from './ui';
import {Segments} from './experience';
export function StudyForecastScreen({navigation,route}:RootScreenProps<'StudyForecast'>){
 const {data,dayKey}=useRoutine(),{colors:c}=useTheme(),[span,setSpan]=useState<7|30|90>(30),[deckId,setDeckId]=useState(route.params?.deckId),[selected,setSelected]=useState(dayKey),[limit,setLimit]=useState(20),[showDay,setShowDay]=useState(false);
 const forecast=useMemo(()=>studyForecast(data,dayKey,span,deckId),[data,dayKey,span,deckId]);
 const chosen=forecast.days.find(d=>d.key===selected)??forecast.days[0],maximum=Math.max(1,...forecast.days.map(d=>d.total));
 const label=(key:string)=>key===dayKey?'오늘':key===addDays(dayKey,1)?'내일':key===addDays(dayKey,2)?'모레':`${Number(key.slice(5,7))}월 ${Number(key.slice(8))}일`;
 return <Page title="복습 예정" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{[{id:undefined,name:'전체 덱'},...data.decks.filter(d=>d.active)].map(d=><Pressable key={d.id??'all'} accessibilityRole="button" accessibilityLabel={`${d.name} 복습 예정`} accessibilityState={{selected:deckId===d.id}} onPress={()=>{setDeckId(d.id);setLimit(20)}} style={{padding:11,borderRadius:14,backgroundColor:deckId===d.id?c.primarySoft:c.card}}><Copy size={13}>{d.name}</Copy></Pressable>)}</View>
  <Segments value={String(span)} onChange={value=>{setSpan(Number(value) as 7|30|90);setSelected(dayKey);setLimit(20)}} items={[{id:'7',label:'7일'},{id:'30',label:'30일'},{id:'90',label:'90일'}]}/>
  <CardView><Copy muted>오늘 복습할 카드</Copy><Copy size={38} weight="800">{forecast.days[0].total}장</Copy><Copy size={13}>내일 {forecast.days[1]?.total??0}장 · {span}일간 현재 예정 {forecast.total}장</Copy>{forecast.days[0].overdue>0?<Copy muted size={12}>오늘 분량에 밀린 카드 {forecast.days[0].overdue}장이 포함돼요.</Copy>:null}<Copy muted size={12}>새벽 4시 기준 · 현재 다음 복습일을 보여줘요. 채점하면 날짜와 분량이 달라질 수 있어요.</Copy></CardView>
  <Copy size={19} weight="800">날짜별 예정</Copy>
  <View style={{gap:2}}>{forecast.days.map(day=><Pressable key={day.key} accessibilityRole="button" accessibilityLabel={`${day.key} ${label(day.key)} 복습 ${day.total}장`} accessibilityState={{selected:chosen.key===day.key}} onPress={()=>{setSelected(day.key);setLimit(20);setShowDay(true)}} style={{padding:12,borderRadius:16,gap:7,backgroundColor:chosen.key===day.key?c.primarySoft:c.card}}><View style={u.between}><View style={{flex:1}}><Copy weight="700">{label(day.key)}</Copy><Copy size={11} muted>{day.key}</Copy></View><Copy weight="800">{day.total}장</Copy><Icon name="chevron-forward" size={15}/></View><View style={{height:5,borderRadius:3,backgroundColor:c.border,overflow:'hidden'}}><View style={{height:5,width:`${day.total/maximum*100}%`,backgroundColor:c.primary,borderRadius:3}}/></View></Pressable>)}</View>
  <Modal visible={showDay} transparent animationType="slide" onRequestClose={()=>setShowDay(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.35)'}}><View style={{maxHeight:'85%',backgroundColor:c.card,borderTopLeftRadius:28,borderTopRightRadius:28,padding:18,gap:10}}><View style={u.between}><Copy size={20} weight="800">예정 카드</Copy><Link label="예정 카드 닫기" onPress={()=>setShowDay(false)}/></View><ScrollView><CardView><Copy weight="800">{label(chosen.key)} 예정 카드 · {chosen.total}장</Copy><Copy muted size={12}>복습 {chosen.review} · 학습 중 {chosen.learning} · 재학습 {chosen.relearning}</Copy>{chosen.words.slice(0,limit).map(word=><Pressable key={word.id} accessibilityRole="button" accessibilityLabel={`${word.front} 복습 이력`} onPress={()=>{setShowDay(false);navigation.navigate('StudyHistory',{wordId:word.id,deckId:word.deckId})}} style={[u.between,{paddingVertical:9,gap:10}]}><View style={{flex:1}}><Copy weight="700">{word.front}</Copy><Copy muted size={12} numberOfLines={2}>{word.back}</Copy></View><Copy muted size={11}>{word.card.state===State.Review?'복습':word.card.state===State.Relearning?'재학습':'학습 중'}</Copy></Pressable>)}{!chosen.total?<Copy muted>현재 예정된 카드가 없어요.</Copy>:null}{chosen.total>limit?<Link label="20장 더 보기" onPress={()=>setLimit(n=>n+20)}/>:null}</CardView></ScrollView></View></View></Modal>
  <Copy muted size={12}>아직 시작하지 않은 새 카드 {forecast.fresh}장은 예정 수에 넣지 않았어요.{forecast.buried?` 오늘 숨긴 ${forecast.buried}장은 내일부터 반영해요.`:''}{forecast.later?` 조회 기간 이후 ${forecast.later}장이 더 예정돼 있어요.`:''} 신고·보류 카드와 비활성 덱은 제외해요.</Copy>
 </Page>;
}
