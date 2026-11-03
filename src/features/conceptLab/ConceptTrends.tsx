import React from 'react';
import {conceptTrends} from '../../lib/conceptGeneration';
import {LabState} from '../../lib/conceptLabTypes';
import {CardView,Copy} from '../routine/ui';
const rate=(n:{correct:number;total:number})=>n.total?`${Math.round(n.correct/n.total*100)}% (${n.correct}/${n.total})`:'기록 없음';
export function ConceptTrends({data}:{data:LabState}){
 const trends=conceptTrends(data),active=trends.filter(t=>t.current.total+t.previous.total>0);
 return <><Copy size={21} weight="700">개념별 변화</Copy><Copy muted size={12}>최근 7일과 그 이전 7일 · 자기 평가 기준 · 각 기간 3회 이상일 때 변화 표시</Copy>{!active.length?<Copy muted>학습 후 개념별 변화를 확인할 수 있어요.</Copy>:null}{active.map(t=><CardView key={t.id}>
  <Copy weight="700">{t.label}</Copy><Copy>{t.status==='insufficient'?'비교할 기록이 아직 적어요':t.status==='improved'?`자기 평가 향상 · +${t.change}%p`:t.status==='declined'?`최근 더 어려움 · ${t.change}%p`:`비슷한 수준 · ${t.change}%p`}</Copy>
  <Copy size={13}>이전 {rate(t.previous)} → 최근 {rate(t.current)}</Copy><Copy muted size={12}>새 문제 첫 응답: 이전 {rate(t.previous.novelFirst)} → 최근 {rate(t.current.novelFirst)}</Copy>
  <Copy muted size={12}>이전 {t.previous.days}일·{t.previous.cards}문제 / 최근 {t.current.days}일·{t.current.cards}문제에서 평가</Copy>
  <Copy muted size={12}>힌트 없이 정답: 이전 {t.previous.unassisted}/{t.previous.total} → 최근 {t.current.unassisted}/{t.current.total}</Copy>
  {Object.entries(t.abilities).map(([key,value])=><Copy muted key={key} size={12}>{value.label}: {rate(value.previous)} → {rate(value.current)}</Copy>)}
 </CardView>)}{trends.length>active.length?<Copy muted size={12}>최근 비교 기간에 기록 없는 개념 {trends.length-active.length}개</Copy>:null}</>;
}
