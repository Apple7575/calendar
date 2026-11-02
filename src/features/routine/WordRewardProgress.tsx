import React from 'react';
import {View} from 'react-native';
import {wordRewardStatus} from '../../lib/studyRewards';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Copy,Progress} from './ui';

/** Reward progress is independent of a batch finishing or cards being excluded. */
export function WordRewardProgress({excluded=0}:{excluded?:number}){
 const {data,dayKey}=useRoutine(),{colors:c}=useTheme(),reward=wordRewardStatus(data,dayKey);
 return <View testID="word-reward-progress" style={{alignSelf:'stretch',padding:14,borderRadius:18,backgroundColor:c.primarySoft,gap:5}}>
  <Copy size={17} weight="800">다음 5분까지 {reward.untilNext}장</Copy>
  <Copy size={12}>이번 보상 구간 {reward.pending}/{reward.required}장 완료</Copy>
  <Progress value={reward.pending/reward.required} label={`다음 5분 보상까지 ${reward.untilNext}장 남음`}/>
  {excluded>0?<Copy muted size={12}>제외된 {excluded}장은 완료 수에 포함하지 않았어요.</Copy>:null}
  <Copy muted size={12}>남은 분량은 오늘 이어서 채울 수 있어요.</Copy>
 </View>;
}
