import React from 'react';
import {promiseOutcomesOn} from '../../lib/commitments';
import type {RoutineData} from '../../lib/routineModel';
import {CardView,Copy} from './ui';

/** Tomorrow's-promise results settled on a day. A missed one is charged without a confirm step, so it is said here. */
export function PromiseDayRecords({data,day}:{data:RoutineData;day:string}){
 const rows=promiseOutcomesOn(data,day);
 if(!rows.length)return null;
 return <CardView>
  <Copy variant="label">내일 약속</Copy>
  {rows.map(r=><Copy key={r.promiseDay}>{r.label}</Copy>)}
 </CardView>;
}
