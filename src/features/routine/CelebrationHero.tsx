import React from 'react';
import {ImageBackground,Text,View} from 'react-native';
import {Mascot} from './ui';
export function CelebrationHero({title,subtitle,compact=false}:{title:string;subtitle?:string;compact?:boolean}){
 return <ImageBackground source={require('../../../assets/bori/celebration-sunburst-v1.png')} resizeMode="cover" imageStyle={{borderRadius:30}} style={{borderRadius:30,overflow:'hidden',alignItems:'center',paddingTop:compact?14:22,paddingHorizontal:16,paddingBottom:4}}>
  <Text accessibilityRole="header" style={{color:'#18264E',fontSize:compact?26:32,lineHeight:compact?34:40,fontWeight:'900',textAlign:'center',letterSpacing:-1}}>{title}</Text>
  {subtitle?<Text style={{color:'#4D4A38',fontSize:13,textAlign:'center',marginTop:5,fontWeight:'600'}}>{subtitle}</Text>:null}
  <View style={{alignItems:'center',marginTop:compact?-16:-10}}><Mascot size={compact?205:250} mood="celebrate"/></View>
 </ImageBackground>;
}
