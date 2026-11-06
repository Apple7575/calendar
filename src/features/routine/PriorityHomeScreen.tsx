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
import {Icon,NavCard,Notice,Page,ProfileButton} from './ui';
import {control,radii,space,type} from '../../theme/tokens';
import {PriorityMissionCard} from './PriorityMissionCard';
import {RewardUseToggle} from './RewardUseToggle';
import {usePriorityVisuals} from './PriorityUI';
import {MotionEnter} from './motion';

export function PriorityHomeScreen(){
 const {data,dayKey,ready,error,native}=useRoutine(),p=usePriorityVisuals(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const scroll=useRef<ScrollView>(null),focused=useIsFocused(),stamp=priorityPlan(data,dayKey)?.updatedAt,lastStamp=useRef<string|undefined>(undefined),wasFocused=useRef(false);
 useEffect(()=>{if(focused&&!wasFocused.current&&stamp!==lastStamp.current)scroll.current?.scrollTo({y:0,animated:false});if(focused)lastStamp.current=stamp;wasFocused.current=focused},[focused,stamp]);
 const day=getDay(data,dayKey),words=studyProgress(day),streak=routineStreak(data,dayKey),tomorrow=addDays(dayKey,1),prepared=!!priorityPlan(data,tomorrow);
 const civil=todayKey(),schedule=useDayData(civil),google=useGoogleEvents(civil.slice(0,7)),events=eventsOnDate(mergeEvents(schedule.localEvents,google.events),civil);
 const date=new Date(dayKey+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'});
 const morning=day.paid.morning>0,evening=eveningSteps(data,dayKey),eveningDone=evening.length>0&&evening.every((_,i)=>day.evening?.[i]);
 const entries=[
  {name:'아침 루틴',icon:'sunny-outline' as const,done:morning,status:morning?'완료':day.morning.some(Boolean)?`${day.morning.filter(Boolean).length}/${morningSteps(data,dayKey).length} · 이어하기`:'작게 시작해도 좋아요',onPress:()=>nav.navigate('GuidedRoutine',{slot:'morning'})},
  {name:'단어 학습',icon:'layers-outline' as const,done:words.full,status:words.total?`${words.done}/${words.total}장 · ${words.full?'완료':'학습하기'}`:'단어장과 복습',onPress:()=>nav.navigate('Main',{screen:'Study'})},
  {name:'운동',icon:'barbell-outline' as const,done:day.paid.gym>0,status:day.paid.gym?'완료':'헬스장 또는 집에서',onPress:()=>nav.navigate('RoutineWorkout')},
  {name:'저녁 루틴',icon:'moon-outline' as const,done:eveningDone,status:eveningDone?'완료':'오늘을 정리하는 시간',onPress:()=>nav.navigate('GuidedRoutine',{slot:'evening'})},
 ];
 const finished=entries.filter(e=>e.done).length;
 return <Page title="오늘" showHeader={false} scrollRef={scroll}>
  <View testID="home-metrics" style={{flexDirection:'row',alignItems:'stretch',borderRadius:radii.card,backgroundColor:p.paper,paddingVertical:space.xs}}>{[
   {label:'연속 실천',value:streak.current.toLocaleString('ko-KR'),unit:'일',icon:'flame' as const,color:'#DF7436',go:()=>nav.navigate('RoutineHistory')},
   {label:'지금 사용 가능',value:timeWallet(day,dayKey,native).available.toLocaleString('ko-KR'),unit:'분',icon:'timer-outline' as const,color:p.brandInk,go:()=>nav.navigate('TimeWallet')},
   {label:'가용 금액',value:moneySummary(data).available.toLocaleString('ko-KR'),unit:'원',icon:'cash-outline' as const,color:p.success,go:()=>nav.navigate('MoneyWallet')},
  ].map((metric,i)=><Pressable key={metric.label} accessibilityRole="button" accessibilityLabel={metric.label+' '+metric.value+metric.unit} onPress={metric.go} style={({pressed})=>({flex:1,minWidth:0,minHeight:control.compact,justifyContent:'center',alignItems:'center',gap:space.xxs,paddingHorizontal:space.xxs,borderLeftWidth:i?1:0,borderColor:p.line,backgroundColor:pressed?p.brandSoft:'transparent'})}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,flexWrap:'wrap'}}><Icon name={metric.icon} size={20} color={metric.color}/><Text style={[type.section,{color:p.ink,flexShrink:1,textAlign:'center'}]}>{metric.value}<Text style={[type.caption,{fontWeight:'600'}]}> {metric.unit}</Text></Text></View></Pressable>)}</View>
  <RewardUseToggle toolbar/>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:space.xs}}><Text accessibilityRole="header" style={[type.section,{color:p.ink}]}>{date}</Text><View style={{flexDirection:'row',alignItems:'center',gap:space.xs}}><Pressable accessibilityRole="button" accessibilityLabel={prepared?'내일 계획 확인':'내일 계획 준비'} onPress={()=>nav.navigate('PriorityPlan',{day:tomorrow})} style={{flexDirection:'row',alignItems:'center',gap:space.xxs,minHeight:control.touch,paddingHorizontal:space.xxs}}><Icon name={prepared?'checkmark-circle':'calendar-outline'} size={16} color={prepared?p.success:p.brandInk}/><Text style={[type.caption,{color:prepared?p.success:p.brandInk,fontWeight:'700'}]}>{prepared?'내일 준비 완료':'내일 준비'}</Text></Pressable><ProfileButton/></View></View>
  <PriorityMissionCard fallback={(()=>{const next=entries.find(e=>!e.done);return next?{label:next.name+' 하기',onPress:next.onPress}:undefined})()}/>
  <View style={{gap:space.sm,paddingTop:space.xs}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:control.touch}}><View style={{flexDirection:'row',alignItems:'baseline',gap:space.xs}}><Text style={[type.section,{color:p.ink}]}>루틴과 학습</Text><Text testID="home-routine-count" style={[type.label,{color:finished?p.brandInk:p.muted}]}>{finished}/{entries.length}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="루틴 설정" onPress={()=>nav.navigate('RoutineSetup')} style={{width:control.touch,height:control.touch,alignItems:'flex-end',justifyContent:'center'}}><Icon name="options-outline" color={p.muted} size={20}/></Pressable></View><View accessibilityRole="progressbar" accessibilityLabel={`오늘 루틴과 학습 ${entries.length}개 중 ${finished}개 완료`} style={{flexDirection:'row',gap:space.xxs}}>{entries.map(e=><View key={e.name} style={{flex:1,height:6,borderRadius:3,backgroundColor:e.done?p.brand:p.line}}/>)}</View>{finished===entries.length?<Notice tone="success">오늘 루틴과 학습을 모두 해냈어요.</Notice>:null}<View style={{flexDirection:'row',flexWrap:'wrap',gap:space.sm}}>{entries.map(e=><Pressable key={e.name} accessibilityRole="button" accessibilityLabel={e.done?`${e.name} 완료 · 다시 보기`:`${e.name} 시작·이어하기`} disabled={!ready} onPress={e.onPress} style={({pressed})=>({flexBasis:'47%',flexGrow:1,minHeight:104,padding:space.md,borderRadius:radii.card,backgroundColor:e.done?p.brandSoft:pressed?p.brandSoft:p.paper,opacity:e.done&&pressed?.8:1,gap:space.xxs})}><MotionEnter key={String(e.done)} celebration={e.done}><Icon name={e.done?'checkmark-circle':e.icon} size={24} color={p.brandInk}/></MotionEnter><Text style={[type.label,{color:p.ink,paddingTop:space.xxs}]}>{e.name}</Text><Text style={[type.caption,{color:e.done?p.brandInk:p.muted,fontWeight:e.done?'700':'500'}]}>{e.status}</Text></Pressable>)}</View><NavCard title="원하는 공부 더 하기" accessibilityLabel="집중 공부로 시간 모으기" icon="book-outline" onPress={()=>nav.navigate('BookStudy')}/></View>
  <View style={{gap:space.xs,paddingTop:space.xs}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:control.touch}}><Text style={[type.section,{color:p.ink}]}>오늘 일정</Text><Pressable accessibilityRole="button" accessibilityLabel="달력 보기" onPress={()=>nav.navigate('Main',{screen:'Records',params:{section:'calendar'}})} style={{minHeight:control.touch,justifyContent:'center'}}><Text style={[type.caption,{color:p.brandInk,fontWeight:'700'}]}>전체 보기</Text></Pressable></View>{events.length?events.slice(0,2).map(e=><Pressable key={e.id} accessibilityRole="button" accessibilityLabel={e.title} onPress={()=>nav.navigate('DayDetail',{date:civil})} style={{flexDirection:'row',gap:space.sm,alignItems:'center',minHeight:control.compact,paddingVertical:space.xs}}><View style={{width:3,height:29,borderRadius:2,backgroundColor:p.brand}}/><Text style={[type.caption,{color:p.muted,minWidth:40}]}>{e.allDay?'종일':formatTime(e.startAt)}</Text><Text numberOfLines={2} style={[type.body,{color:p.ink,flex:1}]}>{e.title}</Text></Pressable>):<Text style={[type.body,{color:p.muted}]}>{schedule.loading?'일정 확인 중…':'정해진 일정이 없어요.'}</Text>}<Pressable accessibilityRole="button" accessibilityLabel="일정 추가" onPress={()=>nav.navigate('EventEdit',{date:civil})} style={{alignSelf:'flex-start',minHeight:control.touch,justifyContent:'center'}}><Text style={[type.label,{color:p.brandInk}]}>+ 일정 추가</Text></Pressable>{google.error?<Notice tone="warning" actionLabel="일정 연결 확인" onAction={()=>nav.navigate('SettingsHub')}>캘린더 일정을 불러오지 못했어요.</Notice>:null}</View>
  <View style={{borderRadius:radii.card,backgroundColor:p.paper,paddingHorizontal:space.md}}>{[
   {label:'함께 쌓은 기록',detail:streak.current+'일 이어왔어요',icon:'leaf-outline' as const,go:()=>nav.navigate('RoutineHistory')},
   {label:'실천 순서 보너스',detail:day.bonus?.order?'+60분 적립':day.orderProgress?.status==='outOfOrder'?'내 순서 확인':`${day.orderProgress?.step??0}/${day.orderProgress?.sequence.length??0} 완료`,icon:'trail-sign-outline' as const,go:()=>nav.navigate('HabitOrderSettings')},
   {label:'돈 보상 지갑',detail:data.money?moneySummary(data).available.toLocaleString('ko-KR')+'원':'금액 설정',icon:'wallet-outline' as const,go:()=>nav.navigate('MoneyWallet')},
  ].map((r,i)=><Pressable accessibilityRole="button" accessibilityLabel={r.label} key={r.label} onPress={r.go} style={{flexDirection:'row',alignItems:'center',gap:space.sm,minHeight:control.large}}><Icon name={r.icon} color={p.muted} size={21}/><Text style={[type.label,{flex:1,color:p.ink}]}>{r.label}</Text><Text style={[type.caption,{color:p.muted}]}>{r.detail}</Text><Icon name="chevron-forward" size={18} color={p.muted}/></Pressable>)}</View>
  {error?<Notice tone="error">{error}</Notice>:null}
 </Page>;
}
