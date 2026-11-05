import React from 'react';
import {emergencyUnlocksOn} from '../../lib/emergencyUnlock';
import {penaltyLabel} from '../../lib/focusPenalty';
import type {RoutineData} from '../../lib/routineModel';
import {CardView,Copy} from './ui';

const clock=(iso:string)=>new Date(iso).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
/** Each emergency unlock of a day, with its reason and penalty. */
export function EmergencyDayRecords({data,day}:{data:RoutineData;day:string}){
 const rows=emergencyUnlocksOn(data,day);
 if(!rows.length)return null;
 return <CardView>
  <Copy variant="label">긴급 해제</Copy>
  {rows.map(u=><React.Fragment key={u.id}>
   <Copy variant="caption" muted>{clock(u.at)+' · '+penaltyLabel({minutes:u.minutes,won:u.won})}</Copy>
   <Copy>{u.reason||'이유가 남지 않았어요'}</Copy>
  </React.Fragment>)}
 </CardView>;
}
