import React,{useState} from 'react';
import {SPEAKING_POLICY,SPEAKING_UNCOUNTED_TEXT,speakingRecords,type SpeakingRecord} from '../../lib/speaking';
import {speakingTopic} from '../../lib/speakingTopics';
import type {RoutineData} from '../../lib/routineModel';
import {CardView,Copy,Link} from './ui';

function Row({record:r}:{record:SpeakingRecord}){
 const [open,setOpen]=useState(false),minutes=r.minutes??0,credited=r.creditedChars??0;
 const reward=r.status!=='settled'?'아직 마치지 않았어요':credited.toLocaleString('ko-KR')+'자 인정'+(minutes?' · '+minutes+'분 · '+(minutes*SPEAKING_POLICY.wonPerMinute).toLocaleString('ko-KR')+'원':'');
 return <CardView>
  <Copy variant="caption" muted>{r.topicTitle+' · '+reward}</Copy>
  <Copy variant="label">{r.question}</Copy>
  {open?<>
   <Copy variant="caption" muted>내가 말한 내용</Copy><Copy>{r.answer}</Copy>
   {r.feedback?<><Copy variant="caption" muted>잘한 점</Copy><Copy>{r.feedback.good}</Copy><Copy variant="caption" muted>{speakingTopic(r.topicId)?.missedLabel??'빠뜨린 점'}</Copy><Copy>{r.feedback.missed}</Copy><Copy variant="caption" muted>되묻는 질문</Copy><Copy>{r.feedback.followUp}</Copy></>:null}
   {r.followUpAnswer?<><Copy variant="caption" muted>되묻는 질문에 한 답</Copy><Copy>{r.followUpAnswer}</Copy></>:null}
   {r.uncounted?<Copy variant="caption" muted>{SPEAKING_UNCOUNTED_TEXT[r.uncounted]}</Copy>:null}
  </>:null}
  <Link label={open?'접기':'말한 내용 보기'} onPress={()=>setOpen(v=>!v)}/>
 </CardView>;
}
/** What was said on a day, by the day it was said. The most recent 100 are kept. */
export function SpeakingDayRecords({data,day}:{data:RoutineData;day:string}){
 const rows=speakingRecords(data).filter(r=>r.day===day);
 if(!rows.length)return null;
 return <>{rows.map(r=><Row key={r.id} record={r}/>)}</>;
}
