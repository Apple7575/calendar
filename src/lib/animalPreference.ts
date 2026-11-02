import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect,useSyncExternalStore} from 'react';
import type {AnimalCharacterId} from '../features/routine/animalAssets';
const key='routine.animal.character.v1',listeners=new Set<()=>void>();
let selected:AnimalCharacterId='C01',loading:Promise<void>|undefined,writes=Promise.resolve();
const emit=()=>listeners.forEach(fn=>fn());
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)};};
export function loadAnimalPreference(){return loading??(loading=AsyncStorage.getItem(key).then(value=>{if(['C01','C02','C03','C04'].includes(value??'')){selected=value as AnimalCharacterId;emit();}}).catch(()=>{}));}
export function setAnimalCharacter(id:AnimalCharacterId){
 const operation=writes.catch(()=>{}).then(async()=>{await loadAnimalPreference();if(!['C01','C02','C03','C04'].includes(id))throw new Error('캐릭터를 확인해 주세요.');await AsyncStorage.setItem(key,id);selected=id;emit();});
 writes=operation;return operation;
}
export function useAnimalCharacter(){const value=useSyncExternalStore(subscribe,()=>selected,()=>selected);useEffect(()=>{void loadAnimalPreference()},[]);return value;}
