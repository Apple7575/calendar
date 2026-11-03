import {focusRampStatus} from '../../lib/focusRamp';
import React,{useCallback,useEffect,useState} from 'react';
import {AppState,Platform,Text,View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootScreenProps} from '../../navigation/types';
import {adjustBookTimer,pauseBookTimer,resumeBookTimer,settleBookTimer,skipBookBreak,startBookTimer,startBookBreak} from '../../lib/bookStudy';
import {bookDisplaySeconds} from '../../lib/bookTimerTime';
import * as Crypto from 'expo-crypto';
import {handwritingAccess} from '../../lib/handwriting';
import {activePriorityTask} from '../../lib/priorityPlan';
import {focusTheme} from '../../theme/themes';
import {useRoutine} from './RoutineProvider';
import {FocusClock} from './FocusClock';
import {useStudyFeedback} from './useStudyFeedback';
export function FocusTimerScreen({navigation}:RootScreenProps<'FocusTimer'>){
 const {data,dayKey,update}=useRoutine(),timer=data.bookTimer,insets=useSafeAreaInsets(),[clock,setClock]=useState(Date.now()),[error,setError]=useState(''),[wake,setWake]=useState('화면 꺼짐 방지 확인 중'),[cue,setCue]=useState<string|null>(null);
 useStudyFeedback(cue?{kind:'timer',id:cue}:null);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(timer?.running&&Date.now()>=timer.endsAt){setCue(timer.id+':'+timer.phase);if(timer.phase==='break')void update(s=>settleBookTimer(s)).catch(e=>setError(e.message))}},[clock,timer?.running,timer?.endsAt,update]);
 useFocusEffect(useCallback(()=>{
  let active=true;let orientation:typeof import('expo-screen-orientation')|undefined,previous:import('expo-screen-orientation').OrientationLock|undefined;
  const tag='routine-focus-timer';
  const acquire=async()=>{try{const awake=await import('expo-keep-awake');if(!active)return;await awake.activateKeepAwakeAsync(tag);if(!active||AppState.currentState!=='active'){await awake.deactivateKeepAwake(tag);return;}setWake('화면 꺼짐 방지 켜짐');}catch{if(active)setWake('화면 꺼짐 방지를 지원하지 않는 환경이에요');}};
  void acquire();
  if(Platform.OS!=='web')void (async()=>{try{orientation=await import('expo-screen-orientation');previous=await orientation.getOrientationLockAsync();if(active)await orientation.lockAsync(orientation.OrientationLock.LANDSCAPE);if(!active&&previous!==undefined)await orientation.lockAsync(previous);}catch{if(active)setError('가로 전환을 적용하지 못했어요. 새 빌드에서 확인해 주세요.');}})();
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void acquire();else void import('expo-keep-awake').then(m=>m.deactivateKeepAwake(tag)).catch(()=>{});});
  return()=>{active=false;listener.remove();void import('expo-keep-awake').then(m=>m.deactivateKeepAwake(tag)).catch(()=>{});if(orientation&&previous!==undefined)void orientation.lockAsync(previous).catch(()=>{});};
 },[]));
 const remaining=timer?bookDisplaySeconds(timer,Math.max(clock,Date.now())):0;
 const access=handwritingAccess(data,timer?.subject??'',clock),ramp=focusRampStatus(data,clock);
 useEffect(()=>{if(access.ready&&data.handwritingReceipts?.some(r=>r.subject===timer?.subject&&r.rewardStatus==='pending'))void update(s=>s).catch(e=>setError(e.message))},[access.ready,data.handwritingReceipts,timer?.subject,update]);
 return <View style={{flex:1,backgroundColor:focusTheme.colors.background,paddingTop:insets.top,paddingBottom:insets.bottom,paddingLeft:insets.left,paddingRight:insets.right}}><FocusClock requiredMinutes={ramp.required/60} needsPlan={ramp.needsPlan} design="A" left={remaining} total={timer?.phase==='break'?300:timer?.targetSeconds??timer?.duration??1500} onBreak={()=>{void update(s=>startBookBreak(s)).catch(e=>setError(e.message))}} onSkipBreak={()=>{if(ramp.needsPlan){navigation.replace('BookStudy');return;}const breakId=timer?.id;if(breakId)void update(s=>skipBookBreak(s,breakId,Crypto.randomUUID())).catch(e=>setError(e.message))}} onAdjust={seconds=>{void update(s=>adjustBookTimer(s,seconds)).catch(e=>setError(e.message))}} running={!!timer?.running} phase={timer?.phase??'idle'} subject={timer?.subject??'집중 공부'} ready={access.ready} onClose={()=>navigation.popTo('Main')} onPhoto={()=>navigation.navigate('BookStudy',{capture:true})} onLeaveNote={activePriorityTask(data,dayKey)?.startedAt?()=>navigation.navigate('PriorityPause'):undefined} onPause={()=>{if((ramp.needsPlan&&!timer?.running)||((!timer||timer.phase==='idle')&&!data.outputDraft)){navigation.replace('BookStudy');return;}void update(s=>!s.bookTimer||s.bookTimer.phase==='idle'?s.outputDraft?startBookTimer(s,Crypto.randomUUID(),s.outputDraft.subject,Date.now(),focusRampStatus(s).required,'output'):s:s.bookTimer.running?pauseBookTimer(s):resumeBookTimer(s)).catch(e=>setError(e.message))}}/><Text style={{color:focusTheme.colors.textMuted,textAlign:'center',padding:8,fontSize:12}}>{error||wake}</Text></View>;
}
