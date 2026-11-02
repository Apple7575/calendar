import {PriorityPauseView} from './PriorityPauseView';
import React,{useState} from 'react';
import {RootScreenProps} from '../../navigation/types';
import {activePriorityTask,saveNextPriorityAction} from '../../lib/priorityPlan';
import {stopBookTimer} from '../../lib/bookStudy';
import {useRoutine} from './RoutineProvider';
export function PriorityPauseScreen({navigation}:RootScreenProps<'PriorityPause'>){
 const {data,dayKey,update}=useRoutine(),task=activePriorityTask(data,dayKey);
 const [text,setText]=useState(task?.nextAction??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const finish=async(save:boolean)=>{if(busy)return;setBusy(true);setError('');try{await update(s=>save&&task?saveNextPriorityAction(stopBookTimer(s),dayKey,task.id,text):stopBookTimer(s));navigation.popTo('Main',{screen:'Today'})}catch(e){setError(e instanceof Error?e.message:'시작 위치를 저장하지 못했어요.')}finally{setBusy(false)}};
 return <PriorityPauseView task={task} text={text} onChange={setText} busy={busy} error={error} onSave={()=>void finish(true)} onSkip={()=>void finish(false)} onBack={()=>navigation.goBack()}/>;
}
