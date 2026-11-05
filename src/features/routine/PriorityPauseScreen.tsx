import {PriorityPauseView} from './PriorityPauseView';
import React,{useState} from 'react';
import {RootScreenProps} from '../../navigation/types';
import {activePriorityTask,saveNextPriorityAction} from '../../lib/priorityPlan';
import {finishFocusRun} from '../../lib/bookStudy';
import {focusQuitPenalty,penaltyLabel} from '../../lib/focusPenalty';
import {useRoutine} from './RoutineProvider';
import {QuitAsk,useQuitQuestion} from './QuitAsk';
import {useQuitConfirm} from './useQuitConfirm';
export function PriorityPauseScreen({navigation}:RootScreenProps<'PriorityPause'>){
 const {data,dayKey,update}=useRoutine(),task=activePriorityTask(data,dayKey);
 const [text,setText]=useState(task?.nextAction??''),[busy,setBusy]=useState(false),[error,setError]=useState(''),penalty=penaltyLabel(focusQuitPenalty(data)),confirm=useQuitConfirm(penalty,useQuitQuestion(dayKey));
 const finish=async(save:boolean)=>{if(busy)return;setBusy(true);setError('');try{await update(s=>save&&task?saveNextPriorityAction(finishFocusRun(s),dayKey,task.id,text):finishFocusRun(s));navigation.popTo('Main',{screen:'Today'})}catch(e){setError(e instanceof Error?e.message:'시작 위치를 저장하지 못했어요.')}finally{setBusy(false)}};
 return <PriorityPauseView penalty={penalty} again={confirm.open&&!confirm.question} ask={<QuitAsk question={confirm.question} onStay={()=>{confirm.stay();navigation.goBack()}}/>} task={task} text={text} onChange={setText} busy={busy} error={error} onSave={()=>confirm.press(()=>void finish(true))} onSkip={()=>confirm.press(()=>void finish(false))} onBack={()=>navigation.goBack()}/>;
}
