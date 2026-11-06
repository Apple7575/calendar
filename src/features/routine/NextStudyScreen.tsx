import React,{useState} from 'react';
import {View} from 'react-native';
import {answerNextStudy,dismissNextStudy,nextStudyOptions,RESERVATION_POLICY,studyReservations} from '../../lib/studyReservation';
import type {NextStudyChoice} from '../../lib/studyReservation';
import {RootScreenProps} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Link,Notice,Page} from './ui';

const clock=(at:number)=>{const d=new Date(at);return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`};

/** 마칠 때 한 번 묻는다: 다음 공부는 언제? (S1-10) 고르면 그 시각에 알림이 한 번 온다. 보상·벌점은 없다. */
export function NextStudyScreen({navigation,route}:RootScreenProps<'NextStudy'>){
 const {data,update}=useRoutine(),[busy,setBusy]=useState(false),[error,setError]=useState(''),now=Date.now();
 const ask=studyReservations(data).find(r=>r.id===route.params.id),options=nextStudyOptions(data,now);
 const close=()=>navigation.goBack();
 const choose=async(choice:NextStudyChoice)=>{
  if(busy||!ask)return;setBusy(true);setError('');
  try{await update(s=>answerNextStudy(s,ask.id,choice,Date.now()));close();}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 골라 주세요.');setBusy(false);}
 };
 return <Page title="다음 공부" right={<Link label="닫기" onPress={()=>{if(ask&&ask.choice===undefined)void update(s=>dismissNextStudy(s,ask.id,Date.now())).catch(()=>{});close();}}/>}>
  <CardView>
   <View testID="next-study" style={{gap:space.sm}}>
    <Copy variant="section">다음 공부는 언제 할까요?</Copy>
    {ask?<Copy muted>{`${ask.subject} · 고른 시각에 알림이 한 번 와요. 누르면 2분 타이머가 바로 열려요.`}</Copy>:null}
    {options.length===1?<Notice>{`오늘 알림 ${RESERVATION_POLICY.remindersPerDay}번을 다 썼어요.`}</Notice>:null}
    {ask&&ask.choice===undefined?options.map(o=><Action key={o.choice} secondary={o.choice==='none'} disabled={busy} label={o.at?`${o.label} · ${clock(o.at)}`:o.label} onPress={()=>void choose(o.choice)}/>):<Copy muted>이미 골랐어요.</Copy>}
    <Copy muted size={12}>{`예약을 지키지 못해도 벌점은 없어요. 알림은 하루 ${RESERVATION_POLICY.remindersPerDay}번까지예요.`}</Copy>
   </View>
  </CardView>
  {error?<Notice tone="error">{error}</Notice>:null}
 </Page>;
}
