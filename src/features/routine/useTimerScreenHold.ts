import {useCallback,useRef,useState} from 'react';
import {AppState,Platform} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

const TAG='routine-guided-timer';
type Orientation=typeof import('expo-screen-orientation');
// 쓸 때 불러온다. 모듈이 없는 환경에서도 화면이 깨지지 않게 try 안에서 부른다.
const loadOrientation=():Orientation=>require('expo-screen-orientation');
const loadKeepAwake=():typeof import('expo-keep-awake')=>require('expo-keep-awake');
/** 마지막으로 고른 방향. 다음 행동과 다음 루틴에도 이어진다. */
let portraitChoice=false;
export function resetTimerOrientationForTest(){portraitChoice=false}

/** 타이머를 쓰는 동안 화면을 켜 두고 가로로 연다. 화면을 떠나면 원래 방향으로 돌려놓는다. */
export function useTimerScreenHold(active:boolean){
 const [error,setError]=useState(''),holding=useRef(false);
 useFocusEffect(useCallback(()=>{
  if(!active)return;
  let live=true,previous:number|undefined,orientation:Orientation|undefined;
  holding.current=true;
  const keepAwake=async()=>{try{if(live&&AppState.currentState!=='background')await loadKeepAwake().activateKeepAwakeAsync(TAG);}catch{}};
  const release=()=>{try{void Promise.resolve(loadKeepAwake().deactivateKeepAwake(TAG)).catch(()=>{})}catch{}};
  void keepAwake();
  if(Platform.OS!=='web')void (async()=>{try{
   orientation=loadOrientation();
   previous=await orientation.getOrientationLockAsync();
   if(live)await orientation.lockAsync(portraitChoice?orientation.OrientationLock.PORTRAIT_UP:orientation.OrientationLock.LANDSCAPE);
   else if(previous!==undefined)await orientation.lockAsync(previous);
  }catch{if(live)setError('화면 방향을 바꾸지 못했어요. 돌리기 버튼을 다시 눌러 주세요.')}})();
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void keepAwake();else release()});
  return()=>{live=false;holding.current=false;listener.remove();release();if(orientation&&previous!==undefined)void orientation.lockAsync(previous).catch(()=>{})};
 },[active]));
 const rotate=useCallback(()=>{
  portraitChoice=!portraitChoice;
  if(Platform.OS==='web'){setError('웹 미리보기에서는 돌아가지 않아요. 아이폰에서 돌아가요.');return}
  const portrait=portraitChoice;
  void Promise.resolve().then(()=>{const o=loadOrientation();if(holding.current)return o.lockAsync(portrait?o.OrientationLock.PORTRAIT_UP:o.OrientationLock.LANDSCAPE)}).then(()=>setError('')).catch(()=>setError('화면 방향을 바꾸지 못했어요. 돌리기 버튼을 다시 눌러 주세요.'));
 },[]);
 return {rotate,error};
}
