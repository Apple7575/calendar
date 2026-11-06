import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {Goal,MAX_ACTIVE_GOALS,activeGoals,goalBrokenLinks,goalWeek,hasGoalLinks,readGoals} from '../../lib/routineGoals';
import {goalDueInfo,readableGoalDate} from '../../lib/primaryGoal';
import {durationLabel} from '../../lib/dailyTimeline';
import {goalWeekTime} from '../../lib/goalTime';
import {useTheme} from '../../theme/ThemeContext';
import {colorRoles} from '../../theme/roles';
import {koreanTitle,space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {GoalForm} from './GoalForm';
import {MenuRow} from './experience';
import {Action,CardView,CharacterPeek,Copy,EmptyState,Icon,LoadingState,Notice,Page,Progress,u} from './ui';

type Nav=NativeStackNavigationProp<RootStackParamList>;

function GoalCard({goal,today}:{goal:Goal;today:string}){
 const {data}=useRoutine(),theme=useTheme(),nav=useNavigation<Nav>(),due=goalDueInfo(goal,today),linked=hasGoalLinks(goal),week=goalWeek(data,goal,today),time=linked?goalWeekTime(data,goal,today):undefined,broken=goalBrokenLinks(data,goal);
 return <CardView>
  <Pressable accessibilityRole="button" accessibilityLabel={`${goal.title} 목표 자세히 보기`} onPress={()=>nav.navigate('GoalDetail',{goalId:goal.id})} style={({pressed})=>({gap:space.sm,opacity:pressed?.6:1})}>
   <View style={[u.between,{gap:space.sm}]}>
    <View style={{flex:1,gap:space.xxs}}>
     {due?<Copy variant="label" style={{color:colorRoles(theme).primary.ink}}>{`${due.label} · ${readableGoalDate(goal.dueDate!)}`}</Copy>:null}
     <Text {...koreanTitle.props} style={[koreanTitle.style,{color:theme.colors.text,fontSize:24,lineHeight:32,fontWeight:'800'}]}>{goal.title}</Text>
     {goal.why?<Copy muted>{goal.why}</Copy>:null}
    </View>
    <Icon name="chevron-forward" size={18}/>
   </View>
   {linked?<View style={{gap:space.xxs}}>
    <View style={u.between}><Copy variant="caption" muted>이번 주 공부한 날</Copy><Copy variant="label" muted>{`${week.count}일 / 주 ${week.target}일`}</Copy></View>
    <Progress value={week.count/week.target} label={`${goal.title} 이번 주 공부한 날 ${week.count}일, 목표 ${week.target}일`}/>
    {time&&time.seconds+time.lastWeekSeconds?<Copy variant="caption" muted>{`공부 시간 이번 주 ${durationLabel(time.seconds)} · 지난주 ${durationLabel(time.lastWeekSeconds)}`}</Copy>:null}
   </View>:null}
   {broken.subjects.length+broken.deckIds.length?<Notice tone="warning">연결이 끊긴 공부가 있어요. 눌러서 확인해 보세요.</Notice>:null}
   {due?.passed?<Notice tone="warning">정한 날짜가 지났어요. 눌러서 날짜를 고치거나 목표를 끝내 보세요.</Notice>:null}
  </Pressable>
  {linked?null:<View style={{gap:space.xs}}>
   <Copy variant="caption" muted>공부를 연결하면 이번 주에 얼마나 했는지 볼 수 있어요.</Copy>
   <Action secondary compact label="공부 연결하기" accessibilityLabel={`${goal.title} 공부 연결하기`} onPress={()=>nav.navigate('GoalDetail',{goalId:goal.id,open:'links'})}/>
  </View>}
 </CardView>;
}

function FinishedGoals({goals}:{goals:Goal[]}){
 const nav=useNavigation<Nav>(),[open,setOpen]=useState(false);
 if(!goals.length)return null;
 return <CardView>
  <Pressable accessibilityRole="button" accessibilityLabel={`끝낸 목표 ${goals.length}개`} accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={[u.between,{minHeight:44}]}><Copy variant="label">{`끝낸 목표 ${goals.length}개`}</Copy><Icon name={open?'chevron-up':'chevron-down'} size={18}/></Pressable>
  {open?goals.map(goal=><Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`${goal.title} 목표 자세히 보기`} onPress={()=>nav.navigate('GoalDetail',{goalId:goal.id})} style={[u.between,{minHeight:44,gap:space.sm}]}><View style={{flex:1}}><Copy>{goal.title}</Copy></View><Icon name="chevron-forward" size={18}/></Pressable>):null}
 </CardView>;
}

function ReviewLinks(){
 const nav=useNavigation<Nav>();
 return <CardView style={{gap:space.xxs}}>
  <Copy variant="section">돌아보기</Copy>
  <MenuRow title="밤 1분 돌아보기" subtitle="오늘 기록 · 내일 첫 공부 약속" icon="moon-outline" onPress={()=>nav.navigate('NightReflection')}/>
  <MenuRow title="주간 점검" subtitle="지난주 결과 · 예치금 · 다음 주 규칙" icon="calendar-outline" onPress={()=>nav.navigate('WeekCheck')}/>
 </CardView>;
}

export function GoalHomeScreen(){
 const {data,dayKey,ready,error}=useRoutine(),{goals,unreadable,canReplaceUnreadable}=readGoals(data),[adding,setAdding]=useState(false);
 const active=activeGoals(goals),finished=goals.filter(goal=>goal.completedAt);
 return <Page title="목표">
  {!ready?error?<Notice tone="error">{`저장된 기록을 불러오지 못해 목표를 표시할 수 없어요. ${error}`}</Notice>:<LoadingState label="목표를 불러오는 중…"/>
  :adding?<GoalForm today={dayKey} canCancel onDone={()=>setAdding(false)}/>
  :<>
   {unreadable?<Notice tone="warning" actionLabel={canReplaceUnreadable?'목표 다시 정하기':undefined} onAction={canReplaceUnreadable?()=>setAdding(true):undefined}>{canReplaceUnreadable?'저장된 목표를 읽지 못했어요. 다른 기록은 그대로예요. 목표를 다시 정해 주세요.':`읽지 못한 목표가 ${unreadable}개 있어요. 다른 기록은 그대로예요.`}</Notice>:null}
   {active.length?<View testID="goal-summary" style={{gap:space.sm}}>
    <View><CharacterPeek mood="cheer"/><GoalCard goal={active[0]} today={dayKey}/></View>
    {active.slice(1).map(goal=><GoalCard key={goal.id} goal={goal} today={dayKey}/>)}
   </View>:canReplaceUnreadable?null:<View testID="goal-empty" style={{gap:space.xs}}>
    <EmptyState peek title="아직 목표가 없어요" description="목표를 정하고 공부를 연결하면 이번 주에 얼마나 다가갔는지와 다음에 할 일을 볼 수 있어요." actionLabel="목표 정하기" onAction={()=>setAdding(true)}/>
   </View>}
   {active.length?active.length<MAX_ACTIVE_GOALS?<Action secondary label="목표 추가" onPress={()=>setAdding(true)}/>:<Copy variant="caption" muted>{`진행 중인 목표는 ${MAX_ACTIVE_GOALS}개까지 둘 수 있어요.`}</Copy>:null}
   <FinishedGoals goals={finished}/>
   <ReviewLinks/>
  </>}
 </Page>;
}
