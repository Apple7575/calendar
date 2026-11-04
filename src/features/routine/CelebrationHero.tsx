import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
import {AnimalSharedLayer} from './AnimalSharedScene';
import React from 'react';
import {Text,View} from 'react-native';
import {Mascot} from './ui';
import {useTheme} from '../../theme/ThemeContext';
export function CelebrationHero({title,subtitle,compact=false,action='A25',character}:{title:string;subtitle?:string;compact?:boolean;action?:AnimalActionId;character?:AnimalCharacterId}){
 const {colors:c,isDark}=useTheme();
 return <View style={{borderRadius:30,overflow:'hidden',alignItems:'center',paddingTop:compact?14:22,paddingHorizontal:16,paddingBottom:4}}>
  <AnimalSharedLayer id="celebration_effects"/>
  <Text accessibilityRole="header" style={{color:isDark?c.primary:'#18264E',fontSize:compact?26:32,lineHeight:compact?34:40,fontWeight:'900',textAlign:'center',letterSpacing:-1}}>{title}</Text>
  {subtitle?<Text style={{color:isDark?c.textMuted:'#4D4A38',fontSize:13,textAlign:'center',marginTop:5,fontWeight:'600'}}>{subtitle}</Text>:null}
  <View style={{alignItems:'center',marginTop:compact?-16:-10}}><Mascot size={compact?205:250} action={action} character={character}/></View>
 </View>;
}
