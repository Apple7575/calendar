import {AnimalSharedScene} from './AnimalSharedScene';
import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
import React,{ReactNode} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {tapLight} from '../../lib/haptics';
import {Copy,Icon,Mascot,ProfileButton,u} from './ui';
import {priorityVisuals} from '../../theme/themes';
import {control,radii,space,type} from '../../theme/tokens';
import {MascotMood} from './boriAssets';
export type SceneTone='morning'|'focus'|'evening';
export function useScene(tone:SceneTone='morning'){
 const theme=useTheme(),{isDark,colors:c}=theme,stage=priorityVisuals(theme);
 if(isDark)return {sky:stage.stage,ground:stage.stage,ink:c.text,muted:c.textMuted,bubble:c.card,accent:c.primary,soft:stage.stageDot};
 if(tone==='evening')return {sky:'#292C4D',ground:'#45436A',ink:'#FAF5EB',muted:'#D3CFE5',bubble:'#393959',accent:'#D5C5EF',soft:'#3A3F42'};
 return tone==='focus'?{sky:'#ECF2DC',ground:'#D9E6BC',ink:c.text,muted:c.textMuted,bubble:'#FFFEF8',accent:'#347B50',soft:'#E5EDD5'}:{sky:stage.stage,ground:stage.stageDot,ink:c.text,muted:stage.stageInk,bubble:'#FFFCF3',accent:stage.stageInk,soft:'#F7E8D3'};
}
export const SettingsButton=ProfileButton;
export function Segments<T extends string>({items,value,onChange}:{items:{id:T;label:string}[];value:T;onChange:(id:T)=>void}){const {colors:c}=useTheme();return <View style={{flexDirection:'row',padding:space.xxs,gap:space.xxs,borderRadius:radii.control,backgroundColor:c.inputBg}}>{items.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:value===item.id}} aria-selected={value===item.id} onPress={()=>{if(value!==item.id){tapLight();onChange(item.id)}}} style={{flex:1,paddingHorizontal:space.xxs,minHeight:control.touch,borderRadius:radii.chip,alignItems:'center',justifyContent:'center',backgroundColor:value===item.id?c.card:'transparent',borderWidth:1,borderColor:value===item.id?c.border:'transparent'}}><Text style={[type.caption,{fontWeight:value===item.id?'800':'600',color:value===item.id?c.text:c.textMuted,textAlign:'center'}]}>{item.label}</Text></Pressable>)}</View>}
export function BoriScene({tone='morning',title,description,mood='cheer',size=152,children,action,character,hero=false}:{tone?:SceneTone;title:string;description?:string;mood?:MascotMood;size?:number;children?:ReactNode;action?:AnimalActionId;character?:AnimalCharacterId;hero?:boolean}){
 const p=useScene(tone),{isDark}=useTheme(),{width}=useWindowDimensions(),characterSize=hero?Math.min(360,width-56):size;return <LinearGradient colors={[p.sky,p.ground]} style={{borderRadius:radii.stage,overflow:'hidden',padding:space.lg,gap:space.sm}}>
   {isDark?null:<AnimalSharedScene tone={tone}/>}
   <View testID={hero?'animal-hero-stage':undefined} style={{alignItems:'center',justifyContent:'center',height:hero?characterSize*.72:undefined,paddingTop:hero?0:8,overflow:'hidden'}}><Mascot size={characterSize} mood={mood} action={action} character={character}/></View>
   <View style={{backgroundColor:p.bubble,borderRadius:radii.card,padding:space.md,gap:space.xxs}}><Text accessibilityRole="header" style={[type.heading,{color:p.ink}]}>{title}</Text>{description?<Text style={[type.body,{color:p.muted}]}>{description}</Text>:null}</View>{children}
 </LinearGradient>;
}
export function MenuRow({title,subtitle,icon,onPress}:{title:string;subtitle?:string;icon?:React.ComponentProps<typeof Icon>['name'];onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({pressed})=>[u.between,{paddingVertical:space.sm,minHeight:control.large,opacity:pressed?.6:1}]}>{icon?<Icon name={icon} size={21}/>:null}<View style={{flex:1,gap:2}}><Copy variant="label">{title}</Copy>{subtitle?<Copy variant="caption" muted>{subtitle}</Copy>:null}</View><Icon name="chevron-forward" size={18}/></Pressable>}
