import React from 'react';
import {CONTENT_PLATFORMS,contentIdeas,contentUploadsOn} from '../../lib/content';
import type {RoutineData} from '../../lib/routineModel';
import {CardView,Copy} from './ui';

/** What was uploaded on a day. */
export function ContentDayRecords({data,day}:{data:RoutineData;day:string}){
 const rows=contentUploadsOn(data,day);
 if(!rows.length)return null;
 const ideas=contentIdeas(data);
 return <CardView>
  <Copy variant="label">콘텐츠 업로드</Copy>
  {rows.map(u=><React.Fragment key={u.id}>
   <Copy variant="caption" muted>{(CONTENT_PLATFORMS.find(p=>p.id===u.platform)?.title??'')+' · '+(u.rewarded?'+'+u.minutes/60+'시간 · '+u.won.toLocaleString('ko-KR')+'원':'기록만 남겼어요')}</Copy>
   <Copy numberOfLines={1}>{ideas.find(i=>i.id===u.ideaId)?.text??u.url.replace('https://www.','')}</Copy>
  </React.Fragment>)}
 </CardView>;
}
