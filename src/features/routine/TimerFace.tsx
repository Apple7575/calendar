import React from 'react';
import {Text,View} from 'react-native';
import Svg,{Circle} from 'react-native-svg';

export type TimerFaceColors={text:string;muted:string;accent:string;track:string};

/** 집중과 루틴이 함께 쓰는 원형 시계. 시간 계산은 부르는 쪽에서 하고, 여기서는 그리기만 한다. */
export function TimerFace({size,progress,time,caption,accessibilityLabel,colors,weight='300',fontRatio=.29,children,ticks,tickFill}:{ticks?:{at:number;done:boolean}[];tickFill?:string;size:number;progress:number;time:string;caption?:string;accessibilityLabel:string;colors:TimerFaceColors;weight?:'300'|'800';fontRatio?:number;children?:React.ReactNode}){
 const radius=size/2-7,circumference=2*Math.PI*radius,amount=Math.max(0,Math.min(1,progress));
 return <View style={{width:size,height:size,justifyContent:'center',alignItems:'center'}}>
  <Svg width={size} height={size} style={{position:'absolute'}} accessible={false}>
   <Circle cx={size/2} cy={size/2} r={radius} stroke={colors.track} strokeWidth={5} fill="none"/>
   <Circle cx={size/2} cy={size/2} r={radius} stroke={colors.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={[circumference,circumference]} strokeDashoffset={circumference*(1-amount)} rotation={-90} originX={size/2} originY={size/2}/>
   {ticks?.map(t=><Circle key={t.at} cx={size/2+radius*Math.sin(2*Math.PI*t.at)} cy={size/2-radius*Math.cos(2*Math.PI*t.at)} r={t.done?7:6} fill={t.done?colors.accent:tickFill??colors.track} stroke={t.done?colors.accent:colors.muted} strokeWidth={2}/>)}
  </Svg>
  <Text testID="timer-face-time" accessibilityRole="timer" accessibilityLabel={accessibilityLabel} style={{color:colors.text,fontSize:size*fontRatio,fontWeight:weight,fontVariant:['tabular-nums'],letterSpacing:-2}}>{time}</Text>
  {caption?<Text style={{color:colors.muted,fontSize:13}}>{caption}</Text>:null}
  {children}
 </View>;
}
