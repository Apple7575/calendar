import {characterForAction} from './animalCast';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {MascotVisible} from './mascotVisibility';
import {AppState,Pressable,Text,View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useReducedMotion} from './motion';
import {BoriAnimation} from './BoriAnimation';
import type {BoriStage,BoriState,MascotMood} from './boriAssets';
import {animalCharacters,animalClip,loadAnimalClip,AnimalActionId,AnimalCharacterId} from './animalAssets';
import {animalActionForMood,legacyAnimalActions} from './animalScene';
import {useAnimalCharacter} from '../../lib/animalPreference';
import {tapLight} from '../../lib/haptics';
import {useOptionalRoutine} from './RoutineProvider';
import {boriStageRank} from '../../lib/boriGrowth';

/** Existing screen API retained; animal identity is independent of recorded growth. */
export type BoriMascotProps={size?:number;happy?:boolean;mood?:MascotMood;state?:BoriState;stage?:BoriStage;frame?:number;action?:AnimalActionId;character?:AnimalCharacterId;staticPose?:boolean;interactive?:boolean};
export function BoriMascot({size=85,happy=false,mood,state,frame,action,character,staticPose=false,interactive=true}:BoriMascotProps){
 const selected=useAnimalCharacter(),reduced=useReducedMotion(),focused=useIsFocused();
 const routine=useOptionalRoutine(),growth=routine?.data.boriStage??'sprout',previousGrowth=useRef(growth);
 const [foreground,setForeground]=useState(AppState.currentState==='active'),[transient,setTransient]=useState<AnimalActionId|null>(null),[completed,setCompleted]=useState(''),[failed,setFailed]=useState(''),[retry,setRetry]=useState(0);
 const requested=action??(state?legacyAnimalActions[state]:animalActionForMood(mood??(happy?'proud':undefined)));
 const id=character??characterForAction(requested,selected);
 useEffect(()=>{if(!action&&boriStageRank[growth]>boriStageRank[previousGrowth.current])setTransient(growth==='blooming'?'A48':'A47');previousGrowth.current=growth},[growth,action]);
 useEffect(()=>{setTransient(null)},[requested,id]);
 useEffect(()=>{const listener=AppState.addEventListener('change',next=>setForeground(next==='active'));return()=>listener.remove()},[]);
 const celebration=/^A(2[4-9]|30)$/.test(requested);
 // Play the big celebration once, then stay alive with the manifest's idle loop.
 const settledAction=!animalClip(id,requested).loop&&completed===id+':'+requested+':'+retry;
 const current=transient??(settledAction?'A01':requested),clip=animalClip(id,current),source=loadAnimalClip(id,current),key=id+':'+current+':'+retry;
 const still=frame??(staticPose||reduced?clip.poster_frame:undefined);
 const visible=React.useContext(MascotVisible);
 const active=visible&&focused&&foreground&&still===undefined&&completed!==key&&failed!==key;
 const finish=useCallback(()=>{setCompleted(key);if(transient)setTransient(null)},[key,transient]);
 const fail=useCallback(()=>setFailed(key),[key]);
 const name=animalCharacters.find(c=>c.id===id)!.name;
 return <Pressable pointerEvents={interactive?'auto':'none'} testID={'animal-'+id+'-'+current} accessibilityRole={!interactive||celebration||still!==undefined?'image':'button'}
  accessibilityLabel={name+' · '+clip.name+(still!==undefined?' · 대표 정지 프레임':'')} accessibilityHint={celebration||still!==undefined?undefined:'누르면 터치에 반응해요'}
  disabled={!interactive||celebration||still!==undefined||!focused||!foreground} onPress={()=>{setRetry(n=>n+1);if(failed===key)return;tapLight();setTransient(transient==='A06'?'A07':'A06')}}
  style={{width:size,height:size,overflow:'hidden'}}>
  <View pointerEvents="none" style={{width:'100%',height:'100%'}}>
   {failed===key?<Text style={{textAlign:'center',padding:8,fontSize:12}}>친구를 불러오지 못했어요.</Text>:<BoriAnimation key={key} source={source} loop={clip.loop} active={active} stillFrame={still} onFinish={finish} onFailure={fail}/>}
  </View>
 </Pressable>;
}
