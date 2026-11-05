import React,{useState} from 'react';
import {RootScreenProps} from '../../navigation/types';
import {HandwritingLog} from './HandwritingLog';
import {PriorityHistoryCard} from './PriorityHistoryCard';
import {useRoutine} from './RoutineProvider';
import {Segments} from './experience';
import {CardView,Copy,Page} from './ui';

export type StudyLogTab='priority'|'focus'|'writing';

/** 기록 탭 통계에서 들어오는 긴 목록. 표시 개수와 내용은 예전 통계 칸과 같다. */
export function StudyLogScreen({route}:RootScreenProps<'StudyLog'>){
 const {data}=useRoutine(),[tab,setTab]=useState<StudyLogTab>(route.params?.tab??'focus'),sessions=(data.bookSessions??[]).filter(s=>s.savedAt);
 const hasPriority=Object.keys(data.priorityDays??{}).length>0;
 return <Page title="공부 기록">
  <Segments value={tab} onChange={setTab} items={[...(hasPriority?[{id:'priority' as const,label:'중요한 일'}]:[]),{id:'focus' as const,label:'집중'},{id:'writing' as const,label:'필기'}]}/>
  {tab==='priority'?<PriorityHistoryCard/>:tab==='writing'?<HandwritingLog/>:<><CardView><Copy size={24} weight="800">집중 {Math.round(sessions.reduce((sum,s)=>sum+s.seconds,0)/60)}분</Copy><Copy muted>한 줄 기록을 남긴 {sessions.length}세트</Copy></CardView>{[...sessions].reverse().slice(0,30).map(s=><CardView key={s.id}><Copy weight="700">{s.subject} · {Math.round(s.seconds/60)}분</Copy><Copy muted size={12}>{new Date(s.completedAt).toLocaleString('ko-KR')}</Copy><Copy>{s.note}</Copy>{s.next?<Copy muted size={12}>다음: {s.next}</Copy>:null}</CardView>)}</>}
 </Page>;
}
