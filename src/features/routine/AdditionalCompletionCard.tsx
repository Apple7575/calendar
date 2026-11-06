import React from 'react';
import {View} from 'react-native';
import type {AdditionalPlan} from '../../lib/routineModel';
import {extraReceipt} from '../../lib/rewardReceipt';
import {useRoutine} from './RoutineProvider';
import {Copy,Mascot,u} from './ui';
import {RewardBalanceDetails} from './RewardBalanceDetails';
import {WordRewardProgress} from './WordRewardProgress';
export function AdditionalCompletionCard({plan,count,excluded=0}:{plan?:AdditionalPlan;count:number;excluded?:number}){
 const {data,dayKey}=useRoutine(),receipt=extraReceipt(data,dayKey,plan);
 return <View testID="study-batch-complete" style={{gap:12}}><View style={[u.row,{gap:8}]}><Mascot size={36} action="A26"/><Copy size={14} weight="700">추가 {count}장 완료</Copy></View>
 <View style={{gap:5,alignItems:'center'}}><Copy muted size={12}>{receipt.tracked?'이번 추가 학습으로 받은 시간':'이전 분량 · 이번 지급 내역 없음'}</Copy><Copy size={38} weight="800">+{receipt.granted}분</Copy>{receipt.withheld>0?<Copy weight="700" size={14}>한도 때문에 적립되지 않은 시간 {receipt.withheld}분</Copy>:null}</View><WordRewardProgress excluded={excluded}/><Copy weight="700" size={14}>오늘 단어 보상 합계 +{receipt.budget.earned}분</Copy><Copy muted size={12}>기본 목표·추가 학습·짧은 복습을 합친 시간이에요. 순서·루틴·손글씨 보상은 별도예요.</Copy><RewardBalanceDetails/></View>;
}
