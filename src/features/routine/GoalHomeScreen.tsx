import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {addDays} from '../../lib/dateUtils';
import {PrimaryGoal,goalDueInfo,goalWeekProgress,nextGoalStep,readPrimaryGoal,readableGoalDate} from '../../lib/primaryGoal';
import {useTheme} from '../../theme/ThemeContext';
import {colorRoles} from '../../theme/roles';
import {koreanTitle,space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {GoalForm} from './GoalForm';
import {Action,CardView,CharacterPeek,Copy,EmptyState,Icon,LoadingState,Notice,Page,Progress,u} from './ui';

type Nav=NativeStackNavigationProp<RootStackParamList>;

function GoalCard({goal,today}:{goal:PrimaryGoal;today:string}){
 const theme=useTheme(),nav=useNavigation<Nav>(),due=goalDueInfo(goal,today);
 return <View testID="goal-summary"><CharacterPeek mood="cheer"/><Pressable accessibilityRole="button" accessibilityLabel={`${goal.title} 목표 자세히 보기`} onPress={()=>nav.navigate('GoalDetail')} style={({pressed})=>({opacity:pressed?.6:1})}><CardView>
  <View style={[u.between,{gap:space.sm}]}>
   <View style={{flex:1,gap:space.xxs}}>
    {due?<Copy variant="label" style={{color:colorRoles(theme).primary.ink}}>{`${due.label} · ${readableGoalDate(goal.dueDate!)}`}</Copy>:null}
    <Text {...koreanTitle.props} style={[koreanTitle.style,{color:theme.colors.text,fontSize:24,lineHeight:32,fontWeight:'800'}]}>{goal.title}</Text>
    {goal.why?<Copy muted>{goal.why}</Copy>:null}
   </View>
   <Icon name="chevron-forward" size={18}/>
  </View>
  {due?.passed?<Notice tone="warning">정한 날짜가 지났어요. 눌러서 날짜를 고치거나 새 목표를 정해 보세요.</Notice>:null}
 </CardView></Pressable></View>;
}

function WeekCard({goal,today}:{goal:PrimaryGoal;today:string}){
 const {data}=useRoutine(),theme=useTheme(),{colors:c}=theme,primary=colorRoles(theme).primary,week=goalWeekProgress(data,goal,today),left=week.target-week.count;
 return <CardView>
  <View style={u.between}><Copy variant="section">이번 주 공부한 날</Copy><Copy variant="label" muted>{`${week.count}일 / 주 ${week.target}일`}</Copy></View>
  <Progress value={week.count/week.target} label={`이번 주 공부한 날 ${week.count}일, 목표 ${week.target}일`}/>
  <View testID="goal-week" style={{flexDirection:'row'}}>{week.days.map(day=><View key={day.key} testID={`goal-day-${day.key}`} accessible accessibilityLabel={`${day.label}요일 ${day.counted?'공부함':day.isFuture?'아직 오지 않음':'기록 없음'}`} style={{flex:1,alignItems:'center',gap:space.xxs}}>
   <Copy variant="caption" weight={day.isToday?'800':'500'} muted={!day.isToday}>{day.label}</Copy>
   <View style={{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:day.counted?primary.soft:'transparent',borderWidth:day.isToday?2:1,borderColor:day.counted||day.isToday?primary.ink:c.border,opacity:day.isFuture?0.5:1}}>{day.counted?<Icon name="checkmark" size={18} color={primary.ink}/>:null}</View>
  </View>)}</View>
  <Copy variant="caption" muted>{left>0?`${left}일 더 공부하면 이번 주 약속을 채워요.`:'이번 주 약속을 채웠어요.'} 단어·집중 공부를 완료했거나 중요한 공부를 끝낸 날을 세요.</Copy>
 </CardView>;
}

function NextStepCard({today}:{today:string}){
 const {data}=useRoutine(),nav=useNavigation<Nav>(),step=nextGoalStep(data,today);
 return <CardView>
  <Copy variant="section">다음 한 걸음</Copy>
  {step.kind==='plan'?<><Copy>오늘 먼저 할 공부를 아직 정하지 않았어요.</Copy><Action label="오늘 첫 행동 정하기" onPress={()=>nav.navigate('PriorityPlan',{day:today})}/></>
  :step.kind==='task'?<><View style={{gap:space.xxs}}><Copy variant="caption" muted>{step.subject}</Copy><Copy variant="label">{step.action}</Copy></View><Action label="오늘 탭에서 이어 가기" onPress={()=>nav.navigate('Main',{screen:'Today'})}/></>
  :<><Copy>오늘 계획한 공부를 모두 끝냈어요.</Copy><Action secondary label="내일 계획 준비하기" onPress={()=>nav.navigate('PriorityPlan',{day:addDays(today,1)})}/></>}
 </CardView>;
}

export function GoalHomeScreen(){
 const {data,dayKey,ready,error}=useRoutine(),stored=readPrimaryGoal(data),[editing,setEditing]=useState(false);
 const goal=stored.status==='ok'?stored.goal:undefined;
 return <Page title="목표">
  {!ready?error?<Notice tone="error">{`저장된 기록을 불러오지 못해 목표를 표시할 수 없어요. ${error}`}</Notice>:<LoadingState label="목표를 불러오는 중…"/>
  :editing?<GoalForm key={goal?.updatedAt??'new'} goal={goal} today={dayKey} canCancel onDone={()=>setEditing(false)}/>
  :goal?<>
    <GoalCard goal={goal} today={dayKey}/>
    <WeekCard goal={goal} today={dayKey}/>
    <NextStepCard today={dayKey}/>
   </>
  :stored.status==='invalid'?<Notice tone="warning" actionLabel="목표 다시 정하기" onAction={()=>setEditing(true)}>저장된 목표를 읽지 못했어요. 다른 기록은 그대로예요. 목표를 다시 정해 주세요.</Notice>
  :<View testID="goal-empty" style={{gap:space.xs}}>
    <EmptyState peek title="아직 목표가 없어요" description="목표를 하나 정하면 이번 주에 얼마나 다가갔는지와 다음에 할 일을 여기서 볼 수 있어요." actionLabel="목표 정하기" onAction={()=>setEditing(true)}/>
   </View>}
 </Page>;
}
