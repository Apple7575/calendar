import React from 'react';
import {View} from 'react-native';
import {activityStatusLabel,isActivityComplete,routineActivities,type RoutineActivity} from '../../lib/routineActivity';
import {getDay} from '../../lib/routineModel';
import {useTheme} from '../../theme/ThemeContext';
import {useOptionalRoutine} from './RoutineProvider';
import {CardView,Copy,u} from './ui';

function Mark({activity}:{activity:RoutineActivity}){
 const {colors:c}=useTheme(),done=isActivityComplete(activity);
 return <View style={{width:22,height:22,borderRadius:11,borderWidth:1,borderColor:done?c.primary:c.border,alignItems:'center',justifyContent:'center',backgroundColor:done?c.primarySoft:'transparent'}}><Copy size={12}>{activity.status==='full'?'✓':activity.status==='min'?'◐':activity.status==='progress'?'·':''}</Copy></View>;
}

/** 달력에서 날짜를 눌렀을 때 맨 위에 보이는 그날의 실천과 학습량. 저장된 기록을 읽기만 한다. */
export function DayRoutineSummary({date}:{date:string}){
 const routine=useOptionalRoutine();if(!routine)return null;
 const day=getDay(routine.data,date);
 return <CardView style={{marginBottom:12}}><Copy variant="section">이날의 실천</Copy>
  {routineActivities(routine.data,date).map(activity=><View key={activity.id} style={u.between}><View style={u.row}><Mark activity={activity}/><Copy weight="700">{activity.title}</Copy></View><Copy muted size={13}>{activityStatusLabel[activity.status]}</Copy></View>)}
  <Copy muted size={13}>학습 {day.complete.length}장 · 응답 {day.responses}회 · {Math.round(day.studySeconds/60)}분</Copy>
 </CardView>;
}
