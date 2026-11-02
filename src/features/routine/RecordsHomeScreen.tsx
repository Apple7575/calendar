import {PriorityHistoryCard} from './PriorityHistoryCard';
﻿import React,{useCallback,useRef,useState} from 'react';
import {Image,Pressable,View} from 'react-native';
import {useFocusEffect,useNavigation,useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {todayKey} from '../../lib/dateUtils';
import {DiarySummary,listDiarySummaries} from '../../lib/diary';
import {useRoutine} from './RoutineProvider';
import {HandwritingLog} from './HandwritingLog';
import {Action,CardView,Copy,Link,Page,u} from './ui';
import {Segments,SettingsButton,MenuRow} from './experience';
import {RoutineCalendarScreen,RoutineHistoryScreen} from './RecordScreens';

function DiaryShelf(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),[rows,setRows]=useState<DiarySummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[more,setMore]=useState(false),[moreBusy,setMoreBusy]=useState(false),generation=useRef(0);
 useFocusEffect(useCallback(()=>{const current=++generation.current;setLoading(true);setMoreBusy(false);listDiarySummaries().then(result=>{if(current===generation.current){setRows(result);setMore(result.length===24);setError('')}}).catch(()=>{if(current===generation.current)setError('일기를 불러오지 못했어요. 계정 연결 후 다시 시도해 주세요.')}).finally(()=>{if(current===generation.current)setLoading(false)});return()=>{generation.current++};},[attempt]));
 const loadMore=async()=>{if(moreBusy||!rows.length)return;const current=generation.current;setMoreBusy(true);try{const result=await listDiarySummaries(24,rows[rows.length-1].date);if(current===generation.current){setRows(previous=>[...previous,...result.filter(row=>!previous.some(old=>old.id===row.id))]);setMore(result.length===24);setError('')}}catch{if(current===generation.current)setError('이전 일기를 불러오지 못했어요. 다시 시도해 주세요.')}finally{if(current===generation.current)setMoreBusy(false)}};
 return <View style={{gap:16}}><Action label="오늘 일기 남기기" onPress={()=>nav.navigate('DiaryEdit',{date:todayKey()})}/>{error?<CardView><Copy muted>{error}</Copy><Link label="다시 불러오기" onPress={()=>setAttempt(n=>n+1)}/><Link label="계정 연결 확인" onPress={()=>nav.navigate('SettingsHub')}/></CardView>:null}{loading?<Copy muted>일기를 펼치고 있어요…</Copy>:!rows.length&&!error?<CardView><Copy size={20} weight="800">오늘은 어떤 순간이 남았나요?</Copy><Copy muted>한 줄, 한 장의 사진부터 친구들과 함께 모아요.</Copy></CardView>:null}{rows.map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.date} 일기`} onPress={()=>nav.navigate('DiaryDetail',{date:row.date})}><CardView style={{padding:0,overflow:'hidden'}}>{row.photoUrl?<Image source={{uri:row.photoUrl}} style={{width:'100%',height:170}} resizeMode="cover"/>:null}<View style={{padding:20,gap:7}}><View style={u.between}><Copy muted size={12}>{row.date}</Copy><Copy>{row.mood??''}</Copy></View><Copy size={19} weight="800">{row.highlight||'나의 하루 한 페이지'}</Copy><Copy muted size={13}>{row.content.slice(0,140)||'사진과 마음을 남긴 날'}</Copy></View></CardView></Pressable>)}{more?<Action secondary label={moreBusy?'불러오는 중…':'더 오래된 일기 보기'} disabled={moreBusy||loading} onPress={()=>void loadMore()}/>:null}</View>;
}
export function RecordsHomeScreen(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),route=useRoute(),{data}=useRoutine();
 const params=route.params as {section?:'calendar'|'diary'|'stats'}|undefined,[section,setSection]=useState<'calendar'|'diary'|'stats'>(params?.section??'calendar');
 React.useEffect(()=>{if(params?.section)setSection(params.section)},[params?.section]);
 const [stats,setStats]=useState<'all'|'words'|'book'>('all'),sessions=(data.bookSessions??[]).filter(s=>s.savedAt);
 return <Page title="우리의 기록" right={<SettingsButton/>}><Segments value={section} onChange={setSection} items={[{id:'calendar',label:'달력'},{id:'diary',label:'일기'},{id:'stats',label:'통계'}]}/>
 {section==='calendar'?<RoutineCalendarScreen embedded/>:section==='diary'?<DiaryShelf/>:<View style={{gap:18}}><Segments value={stats} onChange={setStats} items={[{id:'all',label:'전체 실천'},{id:'words',label:'단어'},{id:'book',label:'집중'}]}/>{stats==='all'?<><PriorityHistoryCard/><RoutineHistoryScreen embedded/></>:stats==='words'?<CardView><Copy size={23} weight="800">실제 기억의 발자국</Copy><Copy>누적 응답 {data.reviewHistory?.filter(e=>!e.voidedAt).length??0}회</Copy><MenuRow title="덱·카드별 학습 통계" subtitle="응답 · 완료 · 복습 · 취소 이력" onPress={()=>nav.navigate('StudyHistory')}/><Copy muted size={12}>세부 응답 이력 기능 추가 이전의 과거 일별 기록도 전체 실천에서 확인할 수 있어요.</Copy></CardView>:<><HandwritingLog/><CardView><Copy size={24} weight="800">집중 {Math.round(sessions.reduce((sum,s)=>sum+s.seconds,0)/60)}분</Copy><Copy muted>한 줄 기록을 남긴 {sessions.length}세트</Copy></CardView>{[...sessions].reverse().slice(0,30).map(s=><CardView key={s.id}><Copy weight="700">{s.subject} · {Math.round(s.seconds/60)}분</Copy><Copy muted size={12}>{new Date(s.completedAt).toLocaleString('ko-KR')}</Copy><Copy>{s.note}</Copy>{s.next?<Copy muted size={12}>다음: {s.next}</Copy>:null}</CardView>)}</>}</View>}
 </Page>;
}

