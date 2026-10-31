import React from 'react';
import { Modal } from 'react-native';
import { Action } from './ui';
import {CelebrationSurface} from './CelebrationSurface';

/** Brief full-screen encouragement between cards; X immediately resumes learning. */
export function StudyCelebration({count,onContinue}:{count:number|null;onContinue:()=>void}){
  if(count===null)return null;
  return <Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={onContinue}>
    <CelebrationSurface testID="study-milestone" milestone title={`벌써 ${count}장\n해냈어요!`} subtitle="한 장씩, 기억이 쌓이고 있어요." onClose={onContinue} footer={<Action label="좋아요, 계속할게요" onPress={onContinue}/>}/>
  </Modal>;
}
