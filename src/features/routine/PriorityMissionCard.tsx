import {PriorityMissionView} from './PriorityMissionView';
import React,{useEffect,useState} from 'react';
import {useNavigation,useIsFocused} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {activePriorityTask,beginPriorityTask,beginWouldEndRun,priorityPlan,priorityTaskProgress,reconcilePriorityPlans,nextPriorityTask} from '../../lib/priorityPlan';
import {addDays} from '../../lib/dateUtils';
import {rewardChange} from '../../lib/rewardChange';
import {focusQuitPenalty,penaltyLabel} from '../../lib/focusPenalty';
import {useRoutine} from './RoutineProvider';
import {Link} from './ui';

export function PriorityMissionCard(){
 const {data,dayKey,update,ready,native}=useRoutine(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const focused=useIsFocused();
 const [clock,setClock]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!focused)return;setClock(Date.now());const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t)},[focused]);
 const plan=priorityPlan(data,dayKey),pending=nextPriorityTask(data,dayKey,clock),task=pending??plan?.tasks[0],progress=task?priorityTaskProgress(data,task,clock):undefined;
 useEffect(()=>{if(focused&&ready&&plan?.tasks.some(t=>!t.completedAt&&priorityTaskProgress(data,t,clock).complete))void update(s=>reconcilePriorityPlans(s,dayKey)).catch(e=>setError(e.message))},[focused,ready,clock,plan,dayKey,update]);
 const start=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{let reward:ReturnType<typeof rewardChange>|undefined;await update(s=>{const next=beginPriorityTask(s,dayKey,id);reward=rewardChange(s,next,dayKey);return next});if(reward&&reward.minutes>0)nav.navigate('EarnedReward',{id:'start-'+id+'-'+Date.now(),kind:'plan',quantity:1,...reward,continueTo:'FocusTimer'});else nav.navigate('FocusTimer')}catch(e){setError(e instanceof Error?e.message:'공부를 시작하지 못했어요.')}finally{setBusy(false)}};
 return <PriorityMissionView quitNotice={task&&beginWouldEndRun(data,task)?penaltyLabel(focusQuitPenalty(data,clock)):''} data={data} plan={plan} task={task} pending={pending} progress={progress} clock={clock} busy={busy} ready={ready} error={error} warning={!!data.priorityPolicy?.enabled&&!!native?.supported&&!native.supportsPriorityGate} onStart={id=>void start(id)} onEdit={()=>nav.navigate('PriorityPlan',{day:dayKey})} onTomorrow={()=>nav.navigate('PriorityPlan',{day:addDays(dayKey,1)})}/>;
}

export function PriorityContinuationCard(){
 const {data,dayKey}=useRoutine(),task=activePriorityTask(data,dayKey),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 if(!task?.startedAt||data.bookTimer?.phase!=='focus')return null;
 return <Link label="다음 시작 위치 남기기" onPress={()=>nav.navigate('PriorityPause')}/>;
}
