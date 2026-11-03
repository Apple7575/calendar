import React,{ReactNode,useEffect,useRef} from 'react';
import {Animated,Pressable,useWindowDimensions} from 'react-native';
import {useTheme} from '../../theme/ThemeContext';
import {CardView} from './ui';
import {useReducedMotion} from './motion';
import {radii,space} from '../../theme/tokens';

/** Shared visual shell only. Owners keep their own data, audio, menus and scheduling. */
export function StudyCardSurface({children,overlay,revealed,onReveal,fill=false,canReveal=true,animate=true,hug=false}:{children:ReactNode;overlay?:ReactNode;revealed:boolean;onReveal:()=>void;fill?:boolean;canReveal?:boolean;animate?:boolean;hug?:boolean}){
 const {colors:c}=useTheme(),{height}=useWindowDimensions(),compact=height<760,reduced=useReducedMotion();
 const entrance=useRef(new Animated.Value(reduced||!animate?1:0)).current;
 useEffect(()=>{if(reduced||!animate){entrance.setValue(1);return;}const animation=Animated.timing(entrance,{toValue:1,duration:160,useNativeDriver:true});animation.start();return()=>animation.stop();},[entrance,reduced,animate]);
 return <Animated.View style={{flexGrow:fill?1:0,opacity:entrance,transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[4,0]})}]}}>
  <Pressable testID="study-card-surface" style={{flexGrow:fill?1:0}} onPress={()=>{if(!revealed&&canReveal)onReveal();}} accessible={false}>
   <CardView style={{flexGrow:fill?1:0,padding:compact?space.md:space.lg,gap:space.sm,paddingBottom:fill?110:compact?space.md:space.lg,minHeight:revealed||hug?0:compact?270:310,borderColor:c.border,borderRadius:radii.stage}}>{children}</CardView>
  </Pressable>
  {overlay}
 </Animated.View>;
}
