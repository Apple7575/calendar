import type {RoutineData,Unit,Level,AdditionalPlan} from './routineModel';
import {getDay,FULL,MIN} from './routineModel';
import {wordRewardBudget,wordRewardStatus} from './studyRewards';
export function goalReceipt(data:RoutineData,key:string,unit:Unit,level:Level,added:number){
 const day=getDay(data,key),granted=Math.max(0,added),target=FULL[unit];
 return {granted,goalTotal:day.paid[unit],target,reason:unit==='words'?`${wordRewardStatus(data,key).untilNext}장 더 완료하면 +5분이에요. 기본·추가 학습을 함께 계산해요.`:granted===0?'이 목표의 보상은 이미 받았어요. 다시 열거나 완료해도 중복 지급되지 않아요.':level==='min'?`작은 목표 보상이에요. 전체 완료 시 ${FULL[unit]-MIN[unit]}분을 더 받을 수 있어요.`:day.paid[unit]>granted?'작은 목표에서 받은 시간을 제외한 차액을 적립했어요.':'이번 실천 보상을 적립했어요.',wordBudget:unit==='words'?wordRewardBudget(data,key):undefined};
}
export function extraReceipt(data:RoutineData,key:string,plan:AdditionalPlan|undefined){
 const budget=wordRewardBudget(data,key),reward=plan?.reward;
 const reason=`${wordRewardStatus(data,key).untilNext}장 더 완료하면 +5분이에요. 다음 구간은 5장 늘어나고 새벽 4시에 초기화돼요.`;
 return {granted:reward?.granted??0,withheld:reward?.withheld??0,tracked:!!reward,reason,budget};
}
