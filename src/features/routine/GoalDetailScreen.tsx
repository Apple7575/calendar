import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {goalDueInfo,goalStudySummary,PrimaryGoal,readableGoalDate,readPrimaryGoal} from '../../lib/primaryGoal';
import {useTheme} from '../../theme/ThemeContext';
import {colorRoles} from '../../theme/roles';
import {koreanTitle,space} from '../../theme/tokens';
import {GoalForm} from './GoalForm';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,LoadingState,Notice,Page,u} from './ui';

function Fact({label,value}:{label:string;value:string}){
 return <View style={[u.between,{gap:space.sm}]}><Copy muted>{label}</Copy><Copy variant="label">{value}</Copy></View>;
}

function GoalDetail({goal,today,onEdit}:{goal:PrimaryGoal;today:string;onEdit:()=>void}){
 const {data}=useRoutine(),theme=useTheme(),due=goalDueInfo(goal,today),{startedOn,studiedDays}=goalStudySummary(data,goal,today);
 return <>
  <CardView>
   {due?<Copy variant="label" style={{color:colorRoles(theme).primary.ink}}>{due.label}</Copy>:null}
   <Text {...koreanTitle.props} accessibilityRole="header" style={[koreanTitle.style,{color:theme.colors.text,fontSize:24,lineHeight:32,fontWeight:'800'}]}>{goal.title}</Text>
   {goal.why?<Copy muted>{goal.why}</Copy>:null}
  </CardView>
  {due?.passed?<Notice tone="warning" actionLabel="날짜 고치기" onAction={onEdit}>정한 날짜가 지났어요. 날짜를 고치거나 새 목표를 정해 보세요.</Notice>:null}
  <CardView>
   <Fact label="목표 날짜" value={goal.dueDate?readableGoalDate(goal.dueDate):'정하지 않음'}/>
   <Fact label="주간 약속" value={`주 ${goal.weeklyTargetDays}일`}/>
   <Fact label="시작한 날" value={readableGoalDate(startedOn)}/>
   <Fact label="지금까지 공부한 날" value={`${studiedDays}일`}/>
  </CardView>
  <Action secondary label="목표 고치기" onPress={onEdit}/>
 </>;
}

export function GoalDetailScreen(){
 const {data,dayKey,ready,error}=useRoutine(),stored=readPrimaryGoal(data),[editing,setEditing]=useState(false);
 const goal=stored.status==='ok'?stored.goal:undefined;
 return <Page title="목표 자세히">
  {!ready?error?<Notice tone="error">{`저장된 기록을 불러오지 못해 목표를 표시할 수 없어요. ${error}`}</Notice>:<LoadingState label="목표를 불러오는 중…"/>
  :!goal?<Notice tone="warning">목표를 찾지 못했어요. 목표 탭으로 돌아가 다시 정해 주세요.</Notice>
  :editing?<GoalForm key={goal.updatedAt} goal={goal} today={dayKey} canCancel onDone={()=>setEditing(false)}/>
  :<GoalDetail goal={goal} today={dayKey} onEdit={()=>setEditing(true)}/>}
 </Page>;
}
