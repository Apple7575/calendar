import React from 'react';
import {useRoutine} from './RoutineProvider';
import {CardView,Copy} from './ui';
export function HandwritingLog(){const {data}=useRoutine(),rows=data.handwritingReceipts??[];return <><CardView><Copy size={23} weight="800">손으로 남긴 {rows.reduce((n,r)=>n+r.units,0).toLocaleString()}자</Copy><Copy muted>{rows.length}장 기록 · 누적 적립 {rows.reduce((n,r)=>n+r.minutes,0)}분</Copy><Copy muted size={12}>적립한 시간의 누계예요. 현재 이용 가능한 잔액은 시간 보관함에서 확인해요.</Copy></CardView>{rows.slice(-30).reverse().map(r=><CardView key={r.id}><Copy weight="700">{r.subject} · {r.units}자 · +{r.minutes}분</Copy><Copy muted size={12}>{new Date(r.at).toLocaleString('ko-KR')}</Copy><Copy>{r.lines.join('\n')}</Copy></CardView>)}</>}
