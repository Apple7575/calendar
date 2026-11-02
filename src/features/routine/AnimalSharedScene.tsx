import React,{useCallback,useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {BoriAnimation} from './BoriAnimation';
import {sharedClips,SharedClipId} from './animalAssets';
import {useReducedMotion} from './motion';
const noop=()=>{};
export function AnimalSharedLayer({id,animated=false}:{id:SharedClipId;animated?:boolean}){
 const focused=useIsFocused(),reduced=useReducedMotion(),[foreground,setForeground]=useState(AppState.currentState==='active'),[finished,setFinished]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove()},[]);
 const finish=useCallback(()=>setFinished(true),[]),fail=useCallback(()=>setFailed(true),[]),source=sharedClips[id]();
 return failed?null:<View testID={'shared-'+id} pointerEvents="none" style={{position:'absolute',top:0,left:0,right:0,bottom:0}}><BoriAnimation source={source} active={animated&&focused&&foreground&&!reduced&&!finished} loop={false} stillFrame={!animated?0:reduced?Math.floor((source.ip+source.op)/2):undefined} onFinish={animated?finish:noop} onFailure={fail} resizeMode="cover"/></View>;
}
export function AnimalSharedScene({tone='morning'}:{tone?:'morning'|'focus'|'evening'|'garden'|'rest'|'day'}){
 return <><AnimalSharedLayer id={(tone+'_back') as SharedClipId}/><AnimalSharedLayer id={(tone==='garden'?'garden_front':tone+'_floor') as SharedClipId}/></>;
}
