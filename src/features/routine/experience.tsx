import {AnimalSharedScene} from './AnimalSharedScene';
import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
import React,{ReactNode} from 'react';
import {Pressable,Text,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {tapLight} from '../../lib/haptics';
import {Copy,Icon,Mascot,u} from './ui';
import {MascotMood} from './boriAssets';
export type SceneTone='morning'|'focus'|'evening';
export function useScene(tone:SceneTone='morning'){
 const {isDark,colors:c}=useTheme();
 if(tone==='evening'||isDark)return {sky:'#292C4D',ground:'#45436A',ink:'#FAF5EB',muted:'#D3CFE5',bubble:'#393959',accent:'#D5C5EF',soft:'#3A3F42'};
 return tone==='focus'?{sky:'#ECF2DC',ground:'#D9E6BC',ink:c.text,muted:c.textMuted,bubble:'#FFFEF8',accent:'#347B50',soft:'#E5EDD5'}:{sky:'#FFF0D9',ground:'#F7D9B5',ink:c.text,muted:'#6D725F',bubble:'#FFFCF3',accent:'#96603C',soft:'#F7E8D3'};
}
export function SettingsButton(){const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{colors:c}=useTheme();return <Pressable accessibilityRole="button" accessibilityLabel="프로필·설정" onPress={()=>nav.navigate('SettingsHub')} style={{width:44,height:44,borderRadius:22,backgroundColor:c.primarySoft,alignItems:'center',justifyContent:'center'}}><Icon name="person-outline" size={21} color={c.primary}/></Pressable>}
export function Segments<T extends string>({items,value,onChange}:{items:{id:T;label:string}[];value:T;onChange:(id:T)=>void}){const {colors:c}=useTheme();return <View style={{flexDirection:'row',padding:5,gap:4,borderRadius:20,backgroundColor:c.inputBg}}>{items.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:value===item.id}} aria-selected={value===item.id} onPress={()=>{if(value!==item.id){tapLight();onChange(item.id)}}} style={{flex:1,paddingHorizontal:4,paddingVertical:12,minHeight:46,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:value===item.id?c.card:'transparent',borderWidth:1,borderColor:value===item.id?c.border:'transparent'}}><Text style={{fontSize:14,fontWeight:value===item.id?'800':'600',color:value===item.id?c.text:c.textMuted,textAlign:'center'}}>{item.label}</Text></Pressable>)}</View>}
export function BoriScene({tone='morning',title,description,mood='cheer',size=152,children,action,character}:{tone?:SceneTone;title:string;description?:string;mood?:MascotMood;size?:number;children?:ReactNode;action?:AnimalActionId;character?:AnimalCharacterId}){
 const p=useScene(tone);return <LinearGradient colors={[p.sky,p.ground]} style={{borderRadius:32,overflow:'hidden',padding:22,gap:10}}>
   <AnimalSharedScene tone={tone}/>
   <View pointerEvents="none" style={{position:'absolute',width:210,height:210,borderRadius:110,right:-80,top:-75,backgroundColor:p.bubble,opacity:0.45}}/>
   <View style={{alignItems:'center',paddingTop:8}}><Mascot size={size} mood={mood} action={action} character={character}/></View>
   <View style={{backgroundColor:p.bubble,borderRadius:23,padding:18,gap:5}}><Text accessibilityRole="header" style={{fontSize:23,fontWeight:'800',color:p.ink,lineHeight:33,letterSpacing:-0.6}}>{title}</Text>{description?<Text style={{fontSize:14,lineHeight:22,color:p.muted}}>{description}</Text>:null}</View>{children}
 </LinearGradient>;
}
export function MenuRow({title,subtitle,icon,onPress}:{title:string;subtitle?:string;icon?:React.ComponentProps<typeof Icon>['name'];onPress:()=>void}){const {colors:c}=useTheme();return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[u.between,{paddingVertical:15,gap:12,minHeight:58,borderBottomWidth:1,borderBottomColor:c.border}]}>{icon?<View style={{width:40,height:40,borderRadius:14,backgroundColor:c.primarySoft,justifyContent:'center',alignItems:'center'}}><Icon name={icon} size={20}/></View>:null}<View style={{flex:1,gap:3}}><Copy weight="700">{title}</Copy>{subtitle?<Copy muted size={12}>{subtitle}</Copy>:null}</View><Icon name="chevron-forward" size={18}/></Pressable>}
