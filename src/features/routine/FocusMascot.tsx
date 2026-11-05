import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {focusMascotCue,type FocusMascotCue,type FocusMascotFrame} from '../../lib/focusMascotCue';
import {animalClip,loadAnimalClip,type AnimalActionId} from './animalAssets';
import {BoriAnimation} from './BoriAnimation';
import {useReducedMotion} from './motion';

const CHARACTER='C03';
const CUE_ACTIONS:Record<FocusMascotCue,AnimalActionId>={start:'A31',stage:'A22',break:'A39'};
/** 재생 끝 알림이 오지 않아도 다시 멈추도록 클립 길이에 더하는 여유. */
const FINISH_GRACE_MS=1000;

/** 집중 타이머의 수달. 정해진 순간에 한 번만 움직이고 나머지는 멈춰 있다. 불러오지 못해도 타이머와는 상관없다. */
export function FocusMascot({frame,size}:{frame:FocusMascotFrame;size:number}){
 const reduced=useReducedMotion(),previous=useRef<FocusMascotFrame|null>(null),count=useRef(0),[playing,setPlaying]=useState<{action:AnimalActionId;id:number}|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const cue=focusMascotCue(previous.current,frame);previous.current=frame;if(cue){count.current+=1;setFailed(false);setPlaying({action:CUE_ACTIONS[cue],id:count.current})}},[frame.timerId,frame.phase,frame.credit,frame.elapsed]);
 useEffect(()=>{if(!playing)return;const id=setTimeout(()=>setPlaying(null),animalClip(CHARACTER,playing.action).duration_seconds*1000+FINISH_GRACE_MS);return()=>clearTimeout(id)},[playing]);
 const rest:AnimalActionId=frame.phase==='break'?'A39':'A31',moving=!!playing&&!reduced,action=moving?playing!.action:rest;
 if(failed)return null;
 return <View testID={'focus-mascot-'+(moving?'moving-':'still-')+action} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:size,height:size}}>
  <BoriAnimation key={moving?action+':'+playing!.id:'still:'+action} source={loadAnimalClip(CHARACTER,action)} loop={false} active={moving} stillFrame={moving?undefined:animalClip(CHARACTER,action).poster_frame} onFinish={()=>setPlaying(null)} onFailure={()=>setFailed(true)}/>
 </View>;
}
