import React,{useEffect} from 'react';
import {Pressable,Text,View} from 'react-native';
import {BottomTabBarProps,createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DashboardScreen} from '../features/routine/DashboardScreen';
import {StudyHomeScreen} from '../features/routine/StudyScreens';
import {GoalHomeScreen} from '../features/routine/GoalHomeScreen';
import {RecordsHomeScreen} from '../features/routine/RecordsHomeScreen';
import {useTheme} from '../theme/ThemeContext';
import {MainTabParamList} from './types';
import {maybeAutoBackup} from '../lib/backup';
import {useReducedMotion} from '../features/routine/motion';
import {AchievementWatcher} from '../features/routine/Celebration';
const Tab=createBottomTabNavigator<MainTabParamList>();
const items:Record<string,{label:string;icon:keyof typeof Ionicons.glyphMap;active:keyof typeof Ionicons.glyphMap}>={Today:{label:'오늘',icon:'sunny-outline',active:'sunny'},Study:{label:'학습',icon:'layers-outline',active:'layers'},GoalTab:{label:'목표',icon:'flag-outline',active:'flag'},Records:{label:'기록',icon:'journal-outline',active:'journal'}};
function TabBar({state,navigation}:BottomTabBarProps){
 const {colors:c}=useTheme(),insets=useSafeAreaInsets(),reduced=useReducedMotion();
 return <View style={{backgroundColor:c.surface,borderTopWidth:1,borderTopColor:c.border,paddingHorizontal:12,paddingTop:6,paddingBottom:Math.max(insets.bottom,9),flexDirection:'row'}}>{state.routes.map((route,i)=>{const selected=i===state.index,item=items[route.name];return <Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected}} aria-selected={selected} key={route.key} onPress={()=>{const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(!selected&&!event.defaultPrevented)navigation.navigate(route.name,route.params)}} onLongPress={()=>navigation.emit({type:'tabLongPress',target:route.key})} style={({pressed})=>({minHeight:57,flex:1,alignItems:'center',justifyContent:'center',gap:4,opacity:pressed?0.7:1,transform:[{scale:pressed&&!reduced?0.96:1}]})}><Ionicons name={selected?item.active:item.icon} color={selected?c.primary:c.textMuted} size={23}/><Text style={{fontSize:12,fontWeight:selected?'800':'500',color:selected?c.primary:c.textMuted}}>{item.label}</Text></Pressable>})}</View>;
}
export function MainTabs(){const reduced=useReducedMotion();useEffect(()=>{void maybeAutoBackup()},[]);return <><Tab.Navigator initialRouteName="Today" tabBar={props=><TabBar {...props}/>} screenOptions={{headerShown:false,animation:reduced?'none':'fade'}}><Tab.Screen name="Today" component={DashboardScreen}/><Tab.Screen name="Study" component={StudyHomeScreen}/><Tab.Screen name="GoalTab" component={GoalHomeScreen}/><Tab.Screen name="Records" component={RecordsHomeScreen}/></Tab.Navigator><AchievementWatcher/></>}
