import type {RoutineData,Unit,Level,AdditionalPlan} from './routineModel';
import {getDay,FULL,MIN} from './routineModel';
import {wordRewardBudget,extraRewardsEnabled} from './studyRewards';
export function goalReceipt(data:RoutineData,key:string,unit:Unit,level:Level,added:number){
 const day=getDay(data,key),granted=Math.max(0,added),target=FULL[unit];
 return {granted,goalTotal:day.paid[unit],target,reason:granted===0?'이 목표의 보상은 이미 받았어요. 다시 열거나 완료해도 중복 지급되지 않아요.':level==='min'?`작은 목표 보상이에요. 전체 완료 시 ${FULL[unit]-MIN[unit]}분을 더 받을 수 있어요.`:day.paid[unit]>granted?'작은 목표에서 받은 시간을 제외한 차액을 적립했어요.':'이번 실천 보상을 적립했어요.',wordBudget:unit==='words'?wordRewardBudget(data,key):undefined};
}
export function extraReceipt(data:RoutineData,key:string,plan:AdditionalPlan|undefined){
 const budget=wordRewardBudget(data,key),reward=plan?.reward;
 const reason=reward?.withheld?`오늘 단어 보상 한도 때문에 ${reward.withheld}분은 적립하지 못했어요. 학습 기록은 모두 남았어요.`:plan?.kind==='quick'&&reward?.granted?'짧은 복습 3장 완료 보상 2분을 적립했어요.':!extraRewardsEnabled(data)?'추가 단어 보상이 꺼져 있어 이번 학습에는 시간을 적립하지 않아요.':budget.remaining<5?`오늘 단어 추가 보상 한도에 도달했어요.${getDay(data,key).paid.words<20?' 기본 목표 보상은 별도로 남아 있어요.':''}`:`${10-(getDay(data,key).extraPendingIds?.length??0)}장 더 완료하면 +5분이에요. 남은 분량은 다음 추가 학습에 이어져요.`;
 return {granted:reward?.granted??0,withheld:reward?.withheld??0,tracked:!!reward,reason,budget};
}
