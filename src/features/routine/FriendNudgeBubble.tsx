import React,{useCallback,useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {FriendNudge,NudgeClosed,NudgeSlot} from '../../lib/friendNudge';
import {control,radii,space,type} from '../../theme/tokens';
import {Icon} from './ui';
import {PriorityButton,usePriorityVisuals} from './PriorityUI';

/** 닫은 말풍선 칸. 화면 표시용 키 하나에만 저장하고 보상·잠금·사진 계산은 읽지 않는다. */
const CLOSED_KEY='friendNudge.closed.v1';
export function useNudgeClosed(dayKey:string){
 const [closed,setClosed]=useState<NudgeClosed>(null);
 useEffect(()=>{let live=true;AsyncStorage.getItem(CLOSED_KEY).then(raw=>{if(!live||!raw)return;try{const v=JSON.parse(raw);if(v&&typeof v.day==='string'&&Array.isArray(v.slots))setClosed(v)}catch{}}).catch(()=>{});return()=>{live=false}},[]);
 const close=useCallback((slot:NudgeSlot)=>{setClosed(prev=>{const next={day:dayKey,slots:prev?.day===dayKey?[...prev.slots.filter(s=>s!==slot),slot]:[slot]};AsyncStorage.setItem(CLOSED_KEY,JSON.stringify(next)).catch(()=>{});return next})},[dayKey]);
 return {closed,close};
}

/** 오늘 탭 친구의 말풍선. 행동 버튼은 아래 카드의 기존 시작 버튼이고, 그 버튼이 없을 때만 action을 함께 보여 준다. */
export function FriendNudgeBubble({nudge,onClose,action}:{nudge:FriendNudge;onClose:()=>void;action?:{label:string;onPress:()=>void}}){
 const p=usePriorityVisuals();
 return <View testID={'friend-nudge-'+nudge.slot} accessibilityLiveRegion="polite" style={{alignSelf:'stretch',marginBottom:space.xs}}>
  <View style={{backgroundColor:p.paper,borderRadius:radii.card,paddingLeft:space.md,paddingVertical:space.sm,gap:space.xs}}>
   <View style={{flexDirection:'row',alignItems:'flex-start',gap:space.xs}}>
    <View style={{flex:1,minWidth:0,gap:2,paddingTop:space.xxs}}><Text style={[type.label,{color:p.ink}]}>{nudge.title}</Text><Text style={[type.body,{color:p.muted}]}>{nudge.detail}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="말풍선 닫기" onPress={onClose} style={{width:control.touch,height:control.touch,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={20} color={p.muted}/></Pressable>
   </View>
   {action?<View style={{paddingRight:space.md}}><PriorityButton label={action.label} onPress={action.onPress}/></View>:null}
  </View>
  <View style={{alignSelf:'center',width:0,height:0,borderLeftWidth:10,borderRightWidth:10,borderTopWidth:10,borderLeftColor:'transparent',borderRightColor:'transparent',borderTopColor:p.paper}}/>
 </View>;
}
