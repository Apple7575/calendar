import React from 'react';
import {View} from 'react-native';
import type {AdditionalPlan} from '../../lib/routineModel';
import {extraReceipt} from '../../lib/rewardReceipt';
import {useRoutine} from './RoutineProvider';
import {Copy} from './ui';
import {CelebrationHero} from './CelebrationHero';
import {RewardBalanceDetails} from './RewardBalanceDetails';
import {WordRewardProgress} from './WordRewardProgress';
export function AdditionalCompletionCard({plan,count,excluded=0}:{plan?:AdditionalPlan;count:number;excluded?:number}){
 const {data,dayKey}=useRoutine(),receipt=extraReceipt(data,dayKey,plan);
 return <View testID="study-batch-complete" style={{gap:12}}><CelebrationHero character="C02" action="A26" compact title={`${count}장,\n끝까지 해냈어요!`} subtitle="추가 학습 완료"/>
 <View style={{gap:5,alignItems:'center'}}><Copy muted size={12}>{receipt.tracked?'이번 추가 학습으로 받은 시간':'이전 분량 · 이번 지급 내역 없음'}</Copy><Copy size={38} weight="800">+{receipt.granted}분</Copy>{receipt.withheld>0?<Copy weight="700" size={14}>한도 때문에 적립되지 않은 시간 {receipt.withheld}분</Copy>:null}</View><WordRewardProgress excluded={excluded}/><Copy weight="700" size={14}>오늘 단어 보상 합계 +{receipt.budget.earned}분</Copy><Copy muted size={12}>기본 목표·추가 학습·짧은 복습을 합친 시간이에요. 순서·루틴·손글씨 보상은 별도예요.</Copy><RewardBalanceDetails/></View>;
}
