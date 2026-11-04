import {useCallback,useRef,useState} from 'react';
import {AppState,Platform} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

export type TimerScreen='focus'|'routine';
type Orientation=typeof import('expo-screen-orientation');
// 쓸 때 불러온다. 모듈이 없는 환경에서도 화면이 깨지지 않게 try 안에서 부른다.
const loadOrientation=():Orientation=>require('expo-screen-orientation');
const loadKeepAwake=():typeof import('expo-keep-awake')=>require('expo-keep-awake');
/** 화면별로 고른 방향. 앱을 끄기 전까지 이어져서 카메라나 다음 행동에서 돌아와도 그대로다. */
const portraitChoice:Record<TimerScreen,boolean>={focus:false,routine:false};
export function resetTimerOrientationForTest(){portraitChoice.focus=false;portraitChoice.routine=false}
const ROTATE_ERROR='화면 방향을 바꾸지 못했어요. 돌리기 버튼을 다시 눌러 주세요.';

/** 집중과 루틴 타이머가 함께 쓴다. 쓰는 동안 화면을 켜 두고 가로로 열며, 화면을 떠나면 원래 방향으로 돌려놓는다. */
export function useTimerScreenHold(active:boolean,screen:TimerScreen='routine'){
 const [error,setError]=useState(''),[wake,setWake]=useState('화면 꺼짐 방지 확인 중'),holding=useRef(false);
 const tag='routine-'+screen+'-timer';
 useFocusEffect(useCallback(()=>{
  if(!active)return;
  let live=true,previous:number|undefined,orientation:Orientation|undefined;
  holding.current=true;
  const release=()=>{try{void Promise.resolve(loadKeepAwake().deactivateKeepAwake(tag)).catch(()=>{})}catch{}};
  const keepAwake=async()=>{try{
   await loadKeepAwake().activateKeepAwakeAsync(tag);
   if(!live||AppState.currentState==='background'){release();return}
   setWake('화면 꺼짐 방지 켜짐');
  }catch{if(live)setWake('화면 꺼짐 방지를 지원하지 않는 환경이에요')}};
  void keepAwake();
  if(Platform.OS!=='web')void (async()=>{try{
   orientation=loadOrientation();
   previous=await orientation.getOrientationLockAsync();
   if(live)await orientation.lockAsync(portraitChoice[screen]?orientation.OrientationLock.PORTRAIT_UP:orientation.OrientationLock.LANDSCAPE);
   else if(previous!==undefined)await orientation.lockAsync(previous);
  }catch{if(live)setError(ROTATE_ERROR)}})();
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void keepAwake();else release()});
  return()=>{live=false;holding.current=false;listener.remove();release();if(orientation&&previous!==undefined)void orientation.lockAsync(previous).catch(()=>{})};
 },[active,screen,tag]));
 const rotate=useCallback(()=>{
  portraitChoice[screen]=!portraitChoice[screen];
  if(Platform.OS==='web'){setError('웹 미리보기에서는 돌아가지 않아요. 아이폰에서 돌아가요.');return}
  const portrait=portraitChoice[screen];
  void Promise.resolve().then(()=>{const o=loadOrientation();if(holding.current)return o.lockAsync(portrait?o.OrientationLock.PORTRAIT_UP:o.OrientationLock.LANDSCAPE)}).then(()=>setError('')).catch(()=>setError(ROTATE_ERROR));
 },[screen]);
 return {rotate,error,wake};
}
