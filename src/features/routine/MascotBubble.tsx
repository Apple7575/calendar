import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {koreanTitle,radii,space,type} from '../../theme/tokens';

/** The friend's question. With onClose, pressing it closes it. The tail points at the friend. */
export function MascotBubble({text,background,color,tail='down',onClose}:{text:string;background:string;color:string;tail?:'up'|'down';onClose?:()=>void}){
 const point=<View style={{alignSelf:'center',width:12,height:12,backgroundColor:background,transform:[{rotate:'45deg'}],marginVertical:-6,zIndex:1}}/>;
 return <Pressable testID="mascot-bubble" accessibilityRole={onClose?'button':'text'} accessibilityLiveRegion="polite" accessibilityHint={onClose?'누르면 질문을 닫아요':undefined} disabled={!onClose} onPress={onClose}>
  {tail==='up'?point:null}
  <View style={{backgroundColor:background,borderRadius:radii.control,paddingHorizontal:space.sm,paddingVertical:space.xs}}><Text {...koreanTitle.props} style={[{...type.label,fontWeight:'700',color,textAlign:'center'},koreanTitle.style]}>{text}</Text></View>
  {tail==='down'?point:null}
 </Pressable>;
}
