import React from 'react';
import {Modal,View} from 'react-native';
import type {AdditionalPlan} from '../../lib/routineModel';
import {extraReceipt} from '../../lib/rewardReceipt';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {useRoutine} from './RoutineProvider';
import {useTheme} from '../../theme/ThemeContext';
import {Action,Copy} from './ui';
import {CelebrationSurface,CelebrationLink} from './CelebrationSurface';
export function StudyFinishedCelebration({visible,plan,count,additional=true,onClose,onFinish}:{visible:boolean;plan?:AdditionalPlan;count:number;additional?:boolean;onClose:()=>void;onFinish:()=>void}){
 const {data,dayKey,native}=useRoutine(),{colors:c}=useTheme(),receipt=extraReceipt(data,dayKey,plan),wallet=timeWallet(getDay(data,dayKey),dayKey,native);
 if(!visible)return null;
 return <Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={onClose}><CelebrationSurface testID="study-finished-celebration" title={`${count}장,\n끝까지 해냈어요!`} subtitle={additional?'추가 학습 완료':'이번 학습 분량 완료'} onClose={onClose} footer={<><Action label="학습으로 돌아가기" onPress={onFinish}/><CelebrationLink label="더 공부하기" onPress={onClose}/></>}>
  <View style={{alignSelf:'stretch',backgroundColor:c.card,borderRadius:26,padding:16,alignItems:'center',gap:4}}><Copy muted size={12}>{additional?'이번 추가 학습으로 받은 시간':'이번 학습에서 새로 받은 시간'}</Copy><Copy weight="800" size={42}>+{receipt.granted}분</Copy>{receipt.withheld>0?<Copy size={13} weight="700">한도 때문에 미적립 {receipt.withheld}분</Copy>:null}<Copy size={13}>오늘 단어 {receipt.budget.earned} / {receipt.budget.cap}분</Copy><Copy size={13}>지금 사용 가능 {wallet.available}분</Copy><Copy muted size={12}>{!additional?'이번 덱의 학습 기록을 저장했어요. 오늘 기본 목표 보상은 별도로 한 번만 지급돼요.':receipt.withheld>0?'공부한 기록은 모두 저장했어요.':wallet.reason}</Copy></View>
 </CelebrationSurface></Modal>;
}
