import {focusRampStatus,focusRewardPreview} from '../../lib/focusRamp';
import {focusQuitPenalty,penaltyLabel} from '../../lib/focusPenalty';
import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {useTimerScreenHold} from './useTimerScreenHold';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootScreenProps} from '../../navigation/types';
import {adjustBookTimer,finishFocusRun,pauseBookTimer,resumeBookTimer,settleBookTimer,skipBookBreak,startBookTimer,startBookBreak} from '../../lib/bookStudy';
import {bookDisplaySeconds,bookRestOvertime} from '../../lib/bookTimerTime';
import * as Crypto from 'expo-crypto';
import {handwritingAccess} from '../../lib/handwriting';
import {activePriorityTask} from '../../lib/priorityPlan';
import {canDeclareFinish,canTakeHandwritingPhoto,FOCUS_OVERTIME_FLASH_SECONDS,focusClockInverted} from '../../lib/focusFlow';
import {focusTheme,overtimeTheme} from '../../theme/themes';
import {StatusBar} from 'expo-status-bar';
import {useRoutine} from './RoutineProvider';
import {FocusClock} from './FocusClock';
import {useStudyFeedback} from './useStudyFeedback';
/** 뒤집힘이 끝난 타이머. 시간을 조정해 목표를 다시 넘어도 또 번쩍이지 않게 한다. 표시 전용이라 저장하지 않는다. */
let flashFinishedTimer:string|undefined;
export function FocusTimerScreen({navigation}:RootScreenProps<'FocusTimer'>){
 const {data,dayKey,update}=useRoutine(),timer=data.bookTimer,insets=useSafeAreaInsets(),[clock,setClock]=useState(Date.now()),[error,setError]=useState(''),[cue,setCue]=useState<string|null>(null);
 useStudyFeedback(cue?{kind:'timer',id:cue}:null);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(timer?.running&&Date.now()>=timer.endsAt){setCue(timer.id+':'+timer.phase);if(timer.phase==='break')void update(s=>settleBookTimer(s)).catch(e=>setError(e.message))}},[clock,timer?.running,timer?.endsAt,update]);
 const hold=useTimerScreenHold(true,'focus'),rotate=hold.rotate;
 const remaining=timer?bookDisplaySeconds(timer,Math.max(clock,Date.now())):0,restOvertime=timer?bookRestOvertime(timer,Math.max(clock,Date.now())):null;
 const access=handwritingAccess(data,timer?.subject??'',clock),ramp=focusRampStatus(data,clock);
 useEffect(()=>{if(access.ready&&data.handwritingReceipts?.some(r=>r.subject===timer?.subject&&r.rewardStatus==='pending'))void update(s=>s).catch(e=>setError(e.message))},[access.ready,data.handwritingReceipts,timer?.subject,update]);
 if(timer?.phase==='focus'&&remaining<=-FOCUS_OVERTIME_FLASH_SECONDS)flashFinishedTimer=timer.id;
 const flashDone=!!timer&&flashFinishedTimer===timer.id,inverted=focusClockInverted(timer?.phase??'idle',remaining,ramp.needsPlan?null:restOvertime,flashDone);
 const reward=focusRewardPreview(data,timer?.subject??'',clock);
 return <View testID="focus-timer-screen" style={{flex:1,backgroundColor:inverted?overtimeTheme.colors.background:focusTheme.colors.background,paddingTop:insets.top,paddingBottom:insets.bottom,paddingLeft:insets.left,paddingRight:insets.right}}><StatusBar style={inverted?'dark':'light'}/><FocusClock overtimeFlashDone={flashDone} quitPenalty={penaltyLabel(focusQuitPenalty(data,clock))} awaitingChoice={timer?.awaitingChoice===true} onDeclare={canDeclareFinish(data,clock)?()=>navigation.navigate('BookStudy',{capture:true,declare:true}):undefined} onFinish={()=>{void update(s=>({...finishFocusRun(s),outputDraft:undefined})).then(()=>navigation.popTo('Main')).catch(e=>setError(e.message))}} restOvertime={ramp.needsPlan?null:restOvertime} requiredMinutes={ramp.required/60} needsPlan={ramp.needsPlan} design="A" left={remaining} total={timer?.phase==='break'?300:timer?.rewardMode==='output'&&ramp.required?Math.max(ramp.required,remaining):timer?.targetSeconds??timer?.duration??1500} onRotate={rotate} carried={timer?.carrySeconds??0} dueMinutes={reward.due} nextMinutes={reward.next} onBreak={()=>{void update(s=>startBookBreak(s)).catch(e=>setError(e.message))}} onSkipBreak={()=>{if(ramp.needsPlan){navigation.replace('BookStudy');return;}const breakId=timer?.id;if(breakId)void update(s=>skipBookBreak(s,breakId,Crypto.randomUUID())).catch(e=>setError(e.message))}} onAdjust={seconds=>{void update(s=>adjustBookTimer(s,seconds)).catch(e=>setError(e.message))}} running={!!timer?.running} phase={timer?.phase??'idle'} subject={timer?.subject??'집중 공부'} ready={canTakeHandwritingPhoto(data,clock)} onClose={()=>navigation.popTo('Main')} onPhoto={()=>navigation.navigate('BookStudy',{capture:true})} onLeaveNote={activePriorityTask(data,dayKey)?.startedAt?()=>navigation.navigate('PriorityPause'):undefined} onPause={()=>{if((ramp.needsPlan&&!timer?.running)||((!timer||timer.phase==='idle')&&!data.outputDraft)){navigation.replace('BookStudy');return;}void update(s=>!s.bookTimer||s.bookTimer.phase==='idle'?s.outputDraft?startBookTimer(s,Crypto.randomUUID(),s.outputDraft.subject,Date.now(),focusRampStatus(s).required,'output'):s:s.bookTimer.running?pauseBookTimer(s):resumeBookTimer(s)).catch(e=>setError(e.message))}}/><Text style={{color:inverted?overtimeTheme.colors.textMuted:focusTheme.colors.textMuted,textAlign:'center',paddingHorizontal:8,paddingVertical:4,fontSize:12}}>{error||hold.error||hold.wake}</Text></View>;
}
