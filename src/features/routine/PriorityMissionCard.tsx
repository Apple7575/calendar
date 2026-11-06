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
import {friendNudge} from '../../lib/friendNudge';
import {routineStreak} from '../../lib/routineActivity';
import {FriendNudgeBubble,useNudgeClosed} from './FriendNudgeBubble';
import {QuitAsk,useQuitQuestion} from './QuitAsk';
import {useQuitConfirm} from './useQuitConfirm';

/** fallback: 지금 할 우선 과제가 없을 때 말풍선이 여는 오늘의 다음 할 일. */
export function PriorityMissionCard({fallback}:{fallback?:{label:string;onPress:()=>void}}={}){
 const {data,dayKey,update,ready,native}=useRoutine(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const focused=useIsFocused();
 const [clock,setClock]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[startingId,setStartingId]=useState<string>();
 useEffect(()=>{if(!focused)return;setClock(Date.now());const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t)},[focused]);
 const plan=priorityPlan(data,dayKey),pending=nextPriorityTask(data,dayKey,clock),task=pending??plan?.tasks[0],progress=task?priorityTaskProgress(data,task,clock):undefined;
 useEffect(()=>{if(focused&&ready&&plan?.tasks.some(t=>!t.completedAt&&priorityTaskProgress(data,t,clock).complete))void update(s=>reconcilePriorityPlans(s,dayKey)).catch(e=>setError(e.message))},[focused,ready,clock,plan,dayKey,update]);
 const start=async(id:string)=>{if(busy)return;setBusy(true);setError('');try{let reward:ReturnType<typeof rewardChange>|undefined;await update(s=>{const next=beginPriorityTask(s,dayKey,id);reward=rewardChange(s,next,dayKey);return next});if(reward&&reward.minutes>0)nav.navigate('EarnedReward',{id:'start-'+id+'-'+Date.now(),kind:'plan',quantity:1,...reward,continueTo:'FocusTimer'});else nav.navigate('FocusTimer')}catch(e){setError(e instanceof Error?e.message:'공부를 시작하지 못했어요.')}finally{setBusy(false)}};
 /** Any task on this card can end the run, including the rows under the main one, so each press is checked for its own task. */
 // 오늘 탭 친구가 먼저 말 걸기(18:00·20:30, 오늘 공부 전일 때만). 말풍선만 띄우고 행동은 아래 시작 버튼이다.
 const {closed,close}=useNudgeClosed(dayKey),nudge=friendNudge({now:new Date(clock),dayKey,todayDone:routineStreak(data,dayKey).todayDone,closed});
 const nudgeView=nudge?<FriendNudgeBubble nudge={nudge} onClose={()=>close(nudge.slot)} action={plan&&!pending?fallback:undefined}/>:null;
 const penalty=penaltyLabel(focusQuitPenalty(data,clock)),confirm=useQuitConfirm(penalty,useQuitQuestion(dayKey));
 const open=(id:string)=>{const target=plan?.tasks.find(t=>t.id===id);if(!target||!beginWouldEndRun(data,target)){confirm.stay();void start(id);return}setStartingId(id);confirm.press(()=>void start(id))};
 const asking=confirm.open&&startingId?startingId:undefined;
 return <PriorityMissionView nudge={nudgeView} nudgeAction={nudge?.action} quitNotice={task&&beginWouldEndRun(data,task)?penalty:''} askFor={asking} ask={asking?<QuitAsk question={confirm.question} onStay={confirm.stay} go={{label:(confirm.question?'마치고 시작':'한 번 더 누르면 시작해요')+' · '+penalty,onPress:()=>open(asking)}}/>:null} data={data} plan={plan} task={task} pending={pending} progress={progress} clock={clock} busy={busy} ready={ready} error={error} warning={!!data.priorityPolicy?.enabled&&!!native?.supported&&!native.supportsPriorityGate} onStart={open} onEdit={()=>nav.navigate('PriorityPlan',{day:dayKey})} onTomorrow={()=>nav.navigate('PriorityPlan',{day:addDays(dayKey,1)})}/>;
}

export function PriorityContinuationCard(){
 const {data,dayKey}=useRoutine(),task=activePriorityTask(data,dayKey),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 if(!task?.startedAt||data.bookTimer?.phase!=='focus')return null;
 return <Link label="멈추고 메모" onPress={()=>nav.navigate('PriorityPause')}/>;
}
