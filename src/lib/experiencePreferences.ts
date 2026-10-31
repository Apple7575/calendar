import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useSyncExternalStore} from 'react';
export type ExperiencePreferences={sound:boolean;haptics:boolean;motion:boolean};
const key='routine.experience.v1';
let value:ExperiencePreferences={sound:true,haptics:true,motion:true};
let loading:Promise<void>|null=null;
let writes:Promise<void>=Promise.resolve();
const listeners=new Set<()=>void>();
export const experiencePreferences=()=>value;
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)};};
export function loadExperiencePreferences(){return loading??(loading=AsyncStorage.getItem(key).then(raw=>{if(raw){const parsed=JSON.parse(raw);value={sound:parsed.sound!==false,haptics:parsed.haptics!==false,motion:parsed.motion!==false};listeners.forEach(fn=>fn());}}).catch(()=>{}));}
export function setExperiencePreference(name:keyof ExperiencePreferences,enabled:boolean){
 const task=writes.catch(()=>{}).then(async()=>{await loadExperiencePreferences();const next={...value,[name]:enabled};await AsyncStorage.setItem(key,JSON.stringify(next));value=next;listeners.forEach(fn=>fn());});writes=task;return task;
}
export function useExperiencePreferences(){const preferences=useSyncExternalStore(subscribe,experiencePreferences,experiencePreferences);useEffect(()=>{void loadExperiencePreferences()},[]);return preferences;}
