import React,{useEffect,useState} from 'react';
import {Pressable,View} from 'react-native';
import {useNavigation,useIsFocused} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {activePriorityTask,beginPriorityTask,priorityPlan,priorityTaskProgress,reconcilePriorityPlans,nextPriorityTask} from '../../lib/priorityPlan';
import {addDays} from '../../lib/dateUtils';
import {rewardChange} from '../../lib/rewardChange';
import {useRoutine} from './RoutineProvider';
import {useTheme} from '../../theme/ThemeContext';
import {Action,CardView,Copy,Icon,Link,Mascot,u} from './ui';

export function PriorityMissionCard(){
 const {data,dayKey,update,ready,native}=useRoutine(),{colors:c}=useTheme(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const focused=useIsFocused();
 const [clock,setClock]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!focused)return;setClock(Date.now());const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t)},[focused]);
 const plan=priorityPlan(data,dayKey),pending=nextPriorityTask(data,dayKey,clock),task=pending??plan?.tasks[0],progress=task?priorityTaskProgress(data,task,clock):undefined;
 useEffect(()=>{if(focused&&ready&&plan?.tasks.some(t=>!t.completedAt&&priorityTaskProgress(data,t,clock).complete))void update(s=>reconcilePriorityPlans(s,dayKey)).catch(e=>setError(e.message))},[focused,ready,clock,plan,dayKey,update]);
 const start=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{let reward:ReturnType<typeof rewardChange>|undefined;await update(s=>{const next=beginPriorityTask(s,dayKey,id);reward=rewardChange(s,next,dayKey);return next});nav.navigate('BookStudy');if(reward&&reward.minutes>0)nav.navigate('EarnedReward',{id:'start-'+id+'-'+Date.now(),kind:'plan',quantity:1,...reward,continueTo:'FocusTimer'});else nav.navigate('FocusTimer')}catch(e){setError(e instanceof Error?e.message:'공부를 시작하지 못했어요.')}finally{setBusy(false)}};
 if(!plan)return <View testID="priority-mission" style={{backgroundColor:'#234AB7',borderRadius:28,padding:24,gap:13}}><Copy style={{color:'#DCE8FF'}} weight="800">중요한 일부터, 딱 2분.</Copy><View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Copy size={28} weight="800" style={{color:'#FFFFFF'}}>오늘 첫 공부를{`\n`}미리 정해둘까요?</Copy><Copy style={{color:'#DFE8FF'}} size={14}>무엇부터 할지 정해두면, 시작은 버튼 하나예요.</Copy></View><Mascot size={100} character="C03" action="A31"/></View><Action label="오늘의 첫 행동 정하기" onPress={()=>nav.navigate('PriorityPlan',{day:dayKey})}/><Pressable accessibilityRole="button" accessibilityLabel="내일 시작할 행동 준비" onPress={()=>nav.navigate('PriorityPlan',{day:addDays(dayKey,1)})} style={{padding:10,alignItems:'center'}}><Copy style={{color:'#DFE8FF'}}>내일 시작할 행동 준비</Copy></Pressable></View>;
 const completed=plan.tasks.filter(t=>priorityTaskProgress(data,t,clock).complete).length;
 return <View testID="priority-mission" style={{gap:15,borderRadius:28,padding:23,backgroundColor:c.primarySoft,borderWidth:2,borderColor:c.primary}}>
  <View style={u.between}><Copy weight="800">{pending?'지금 할 한 가지':'중요한 공부, 모두 시작했어요'}</Copy><Link label="계획" onPress={()=>nav.navigate('PriorityPlan',{day:dayKey})}/></View>
  <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,gap:6}}><Copy size={25} weight="800">{task?.subject}</Copy><Copy size={17} weight="700">{task?.nextAction||task?.action}</Copy></View><Mascot character="C03" size={86} action={pending?'A31':'A23'}/></View>
  {task?.preparation?<View style={{borderRadius:14,padding:12,backgroundColor:c.card}}><Copy size={12} muted>시작 전 준비</Copy><Copy size={14}>{task.preparation}</Copy></View>:null}
  {task?.target?<Copy size={13}>이어서 할 분량 · {task.target}</Copy>:null}
  {pending&&progress?<><View style={{height:8,borderRadius:4,backgroundColor:c.border,overflow:'hidden'}}><View style={{height:8,width:`${Math.min(100,progress.seconds/task!.minimum*100)}%`,backgroundColor:c.primary}}/></View><Copy size={13}>{progress.seconds>=task!.minimum?'✓ 작은 공부 시간 충족':'작은 시작 '+Math.floor(progress.seconds/60)+'분 '+progress.seconds%60+'초 / '+task!.minimum/60+'분'} · {progress.photo?'✓ 필기 확인':'필기 사진 남기기'}</Copy>{progress.complete?<Copy size={13}>시간 사용을 위한 작은 시작을 해냈어요. 공부는 같은 과목으로 계속 이어가요.</Copy>:null}<Action label={progress.complete?'같은 공부 계속 이어가기':task?.startedAt?'첫 행동 이어서 하기':task!.minimum/60+'분, 이 행동부터 시작'} disabled={!ready||busy} onPress={()=>void start(task!.id)}/></>:<><Copy>✓ {completed}/{plan.tasks.length}개의 작은 시작을 해냈어요. 오늘 기록은 그대로 남아요.</Copy><Action label="같은 공부 더 이어가기" disabled={busy} onPress={()=>void start(task!.id)}/><Link label="내일 첫 행동 준비하기" onPress={()=>nav.navigate('PriorityPlan',{day:addDays(dayKey,1)})}/></>}
  <View style={{gap:6}}>{plan.tasks.map((t,i)=><Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${i+1}순위 ${t.subject} 열기`} disabled={busy} onPress={()=>void start(t.id)} style={[u.between,{paddingVertical:10,borderTopWidth:1,borderTopColor:c.border}]}><Copy size={13}>{priorityTaskProgress(data,t,clock).complete?'✓':i+1} {t.subject}</Copy><Icon name="chevron-forward" size={17}/></Pressable>)}</View>
  <Copy muted size={12}>순서는 추천이에요. 다른 공부도 선택할 수 있고 보상도 적립돼요.</Copy>
  {data.priorityPolicy?.enabled&&native?.supported&&!native.supportsPriorityGate?<Copy size={12}>현재 설치본은 첫 공부 잠금을 지원하지 않아요. 새 아이폰 빌드에서 기기 잠금이 적용돼요.</Copy>:null}
  {error?<Copy>{error}</Copy>:null}
 </View>;
}

export function PriorityContinuationCard(){
 const {data,dayKey}=useRoutine(),task=activePriorityTask(data,dayKey),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 if(!task?.startedAt||data.bookTimer?.phase!=='focus')return null;
 return <CardView><Copy weight="800">멈추기 전에, 다음 시작 준비</Copy><Copy muted size={13}>다음에 바로 할 행동 한 줄을 남겨요.</Copy><Action secondary label="다음 시작 위치 남기기" onPress={()=>nav.navigate('PriorityPause')}/></CardView>;
}
