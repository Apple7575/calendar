import { BlurView } from 'expo-blur';
import React,{useEffect,useState} from 'react';
import { AccessibilityInfo, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grade,Rating } from 'ts-fsrs';
import { useTheme } from '../../theme/ThemeContext';
import { Action } from './ui';

export function StudyRatingBar({revealed,busy,onReveal,onAnswer,interval,revealLabel='정답 보기'}:{revealed:boolean;busy:boolean;onReveal:()=>void;onAnswer:(grade:Grade)=>void;interval:(grade:Grade)=>string;revealLabel?:string}) {
  const {colors:c,isDark}=useTheme(),insets=useSafeAreaInsets();const [opaque,setOpaque]=useState(false);
  useEffect(()=>{let live=true;if(Platform.OS==='ios')void AccessibilityInfo.isReduceTransparencyEnabled().then(value=>{if(live)setOpaque(value)}).catch(()=>{});
    const listener=AccessibilityInfo.addEventListener('reduceTransparencyChanged',setOpaque);return()=>{live=false;listener.remove()};},[]);
  if(!revealed)return <View style={{marginBottom:Math.max(insets.bottom,12)}}><Action label={revealLabel} accessibilityLabel={revealLabel} disabled={busy} onPress={onReveal}/></View>;
  return <View style={{marginBottom:Math.max(insets.bottom,12),borderRadius:26,shadowColor:c.shadow,shadowOpacity:0.1,shadowRadius:18,shadowOffset:{width:0,height:5}}}>
    <BlurView intensity={opaque?100:18} tint={isDark?'systemUltraThinMaterialDark':'systemUltraThinMaterialLight'} style={{borderRadius:26,overflow:'hidden',padding:6,borderWidth:1,borderColor:isDark?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.75)',backgroundColor:opaque?c.card:isDark?'rgba(20,25,34,0.16)':'rgba(255,255,255,0.12)'}}>
      <View style={{flexDirection:'row',gap:4}}>{([[Rating.Again,'다시'],[Rating.Hard,'어려움'],[Rating.Good,'좋음'],[Rating.Easy,'쉬움']]as const).map(([grade,label])=><Pressable key={grade} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>onAnswer(grade)}
        style={({pressed})=>({flex:1,minHeight:66,borderRadius:20,alignItems:'center',justifyContent:'center',gap:5,opacity:busy?0.45:1,backgroundColor:pressed?c.primarySoft:isDark?'rgba(255,255,255,0.045)':'rgba(255,255,255,0.2)'})}>
        <Text style={{color:c.text,fontSize:15,fontWeight:'700'}}>{label}</Text><Text style={{color:c.textMuted,fontSize:12}}>{interval(grade)}</Text>
      </Pressable>)}</View>
    </BlurView>
  </View>;
}
