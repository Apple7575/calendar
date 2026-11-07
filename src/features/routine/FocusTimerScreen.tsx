import {timerCueKind} from '../../lib/focusCue';
import {canStartBreak,focusBreakWait,focusRampStatus,focusRoundProgress,focusRewardPreview,focusRunCredit,focusRunSeconds} from '../../lib/focusRamp';
import {focusQuitPenalty,penaltyLabel} from '../../lib/focusPenalty';
import React,{useEffect,useState} from 'react';
import {Text,useWindowDimensions,View} from 'react-native';
import {useTimerScreenHold} from './useTimerScreenHold';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootScreenProps} from '../../navigation/types';
import {adjustBookTimer,breakLength,earnedBreakSeconds,finishFocusRun,finishWithoutPhoto,pauseBookTimer,resumeBookTimer,settleBookTimer,skipBookBreak,startBookTimer,takeEarnedBreak} from '../../lib/bookStudy';
import {bookDisplaySeconds,bookRestOvertime} from '../../lib/bookTimerTime';
import * as Crypto from 'expo-crypto';
import {handwritingAccess} from '../../lib/handwriting';
import {activePriorityTask} from '../../lib/priorityPlan';
import {pagesPreview} from '../../lib/handwriting';
import {canDeclareFinish,canTakeHandwritingPhoto,FOCUS_OVERTIME_FLASH_SECONDS,focusClockInverted} from '../../lib/focusFlow';
import {focusTheme,overtimeTheme} from '../../theme/themes';
import {StatusBar} from 'expo-status-bar';
import {useRoutine} from './RoutineProvider';
import {useRestAlarmSetting} from './useRestAlarmSetting';
import {FocusAlarmToggle} from './FocusAlarmToggle';
import {useRestAlarmRinging} from './useRestAlarmRinging';
import {stopRingingRestAlarm} from '../../lib/restAlarmState';
import {FocusClock} from './FocusClock';
import {useRewardUse} from './RewardUseToggle';
import {focusJourney} from '../../lib/focusJourney';
import {FocusMascot} from './FocusMascot';
import {loadFocusQuestions,takeFocusQuestion} from '../../lib/focusQuestions';
import {useStudyFeedback} from './useStudyFeedback';
import {askNextStudy,reservedStudy,startReservedStudy} from '../../lib/studyReservation';
import {FocusNoiseButton} from './FocusNoise';
/** 뒤집힘이 끝난 타이머. 시간을 조정해 목표를 다시 넘어도 또 번쩍이지 않게 한다. 표시 전용이라 저장하지 않는다. */
let flashFinishedTimer:string|undefined;
export function FocusTimerScreen({navigation}:RootScreenProps<'FocusTimer'>){
 const {data,dayKey,update}=useRoutine(),timer=data.bookTimer,insets=useSafeAreaInsets(),[clock,setClock]=useState(Date.now()),[error,setError]=useState(''),[cue,setCue]=useState<string|null>(null);
 // 휴식 보상 차임은 휴식 버튼이 열릴 때만(Felix 검토): 휴식에서 돌아온 공부는 시계가 끝나도 아직 휴식이 안 열릴 수 있다.
 useStudyFeedback(cue?{kind:timerCueKind(cue.slice(cue.lastIndexOf(':')+1),data,clock),id:cue}:null);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(id)},[]);
 useEffect(()=>{void loadFocusQuestions()},[]);
 useEffect(()=>{if(timer?.running&&Date.now()>=timer.endsAt){setCue(timer.id+':'+timer.phase);if(timer.phase==='break')void update(s=>settleBookTimer(s)).catch(e=>setError(e.message))}},[clock,timer?.running,timer?.endsAt,update]);
 // Landscape: the sound row sits in the top bar, left of the rotate button, so it adds no line and clears the clock and panel.
 const alarmRinging=useRestAlarmRinging(),window=useWindowDimensions(),wide=window.width>window.height,[alarmOn,setAlarmOn]=useRestAlarmSetting(),hold=useTimerScreenHold(true,'focus'),rotate=hold.rotate,toMain=()=>hold.leave(()=>navigation.popTo('Main')),use=useRewardUse();
 const remaining=timer?bookDisplaySeconds(timer,Math.max(clock,Date.now())):0,restOvertime=timer?bookRestOvertime(timer,Math.max(clock,Date.now())):null;
 const access=handwritingAccess(data,timer?.subject??'',clock),ramp=focusRampStatus(data,clock);
 useEffect(()=>{if(access.ready&&data.handwritingReceipts?.some(r=>r.subject===timer?.subject&&r.rewardStatus==='pending'))void update(s=>s).catch(e=>setError(e.message))},[access.ready,data.handwritingReceipts,timer?.subject,update]);
 if(timer?.phase==='focus'&&remaining<=-FOCUS_OVERTIME_FLASH_SECONDS)flashFinishedTimer=timer.id;
 const flashDone=!!timer&&flashFinishedTimer===timer.id,inverted=focusClockInverted(timer?.phase??'idle',remaining,ramp.needsPlan?null:restOvertime,flashDone);
 const reward=focusRewardPreview(data,timer?.subject??'',clock),reserved=reservedStudy(data,clock);
 const onJourney=!!ramp.required&&!ramp.needsPlan&&timer?.phase!=='break'&&restOvertime===null&&(timer?.phase!=='focus'||timer.rewardMode==='output');
 // The clock is one 25-minute round: the marks already paid this round plus what this run has studied since.
 const roundAt=focusRoundProgress(data,timer?.phase==='focus'?focusRunCredit(data,clock):timer?.awaitingChoice===true?timer.carrySeconds??0:0,clock),journey=onJourney?focusJourney(roundAt.studied,roundAt.required):null;
 const mascotFrame={timerId:timer?.id??'',phase:timer?.phase??'idle',credit:Math.floor(focusRunCredit(data,clock)),elapsed:timer?.phase==='break'?breakLength(timer)-remaining:Math.floor(focusRunSeconds(data,clock))},message=error||use.error||hold.error||hold.wake;
 // S2-13 (team lead): the bell sits just left of 화면 돌리기 in both orientations; in landscape the noise button joins it there.
 const noiseButton=<FocusNoiseButton color={inverted?overtimeTheme.colors.textMuted:focusTheme.colors.textMuted} surface={inverted?overtimeTheme.colors.primarySoft:focusTheme.colors.border} phase={timer?.phase??'idle'}/>,bell=<FocusAlarmToggle on={alarmOn} onChange={setAlarmOn} color={inverted?overtimeTheme.colors.text:focusTheme.colors.primary} muted={inverted?overtimeTheme.colors.textMuted:focusTheme.colors.textMuted} surface={inverted?overtimeTheme.colors.primarySoft:focusTheme.colors.border}/>;
 return <View testID="focus-timer-screen" style={{flex:1,overflow:'hidden',backgroundColor:inverted?overtimeTheme.colors.background:focusTheme.colors.background,paddingTop:insets.top,paddingBottom:insets.bottom,paddingLeft:insets.left,paddingRight:insets.right}}><StatusBar style={inverted?'dark':'light'}/><FocusClock breakWait={focusBreakWait(data,clock)} askQuit={()=>takeFocusQuestion('quit',dayKey)} journey={journey} rewardUse={{label:use.busy?'기기에 반영하고 있어요':use.on?'스크린타임 끄기':'스크린타임 켜기 · '+use.wallet.balance+'분',onPress:()=>void use.change(!use.on)}} character={size=><FocusMascot frame={mascotFrame} size={size}/>} overtimeFlashDone={flashDone} quitPenalty={penaltyLabel(focusQuitPenalty(data,clock))} awaitingChoice={timer?.awaitingChoice===true} onDeclare={canDeclareFinish(data,clock)?()=>navigation.navigate('BookStudy',{capture:true,declare:true}):undefined} declareLabel={data.handwritingPending?.declared?'다 했어요 · 사진 이어서 ('+pagesPreview(data).total+'/100자)':undefined} onFinish={()=>{void update(s=>askNextStudy(finishWithoutPhoto(s),'ask-'+Date.now())).then(toMain).catch(e=>setError(e.message))}} restOvertime={ramp.needsPlan?null:restOvertime} requiredMinutes={ramp.required/60} needsPlan={ramp.needsPlan} design="A" left={remaining} total={timer?.phase==='break'?breakLength(timer):timer?.rewardMode==='output'&&ramp.required?Math.max(ramp.required,remaining):timer?.targetSeconds??timer?.duration??1500} onRotate={rotate} topControls={wide?<>{noiseButton}{bell}</>:bell} alarmOn={alarmOn} alarmRinging={alarmRinging} onStopAlarm={stopRingingRestAlarm} carried={timer?.carrySeconds??0} breakMinutes={earnedBreakSeconds(data,clock)/60} dueMinutes={reward.due} nextMinutes={reward.next} onBreak={canStartBreak(data,clock)?()=>{void update(s=>takeEarnedBreak(s)).catch(e=>setError(e.message))}:undefined} onSkipBreak={()=>{if(ramp.needsPlan){navigation.replace('BookStudy');return;}const breakId=timer?.id;if(breakId)void update(s=>skipBookBreak(s,breakId,Crypto.randomUUID())).catch(e=>setError(e.message))}} onAdjust={seconds=>{void update(s=>adjustBookTimer(s,seconds)).catch(e=>setError(e.message))}} running={!!timer?.running} phase={timer?.phase??'idle'} subject={timer?.subject??reserved?.subject??'집중 공부'} ready={canTakeHandwritingPhoto(data,clock)} onClose={toMain} onPhoto={()=>navigation.navigate('BookStudy',{capture:true})} onLeaveNote={activePriorityTask(data,dayKey)?.startedAt?()=>navigation.navigate('PriorityPause'):undefined} onPause={()=>{const idle=!timer||timer.phase==='idle';if(!(ramp.needsPlan&&!timer?.running)&&idle&&!data.outputDraft&&reserved){const id=Crypto.randomUUID();void update(s=>startReservedStudy(s,id,Date.now())).catch(e=>setError(e.message));return;}if((ramp.needsPlan&&!timer?.running)||(idle&&!data.outputDraft)){navigation.replace('BookStudy');return;}void update(s=>!s.bookTimer||s.bookTimer.phase==='idle'?s.outputDraft?startBookTimer(s,Crypto.randomUUID(),s.outputDraft.subject,Date.now(),focusRampStatus(s).required,'output'):s:s.bookTimer.running?pauseBookTimer(s):resumeBookTimer(s)).catch(e=>setError(e.message))}}/>{message?<Text style={{color:inverted?overtimeTheme.colors.textMuted:focusTheme.colors.textMuted,textAlign:'center',paddingHorizontal:8,paddingVertical:4,fontSize:12}}>{message}</Text>:null}{wide?null:<View testID="focus-sound-row" pointerEvents="box-none" style={{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingVertical:4}}>{noiseButton}</View>}</View>;
}
