import React,{useState} from 'react';
import {TextInput,View} from 'react-native';
import {RootScreenProps} from '../../navigation/types';
import {activePriorityTask,saveNextPriorityAction} from '../../lib/priorityPlan';
import {stopBookTimer} from '../../lib/bookStudy';
import {useRoutine} from './RoutineProvider';
import {useTheme} from '../../theme/ThemeContext';
import {Action,CardView,Copy,Link,Mascot,Page} from './ui';
export function PriorityPauseScreen({navigation}:RootScreenProps<'PriorityPause'>){
 const {data,dayKey,update}=useRoutine(),{colors:c}=useTheme(),task=activePriorityTask(data,dayKey);
 const [text,setText]=useState(task?.nextAction??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const finish=async(save:boolean)=>{if(busy)return;setBusy(true);setError('');try{await update(s=>save&&task?saveNextPriorityAction(stopBookTimer(s),dayKey,task.id,text):stopBookTimer(s));navigation.popTo('Main',{screen:'Today'})}catch(e){setError(e instanceof Error?e.message:'시작 위치를 저장하지 못했어요.')}finally{setBusy(false)}};
 return <Page title="다음 시작 준비" right={<Link label="공부로 돌아가기" onPress={()=>navigation.goBack()}/>} footer={<View style={{gap:5}}><Action label="다음 행동 저장하고 잠깐 멈추기" disabled={busy||!task||!text.trim()} onPress={()=>void finish(true)}/><Link label="지금은 메모 없이 멈추기" disabled={busy} onPress={()=>void finish(false)}/></View>}>
  <View style={{alignItems:'center'}}><Mascot character="C03" action="A60" size={140}/></View><Copy size={26} weight="800">다음엔 어디부터 할까요?</Copy><Copy>돌아왔을 때 고민하지 않도록, 바로 할 행동 한 줄만 남겨요.</Copy>{task?<CardView><Copy muted size={12}>방금 하던 공부 · {task.subject}</Copy><Copy weight="700">{task.target||task.action}</Copy></CardView>:null}<TextInput accessibilityLabel="이어갈 첫 행동" value={text} onChangeText={setText} multiline maxLength={300} placeholder="예: 33쪽 2번 회로부터 그리기" placeholderTextColor={c.textMuted} style={{backgroundColor:c.inputBg,color:c.text,padding:18,borderRadius:20,minHeight:120,textAlignVertical:'top',fontSize:17}}/><Copy muted size={12}>공부 기록과 받은 보상은 그대로예요. 저장하면 타이머는 정지하고 홈으로 돌아가요.</Copy>{error?<Copy>{error}</Copy>:null}
 </Page>;
}
