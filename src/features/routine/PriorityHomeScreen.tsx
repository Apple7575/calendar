import React,{useEffect,useRef} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {useNavigation,useIsFocused} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {getDay,morningSteps,studyProgress} from '../../lib/routineModel';
import {eveningSteps} from '../../lib/dailyPlan';
import {routineStreak} from '../../lib/routineActivity';
import {priorityPlan} from '../../lib/priorityPlan';
import {timeWallet} from '../../lib/timeWallet';
import {moneySummary} from '../../lib/moneyRewards';
import {addDays,formatTime,todayKey} from '../../lib/dateUtils';
import {eventsOnDate,mergeEvents} from '../../lib/eventMerge';
import {useDayData} from '../../hooks/useDayData';
import {useGoogleEvents} from '../../hooks/useGoogleEvents';
import {useRoutine} from './RoutineProvider';
import {Icon,Page} from './ui';
import {SettingsButton} from './experience';
import {PriorityMissionCard} from './PriorityMissionCard';
import {RewardUseToggle} from './RewardUseToggle';
import {usePriorityVisuals} from './PriorityUI';

export function PriorityHomeScreen(){
 const {data,dayKey,ready,error,native}=useRoutine(),p=usePriorityVisuals(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const scroll=useRef<ScrollView>(null),focused=useIsFocused(),stamp=priorityPlan(data,dayKey)?.updatedAt,lastStamp=useRef<string|undefined>(undefined),wasFocused=useRef(false);
 useEffect(()=>{if(focused&&!wasFocused.current&&stamp!==lastStamp.current)scroll.current?.scrollTo({y:0,animated:false});if(focused)lastStamp.current=stamp;wasFocused.current=focused},[focused,stamp]);
 const day=getDay(data,dayKey),words=studyProgress(day),streak=routineStreak(data,dayKey),tomorrow=addDays(dayKey,1),prepared=!!priorityPlan(data,tomorrow);
 const civil=todayKey(),schedule=useDayData(civil),google=useGoogleEvents(civil.slice(0,7)),events=eventsOnDate(mergeEvents(schedule.localEvents,google.events),civil);
 const date=new Date(dayKey+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
 const morning=day.paid.morning>0,evening=eveningSteps(data,dayKey),eveningDone=evening.length>0&&evening.every((_,i)=>day.evening?.[i]);
 const entries=[
  {name:'아침 루틴',icon:'sunny-outline' as const,status:morning?'완료':day.morning.some(Boolean)?`${day.morning.filter(Boolean).length}/${morningSteps(data,dayKey).length} · 이어하기`:'작게 시작해도 좋아요',onPress:()=>nav.navigate('GuidedRoutine',{slot:'morning'})},
  {name:'단어 학습',icon:'layers-outline' as const,status:words.total?`${words.done}/${words.total}장 · ${words.full?'더 공부하기':'학습하기'}`:'단어장과 복습',onPress:()=>nav.navigate('Main',{screen:'Study'})},
  {name:'운동',icon:'barbell-outline' as const,status:day.paid.gym?'완료':'헬스장 또는 집에서',onPress:()=>nav.navigate('RoutineWorkout')},
  {name:'저녁 루틴',icon:'moon-outline' as const,status:eveningDone?'완료':'오늘을 정리하는 시간',onPress:()=>nav.navigate('GuidedRoutine',{slot:'evening'})},
 ];
 return <Page title="오늘" showHeader={false} scrollRef={scroll}>
  <View testID="home-metrics" style={{flexDirection:'row',alignItems:'stretch',borderRadius:20,backgroundColor:p.paper,paddingVertical:7,borderWidth:1,borderColor:p.line}}>{[
   {label:'연속 실천',value:streak.current.toLocaleString('ko-KR'),unit:'일',icon:'flame' as const,color:'#DF7436',go:()=>nav.navigate('RoutineHistory')},
   {label:'지금 사용 가능',value:timeWallet(day,dayKey,native).available.toLocaleString('ko-KR'),unit:'분',icon:'timer-outline' as const,color:p.brandInk,go:()=>nav.navigate('TimeWallet')},
   {label:'가용 금액',value:moneySummary(data).available.toLocaleString('ko-KR'),unit:'원',icon:'cash-outline' as const,color:p.success,go:()=>nav.navigate('MoneyWallet')},
  ].map((metric,i)=><Pressable key={metric.label} accessibilityRole="button" accessibilityLabel={metric.label+' '+metric.value+metric.unit} onPress={metric.go} style={({pressed})=>({flex:1,minWidth:0,minHeight:48,justifyContent:'center',alignItems:'center',gap:5,paddingHorizontal:5,borderLeftWidth:i?1:0,borderColor:p.line,backgroundColor:pressed?p.brandSoft:'transparent'})}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,flexWrap:'wrap'}}><Icon name={metric.icon} size={20} color={metric.color}/><Text style={{fontSize:16,fontWeight:'800',color:p.ink,flexShrink:1,textAlign:'center'}}>{metric.value}<Text style={{fontSize:12,fontWeight:'600'}}> {metric.unit}</Text></Text></View><Text style={{fontSize:12,color:p.muted,textAlign:'center'}}>{metric.label}</Text></Pressable>)}</View>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4,marginTop:-6}}><Text style={{color:p.muted,fontSize:13}}>{date}</Text><View style={{flexDirection:'row',alignItems:'center',gap:10}}><Pressable accessibilityRole="button" accessibilityLabel={prepared?'내일 계획 확인':'내일 계획 준비'} onPress={()=>nav.navigate('PriorityPlan',{day:tomorrow})} style={{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:7}}><Icon name={prepared?'checkmark-circle':'calendar-outline'} size={15} color={prepared?p.success:p.brandInk}/><Text style={{color:prepared?p.success:p.brandInk,fontSize:12,fontWeight:'700'}}>{prepared?'내일 준비 완료':'내일 준비'}</Text></Pressable><SettingsButton/></View></View>
  <PriorityMissionCard/>
  <RewardUseToggle toolbar/>
  <View style={{gap:12,paddingTop:8}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:p.ink,fontSize:18,fontWeight:'800'}}>루틴과 학습</Text><Pressable accessibilityRole="button" accessibilityLabel="루틴 설정" onPress={()=>nav.navigate('RoutineSetup')} hitSlop={8}><Icon name="options-outline" color={p.muted} size={18}/></Pressable></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{entries.map(e=><Pressable key={e.name} accessibilityRole="button" accessibilityLabel={`${e.name} 시작·이어하기`} disabled={!ready} onPress={e.onPress} style={({pressed})=>({flexBasis:'47%',flexGrow:1,minHeight:109,padding:16,borderRadius:20,backgroundColor:pressed?p.brandSoft:p.paper,gap:8})}><Icon name={e.icon} size={22} color={p.brandInk}/><Text style={{color:p.ink,fontWeight:'800',fontSize:15}}>{e.name}</Text><Text style={{color:p.muted,fontSize:11}}>{e.status}</Text></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityLabel="손글씨 공부로 시간 모으기" onPress={()=>nav.navigate('BookStudy')} style={{flexDirection:'row',gap:10,alignItems:'center',padding:15,borderRadius:18,backgroundColor:p.paper}}><Icon name="book-outline" size={19} color={p.brandInk}/><Text style={{flex:1,color:p.ink,fontSize:13,fontWeight:'700'}}>원하는 공부 더 하기</Text><Icon name="arrow-forward" size={17} color={p.muted}/></Pressable></View>
  <View style={{gap:10,paddingTop:7}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:18,fontWeight:'800',color:p.ink}}>오늘 일정</Text><Pressable accessibilityRole="button" accessibilityLabel="달력 보기" onPress={()=>nav.navigate('Main',{screen:'Records',params:{section:'calendar'}})}><Text style={{color:p.muted,fontSize:12}}>전체 보기 →</Text></Pressable></View>{events.length?events.slice(0,2).map(e=><Pressable key={e.id} accessibilityRole="button" accessibilityLabel={e.title} onPress={()=>nav.navigate('DayDetail',{date:civil})} style={{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:12}}><View style={{width:3,height:29,borderRadius:2,backgroundColor:p.brand}}/><Text style={{fontSize:12,color:p.muted,minWidth:40}}>{e.allDay?'종일':formatTime(e.startAt)}</Text><Text numberOfLines={2} style={{color:p.ink,fontSize:14,flex:1}}>{e.title}</Text></Pressable>):<Text style={{fontSize:13,color:p.muted,paddingVertical:10}}>{schedule.loading?'일정 확인 중…':'정해진 일정이 없어요.'}</Text>}<Pressable accessibilityRole="button" accessibilityLabel="일정 추가" onPress={()=>nav.navigate('EventEdit',{date:civil})} style={{alignSelf:'flex-start',paddingVertical:8}}><Text style={{color:p.brandInk,fontSize:13,fontWeight:'700'}}>+ 일정 추가</Text></Pressable>{google.error?<Pressable accessibilityRole="button" onPress={()=>nav.navigate('SettingsHub')}><Text style={{color:p.muted,fontSize:12}}>일정 연결 확인 →</Text></Pressable>:null}</View>
  <View style={{borderRadius:22,backgroundColor:p.paper,paddingHorizontal:17}}>{[
   {label:'함께 쌓은 기록',detail:streak.current+'일 이어왔어요',icon:'leaf-outline' as const,go:()=>nav.navigate('RoutineHistory')},
   {label:'실천 순서 보너스',detail:day.bonus?.order?'+60분 적립':day.orderProgress?.status==='outOfOrder'?'내 순서 확인':`${day.orderProgress?.step??0}/${day.orderProgress?.sequence.length??0} 완료`,icon:'trail-sign-outline' as const,go:()=>nav.navigate('HabitOrderSettings')},
   {label:'돈 보상 지갑',detail:data.money?moneySummary(data).available.toLocaleString('ko-KR')+'원':'금액 설정',icon:'wallet-outline' as const,go:()=>nav.navigate('MoneyWallet')},
  ].map((r,i)=><Pressable accessibilityRole="button" accessibilityLabel={r.label} key={r.label} onPress={r.go} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:62,borderTopWidth:i?1:0,borderColor:p.line}}><Icon name={r.icon} color={p.muted} size={19}/><Text style={{flex:1,fontSize:13,fontWeight:'700',color:p.ink}}>{r.label}</Text><Text style={{fontSize:11,color:p.muted}}>{r.detail}</Text><Icon name="chevron-forward" size={14} color={p.muted}/></Pressable>)}</View>
  {error?<Text style={{color:p.muted,fontSize:12,lineHeight:19}}>{error}</Text>:null}
 </Page>;
}
