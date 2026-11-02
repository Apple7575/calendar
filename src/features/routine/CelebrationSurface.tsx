import {AnimalSharedLayer} from './AnimalSharedScene';
import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
import React,{ReactNode} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {Icon,Mascot} from './ui';

/** Full-bleed celebration. Closing never changes the saved achievement or reward. */
export function CelebrationSurface({title,subtitle,onClose,children,footer,testID='fullscreen-celebration',milestone=false,detailedResult=false,action,character}:{title:string;subtitle?:string;onClose:()=>void;children?:ReactNode;footer:ReactNode;testID?:string;milestone?:boolean;detailedResult?:boolean;action?:AnimalActionId;character?:AnimalCharacterId}){
 const {width,height}=useWindowDimensions(),small=height<740;
 const size=Math.min(360,width-32,Math.max(175,height*(milestone ? .43 : detailedResult ? .23 : .34)));
 return <View testID={testID} style={{flex:1,backgroundColor:'#FFEBA0'}}>
  <AnimalSharedLayer id="celebration_effects" animated/>
  <StatusBar style="dark"/>
  <SafeAreaView style={{flex:1}} edges={['top','bottom']}>
   <View style={{height:52,paddingHorizontal:14,justifyContent:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="축하 화면 닫기" accessibilityHint="완료 기록과 받은 시간은 그대로 유지돼요" onPress={onClose} hitSlop={6} style={({pressed})=>({width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:pressed?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.55)'})}><Icon name="close" size={27} color="#18264E"/></Pressable></View>
   <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1,justifyContent:'center',alignItems:'center',paddingHorizontal:20,paddingBottom:12}} showsVerticalScrollIndicator={false}>
    <View style={{width:'100%',maxWidth:520,alignItems:'center',gap:small?5:8}}>
     <Text accessibilityRole="header" style={{color:'#18264E',fontSize:small?29:36,lineHeight:small?37:45,fontWeight:'900',textAlign:'center',letterSpacing:-1.1}}>{title}</Text>
     {subtitle?<Text style={{color:'#5D553C',fontSize:14,lineHeight:21,textAlign:'center',fontWeight:'600'}}>{subtitle}</Text>:null}
     <View style={{alignItems:'center',marginVertical:small?-10:-5}}><Mascot character={character} size={size} action={action??(milestone?'A35':'A25')}/></View>
     {children}
    </View>
   </ScrollView>
   <View style={{width:'100%',maxWidth:520,alignSelf:'center',paddingHorizontal:20,paddingTop:8,paddingBottom:10,gap:4}}>{footer}</View>
  </SafeAreaView>
 </View>;
}
export function CelebrationLink({label,onPress}:{label:string;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:8}}><Text style={{color:'#243552',fontSize:15,fontWeight:'700',textAlign:'center'}}>{label}</Text></Pressable>}
