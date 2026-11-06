import {DailyTimelineRow} from './DailyTimeline';
import React,{useCallback,useRef,useState} from 'react';
import {Image,Pressable,View} from 'react-native';
import {useFocusEffect,useNavigation,useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {todayKey} from '../../lib/dateUtils';
import {DiarySummary,listDiarySummaries} from '../../lib/diary';
import {useRoutine} from './RoutineProvider';
import {radii,space} from '../../theme/tokens';
import {Action,CardView,Copy,Link,Page,u} from './ui';
import {Segments,SettingsButton} from './experience';
import {RoutineCalendarScreen,RoutineHistoryScreen} from './RecordScreens';

/** reload가 바뀌면(당겨서 새로고침) 목록을 그대로 둔 채 다시 받고, 끝나면 onSettled를 부른다. */
function DiaryShelf({reload=0,onSettled}:{reload?:number;onSettled?:()=>void}){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),[rows,setRows]=useState<DiarySummary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[more,setMore]=useState(false),[moreBusy,setMoreBusy]=useState(false),generation=useRef(0),lastReload=useRef(reload);
 useFocusEffect(useCallback(()=>{const current=++generation.current,quiet=reload!==lastReload.current;lastReload.current=reload;if(!quiet)setLoading(true);setMoreBusy(false);listDiarySummaries().then(result=>{if(current===generation.current){setRows(result);setMore(result.length===24);setError('')}}).catch(()=>{if(current===generation.current)setError('일기를 불러오지 못했어요. 계정 연결 후 다시 시도해 주세요.')}).finally(()=>{if(current===generation.current){setLoading(false);onSettled?.()}});return()=>{generation.current++};},[attempt,reload]));
 const loadMore=async()=>{if(moreBusy||!rows.length)return;const current=generation.current;setMoreBusy(true);try{const result=await listDiarySummaries(24,rows[rows.length-1].date);if(current===generation.current){setRows(previous=>[...previous,...result.filter(row=>!previous.some(old=>old.id===row.id))]);setMore(result.length===24);setError('')}}catch{if(current===generation.current)setError('이전 일기를 불러오지 못했어요. 다시 시도해 주세요.')}finally{if(current===generation.current)setMoreBusy(false)}};
 return <View style={{gap:16}}><Action label="오늘 일기 남기기" onPress={()=>nav.navigate('DiaryEdit',{date:todayKey()})}/>{error?<CardView><Copy muted>{error}</Copy><Link label="다시 불러오기" onPress={()=>setAttempt(n=>n+1)}/><Link label="계정 연결 확인" onPress={()=>nav.navigate('SettingsHub')}/></CardView>:null}{loading?<Copy muted>일기를 펼치고 있어요…</Copy>:!rows.length&&!error?<CardView><Copy size={20} weight="800">오늘은 어떤 순간이 남았나요?</Copy><Copy muted>한 줄, 한 장의 사진부터 친구들과 함께 모아요.</Copy></CardView>:null}{rows.map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.date} 일기`} onPress={()=>nav.navigate('DiaryDetail',{date:row.date})}><CardView style={{flexDirection:'row',alignItems:'center',gap:space.sm,padding:space.sm}}>{row.photoUrl?<Image source={{uri:row.photoUrl}} style={{width:72,height:72,borderRadius:radii.chip}} resizeMode="cover"/>:null}<View style={{flex:1,minWidth:0,gap:space.xxs}}><View style={u.between}><Copy variant="caption" muted>{row.date}</Copy><Copy variant="caption">{row.mood??''}</Copy></View><Copy variant="label" numberOfLines={1}>{row.highlight||'나의 하루 한 페이지'}</Copy><Copy variant="caption" muted numberOfLines={2}>{row.content.slice(0,140)||'사진과 마음을 남긴 날'}</Copy></View></CardView></Pressable>)}{more?<Action secondary label={moreBusy?'불러오는 중…':'더 오래된 일기 보기'} disabled={moreBusy||loading} onPress={()=>void loadMore()}/>:null}</View>;
}
/** 통계 아래의 이동 칸. 긴 목록은 각자의 화면에 있다. */
function StatTile({title,detail,onPress}:{title:string;detail:string;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={title+', '+detail} onPress={onPress} style={({pressed})=>({flexGrow:1,flexBasis:'45%',opacity:pressed?.6:1})}><CardView style={{padding:space.sm,gap:space.xxs}}><Copy variant="label">{title}</Copy><Copy variant="caption" muted numberOfLines={1}>{detail}</Copy></CardView></Pressable>;
}
function StatsSection(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data}=useRoutine();
 const sessions=(data.bookSessions??[]).filter(s=>s.savedAt),writing=data.handwritingReceipts??[],priorityDays=Object.values(data.priorityDays??{});
 return <View style={{gap:space.sm}}><RoutineHistoryScreen embedded/>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:space.xs}}>
   {priorityDays.length?<StatTile title="중요한 일" detail={'손댄 날 '+priorityDays.filter(d=>d.tasks[0]?.completedAt).length+'일'} onPress={()=>nav.navigate('StudyLog',{tab:'priority'})}/>:null}
   <StatTile title="단어" detail={'누적 응답 '+(data.reviewHistory?.filter(e=>!e.voidedAt).length??0)+'회'} onPress={()=>nav.navigate('StudyHistory')}/>
   <StatTile title="집중" detail={Math.round(sessions.reduce((sum,s)=>sum+s.seconds,0)/60)+'분 · '+sessions.length+'세트'} onPress={()=>nav.navigate('StudyLog',{tab:'focus'})}/>
   <StatTile title="필기" detail={writing.reduce((n,r)=>n+r.units,0).toLocaleString()+'자 · '+writing.length+'장'} onPress={()=>nav.navigate('StudyLog',{tab:'writing'})}/>
  </View>
  <Copy variant="caption" muted>세부 응답 이력 기능 추가 이전의 과거 일별 기록도 위 통계에서 확인할 수 있어요.</Copy>
 </View>;
}
export function RecordsHomeScreen(){
 const route=useRoute();
 const params=route.params as {section?:'calendar'|'diary'|'stats'}|undefined,[section,setSection]=useState<'calendar'|'diary'|'stats'>(params?.section??'calendar');
 React.useEffect(()=>{if(params?.section)setSection(params.section)},[params?.section]);
 // 일기는 서버에서 받으므로 당겨서 새로고침을 둔다. 달력·통계는 기기 안 기록이라 두지 않는다.
 const [reload,setReload]=useState(0),[refreshing,setRefreshing]=useState(false);
 return <Page title="우리의 기록" right={<SettingsButton/>} onRefresh={section==='diary'?()=>{setRefreshing(true);setReload(n=>n+1)}:undefined} refreshing={refreshing}><Segments value={section} onChange={setSection} items={[{id:'calendar',label:'달력'},{id:'diary',label:'일기'},{id:'stats',label:'통계'}]}/>
 {section==='calendar'?<View style={{gap:space.xs}}><DailyTimelineRow/><RoutineCalendarScreen embedded/></View>:section==='diary'?<DiaryShelf reload={reload} onSettled={()=>setRefreshing(false)}/>:<StatsSection/>}
 </Page>;
}
