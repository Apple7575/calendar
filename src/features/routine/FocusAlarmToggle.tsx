import React from 'react';
import {AccessibilityInfo,Pressable} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {tapLight} from '../../lib/haptics';
import {control} from '../../theme/tokens';

/**
 * 휴식 끝 알람 종 (S1-21, 배치 Diana 확정). 한 번 누르면 켜고 끈다. 상태는 모양과 색으로 바로 보인다.
 * 켬: 채운 종 · 그 화면 강조색. 끔: 빗금 종 · 흐린 글자색. 바꾸면 VoiceOver가 "알람 켬/끔"을 읽는다.
 * 타이머 맨 아래 가운데 줄(focus-sound-row)에 소리 버튼(S1-22)과 나란히 둔다.
 */
export function FocusAlarmToggle({on,onChange,color,muted,surface}:{on:boolean;onChange:(on:boolean)=>void;color:string;muted:string;surface:string}){
 const press=()=>{tapLight();const next=!on;onChange(next);AccessibilityInfo.announceForAccessibility?.(next?'알람 켬':'알람 끔');};
 return <Pressable testID="rest-alarm-toggle" {...({dataSet:{on:on?'1':'0'}} as object)} accessibilityRole="switch" accessibilityState={{checked:on}} accessibilityLabel="휴식 끝 알람" onPress={press} style={({pressed})=>({width:control.touch,height:control.touch,borderRadius:control.touch/2,alignItems:'center',justifyContent:'center',backgroundColor:surface,transform:[{scale:pressed?.97:1}]})}>
  <Ionicons name={on?'notifications':'notifications-off-outline'} size={22} color={on?color:muted}/>
 </Pressable>;
}
