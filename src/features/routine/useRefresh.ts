import {useCallback,useRef,useState} from 'react';

/** 당겨서 새로고침(S1-25 ⑨). 읽기 하나만 돌리고, 도는 중에 또 당겨도 한 번만, 실패해도 표시는 멈춘다. */
export function useRefresh(run:()=>Promise<void>){
 const [refreshing,setRefreshing]=useState(false),busy=useRef(false);
 const onRefresh=useCallback(()=>{
  if(busy.current)return;
  busy.current=true;setRefreshing(true);
  void run().catch(()=>{}).finally(()=>{busy.current=false;setRefreshing(false);});
 },[run]);
 return {refreshing,onRefresh};
}
