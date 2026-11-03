import React,{ReactNode,useEffect,useRef} from 'react';
import {Animated,Pressable,useWindowDimensions} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {CardView} from './ui';
import {useReducedMotion} from './motion';

/** Shared visual shell only. Owners keep their own data, audio, menus and scheduling. */
export function StudyCardSurface({children,overlay,revealed,onReveal,fill=false,canReveal=true}:{children:ReactNode;overlay?:ReactNode;revealed:boolean;onReveal:()=>void;fill?:boolean;canReveal?:boolean}){
 const {colors:c}=useTheme(),{height}=useWindowDimensions(),compact=height<760,reduced=useReducedMotion();
 const entrance=useRef(new Animated.Value(reduced?1:0)).current;
 useEffect(()=>{if(reduced){entrance.setValue(1);return;}const animation=Animated.timing(entrance,{toValue:1,duration:160,useNativeDriver:true});animation.start();return()=>animation.stop();},[entrance,reduced]);
 return <Animated.View style={{flexGrow:fill?1:0,opacity:entrance,transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[4,0]})}]}}>
  <Pressable testID="study-card-surface" style={{flexGrow:fill?1:0}} onPress={()=>{if(!revealed&&canReveal)onReveal();}} accessible={false}>
   <CardView style={{flexGrow:fill?1:0,padding:compact?16:20,gap:10,paddingBottom:fill?110:compact?16:20,minHeight:revealed?0:compact?270:310,borderWidth:1,borderColor:c.border,borderRadius:28}}>{children}</CardView>
  </Pressable>
  {overlay}
 </Animated.View>;
}
