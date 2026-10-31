import {HabitOrderCard} from './HabitOrderCard';
import React from 'react';
import {FreeStudyCard} from './RewardSourcesCard';
import {Pressable,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {useDayData} from '../../hooks/useDayData';
import {useGoogleEvents} from '../../hooks/useGoogleEvents';
import {eventsOnDate,mergeEvents} from '../../lib/eventMerge';
import {addDays,formatTime,todayKey} from '../../lib/dateUtils';
import {getDay,morningSteps,studyProgress} from '../../lib/routineModel';
import {eveningSteps,isReturnDay} from '../../lib/dailyPlan';
import {isActivityComplete,routineActivities,routineStreak} from '../../lib/routineActivity';
import {timeWallet} from '../../lib/timeWallet';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Icon,Link,Page,u} from './ui';
import {BoriScene,SettingsButton} from './experience';
import {MotionEnter} from './motion';
import {RewardUseToggle} from './RewardUseToggle';

export function DashboardScreen(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{colors:c}=useTheme();
 const {data,ready,dayKey,native,now,error}=useRoutine(),day=getDay(data,dayKey),wallet=timeWallet(day,dayKey,native),streak=routineStreak(data,dayKey);
 const civil=todayKey(),schedule=useDayData(civil),google=useGoogleEvents(civil.slice(0,7));
 const events=eventsOnDate(mergeEvents(schedule.localEvents,google.events),civil),hour=now.getHours(),night=hour>=18||hour<4;
 const activities=routineActivities(data,dayKey),morning=day.paid.morning>0,evening=activities.find(a=>a.id==='evening')!,study=studyProgress(day);
 const nextMorning=morningSteps(data,dayKey).find((_,i)=>!day.morning[i]);
 const nextEvening=eveningSteps(data,dayKey).find((_,i)=>!day.evening?.[i]);
 const suggested=night&&!isActivityComplete(evening)?'evening':!morning?'morning':!study.full&&study.total>0?'words':'evening';
 const open=(id:string)=>id==='morning'||id==='evening'?nav.navigate('GuidedRoutine',{slot:id}):id==='words'?nav.navigate('Main',{screen:'Study'}):nav.navigate('RoutineWorkout');
 const title=isReturnDay(data,dayKey)&&!morning?'다시 만나서 반가워요.\n하나부터 시작해 볼까요?':night?isActivityComplete(evening)?'오늘도 함께해서 좋았어요.\n편안한 밤을 보내요.':`오늘의 나를 토닥여요.\n${nextEvening?.title??'저녁 루틴'}, 같이 할까요?`:!morning?day.morning.some(Boolean)?`여기까지 잘했어요!\n다음은 ${nextMorning?.title??'아침 준비'}예요.`:`좋은 아침이에요!\n${nextMorning?.title??'이불 정리'}부터 같이 해요.`:study.full?'오늘 약속을 하나씩\n해내고 있네요!':'하루를 시작했네요!\n오늘 공부도 준비됐어요.';
 const nodes=[{id:'morning',title:'아침 루틴',icon:'sunny-outline' as const,detail:'04:30 시작 · 07:00까지',reward:'전체 +10분 · 작게 +5분',progress:`${day.morning.filter(Boolean).length}/${morningSteps(data,dayKey).length}개`},{id:'words',title:'단어 학습',icon:'layers-outline' as const,detail:'내 기억에 맞춘 복습',reward:'전체 +20분 · 작게 +5분',progress:`${study.done}/${study.total}장`},{id:'gym',title:'운동',icon:'barbell-outline' as const,detail:'일정에 맞춰 독립적으로',reward:'헬스장 +30분 · 집 +10분',progress:'운동한 날 직접 체크'},{id:'evening',title:'저녁 루틴',icon:'moon-outline' as const,detail:'21:00부터 취침 준비',reward:'하루 정리 · 별도 시간 보상 없음',progress:`${day.evening?.filter(Boolean).length??0}/${eveningSteps(data,dayKey).length}개`}];
 return <Page title={night?'보리와 마무리':'보리와 오늘'} right={<SettingsButton/>}>
  <Pressable testID="time-wallet-summary" accessibilityRole="button" accessibilityLabel="사용 시간 상세" onPress={()=>nav.navigate('TimeWallet')} style={{padding:15,borderRadius:20,backgroundColor:c.primarySoft,flexDirection:'row',alignItems:'center',gap:12}}>
   <Icon name={wallet.available?'lock-open-outline':'shield-outline'} size={22}/><View style={{flex:1}}><Copy size={12}>{wallet.reason}</Copy><Copy weight="800">{wallet.available?`사용 가능 ${wallet.available}분`:`오늘 모은 시간 ${wallet.localEarned}분`}</Copy></View><Icon name="chevron-forward" size={18}/>
  </Pressable>
  <RewardUseToggle/>
  <BoriScene tone={night?'evening':'morning'} title={title} size={158} mood={night?'sleepy':morning?'proud':'cheer'} description={morning?'경로는 추천 순서예요. 하고 싶은 목표부터 골라도 좋아요.':'작은 목표도 충분해요. 아침을 마치면 모은 시간을 쓸 수 있어요.'}/>
  <HabitOrderCard/><FreeStudyCard/>{error?<Copy muted>{error}</Copy>:null}
  <View style={u.between}><Copy size={21} weight="800">오늘의 작은 발걸음</Copy><Copy muted size={12}>{activities.filter(isActivityComplete).length}개 실천</Copy></View>
  <View style={{paddingHorizontal:2}}>{nodes.map((node,index)=>{
   const activity=activities.find(a=>a.id===node.id)!,done=isActivityComplete(activity),active=suggested===node.id;
   return <MotionEnter key={node.id} delay={index*45}><View style={{flexDirection:'row',gap:14}}>
    <View style={{alignItems:'center',width:54}}><View style={{width:52,height:52,borderRadius:26,backgroundColor:done?c.primary:active?c.primarySoft:c.inputBg,borderWidth:active?2:1,borderColor:active?c.primary:c.border,alignItems:'center',justifyContent:'center'}}><Icon name={done?'checkmark':node.icon} color={done?c.white:c.primary} size={23}/></View>{index<nodes.length-1?<View style={{width:2,flex:1,minHeight:58,backgroundColor:c.border,marginVertical:6}}/>:null}</View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${node.title}${done?' 완료 기록':' 시작·이어하기'}`} disabled={!ready} onPress={()=>open(node.id)} style={{flex:1,marginBottom:16,padding:16,borderRadius:22,borderWidth:active?2:1,borderColor:active?c.primary:c.border,backgroundColor:active?c.primarySoft:c.card,gap:4}}>
     <View style={u.between}><Copy size={18} weight="800">{node.title}</Copy><Icon name={done?'checkmark-circle-outline':'arrow-forward-circle-outline'} size={23}/></View>
     <Copy muted size={12}>{node.detail}</Copy><Copy size={12}>{done?'실천 완료 · 기록 보기':activity.status==='progress'?`이어하기 · ${node.progress}`:node.id==='gym'?'선택 목표 · 예정 없는 날도 괜찮아요':active?'지금 추천해요 · 시작하기':`언제든 시작 · ${node.progress}`}</Copy><Copy muted size={11}>{node.reward}</Copy>
    </Pressable>
   </View></MotionEnter>;
  })}</View>
  <Pressable accessibilityRole="button" accessibilityLabel="루틴 스트릭 기록" onPress={()=>nav.navigate('RoutineHistory')} style={{borderRadius:24,padding:20,backgroundColor:c.primarySoft,gap:10}}><View style={u.between}><Copy weight="800">함께 쌓은 {streak.current}일의 발자국</Copy><Icon name="leaf-outline" size={23}/></View><View style={{flexDirection:'row',justifyContent:'space-between'}}>{Array.from({length:7},(_,i)=>addDays(dayKey,i-6)).map(key=><View key={key} style={{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:streak.completedDays.includes(key)?c.primary:c.card}}><Text style={{color:streak.completedDays.includes(key)?c.white:c.textMuted,fontSize:12}}>{streak.completedDays.includes(key)?'✓':Number(key.slice(-2))}</Text></View>)}</View><Copy size={12}>작게 마친 하루도 같은 발자국이에요.</Copy></Pressable>
  <View style={u.between}><Copy size={21} weight="800">오늘 일정</Copy><Link label="달력 보기" onPress={()=>nav.navigate('Main',{screen:'Records',params:{section:'calendar'}})}/></View>
  <View style={{padding:4,gap:14}}>{events.slice(0,3).map(event=><Pressable key={event.id} accessibilityRole="button" accessibilityLabel={event.title} onPress={()=>nav.navigate('DayDetail',{date:civil})} style={u.between}><Copy muted size={12}>{event.allDay?'종일':formatTime(event.startAt)}</Copy><View style={{flex:1,marginLeft:14}}><Copy weight="700">{event.title}</Copy></View><Icon name="chevron-forward" size={16}/></Pressable>)}{!events.length?<Copy muted size={13}>{schedule.loading?'일정을 확인하고 있어요…':'아직 정해진 일정이 없어요. 나만의 하루를 만들어 봐요.'}</Copy>:null}{google.error?<Link label="구글 일정 다시 연결" onPress={()=>nav.navigate('SettingsHub')}/>:null}<Action secondary compact label="일정 추가" onPress={()=>nav.navigate('EventEdit',{date:civil})}/></View>
 </Page>;
}


