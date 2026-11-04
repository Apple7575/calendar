import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {useNavigation,useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {addDays} from '../../lib/dateUtils';
import {Goal,completeGoal,deleteGoal,goalBrokenLinks,goalNextStep,goalTotals,goalWeek,hasGoalLinks,readGoals,reopenGoal} from '../../lib/routineGoals';
import {goalDueInfo,readableGoalDate} from '../../lib/primaryGoal';
import type {RoutineData} from '../../lib/routineModel';
import {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {colorRoles} from '../../theme/roles';
import {koreanTitle,space} from '../../theme/tokens';
import {GoalForm} from './GoalForm';
import {GoalLinksForm} from './GoalLinksForm';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Icon,Link,LoadingState,Notice,Page,Progress,u} from './ui';

type Nav=NativeStackNavigationProp<RootStackParamList>;

function Fact({label,value}:{label:string;value:string}){
 return <View style={[u.between,{gap:space.sm}]}><Copy muted>{label}</Copy><View style={{flexShrink:1}}><Copy variant="label">{value}</Copy></View></View>;
}

function WeekCard({goal,today}:{goal:Goal;today:string}){
 const {data}=useRoutine(),theme=useTheme(),{colors:c}=theme,primary=colorRoles(theme).primary,week=goalWeek(data,goal,today),left=week.target-week.count;
 return <CardView>
  <View style={u.between}><Copy variant="section">이번 주 공부한 날</Copy><Copy variant="label" muted>{`${week.count}일 / 주 ${week.target}일`}</Copy></View>
  <Progress value={week.count/week.target} label={`이번 주 공부한 날 ${week.count}일, 목표 ${week.target}일`}/>
  <View testID="goal-week" style={{flexDirection:'row'}}>{week.days.map(day=><View key={day.key} testID={`goal-day-${day.key}`} accessible accessibilityLabel={`${day.label}요일 ${day.counted?'공부함':day.isFuture?'아직 오지 않음':'기록 없음'}`} style={{flex:1,alignItems:'center',gap:space.xxs}}>
   <Copy variant="caption" weight={day.isToday?'800':'500'} muted={!day.isToday}>{day.label}</Copy>
   <View style={{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:day.counted?primary.soft:'transparent',borderWidth:day.isToday?2:1,borderColor:day.counted||day.isToday?primary.ink:c.border,opacity:day.isFuture?0.5:1}}>{day.counted?<Icon name="checkmark" size={18} color={primary.ink}/>:null}</View>
  </View>)}</View>
  <Copy variant="caption" muted>{left>0?`${left}일 더 공부하면 이번 주 약속을 채워요.`:'이번 주 약속을 채웠어요.'} 연결한 공부를 끝낸 날을 세요.</Copy>
 </CardView>;
}

function NextStepCard({goal,today,onLink}:{goal:Goal;today:string;onLink:()=>void}){
 const {data}=useRoutine(),nav=useNavigation<Nav>(),step=goalNextStep(data,goal,today);
 return <CardView>
  <Copy variant="section">다음 한 걸음</Copy>
  {step.kind==='link'?<><Copy>이 목표에 이어진 공부가 없어요.</Copy><Action label="공부 연결하기" onPress={onLink}/></>
  :step.kind==='plan'?<><Copy>오늘 계획에 이 목표의 공부가 없어요.</Copy><Action label="오늘 계획 정하기" onPress={()=>nav.navigate('PriorityPlan',{day:today})}/></>
  :step.kind==='words'?<><Copy>연결한 단어장을 오늘 공부해 보세요.</Copy><Action label="학습 탭으로 가기" onPress={()=>nav.navigate('Main',{screen:'Study'})}/></>
  :step.kind==='task'?<><View style={{gap:space.xxs}}><Copy variant="caption" muted>{step.subject}</Copy><Copy variant="label">{step.action}</Copy></View><Action label="오늘 탭에서 이어 가기" onPress={()=>nav.navigate('Main',{screen:'Today'})}/></>
  :<><Copy>오늘 이 목표의 공부를 모두 끝냈어요.</Copy><Action secondary label="내일 계획 준비하기" onPress={()=>nav.navigate('PriorityPlan',{day:addDays(today,1)})}/></>}
 </CardView>;
}

function LinksCard({goal,onLink}:{goal:Goal;onLink:()=>void}){
 const {data}=useRoutine(),broken=goalBrokenLinks(data,goal),brokenCount=broken.subjects.length+broken.deckIds.length;
 const names=[...goal.links.subjects.map(subject=>broken.subjects.includes(subject)?`${subject} (기록 없음)`:subject),...goal.links.deckIds.map(id=>data.decks.find(deck=>deck.id===id)?.name??'없어진 단어장')];
 return <CardView>
  <Copy variant="section">연결한 공부</Copy>
  {names.length?<Copy>{names.join(', ')}</Copy>:<Copy muted>공부를 연결하면 이번 주에 얼마나 했는지 볼 수 있어요.</Copy>}
  {brokenCount?<Notice tone="warning">없어진 단어장이나 이름이 바뀐 과목이 있어요. 끊긴 공부는 세지 않아요. 연결을 다시 골라 주세요.</Notice>:null}
  <Action secondary label={names.length?'연결 바꾸기':'공부 연결하기'} onPress={onLink}/>
 </CardView>;
}

function Detail({goal,today,onEdit,onLink}:{goal:Goal;today:string;onEdit:()=>void;onLink:()=>void}){
 const {data,update}=useRoutine(),nav=useNavigation<Nav>(),theme=useTheme(),due=goalDueInfo(goal,today),{startedOn,studiedDays}=goalTotals(data,goal,today),finished=!!goal.completedAt,linked=hasGoalLinks(goal);
 const [confirming,setConfirming]=useState(false),[error,setError]=useState('');
 const run=async(change:(current:RoutineData)=>RoutineData,leave=false)=>{
  setError('');
  try{await update(change);if(leave)nav.goBack();}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 시도해 주세요.');}
 };
 return <>
  <CardView>
   {finished?<Copy variant="label" muted>끝낸 목표</Copy>:due?<Copy variant="label" style={{color:colorRoles(theme).primary.ink}}>{due.label}</Copy>:null}
   <Text {...koreanTitle.props} accessibilityRole="header" style={[koreanTitle.style,{color:theme.colors.text,fontSize:24,lineHeight:32,fontWeight:'800'}]}>{goal.title}</Text>
   {goal.why?<Copy muted>{goal.why}</Copy>:null}
  </CardView>
  {!finished&&due?.passed?<Notice tone="warning" actionLabel="날짜 고치기" onAction={onEdit}>정한 날짜가 지났어요. 날짜를 고치거나 목표를 끝내 보세요.</Notice>:null}
  {!finished&&linked?<WeekCard goal={goal} today={today}/>:null}
  {finished?null:<NextStepCard goal={goal} today={today} onLink={onLink}/>}
  {finished?null:<LinksCard goal={goal} onLink={onLink}/>}
  <CardView>
   <Fact label="목표 날짜" value={goal.dueDate?readableGoalDate(goal.dueDate):'정하지 않음'}/>
   <Fact label="주간 약속" value={`주 ${goal.weeklyTargetDays}일`}/>
   <Fact label="시작한 날" value={readableGoalDate(startedOn)}/>
   <Fact label="지금까지 공부한 날" value={`${studiedDays}일`}/>
  </CardView>
  {error?<Notice tone="error">{error}</Notice>:null}
  {finished?<Action secondary label="다시 진행하기" onPress={()=>void run(current=>reopenGoal(current,goal.id))}/>:<>
   <Action secondary label="목표 고치기" onPress={onEdit}/>
   <Action secondary label="목표 끝내기" onPress={()=>void run(current=>completeGoal(current,goal.id),true)}/>
  </>}
  {confirming?<Notice tone="warning" actionLabel="삭제하기" onAction={()=>void run(current=>deleteGoal(current,goal.id),true)}>이 목표를 지울까요? 공부 기록은 그대로 남아요.</Notice>:<Link muted label="목표 삭제" onPress={()=>setConfirming(true)}/>}
 </>;
}

export function GoalDetailScreen(){
 const {data,dayKey,ready,error}=useRoutine(),{params}=useRoute<RouteProp<RootStackParamList,'GoalDetail'>>();
 const [view,setView]=useState<'detail'|'edit'|'links'>(params.open==='links'?'links':'detail');
 const goal=readGoals(data).goals.find(item=>item.id===params.goalId),show=()=>setView('detail');
 return <Page title="목표 자세히">
  {!ready?error?<Notice tone="error">{`저장된 기록을 불러오지 못해 목표를 표시할 수 없어요. ${error}`}</Notice>:<LoadingState label="목표를 불러오는 중…"/>
  :!goal?<Notice tone="warning">목표를 찾지 못했어요. 목표 탭으로 돌아가 주세요.</Notice>
  :view==='edit'?<GoalForm key={goal.updatedAt} goal={goal} today={dayKey} canCancel onDone={show}/>
  :view==='links'?<GoalLinksForm key={goal.updatedAt} goal={goal} onDone={show}/>
  :<Detail goal={goal} today={dayKey} onEdit={()=>setView('edit')} onLink={()=>setView('links')}/>}
 </Page>;
}
