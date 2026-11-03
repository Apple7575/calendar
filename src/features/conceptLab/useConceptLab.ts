import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createLab,labStorageKey,validateLab,mergeLabContent} from '../../lib/conceptLab';
import type {LabState} from '../../lib/conceptLabTypes';

export function useConceptLab(account?:string){
 const key=labStorageKey(account),[data,setData]=useState<LabState|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false);
 const current=useRef<LabState|null>(null),identity=useRef(key),queue=useRef(Promise.resolve());identity.current=key;
 useEffect(()=>{let live=true;current.current=null;setData(null);setError(null);
  AsyncStorage.getItem(key).then(raw=>{if(!live)return;const loaded=mergeLabContent(raw?validateLab(JSON.parse(raw)):createLab());current.current=loaded;setData(loaded);}).catch(()=>{if(live)setError('실험 데이터를 읽지 못했어요. 저장된 원본을 덮어쓰지 않았어요.');});
  return()=>{live=false;};
 },[key]);
 const update=useCallback((fn:(s:LabState)=>LabState)=>{
  const job=queue.current.catch(()=>{}).then(async()=>{
   if(identity.current!==key||!current.current)throw new Error('학습 기록을 불러온 뒤 다시 시도해 주세요.');
   setBusy(true);const next=validateLab(fn(current.current));await AsyncStorage.setItem(key,JSON.stringify(next));
   if(identity.current===key){current.current=next;setData(next);setError(null);}
  }).catch(e=>{if(identity.current===key)setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 시도해 주세요.');throw e;}).finally(()=>{if(identity.current===key)setBusy(false);});
  queue.current=job;return job;
 },[key]);
 return {data,error,busy,update};
}
