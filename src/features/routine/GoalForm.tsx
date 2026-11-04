import React,{useState} from 'react';
import {View} from 'react-native';
import {GOAL_TITLE_LIMIT,GOAL_WHY_LIMIT,PrimaryGoal,savePrimaryGoal} from '../../lib/primaryGoal';
import {space} from '../../theme/tokens';
import {GoalDateInput} from './GoalDateInput';
import {useRoutine} from './RoutineProvider';
import {Action,Choice,Copy,Field,Link,Notice} from './ui';

export function GoalForm({goal,today,onDone,canCancel}:{goal?:PrimaryGoal;today:string;onDone:()=>void;canCancel:boolean}){
 const {update}=useRoutine();
 const [title,setTitle]=useState(goal?.title??''),[why,setWhy]=useState(goal?.why??''),[dueDate,setDueDate]=useState(goal?.dueDate??''),[days,setDays]=useState<number|undefined>(goal?.weeklyTargetDays);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{
  setBusy(true);setError('');
  try{await update(current=>savePrimaryGoal(current,{title,why,dueDate,weeklyTargetDays:days??0}));onDone();}
  catch(e){setError(e instanceof Error?e.message:'목표를 저장하지 못했어요. 다시 시도해 주세요.');setBusy(false);}
 };
 return <View style={{gap:space.md}}>
  <Copy variant="heading">{goal?'목표 고치기':'어디로 가고 싶나요?'}</Copy>
  <Field label="목표 이름" value={title} onChangeText={setTitle} placeholder="예: JLPT N2 합격" maxLength={GOAL_TITLE_LIMIT}/>
  <Field label="이유 한 줄 (선택)" value={why} onChangeText={setWhy} placeholder="예: 일본에서 일하고 싶어서" maxLength={GOAL_WHY_LIMIT}/>
  <GoalDateInput value={dueDate} today={today} onChange={setDueDate}/>
  <View style={{gap:space.xs}}>
   <Copy variant="caption" weight="700" muted>일주일에 며칠 공부할까요?</Copy>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:space.xs}}>{[1,2,3,4,5,6,7].map(n=><View key={n} style={{flexBasis:'22%',flexGrow:1}}><Choice fill label={`${n}일`} accessibilityLabel={`일주일에 ${n}일`} selected={days===n} onPress={()=>setDays(n)}/></View>)}</View>
  </View>
  {error?<Notice tone="error">{error}</Notice>:null}
  <Action label="목표 저장" loading={busy} onPress={()=>void save()}/>
  {canCancel?<Link muted label="취소" onPress={onDone}/>:null}
 </View>;
}
