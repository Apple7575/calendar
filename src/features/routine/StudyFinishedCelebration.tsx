import React from 'react';
import {Modal,View} from 'react-native';
import type {AdditionalPlan} from '../../lib/routineModel';
import {extraReceipt} from '../../lib/rewardReceipt';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {useRoutine} from './RoutineProvider';
import {useTheme} from '../../theme/ThemeContext';
import {Action,Copy} from './ui';
import {CelebrationSurface} from './CelebrationSurface';
import {WordRewardProgress} from './WordRewardProgress';
export function StudyFinishedCelebration({visible,plan,count,granted,excluded=0,additional=true,onClose}:{visible:boolean;granted?:number;excluded?:number;plan?:AdditionalPlan;count:number;additional?:boolean;onClose:()=>void}){
 const {data,dayKey,native}=useRoutine(),{colors:c}=useTheme(),receipt=extraReceipt(data,dayKey,plan),wallet=timeWallet(getDay(data,dayKey),dayKey,native);
 if(!visible)return null;
 return <Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={onClose}><CelebrationSurface action="A26" detailedResult testID="study-finished-celebration" title={`${count}장,\n끝까지 해냈어요!`} subtitle={additional?'추가 학습 완료':'이번 학습 분량 완료'} onClose={onClose} footer={<Action label="더 공부하기" onPress={onClose}/>}>
  <View style={{alignSelf:'stretch',backgroundColor:c.card,borderRadius:26,padding:16,alignItems:'center',gap:4}}><Copy muted size={12}>{additional?'이번 추가 학습으로 받은 시간':'이번 학습에서 새로 받은 시간'}</Copy><Copy weight="800" size={42}>+{granted??receipt.granted}분</Copy>{receipt.withheld>0?<Copy size={13} weight="700">한도 때문에 미적립 {receipt.withheld}분</Copy>:null}<Copy size={13}>오늘 단어 합계 +{receipt.budget.earned}분</Copy><Copy size={13}>지금 사용 가능 {wallet.available}분</Copy><Copy muted size={12}>{!additional?'완료한 카드가 보상 분량에 쌓였어요.':receipt.withheld>0?'공부한 기록은 모두 저장했어요.':wallet.reason}</Copy></View>
  <WordRewardProgress excluded={excluded}/>
 </CelebrationSurface></Modal>;
}
