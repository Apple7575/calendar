import React from 'react';
import { Linking,View } from 'react-native';
import { studyNotesOnDate } from '../../lib/bookStudy';
import { useOptionalRoutine } from './RoutineProvider';
import { CardView,Copy,Link } from './ui';
export function AutomaticDayNotes({date}:{date:string}){
 const routine=useOptionalRoutine();if(!routine)return null;
 const books=studyNotesOnDate(routine.data,date),summaries=(routine.data.learningSummaries??[]).filter(s=>s.date===date);
 if(!books.length&&!summaries.length)return null;
 return <View style={{gap:12,marginVertical:12}}>
  <Copy size={18} weight="700">오늘 쌓은 공부</Copy>
  {books.map(s=><CardView key={s.id} style={{padding:18,gap:8}}><Copy weight="700">{s.subject} · {Math.round(s.seconds/60)}분</Copy><Copy>{s.note}</Copy>{s.next?<Copy muted size={13}>다음: {s.next}</Copy>:null}</CardView>)}
  {summaries.map(s=><CardView key={s.eventId} style={{padding:18,gap:8}}><Copy muted size={12}>Dot 학습 요약 · 버전 {s.revision}</Copy><Copy weight="700">{s.title}</Copy><Copy>{s.summary}</Copy>{s.questions.length?<Copy muted size={13}>남은 질문: {s.questions.join(' · ')}</Copy>:null}{s.nextAction?<Copy muted size={13}>다음: {s.nextAction}</Copy>:null}{s.sourceUrl?<Link label="원문 대화 열기" onPress={()=>void Linking.openURL(s.sourceUrl)}/>:null}</CardView>)}
  <Copy muted size={12}>공부 기록은 일기 본문과 별도로 보관해요. 대화 요약만으로 공부 시간을 추정하거나 보상을 주지 않아요.</Copy>
 </View>;
}
